import { describe, expect, it } from 'vitest';
import { centerCropRect, softmax, toTensorData, topK } from './foodRecognizer';

describe('preprocessing (must match ml/train.py eval transform)', () => {
  it('crops the centre square after scaling the shorter side to 256', () => {
    // 1000 x 500 photo: scale 256/500, crop 224 -> source side 224 * 500/256 = 437.5
    const r = centerCropRect(1000, 500, 256, 224);
    expect(r.sw).toBeCloseTo(437.5, 10);
    expect(r.sh).toBeCloseTo(437.5, 10);
    expect(r.sx).toBeCloseTo((1000 - 437.5) / 2, 10);
    expect(r.sy).toBeCloseTo((500 - 437.5) / 2, 10);
  });

  it('normalises RGBA into CHW planes with ImageNet mean and std', () => {
    const rgba = new Uint8ClampedArray([
      255, 0, 128, 255, 0, 255, 0, 255, 0, 0, 0, 255, 255, 255, 255, 255,
    ]);
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];
    const t = toTensorData(rgba, 2, mean, std);
    expect(t).toHaveLength(12);
    expect(t[0]).toBeCloseTo((1 - 0.485) / 0.229, 5); // R of pixel 0
    expect(t[4 + 1]).toBeCloseTo((1 - 0.456) / 0.224, 5); // G of pixel 1
    expect(t[8 + 0]).toBeCloseTo((128 / 255 - 0.406) / 0.225, 5); // B of pixel 0
  });
});

describe('softmax and topK', () => {
  it('turns logits into ranked probabilities', () => {
    const p = softmax([2, 1, 0, -1]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    const top = topK(p, ['a', 'b', 'c', 'd'], 3);
    expect(top.map((x) => x.label)).toEqual(['a', 'b', 'c']);
    expect(top[0]!.probability).toBeGreaterThan(top[1]!.probability);
  });

  it('is stable for large logits', () => {
    const p = softmax([1000, 999]);
    expect(p[0]).toBeCloseTo(1 / (1 + Math.exp(-1)), 10);
  });
});
