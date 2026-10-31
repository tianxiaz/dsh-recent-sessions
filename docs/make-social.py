#!/usr/bin/env python3
"""Render docs/social-preview.png (1280x640) for GitHub "Social preview"."""
from PIL import Image, ImageDraw, ImageFont

FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
FONT_BOLD = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
SC = 2
S = 2

def f(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size * S, index=SC)

W, H = 1280, 640
bg = '#f6f7f9'
ink = '#17191c'
muted = '#4b5563'
faint = '#8a939e'
accent = '#1f5fd0'

img = Image.new('RGB', (W * S, H * S), bg)
d = ImageDraw.Draw(img)

# left copy
x = 72
y = 96
d.rounded_rectangle([x * S, y * S, (x + 236) * S, (y + 34) * S], radius=17 * S, fill='#eef1f5')
d.text(((x + 16) * S, (y + 8) * S), 'DeepSeek Harness 插件', font=f(14), fill=muted)
y += 62
d.text((x * S, y * S), '最近会话', font=f(52, True), fill=ink)
y += 78
for line in ('像官方「工作区」一样长在左侧栏里，', '一屏直达该处理、常回访的会话。'):
    d.text((x * S, y * S), line, font=f(22), fill=muted)
    y += 34
y += 26
for item in ('每个会话行 ☆ 一点即收藏', '整段一键收起到一行', '标题右侧就地搜索', '官方会话区原样保留'):
    d.ellipse([x * S, (y + 9) * S, (x + 8) * S, (y + 17) * S], fill=accent)
    d.text(((x + 22) * S, y * S), item, font=f(17), fill=muted)
    y += 32
y = H - 70
d.text((x * S, y * S), 'github.com/tianxiaz/dsh-recent-sessions', font=f(14), fill=faint)

# right: a legible crop of the sidebar (top part), rounded
shot = Image.open('docs/preview-light.png').convert('RGB')
crop = shot.crop((14, 14, 372, 712))          # sidebar panel only, top part
target_h = 620
ratio = target_h / crop.height
crop = crop.resize((int(crop.width * ratio), target_h), Image.LANCZOS)
mask = Image.new('L', crop.size, 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, crop.width - 1, crop.height - 1], radius=10 * S, fill=255)
sx = W - crop.width - 96
sy = (H - target_h) // 2
# soft shadow + border
d.rounded_rectangle([(sx - 3) * S, (sy - 3) * S, (sx + crop.width + 3) * S, (sy + target_h + 3) * S],
                    radius=13 * S, fill='#eceff3')
d.rounded_rectangle([(sx - 1) * S, (sy - 1) * S, (sx + crop.width + 1) * S, (sy + target_h + 1) * S],
                    radius=11 * S, outline='#e3e6ea', width=1 * S)
img.paste(crop, (sx * S, sy * S), mask)

img.resize((W, H), Image.LANCZOS).save('docs/social-preview.png')
print('wrote docs/social-preview.png', (W, H))
