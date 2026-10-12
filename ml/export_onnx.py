"""Export a trained run to ONNX for the website (ONNX Runtime Web).

Writes ml/runs/<run>/web/:
  model.onnx   batch-1 model, input "input" [1,3,H,W] float32, output "logits" [1,num_classes]
  meta.json    labels, preprocessing (resize, crop, mean, std), accuracy, data source

Checks:
  1. ONNX output matches PyTorch on real test images (max |diff| reported).
  2. Top-1 accuracy of the ONNX model on up to --eval-limit test images.
  With --int8, also builds a static-quantized model (about 4x smaller) and only uses
  it if its accuracy drops by no more than --max-int8-drop.

Example:
  ml\\.venv\\Scripts\\python -I ml\\export_onnx.py --run <run-name> --int8

Self-contained (no local imports) so it can run with `python -I`.
"""

from __future__ import annotations

import argparse
import sys
import json
import random
import shutil
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch
from onnxruntime.quantization import CalibrationDataReader, QuantFormat, QuantType, quantize_static
from onnxruntime.quantization.shape_inference import quant_pre_process
from PIL import ImageFile
from torch import nn
from torch.utils.data import Subset
from torchvision import datasets, models, transforms

ImageFile.LOAD_TRUNCATED_IMAGES = True
# Windows consoles default to a legacy code page; exporter logs contain emoji.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")
ML_DIR = Path(__file__).resolve().parent


def build_model(arch: str, num_classes: int) -> nn.Module:
    if arch == "mobilenet_v3_large":
        model = models.mobilenet_v3_large()
        model.classifier[3] = nn.Linear(model.classifier[3].in_features, num_classes)
    elif arch == "efficientnet_b0":
        model = models.efficientnet_b0()
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    else:
        raise ValueError(f"unknown arch {arch}")
    return model


def stratified_split(targets, fractions, seed):
    # Must match train.py exactly.
    rng = random.Random(seed)
    by_class: dict[int, list[int]] = {}
    for i, t in enumerate(targets):
        by_class.setdefault(t, []).append(i)
    train, val, test = [], [], []
    for idx in by_class.values():
        rng.shuffle(idx)
        n_val = max(1, round(len(idx) * fractions[1]))
        n_test = max(1, round(len(idx) * fractions[2]))
        val += idx[:n_val]
        test += idx[n_val : n_val + n_test]
        train += idx[n_val + n_test :]
    return train, val, test


def splits(ckpt):
    """(val, test) datasets with eval preprocessing; val is used for int8 calibration."""
    tf = transforms.Compose(
        [
            transforms.Resize(ckpt["resize"]),
            transforms.CenterCrop(ckpt["input_size"]),
            transforms.ToTensor(),
            transforms.Normalize(ckpt["mean"], ckpt["std"]),
        ]
    )
    data, seed = ckpt["data"], ckpt["data"]["seed"]
    if data["dataset"] == "food101":
        train = datasets.Food101(ML_DIR / "data", split="train", transform=tf, download=False)
        _, val_idx, _ = stratified_split(list(train._labels), (0.9, 0.1, 0.0), seed)  # noqa: SLF001
        test = datasets.Food101(ML_DIR / "data", split="test", transform=tf, download=False)
        return Subset(train, val_idx), test
    data_dir = Path(data["data_dir"])
    if (data_dir / "train").is_dir():
        return datasets.ImageFolder(data_dir / "val", transform=tf), datasets.ImageFolder(data_dir / "test", transform=tf)
    full = datasets.ImageFolder(data_dir, transform=tf)
    _, val_idx, test_idx = stratified_split(full.targets, (0.7, 0.15, 0.15), seed)
    return Subset(full, val_idx), Subset(full, test_idx)


def sample(ds, limit: int, seed: int = 0):
    idx = list(range(len(ds)))
    random.Random(seed).shuffle(idx)
    for i in idx[:limit]:
        image, label = ds[i]
        yield image.unsqueeze(0).numpy().astype(np.float32), label


class Calibration(CalibrationDataReader):
    def __init__(self, ds, n: int):
        self.items = iter([{"input": x} for x, _ in sample(ds, n, seed=1)])

    def get_next(self):
        return next(self.items, None)


