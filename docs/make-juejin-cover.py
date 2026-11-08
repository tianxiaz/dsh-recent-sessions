#!/usr/bin/env python3
"""Render docs/juejin-cover.png (1280x720, 16:9) for the Juejin article cover."""
from PIL import Image, ImageDraw, ImageFont

FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
BOLD = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
SC, S = 2, 2

def f(size, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, size * S, index=SC)

W, H = 1280, 720
bg = '#f6f7f9'
ink = '#14171b'
muted = '#4b5563'
accent = '#1f5fd0'

img = Image.new('RGB', (W * S, H * S), bg)
d = ImageDraw.Draw(img)

def rr(x, y, w, h, r, fill=None, outline=None, width=1):
    box = [x * S, y * S, (x + w) * S, (y + h) * S]
    if fill is None and outline is None:
        return
    if outline is None:
        d.rounded_rectangle(box, radius=r * S, fill=fill)
    else:
        d.rounded_rectangle(box, radius=r * S, fill=fill, outline=outline, width=int(width * S))

def tx(x, y, s, size=26, color=None, bold=False):
    d.text((x * S, y * S), s, font=f(size, bold), fill=color or ink)

x, y = 56, 32
rr(x, y, 236, 36, 18, fill='#eef1f5')
tx(x + 16, y + 7, 'DeepSeek Harness', 21, muted)
y += 56
tx(x, y, '最近会话', 58, ink, bold=True)
y += 76
tx(x, y, '一次接管官方侧栏外壳的实践', 26, muted)
y += 38
tx(x, y, '36 / 34 / 32 / 28px 官方网格 · 五类会话 · 每行 ☆ 收藏', 20, '#6b7480')

# bottom: the desktop mock, cropped to the cover
shot = Image.open('docs/preview-desktop-light.png').convert('RGB')
target_w = W
shot = shot.resize((target_w * S, int(shot.height * target_w / shot.width) * S), Image.LANCZOS)
top = 246
crop_h = (H - top) * S
shot = shot.crop((0, 0, shot.width, min(shot.height, crop_h)))
mask = Image.new('L', shot.size, 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, shot.width - 1, shot.height - 1], radius=16 * S, fill=255)
img.paste(shot, (0, top * S), mask)

img.resize((W, H), Image.LANCZOS).save('docs/juejin-cover.png')
print('wrote docs/juejin-cover.png', (W, H))
