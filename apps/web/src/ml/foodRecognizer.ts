// Runs the food photo classifier (ml/ -> public/models/food-v1) in the browser with
// ONNX Runtime Web. Photos never leave the device. Preprocessing mirrors
// ml/train.py's eval transform: resize shorter side to 256, centre-crop 224,
// ImageNet mean/std normalisation, CHW float32.

import type * as OrtModule from 'onnxruntime-web/wasm';

export interface ModelMeta {
  labels: string[];
  input: { name: string; size: number; resize: number; mean: number[]; std: number[] };
  output: string;
  test_top1_onnx: number;
}

export interface Prediction {
  label: string;
  probability: number;
}

const MODEL_DIR = '/models/food-v1';

type Ort = typeof OrtModule;
type Loaded = {
  ort: Ort;
  session: OrtModule.InferenceSession;
  meta: ModelMeta;
};
let loading: Promise<Loaded> | null = null;

/** Downloads the runtime and model once (about 30 MB); later calls reuse them. */
export function loadRecognizer(): Promise<Loaded> {
  if (!loading) {
    loading = (async () => {
      const ort = await import('onnxruntime-web/wasm');
      ort.env.wasm.numThreads = 1; // no cross-origin isolation on this site
      const meta = (await (await fetch(`${MODEL_DIR}/meta.json`)).json()) as ModelMeta;
      const session = await ort.InferenceSession.create(`${MODEL_DIR}/model.onnx`, {
        executionProviders: ['wasm'],
      });
      return { ort, session, meta };
    })();
    loading.catch(() => {
      loading = null;
    });
  }
  return loading;
}

/** Source rectangle for "resize shorter side to `resize`, then centre-crop `size`". */
export function centerCropRect(width: number, height: number, resize: number, size: number) {
  const scale = resize / Math.min(width, height);
  const side = size / scale;
  return { sx: (width - side) / 2, sy: (height - side) / 2, sw: side, sh: side };
}

/** RGBA pixels (size x size) -> normalised CHW float32 tensor data. */
export function toTensorData(
  rgba: Uint8ClampedArray,
  size: number,
  mean: number[],
  std: number[],
): Float32Array {
  const plane = size * size;
  const out = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) {
      out[c * plane + i] = ((rgba[i * 4 + c] ?? 0) / 255 - (mean[c] ?? 0)) / (std[c] ?? 1);
    }
  }
  return out;
}

export function softmax(logits: ArrayLike<number>): number[] {
  const values = Array.from(logits);
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export function topK(probabilities: number[], labels: string[], k: number): Prediction[] {
  return probabilities
    .map((probability, i) => ({ label: labels[i] ?? String(i), probability }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, k);
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法读取这张图片'));
    };
    img.src = url; // browsers apply EXIF orientation when decoding <img>
  });
}

/** Classifies a photo and returns the top 3 dishes with probabilities. */
export async function recognizeFood(file: Blob): Promise<Prediction[]> {
  const { ort, session, meta } = await loadRecognizer();
  const img = await loadImage(file);
  const { size, resize, mean, std, name } = meta.input;
  const { sx, sy, sw, sh } = centerCropRect(img.naturalWidth, img.naturalHeight, resize, size);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('浏览器不支持图片处理');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
  const data = toTensorData(ctx.getImageData(0, 0, size, size).data, size, mean, std);
  const input = new ort.Tensor('float32', data, [1, 3, size, size]);
  const result = await session.run({ [name]: input });
  const logits = result[meta.output]?.data as Float32Array | undefined;
  if (!logits) throw new Error('模型没有输出结果');
  return topK(softmax(logits), meta.labels, 3);
}
