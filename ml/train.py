"""Train a food photo classifier with transfer learning.

Data sources (pick one):
  --dataset food101      Food-101 via torchvision (research use only; for testing the pipeline)
  --data-dir PATH        Your own photos: PATH/<class_name>/*.jpg, or PATH/{train,val,test}/<class_name>/*.jpg

Outputs go to ml/runs/<run-name>/: best.pt (weights + metadata), labels.json, history.json.

Example:
  ml\\.venv\\Scripts\\python -I ml\\train.py --dataset food101 --epochs 10
  ml\\.venv\\Scripts\\python -I ml\\train.py --data-dir ml\\data\\my_food --epochs 15

This file is self-contained (no local imports) so it can run with `python -I`.
"""

from __future__ import annotations

import argparse
import sys
import json
import random
import time
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
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]
INPUT_SIZE = 224
RESIZE = 256


def build_model(arch: str, num_classes: int) -> nn.Module:
    if arch == "mobilenet_v3_large":
        model = models.mobilenet_v3_large(weights=models.MobileNet_V3_Large_Weights.IMAGENET1K_V2)
        model.classifier[3] = nn.Linear(model.classifier[3].in_features, num_classes)
    elif arch == "efficientnet_b0":
        model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    else:
        raise ValueError(f"unknown arch {arch}")
    return model


def head_parameters(model: nn.Module) -> list[nn.Parameter]:
    return list(model.classifier.parameters())