def onnx_top1(path: Path, ds, limit: int) -> float:
    sess = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    hits = total = 0
    for x, label in sample(ds, limit):
        hits += int(sess.run(None, {"input": x})[0].argmax() == label)
        total += 1
    return hits / total


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--run", required=True)
    p.add_argument("--int8", action="store_true", help="also try static int8 quantization")
    p.add_argument("--calibration-images", type=int, default=300)
    p.add_argument("--eval-limit", type=int, default=2000, help="test images used to score the ONNX models")
    p.add_argument("--max-int8-drop", type=float, default=0.01, help="max top-1 drop allowed for int8")
    args = p.parse_args()

    run_dir = ML_DIR / "runs" / args.run
    out = run_dir / "web"
    out.mkdir(exist_ok=True)
    ckpt = torch.load(run_dir / "best.pt", map_location="cpu", weights_only=False)
    model = build_model(ckpt["arch"], len(ckpt["classes"]))
    model.load_state_dict(ckpt["state_dict"])
    model.eval()

    size = ckpt["input_size"]
    fp32 = run_dir / "model_fp32.onnx"
    torch.onnx.export(
        model,
        (torch.randn(1, 3, size, size),),
        str(fp32),
        input_names=["input"],
        output_names=["logits"],
        opset_version=18,  # the exporter's native opset; converting down fails on some ops
        external_data=False,  # one self-contained file for the website
    )

    val_ds, test_ds = splits(ckpt)

    # 1. Numerical check against PyTorch on real images.
    sess = ort.InferenceSession(str(fp32), providers=["CPUExecutionProvider"])
    max_diff = 0.0
    with torch.no_grad():
        for x, _ in sample(test_ds, 20):
            ref = model(torch.from_numpy(x)).numpy()
            got = sess.run(None, {"input": x})[0]
            max_diff = max(max_diff, float(np.abs(ref - got).max()))
    print(f"ONNX vs PyTorch max |diff| on 20 test images: {max_diff:.2e}")
    if max_diff > 1e-3:
        raise SystemExit("ONNX output differs from PyTorch more than 1e-3; not exporting.")

    # 2. Accuracy of the exported model.
    top1_fp32 = onnx_top1(fp32, test_ds, args.eval_limit)
    print(f"FP32 ONNX top-1 on {min(args.eval_limit, len(test_ds))} test images: {top1_fp32:.3f} "
          f"({fp32.stat().st_size / 1e6:.1f} MB)")
    chosen, chosen_top1, precision = fp32, top1_fp32, "fp32"

    if args.int8:
        pre = run_dir / "model_pre.onnx"
        int8 = run_dir / "model_int8.onnx"
        quant_pre_process(str(fp32), str(pre))
        quantize_static(
            str(pre),
            str(int8),
            Calibration(val_ds, args.calibration_images),
            quant_format=QuantFormat.QDQ,
            activation_type=QuantType.QUInt8,
            weight_type=QuantType.QInt8,
            per_channel=True,
        )
        top1_int8 = onnx_top1(int8, test_ds, args.eval_limit)
        print(f"INT8 ONNX top-1: {top1_int8:.3f} ({int8.stat().st_size / 1e6:.1f} MB)")
        if top1_fp32 - top1_int8 <= args.max_int8_drop:
            chosen, chosen_top1, precision = int8, top1_int8, "int8"
        else:
            print(f"INT8 drops more than {args.max_int8_drop:.3f}; keeping FP32.")

    shutil.copyfile(chosen, out / "model.onnx")
    meta = {
        "arch": ckpt["arch"],
        "precision": precision,
        "labels": ckpt["classes"],
        "input": {"name": "input", "size": size, "resize": ckpt["resize"], "mean": ckpt["mean"], "std": ckpt["std"]},
        "output": "logits",
        "test_top1_onnx": round(chosen_top1, 4),
        "test_images_scored": min(args.eval_limit, len(test_ds)),
        "source": ckpt["source"],
    }
    (out / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote {out / 'model.onnx'} ({precision}) and meta.json")
    print("Send me these two files' folder path and I will wire them into the website.")


if __name__ == "__main__":
    main()
