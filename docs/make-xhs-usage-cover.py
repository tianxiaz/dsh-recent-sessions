#!/usr/bin/env python3
"""Render docs/xiaohongshu-usage-cover.png (1080x1440) for the usage post."""
from PIL import Image, ImageDraw, ImageFont

FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
BOLD = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
SC, S = 2, 2

def f(size, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, size * S, index=SC)

W, H = 1080, 1440
bg, ink, muted, faint = '#f6f7f9', '#14171b', '#4b5563', '#8a939e'
accent, warm, ok = '#1f5fd0', '#b7791f', '#1f9d55'

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

def tx(x, y, s, size=30, color=None, bold=False):
    d.text((x * S, y * S), s, font=f(size, bold), fill=color or ink)

x, y = 72, 92
rr(x, y, 300, 52, 26, fill='#eef1f5')
tx(x + 22, y + 12, '用法 · 3 分钟', 26, muted)
y += 100
tx(x, y, '我把 DSH 侧栏', 84, ink, True)
y += 104
tx(x, y, '改成了「待办台」', 84, ink, True)
y += 120
tx(x, y, '周一早上，3 分钟清完积压', 32, muted)
y += 84

steps = [
    (warm, '① 先看黄点', '「等待你的回应」= 现在卡在你这里的'),
    (accent, '② 悬停点准星', '定位到它属于哪个工作区'),
    (ok, '③ 处理完归档', '绿点消掉，列表自己清空'),
]
for color, head, sub in steps:
    rr(x, y + 12, 12, 12, 6, fill=color)
    tx(x + 28, y, head, 34, ink, True)
    tx(x + 28, y + 42, sub, 26, muted)
    y += 104

# a short quote fills the middle
rr(72, y + 28, W - 144, 150, 18, fill='#eef1f5')
tx(104, y + 56, '把它当「待办台」用，', 32, ink, True)
tx(104, y + 104, '而不是当「会话垃圾桶」。', 32, ink, True)

# footer band: what you get at the end of the loop
rr(72, H - 236, W - 144, 132, 18, fill='#eef1f5')
tx(104, H - 208, '清完之后', 26, muted)
tx(104, H - 166, '黄点归零 · 绿点归档 · 只留下正在做的事', 30, ink, True)

tx(72, H - 66, 'dsh-recent-sessions · MIT', 22, faint)

img.resize((W, H), Image.LANCZOS).save('docs/xiaohongshu-usage-cover.png')
print('wrote docs/xiaohongshu-usage-cover.png', (W, H))
