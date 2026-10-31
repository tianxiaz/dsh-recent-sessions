#!/usr/bin/env python3
"""Render docs/preview-desktop-light.png: a desktop window mock (demo data).

Left column = the sidebar with the Recent sessions section, center = a clean
conversation, so the social card can show the plugin in its real context.
"""
from PIL import Image, ImageDraw, ImageFont

FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
FONT_BOLD = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
SC, S = 2, 2

def f(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size * S, index=SC)

C = dict(bg='#f4f5f7', panel='#ffffff', side='#f7f8fa', border='#e3e6ea', divider='#eceff3',
         text='#17191c', sec='#4b5563', ter='#8a939e', dim='#a6aeb8',
         accent='#2563eb', warn='#b7791f', ok='#1f9d55', idle='#9aa3ad', gold='#b7791f',
         bubble='#f1f3f6', side2='#eef1f5')

W, H = 1200, 800
img = Image.new('RGB', (W * S, H * S), '#e9ecf0')
d = ImageDraw.Draw(img)

def rr(x, y, w, h, r, fill=None, outline=None, width=1):
    box = [x * S, y * S, (x + w) * S, (y + h) * S]
    if fill is None and outline is None:
        return
    if outline is None:
        d.rounded_rectangle(box, radius=r * S, fill=fill)
    else:
        d.rounded_rectangle(box, radius=r * S, fill=fill, outline=outline, width=int(width * S))

def tx(x, y, s, size=13, color=None, bold=False, anchor='la'):
    d.text((x * S, y * S), s, font=f(size, bold), fill=color or C['text'], anchor=anchor)

def ln(pts, color, width=1):
    d.line([(x * S, y * S) for x, y in pts], fill=color, width=int(width * S), joint='curve')

def dot(x, y, r, color):
    d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=color)

def ring(x, y, r, color, width=1.2):
    d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], outline=color, width=int(width * S))

def star(cx, cy, r, color):
    import math
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rad = r if i % 2 == 0 else r * 0.45
        pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
    d.polygon([(x * S, y * S) for x, y in pts], fill=color)

def g_search(x, y, c):
    ring(x, y, 4.2, c, 1.4); ln([(x + 3, y + 3), (x + 6, y + 6)], c, 1.4)

def g_chev(x, y, c):
    ln([(x - 4.5, y - 1.6), (x, y - 5.4), (x + 4.5, y - 1.6)], c, 1.4)
    ln([(x - 4.5, y + 1.6), (x, y + 5.4), (x + 4.5, y + 1.6)], c, 1.4)

def g_open(x, y, c):
    ln([(x + 1, y - 4.4), (x + 5, y - 4.4), (x + 5, y - 0.4)], c, 1.3)
    ln([(x + 4.8, y - 4.2), (x - 1.2, y + 1.8)], c, 1.3)
    ln([(x - 5, y - 1), (x - 5, y + 5), (x + 1, y + 5)], c, 1.3)

def g_folder(x, y, c):
    rr(x - 5.2, y - 3.4, 10.4, 7.4, 1.6, outline=c, width=1.2)
    ln([(x - 5.2, y - 1.4), (x - 2.4, y - 1.4), (x - 1.4, y - 3.4)], c, 1.2)

def g_star(x, y, c): star(x, y, 5.4, c)
def g_warn(x, y, c):
    ln([(x, y - 5), (x + 5, y + 4), (x - 5, y + 4), (x, y - 5)], c, 1.3)
    ln([(x, y - 1.6), (x, y + 1.2)], c, 1.3); dot(x, y + 3, 0.8, c)

def g_play(x, y, c):
    ring(x, y, 5, c, 1.2)
    d.polygon([((x - 1.4) * S, (y - 2.6) * S), ((x - 1.4) * S, (y + 2.6) * S), ((x + 2.6) * S, y * S)], fill=c)

def g_check(x, y, c):
    ring(x, y, 5, c, 1.2); ln([(x - 2.2, y + 0.2), (x - 0.4, y + 2), (x + 3, y - 2)], c, 1.4)

def g_clock(x, y, c):
    ring(x, y, 5, c, 1.2); ln([(x, y - 2.6), (x, y), (x + 2.2, y + 1.4)], c, 1.2)