def train_transform() -> transforms.Compose:
    return transforms.Compose(
        [
            transforms.RandomResizedCrop(INPUT_SIZE, scale=(0.6, 1.0)),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )


def eval_transform() -> transforms.Compose:
    return transforms.Compose(
        [
            transforms.Resize(RESIZE),
            transforms.CenterCrop(INPUT_SIZE),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )


def stratified_split(targets: list[int], fractions: tuple[float, float, float], seed: int):
    """Split indices per class so every class appears in train/val/test."""
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


def load_data(args):
    """Returns (train_ds, val_ds, test_ds, class_names, source_note)."""
    if args.dataset == "food101":
        root = ML_DIR / "data"
        full_train = datasets.Food101(root, split="train", transform=train_transform(), download=args.download)
        full_train_eval = datasets.Food101(root, split="train", transform=eval_transform(), download=False)
        test = datasets.Food101(root, split="test", transform=eval_transform(), download=False)
        targets = list(full_train._labels)  # noqa: SLF001 - torchvision keeps labels here
        train_idx, val_idx, leftover = stratified_split(targets, (0.9, 0.1, 0.0), args.seed)
        train_idx += leftover  # no test carve-out: Food-101 has its own official test split
        return (
            Subset(full_train, train_idx),
            Subset(full_train_eval, val_idx),
            test,
            full_train.classes,
            "Food-101 (ETH Zurich). Research use only; not for the production model.",
        )

    data_dir = Path(args.data_dir)
    if (data_dir / "train").is_dir():
        train = datasets.ImageFolder(data_dir / "train", transform=train_transform())
        val = datasets.ImageFolder(data_dir / "val", transform=eval_transform())
        test = datasets.ImageFolder(data_dir / "test", transform=eval_transform())
        if val.classes != train.classes or test.classes != train.classes:
            raise SystemExit("train/val/test must contain the same class folders")
        return train, val, test, train.classes, f"Own photos: {data_dir}"

    full_aug = datasets.ImageFolder(data_dir, transform=train_transform())
    full_eval = datasets.ImageFolder(data_dir, transform=eval_transform())
    train_idx, val_idx, test_idx = stratified_split(full_aug.targets, (0.7, 0.15, 0.15), args.seed)
    return (
        Subset(full_aug, train_idx),
        Subset(full_eval, val_idx),
        Subset(full_eval, test_idx),
        full_aug.classes,
        f"Own photos: {data_dir} (auto split 70/15/15, seed {args.seed})",
    )


def run_epoch(model, loader, device, criterion, optimizer=None, scaler=None, scheduler=None):
    training = optimizer is not None
    model.train(training)
    total, correct1, correct3, loss_sum = 0, 0, 0, 0.0
    for images, labels in loader:
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)
        with torch.set_grad_enabled(training), torch.autocast(
            device_type=device.type, dtype=torch.float16, enabled=device.type == "cuda"
        ):
            logits = model(images)
            loss = criterion(logits, labels)
        if training:
            optimizer.zero_grad(set_to_none=True)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            if scheduler is not None:
                scheduler.step()
        top3 = logits.topk(min(3, logits.shape[1]), dim=1).indices
        correct1 += (top3[:, 0] == labels).sum().item()
        correct3 += (top3 == labels[:, None]).any(dim=1).sum().item()
        loss_sum += loss.item() * labels.size(0)
        total += labels.size(0)
    return {"loss": loss_sum / total, "top1": correct1 / total, "top3": correct3 / total}


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--dataset", choices=["food101"])
    src.add_argument("--data-dir")
    p.add_argument("--download", action="store_true", help="download Food-101 (~4.7 GB) if missing")
    p.add_argument("--arch", default="mobilenet_v3_large", choices=["mobilenet_v3_large", "efficientnet_b0"])
    p.add_argument("--epochs", type=int, default=10, help="total epochs (first --head-epochs train only the head)")
    p.add_argument("--head-epochs", type=int, default=2)
    p.add_argument("--batch-size", type=int, default=64)
    p.add_argument("--lr", type=float, default=1e-3, help="head learning rate; full fine-tune uses lr/10")
    p.add_argument("--workers", type=int, default=6)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--run-name", default=None)
    args = p.parse_args()

    torch.manual_seed(args.seed)
    random.seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}" + (f" ({torch.cuda.get_device_name(0)})" if device.type == "cuda" else " - training will be slow"))

    train_ds, val_ds, test_ds, classes, source_note = load_data(args)
    print(f"Classes: {len(classes)} | train {len(train_ds)} | val {len(val_ds)} | test {len(test_ds)}")

    loader_kw = dict(batch_size=args.batch_size, num_workers=args.workers, pin_memory=device.type == "cuda",
                     persistent_workers=args.workers > 0)
    train_loader = DataLoader(train_ds, shuffle=True, drop_last=True, **loader_kw)
    val_loader = DataLoader(val_ds, shuffle=False, **loader_kw)

    model = build_model(args.arch, len(classes)).to(device)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    scaler = torch.amp.GradScaler(device.type, enabled=device.type == "cuda")

    run_name = args.run_name or f"{args.dataset or Path(args.data_dir).name}-{args.arch}-{time.strftime('%Y%m%d-%H%M')}"
    out = ML_DIR / "runs" / run_name
    out.mkdir(parents=True, exist_ok=True)
    (out / "labels.json").write_text(json.dumps(classes, ensure_ascii=False, indent=2), encoding="utf-8")

    history, best_top1 = [], -1.0
    for phase, epochs, lr, params in (
        ("head", args.head_epochs, args.lr, head_parameters(model)),
        ("full", args.epochs - args.head_epochs, args.lr / 10, list(model.parameters())),
    ):
        if epochs <= 0:
            continue
        for prm in model.parameters():
            prm.requires_grad = phase == "full"
        for prm in params:
            prm.requires_grad = True
        optimizer = torch.optim.AdamW(params, lr=lr, weight_decay=1e-4)
        scheduler = torch.optim.lr_scheduler.OneCycleLR(
            optimizer, max_lr=lr, total_steps=epochs * len(train_loader), pct_start=0.15
        )
        for epoch in range(epochs):
            t0 = time.time()
            tr = run_epoch(model, train_loader, device, criterion, optimizer, scaler, scheduler)
            va = run_epoch(model, val_loader, device, criterion)
            row = {"phase": phase, "epoch": len(history) + 1, "train": tr, "val": va, "seconds": round(time.time() - t0)}
            history.append(row)
            print(
                f"[{phase}] epoch {row['epoch']}/{args.epochs}  "
                f"train top1 {tr['top1']:.3f}  val top1 {va['top1']:.3f}  val top3 {va['top3']:.3f}  ({row['seconds']}s)"
            )
            if va["top1"] > best_top1:
                best_top1 = va["top1"]
                torch.save(
                    {
                        "arch": args.arch,
                        "state_dict": model.state_dict(),
                        "classes": classes,
                        "input_size": INPUT_SIZE,
                        "resize": RESIZE,
                        "mean": IMAGENET_MEAN,
                        "std": IMAGENET_STD,
                        "val_top1": va["top1"],
                        "val_top3": va["top3"],
                        "source": source_note,
                        "data": {"dataset": args.dataset, "data_dir": args.data_dir, "seed": args.seed},
                    },
                    out / "best.pt",
                )
            (out / "history.json").write_text(json.dumps(history, indent=2), encoding="utf-8")

    print(f"\nBest val top1 {best_top1:.3f}. Saved to {out}")
    print(f"Next: ml\\.venv\\Scripts\\python -I ml\\evaluate.py --run {run_name}")


if __name__ == "__main__":
    main()
