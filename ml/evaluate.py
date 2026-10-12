"""Evaluate a trained run on its held-out test set.

Reports top-1 / top-3 accuracy, per-class accuracy (worst first) and the most
confused class pairs, and writes ml/runs/<run>/evaluation.json.

Example:
  ml\\.venv\\Scripts\\python -I ml\\evaluate.py --run food101-mobilenet_v3_large-20261011-1530

Self-contained (no local imports) so it can run with `python -I`.
"""

from __future__ import annotations

import argparse
import sys
import json
import random
from pathlib import Path

import torch
from PIL import ImageFile
from torch import nn
from torch.utils.data import DataLoader, Subset
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
    # Must match train.py exactly so the test set is the same images.
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


def test_set(ckpt):
    tf = transforms.Compose(
        [
            transforms.Resize(ckpt["resize"]),
            transforms.CenterCrop(ckpt["input_size"]),
            transforms.ToTensor(),
            transforms.Normalize(ckpt["mean"], ckpt["std"]),
        ]
    )
    data = ckpt["data"]
    if data["dataset"] == "food101":
        return datasets.Food101(ML_DIR / "data", split="test", transform=tf, download=False)
    data_dir = Path(data["data_dir"])
    if (data_dir / "test").is_dir():
        return datasets.ImageFolder(data_dir / "test", transform=tf)
    full = datasets.ImageFolder(data_dir, transform=tf)
    _, _, test_idx = stratified_split(full.targets, (0.7, 0.15, 0.15), data["seed"])
    return Subset(full, test_idx)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--run", required=True, help="folder name under ml/runs")
    p.add_argument("--batch-size", type=int, default=128)
    p.add_argument("--workers", type=int, default=6)
    args = p.parse_args()

    run_dir = ML_DIR / "runs" / args.run
    ckpt = torch.load(run_dir / "best.pt", map_location="cpu", weights_only=False)
    classes = ckpt["classes"]
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = build_model(ckpt["arch"], len(classes))
    model.load_state_dict(ckpt["state_dict"])
    model.to(device).eval()

    ds = test_set(ckpt)
    loader = DataLoader(ds, batch_size=args.batch_size, num_workers=args.workers)
    n = len(classes)
    confusion = torch.zeros(n, n, dtype=torch.long)
    top3_hits = 0
    with torch.no_grad():
        for images, labels in loader:
            logits = model(images.to(device)).float().cpu()
            top3 = logits.topk(min(3, n), dim=1).indices
            top3_hits += (top3 == labels[:, None]).any(dim=1).sum().item()
            for t, pr in zip(labels.tolist(), top3[:, 0].tolist()):
                confusion[t, pr] += 1

    total = confusion.sum().item()
    top1 = confusion.trace().item() / total
    per_class = [
        {"class": classes[i], "accuracy": confusion[i, i].item() / max(1, confusion[i].sum().item()), "n": confusion[i].sum().item()}
        for i in range(n)
    ]
    per_class.sort(key=lambda r: r["accuracy"])
    off = confusion.clone()
    off.fill_diagonal_(0)
    pairs = []
    for flat in off.flatten().argsort(descending=True)[:15].tolist():
        t, pr = divmod(flat, n)
        if off[t, pr] == 0:
            break
        pairs.append({"true": classes[t], "predicted": classes[pr], "count": off[t, pr].item()})

    report = {"test_images": total, "top1": top1, "top3": top3_hits / total, "worst_classes": per_class[:10], "most_confused": pairs}
    (run_dir / "evaluation.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Test images: {total}")
    print(f"Top-1 accuracy: {top1:.3f}   Top-3 accuracy: {top3_hits / total:.3f}")
    print("\nWorst classes:")
    for r in per_class[:10]:
        print(f"  {r['class']:<30} {r['accuracy']:.2f}  (n={r['n']})")
    print("\nMost confused (true -> predicted):")
    for r in pairs:
        print(f"  {r['true']} -> {r['predicted']}: {r['count']}")
    print(f"\nNext: ml\\.venv\\Scripts\\python -I ml\\export_onnx.py --run {args.run}")


if __name__ == "__main__":
    main()