def g_plus(x, y, c):
    ln([(x - 4, y), (x + 4, y)], c, 1.3); ln([(x, y - 4), (x, y + 4)], c, 1.3)

def g_panel(x, y, c):
    rr(x - 5, y - 4.4, 10, 8.8, 1.6, outline=c, width=1.2); ln([(x - 1.2, y - 4.4), (x - 1.2, y + 4.4)], c, 1.2)

def g_sparkle(x, y, c):
    ln([(x, y - 5), (x, y + 5)], c, 1.3); ln([(x - 5, y), (x + 5, y)], c, 1.3)
    ln([(x - 2.6, y - 2.6), (x + 2.6, y + 2.6)], c, 1.1); ln([(x - 2.6, y + 2.6), (x + 2.6, y - 2.6)], c, 1.1)

def g_loop(x, y, c):
    ring(x, y, 5, c, 1.2); ln([(x, y - 3.4), (x, y), (x + 2.4, y + 0.6)], c, 1.1)

def g_grid(x, y, c):
    for dx, dy in ((-2.6, -2.6), (1.6, -2.6), (-2.6, 1.6)):
        rr(x + dx - 1.6, y + dy - 1.6, 3.4, 3.4, 0.8, outline=c, width=1.1)
    g_plus(x + 3.2, y + 3.2, c)

def g_send(x, y, c):
    d.polygon([((x - 5) * S, (y - 5) * S), ((x + 5) * S, y * S), ((x - 5) * S, (y + 5) * S), ((x - 2.5) * S, y * S)], fill=c)

# window
rr(0, 0, W, H, 16, fill=C['panel'], outline=C['border'])
# sidebar
rr(0, 0, 300, H, 16, fill=C['side'])
d.rectangle([0, 0, 300 * S, H * S], fill=C['side'])
ln([(300, 0), (300, H)], C['border'], 1)
x, y, w = 14, 18, 272

rr(x, y, 22, 22, 6, fill=C['accent'])
ln([(x + 4, y + 13), (x + 8, y + 10), (x + 12, y + 14), (x + 18, y + 7)], '#ffffff', 1.5)
tx(x + 30, y + 0, 'deepseek', 14, C['text'], bold=True)
tx(x + 100, y + 2, 'HARNESS', 8, C['ter'])
g_panel(x + w - 6, y + 11, C['ter'])
y += 38
rr(x, y, w, 34, 8, fill=C['side2'], outline=C['border'])
g_plus(x + w / 2 - 24, y + 17, C['sec']); tx(x + w / 2 - 10, y + 8, '新会话', 12.5, C['text'])
y += 46
for label, gl in (('插件', g_sparkle), ('自动化任务', g_loop)):
    gl(x + 12, y + 15, C['ter']); tx(x + 28, y + 6, label, 12.5, C['text']); y += 32
g_grid(x + 12, y + 15, C['ter']); tx(x + 28, y + 6, '更多', 12.5, C['sec']); y += 38

# our section
sec_top = y
tx(x, y + 8, '最近会话', 13.5, C['ter']); tx(x + 62, y + 11, '3', 9.5, C['ter'])
g_search(x + w - 72, y + 17, C['sec']); g_chev(x + w - 42, y + 17, C['sec']); g_open(x + w - 12, y + 17, C['sec'])
y += 34
def cat(icon, name, count, rows, color=None):
    global y
    icon(x + 9, y + 15, color or C['ter'])
    tx(x + 24, y + 6, name, 13.5, C['text'])
    tx(x + w - 4, y + 10, str(count), 9.5, C['ter'], anchor='ra')
    y += 32
    for dc, title, when, fav in rows:
        dot(x + 12, y + 15, 3.8, dc)
        tx(x + 27, y + 5, title, 12.5, C['sec'])
        tx(x + w - 20, y + 9, when, 9.5, C['ter'], anchor='ra')
        if fav:
            star(x + w - 8, y + 15, 4.2, C['gold'])
        y += 30
    y += 4

