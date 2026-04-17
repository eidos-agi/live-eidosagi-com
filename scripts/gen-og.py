#!/usr/bin/env python3
"""
gen-og.py — Generate the OG / social share image for live.eidosagi.com.

Outputs:
  public/og.png            1200 x 630  typographic workshop cover
  public/apple-touch-icon.png  180 x 180 flame glyph on warm black
  public/favicon.ico       32 + 16 multi-res ICO (flame glyph)

Usage:
  python3 scripts/gen-og.py

Dependencies: Pillow, fontTools, brotli.
"""

from __future__ import annotations

import io
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

REPO_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = REPO_ROOT / "public"
FONTS_DIR = PUBLIC_DIR / "fonts"

# Workshop palette (mirrors src/app/globals.css)
BG = (22, 18, 16)           # #161210
TEXT = (220, 213, 203)      # #dcd5cb
MUTED = (139, 129, 121)     # #8b8179
PRIMARY = (196, 147, 90)    # #c4935a amber brass
SECONDARY = (122, 140, 114) # #7a8c72 sage


def woff2_to_ttf_bytes(woff2_path: Path) -> bytes:
    from fontTools.ttLib import TTFont
    font = TTFont(str(woff2_path))
    buf = io.BytesIO()
    font.flavor = None
    font.save(buf)
    return buf.getvalue()


def load_font(size: int) -> ImageFont.FreeTypeFont:
    p = FONTS_DIR / "SpaceGrotesk-latin.woff2"
    if p.exists():
        return ImageFont.truetype(io.BytesIO(woff2_to_ttf_bytes(p)), size=size)
    return ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size=size)


def add_grain(img: Image.Image, opacity: float = 0.055) -> Image.Image:
    w, h = img.size
    rnd = random.Random(42)
    noise = Image.new("L", (w // 2, h // 2))
    px = noise.load()
    assert px is not None
    for y in range(h // 2):
        for x in range(w // 2):
            px[x, y] = rnd.randint(0, 255)
    noise = noise.resize((w, h), Image.Resampling.BILINEAR)
    noise = noise.filter(ImageFilter.GaussianBlur(radius=0.6))
    overlay = Image.new("RGBA", (w, h), (255, 240, 220, 0))
    alpha = noise.point(lambda v: int(v * opacity))
    overlay.putalpha(alpha)
    base = img.convert("RGBA")
    return Image.alpha_composite(base, overlay).convert("RGB")


def draw_flame(draw: ImageDraw.ImageDraw, cx: float, cy: float, scale: float,
               color: tuple[int, int, int]) -> None:
    s = scale
    center = [
        (cx, cy - 1.6 * s),
        (cx + 0.35 * s, cy - 0.2 * s),
        (cx + 0.55 * s, cy + 0.6 * s),
        (cx, cy + 0.9 * s),
        (cx - 0.55 * s, cy + 0.6 * s),
        (cx - 0.35 * s, cy - 0.2 * s),
    ]
    draw.polygon(center, fill=color)
    left = [
        (cx - 0.7 * s, cy - 0.9 * s),
        (cx - 0.4 * s, cy - 0.1 * s),
        (cx - 0.25 * s, cy + 0.4 * s),
        (cx - 0.9 * s, cy + 0.5 * s),
        (cx - 0.95 * s, cy + 0.0 * s),
    ]
    draw.polygon(left, fill=color)
    right = [
        (cx + 0.7 * s, cy - 0.9 * s),
        (cx + 0.4 * s, cy - 0.1 * s),
        (cx + 0.25 * s, cy + 0.4 * s),
        (cx + 0.9 * s, cy + 0.5 * s),
        (cx + 0.95 * s, cy + 0.0 * s),
    ]
    draw.polygon(right, fill=color)


def generate_og() -> Path:
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    vignette = Image.new("L", (W, H), 0)
    vdraw = ImageDraw.Draw(vignette)
    vdraw.ellipse([(-200, -200), (W + 200, H + 200)], fill=60)
    vignette = vignette.filter(ImageFilter.GaussianBlur(radius=180))
    warm = Image.new("RGB", (W, H), (40, 28, 20))
    img = Image.composite(warm, img, vignette)
    draw = ImageDraw.Draw(img)

    draw.text((64, 56), "EIDOS AGI · LIVE",
              font=load_font(24), fill=MUTED, spacing=4)
    draw.rectangle([(64, 100), (140, 102)], fill=PRIMARY)

    draw.text((60, 140), "CRUCIBLE",
              font=load_font(200), fill=PRIMARY)

    draw.text((64, 380), "We put models in the fire.",
              font=load_font(52), fill=TEXT)

    draw.text((64, 470), "live.eidosagi.com",
              font=load_font(34), fill=SECONDARY)

    draw_flame(draw, cx=W - 140, cy=H - 140, scale=60, color=PRIMARY)

    draw.text((64, H - 64),
              "A public benchmark · three GPUs · one language model",
              font=load_font(20), fill=MUTED)

    img = add_grain(img, opacity=0.055)
    out_path = PUBLIC_DIR / "og.png"
    img.save(out_path, "PNG", optimize=True)
    return out_path


def generate_apple_touch_icon() -> Path:
    size = 180
    img = Image.new("RGB", (size, size), BG)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [(0, 0), (size, size)], radius=32, fill=255)

    warm = Image.new("RGB", (size, size), (46, 32, 22))
    glow = Image.new("L", (size, size), 0)
    ImageDraw.Draw(glow).ellipse(
        [(size * 0.1, size * 0.1), (size * 0.9, size * 0.9)], fill=120)
    glow = glow.filter(ImageFilter.GaussianBlur(radius=40))
    img = Image.composite(warm, img, glow)
    draw = ImageDraw.Draw(img)
    draw_flame(draw, cx=size / 2, cy=size / 2 + 8,
               scale=size * 0.28, color=PRIMARY)

    bg = Image.new("RGB", (size, size), BG)
    final = Image.composite(img, bg, mask)
    out = PUBLIC_DIR / "apple-touch-icon.png"
    final.save(out, "PNG", optimize=True)
    return out


def generate_favicon_ico() -> Path:
    images: list[Image.Image] = []
    for s in (32, 16):
        img = Image.new("RGBA", (s, s), BG + (255,))
        draw = ImageDraw.Draw(img)
        draw_flame(draw, cx=s / 2, cy=s / 2 + 1,
                   scale=s * 0.28, color=PRIMARY)
        images.append(img)
    out = PUBLIC_DIR / "favicon.ico"
    images[0].save(out, format="ICO", sizes=[(32, 32), (16, 16)],
                   append_images=images[1:])
    return out


def main() -> int:
    PUBLIC_DIR.mkdir(exist_ok=True)
    og = generate_og()
    apple = generate_apple_touch_icon()
    ico = generate_favicon_ico()
    print(f"wrote {og}  ({og.stat().st_size // 1024} KB)")
    print(f"wrote {apple}  ({apple.stat().st_size // 1024} KB)")
    print(f"wrote {ico}  ({ico.stat().st_size} B)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
