#!/usr/bin/env python3
"""Render docs/xiaohongshu-cover.png (1080x1440, 3:4) for Xiaohongshu."""
from PIL import Image, ImageDraw, ImageFont

FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
BOLD = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
SC, S = 2, 2

def f(size, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, size * S, index=SC)

W, H = 1080, 1440
bg = '#f6f7f9'
ink = '#14171b'
muted = '#4b5563'
faint = '#8a939e'
accent = '#1f5fd0'
panel = '#ffffff'
border = '#e2e5ea'

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

def tx(x, y, s, size=30, color=None, bold=False, anchor='la'):
    d.text((x * S, y * S), s, font=f(size, bold), fill=color or ink, anchor=anchor)

x, y = 72, 96
rr(x, y, 300, 52, 26, fill='#eef1f5')
tx(x + 24, y + 12, 'DeepSeek Harness 插件', 26, muted)
y += 96
tx(x, y, '最近会话', 96, ink, bold=True)
y += 130
tx(x, y, '像官方「工作区」一样', 40, muted)
y += 58
tx(x, y, '长在左侧栏里的分区', 40, muted)
y += 96
for line in ('收藏 / 运行中 / 等待你回应 / 完成未读 / 最近活跃', '每个会话行 ☆ 一点即收藏，置顶按分类生效', '可收起到一行，标题右侧就地搜索'):
    rr(x, y + 10, 10, 10, 5, fill=accent)
    tx(x + 26, y, line, 28, muted)
    y += 52

# screenshot, rounded top corners, bleeding to the bottom
shot = Image.open('docs/preview-desktop-light.png').convert('RGB')
target_w = W
shot = shot.resize((target_w * S, int(shot.height * target_w / shot.width) * S), Image.LANCZOS)
sy = H - shot.height // S - 40
mask = Image.new('L', shot.size, 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, shot.width - 1, shot.height - 1], radius=18 * S, fill=255)
rr(40, sy - 6, W - 80, shot.height // S + 12, 20, fill='#e9edf2')
img.paste(shot, (0, sy * S), mask)

img.resize((W, H), Image.LANCZOS).save('docs/xiaohongshu-cover.png')
print('wrote docs/xiaohongshu-cover.png', (W, H))