cat(g_star, '收藏', 1, [(C['idle'], '客户方案评审 · 终稿', '2 小时前', True)])
cat(g_warn, '等待你的回应', 1, [(C['warn'], '登录超时排查', '刚刚', False)], C['warn'])
cat(g_play, '运行中', 1, [(C['accent'], '重构导出模块', '5 分钟前', False)], C['accent'])
cat(g_check, '完成未读', 1, [(C['ok'], '周报生成脚本', '1 小时前', False)], C['ok'])
cat(g_clock, '最近活跃', 3, [(C['idle'], '产品需求评审', '3 小时前', False),
                            (C['idle'], '数据看板口径对齐', '昨天', False)])
tx(x + 27, y + 5, '展开其余 1 个会话', 11.5, C['ter']); y += 28

ln([(x, y + 6), (x + w, y + 6)], C['border'], 1); y += 12
tx(x, y + 8, '工作区', 13.5, C['ter'])
g_search(x + w - 72, y + 17, C['ter']); g_chev(x + w - 42, y + 17, C['ter']); g_plus(x + w - 12, y + 17, C['ter'])
y += 34
for group, rows in (('产品设计', [('交互稿走查', '3 天前')]),):
    g_folder(x + 9, y + 15, C['ter']); tx(x + 24, y + 6, group, 13.5, C['sec']); y += 32
    for title, when in rows:
        dot(x + 12, y + 15, 3.2, C['dim']); tx(x + 27, y + 5, title, 12.5, C['dim'])
        tx(x + w - 4, y + 9, when, 9.5, C['dim'], anchor='ra'); y += 30

# soft highlight around our section
rr(x - 4, sec_top - 4, w + 6, (y - 34) - sec_top + 6, 10, outline='#c7d7f5', width=1.5)

# center column: header + conversation + composer
cx0, cw = 300, W - 300
hh = 74
ln([(300, hh), (W, hh)], C['divider'], 1)
tx(cx0 + 28, 18, '最近会话快捷分组', 14, C['text'], bold=True)
tx(cx0 + 28 + 150, 19, '创造模式', 11, C['ter'])
tx(cx0 + 28, 48, '对话', 12, C['text'])
tx(cx0 + 72, 48, '轨迹', 12, C['ter'])
ln([(cx0 + 28, hh - 1), (cx0 + 60, hh - 1)], C['accent'], 2)

# bubbles
bx, bw = cx0 + 60, cw - 120
uy = hh + 40
rr(bx + bw - 380, uy, 380, 44, 12, fill=C['bubble'])
tx(bx + bw - 366, uy + 12, '帮我把这周的会话按优先级整理一下', 12.5, C['text'])
ay = uy + 68
tx(bx, ay, '好的，我先按状态分组，再排优先级：', 12.5, C['sec'])
items = [('等待授权 / 回答', '登录超时排查', C['warn']),
         ('运行中', '重构导出模块', C['accent']),
         ('完成未读', '周报生成脚本', C['ok']),
         ('最近活跃', '产品需求评审 · 数据看板口径对齐', C['idle'])]
ay += 26
for label, detail, color in items:
    dot(bx + 4, ay + 8, 3.6, color)
    tx(bx + 16, ay, label, 12.5, C['text'])
    tx(bx + 120, ay, detail, 12.5, C['ter'])
    ay += 26
ay += 10
tx(bx, ay, '需要我先展开「等待授权」那一组吗？', 12.5, C['sec'])
ay += 40
tx(bx, ay, '这就把这 4 组分别展开：等待授权 1 · 运行中 1 · 完成未读 1 · 最近活跃 3。', 12.5, C['ter'])

# composer
comp_y = H - 92
rr(cx0 + 28, comp_y, cw - 56, 56, 12, fill=C['panel'], outline=C['border'])
tx(cx0 + 44, comp_y + 17, '发消息或创建任务，/ 调用指令，@ 文件或对话', 12, C['ter'])
g_plus(cx0 + 44, comp_y + 39, C['sec'])
tx(cx0 + 64, comp_y + 30, '工作区内修改', 11, C['sec'])
g_send(cx0 + cw - 76, comp_y + 30, C['accent'])

img.resize((W, H), Image.LANCZOS).save('docs/preview-desktop-light.png')
print('wrote docs/preview-desktop-light.png', (W, H))
