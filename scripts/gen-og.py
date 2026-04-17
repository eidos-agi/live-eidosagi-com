# Hero OG for live.eidosagi.com — live-event edition.
# Workshop palette, three-lane race graphic, live-event badge.
# Run:
#   python3 scripts/gen-og.py
from PIL import Image, ImageDraw, ImageFont
import random, os

OUT = "public/og.png"
W, H = 1200, 630
BG = (22, 18, 16); SURFACE = (30, 26, 23); TEXT = (220, 213, 203)
MUTED = (139, 129, 121); PRIMARY = (196, 147, 90); SAGE = (122, 140, 114)
DANGER = (196, 105, 79)

img = Image.new("RGB", (W, H), BG); draw = ImageDraw.Draw(img)
random.seed(17)
for _ in range(3500):
    x = random.randint(0, W-1); y = random.randint(0, H-1); a = random.randint(0, 18)
    r,g,b = BG; draw.point((x,y), (min(255,r+a), min(255,g+a), min(255,b+a)))

def load(paths, size):
    for p in paths:
        try: return ImageFont.truetype(p, size)
        except Exception: pass
    return ImageFont.load_default()

F_HEAD = load(["/System/Library/Fonts/Supplemental/Futura.ttc","/System/Library/Fonts/HelveticaNeue.ttc"], 96)
F_SUB  = load(["/System/Library/Fonts/Supplemental/Futura.ttc","/System/Library/Fonts/HelveticaNeue.ttc"], 32)
F_MONO = load(["/System/Library/Fonts/Monaco.ttf","/System/Library/Fonts/Menlo.ttc"], 22)
F_MONO_BIG = load(["/System/Library/Fonts/Monaco.ttf","/System/Library/Fonts/Menlo.ttc"], 40)

def lane(y, label, rate, fill_pct, is_leader=False):
    draw.rectangle([80, y, W-80, y+34], fill=SURFACE)
    end = 80 + int((W-160)*fill_pct)
    draw.rectangle([80, y, end, y+34], fill=PRIMARY if is_leader else SAGE)
    draw.rectangle([end-12, y+4, end+4, y+30], fill=(255,180,32))
    draw.text((80, y-30), label, font=F_MONO, fill=MUTED)
    draw.text((W-80, y-30), rate, font=F_MONO, fill=TEXT if is_leader else MUTED, anchor="rt")

lane(335, "H100  $2.49/hr", "126 tok/s  ·  $5.46/M tok", 0.95, is_leader=True)
lane(415, "A100  $0.78/hr", "47 tok/s  ·  $16.61/M tok", 0.40)
lane(495, "A6000 $0.35/hr", "82 tok/s  ·  $1.19/M tok", 0.65)

draw.text((80, 90), "CRUCIBLE", font=F_HEAD, fill=TEXT)
draw.text((80, 195), "Three GPUs. One prompt. Real tokens, real time.", font=F_SUB, fill=PRIMARY)
draw.text((80, 240), "live.eidosagi.com", font=F_MONO_BIG, fill=MUTED)

draw.ellipse([W-260, 102, W-236, 126], fill=DANGER)
draw.text((W-226, 99), "LIVE EVENT — APR 17", font=F_MONO, fill=DANGER)
draw.text((W-226, 130), "self-improving AI", font=F_MONO, fill=MUTED)
draw.text((W-226, 158), "moves to 90% cheaper silicon", font=F_MONO, fill=TEXT)
draw.text((W-226, 186), "without losing intelligence.", font=F_MONO, fill=TEXT)

draw.text((80, H-40), "AN EIDOS AGI OPEN-SOURCE EVENT", font=F_MONO, fill=MUTED)
draw.text((W-80, H-40), "watch + chat + follow on LinkedIn", font=F_MONO, fill=MUTED, anchor="rt")

img.save(OUT, "PNG", optimize=True)
print("wrote", OUT, os.path.getsize(OUT), "bytes")
