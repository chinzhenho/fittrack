"""Collect openly licensed dish photos from Wikimedia Commons and Openverse.

Only licenses that allow commercial use and modification are kept:
CC0, public domain (PDM), CC BY, CC BY-SA. NC / ND / unknown licenses are skipped.
Every saved image is recorded in <out>/metadata.csv with source, author and license,
which is needed for the website's attribution page.

Requests are deliberately slow (both services rate-limit anonymous clients).
Re-running resumes: existing images are skipped.

Example:
  ml\\.venv\\Scripts\\python -I ml\\collect_images.py --out ml\\data\\web_food --max-per-class 150

After collecting, open each class folder in Explorer (View > Large icons) and delete
photos that are not a close-up of the dish (menus, shop fronts, raw ingredients).

Self-contained (no local imports) so it can run with `python -I`.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, UnidentifiedImageError

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

USER_AGENT = "FitTrack-dataset-builder/0.1 (https://github.com/chinzhenho/fittrack)"
MAX_SIDE = 512

# class name -> (Wikimedia Commons categories, Openverse search phrases)
DISHES: dict[str, tuple[list[str], list[str]]] = {
    "nasi_lemak": (["Nasi lemak"], ["nasi lemak"]),
    "roti_canai": (["Roti canai", "Roti prata"], ["roti canai", "roti prata"]),
    "chicken_rice": (["Hainanese chicken rice"], ["hainanese chicken rice", "chicken rice malaysia"]),
    "satay": (["Satay"], ["satay skewers", "sate ayam"]),
    "nasi_goreng": (["Nasi goreng"], ["nasi goreng"]),
    "char_kway_teow": (["Char kway teow"], ["char kway teow", "char koay teow"]),
    "laksa": (["Laksa"], ["laksa noodle soup", "curry laksa", "assam laksa"]),
    "wonton_noodles": (["Wonton noodles"], ["wonton noodles", "wantan mee"]),
    "mee_goreng": (["Mee goreng"], ["mee goreng", "mie goreng"]),
    "rendang": (["Rendang"], ["beef rendang"]),
}

# Accepts e.g. "CC BY-SA 4.0", "CC BY 2.0", "CC0", "Public domain" (Commons) and
# "by-sa 2.0", "cc0 1.0", "pdm 1.0" (Openverse). Anything else (NC, ND, GFDL-only, ports) is skipped.
LICENSE_OK = re.compile(r"^(cc0( 1\.0)?|pdm( 1\.0)?|public domain|(cc )?by(-sa)?( \d\.\d)?)$", re.I)


def http_json(url: str, retries: int = 5) -> dict:
    for attempt in range(retries):
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and attempt < retries - 1:
                wait = 60 * (attempt + 1)
                print(f"  rate limited ({e.code}); waiting {wait}s")
                time.sleep(wait)
                continue
            raise
    raise RuntimeError("unreachable")


def http_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def strip_html(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s or "").strip()


def commons_candidates(category: str, depth: int, delay: float):
    """Yield dicts for image files in a Commons category (and subcategories)."""
    api = "https://commons.wikimedia.org/w/api.php"
    queue, seen = [(category, 0)], set()
    while queue:
        cat, d = queue.pop(0)
        if cat in seen:
            continue
        seen.add(cat)
        cont: dict = {}
        while True:
            params = {
                "action": "query", "format": "json", "generator": "categorymembers",
                "gcmtitle": f"Category:{cat}", "gcmtype": "file", "gcmlimit": "50",
                "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": str(MAX_SIDE), "maxlag": "5",
                **cont,
            }
            data = http_json(f"{api}?{urllib.parse.urlencode(params)}")
            time.sleep(delay)
            for page in (data.get("query", {}).get("pages", {}) or {}).values():
                info = (page.get("imageinfo") or [{}])[0]
                meta = info.get("extmetadata", {})
                yield {
                    "source": "wikimedia_commons",
                    "title": page.get("title", ""),
                    "image_url": info.get("thumburl") or info.get("url", ""),
                    "landing_url": info.get("descriptionurl", ""),
                    "creator": strip_html(meta.get("Artist", {}).get("value", "")),
                    "license": meta.get("LicenseShortName", {}).get("value", ""),
                    "license_url": meta.get("LicenseUrl", {}).get("value", ""),
                }
            if "continue" not in data:
                break
            cont = {k: v for k, v in data["continue"].items() if k != "continue"}
        if d < depth:
            params = {"action": "query", "format": "json", "list": "categorymembers", "cmtitle": f"Category:{cat}",
                      "cmtype": "subcat", "cmlimit": "100"}
            data = http_json(f"{api}?{urllib.parse.urlencode(params)}")
            time.sleep(delay)
            for sub in data.get("query", {}).get("categorymembers", []):
                queue.append((sub["title"].removeprefix("Category:"), d + 1))


def openverse_candidates(query: str, pages: int, delay: float):
    for page in range(1, pages + 1):
        params = {"q": query, "license": "by,by-sa,cc0,pdm", "page_size": "20", "page": str(page), "mature": "false"}
        try:
            data = http_json(f"https://api.openverse.org/v1/images/?{urllib.parse.urlencode(params)}")
        except urllib.error.HTTPError as e:
            print(f"  openverse stopped at page {page}: HTTP {e.code}")
            return
        time.sleep(delay)
        for r in data.get("results", []):
            lic = (r.get("license") or "").lower()
            yield {
                "source": f"openverse/{r.get('source', '')}",
                "title": r.get("title") or "",
                "image_url": r.get("url", ""),
                "landing_url": r.get("foreign_landing_url", ""),
                "creator": r.get("creator") or "",
                "license": f"{lic} {r.get('license_version') or ''}".strip(),
                "license_url": r.get("license_url", ""),
            }
        if page >= (data.get("page_count") or 0):
            return


def license_ok(lic: str) -> bool:
    norm = lic.strip().lower().replace("cc-", "cc ").replace("_", " ")
    norm = re.sub(r"\s+", " ", norm)
    return bool(LICENSE_OK.match(norm))


def dhash(img: Image.Image) -> str:
    g = img.convert("L").resize((9, 8), Image.Resampling.LANCZOS)
    px = list(g.getdata())
    bits = "".join("1" if px[r * 9 + c] > px[r * 9 + c + 1] else "0" for r in range(8) for c in range(8))
    return f"{int(bits, 2):016x}"


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--out", default="ml/data/web_food")
    p.add_argument("--max-per-class", type=int, default=150)
    p.add_argument("--classes", nargs="*", default=list(DISHES))
    p.add_argument("--openverse-pages", type=int, default=6)
    p.add_argument("--delay", type=float, default=3.0, help="seconds between API calls")
    args = p.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    meta_path = out / "metadata.csv"
    fields = ["file", "class", "source", "title", "creator", "license", "license_url", "landing_url", "image_url", "dhash"]
    rows: list[dict] = []
    if meta_path.exists():
        with meta_path.open(encoding="utf-8", newline="") as f:
            rows = list(csv.DictReader(f))
    seen_urls = {r["image_url"] for r in rows}
    seen_hash = {r["dhash"] for r in rows}

    for cls in args.classes:
        cats, queries = DISHES[cls]
        cls_dir = out / cls
        cls_dir.mkdir(exist_ok=True)
        have = sum(1 for r in rows if r["class"] == cls and (out / r["file"]).exists())
        print(f"\n== {cls}: {have} already")

        def candidates():
            for c in cats:
                yield from commons_candidates(c.replace(" ", "_"), depth=2, delay=args.delay)
            for q in queries:
                yield from openverse_candidates(q, args.openverse_pages, args.delay)

        skipped_license = 0
        for cand in candidates():
            if have >= args.max_per_class:
                break
            url = cand["image_url"]
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            if not license_ok(cand["license"]):
                skipped_license += 1
                continue
            try:
                raw = http_bytes(url)
                img = Image.open(io.BytesIO(raw))
                img.load()
                img = img.convert("RGB")
            except (urllib.error.URLError, UnidentifiedImageError, OSError, ValueError) as e:
                print(f"  skip (download/decode): {e}")
                continue
            time.sleep(0.5)
            if min(img.size) < 160:
                continue
            h = dhash(img)
            if h in seen_hash:
                continue
            seen_hash.add(h)
            img.thumbnail((MAX_SIDE, MAX_SIDE))
            name = f"{cls}/{hashlib.sha1(url.encode()).hexdigest()[:12]}.jpg"
            img.save(out / name, "JPEG", quality=90)
            rows.append({**{k: cand.get(k, "") for k in fields}, "file": name, "class": cls, "dhash": h})
            have += 1
            if have % 10 == 0:
                print(f"  {cls}: {have}")
                with meta_path.open("w", encoding="utf-8", newline="") as f:
                    w = csv.DictWriter(f, fieldnames=fields)
                    w.writeheader()
                    w.writerows(rows)
        print(f"  {cls}: {have} images (skipped {skipped_license} with non-commercial/unknown license)")
        with meta_path.open("w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fields)
            w.writeheader()
            w.writerows(rows)

    print("\nPer class:")
    for cls in args.classes:
        n = sum(1 for r in rows if r["class"] == cls and (out / r["file"]).exists())
        print(f"  {cls:<16} {n}")
    print(f"\nMetadata: {meta_path}")


if __name__ == "__main__":
    main()
