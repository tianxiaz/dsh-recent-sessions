#!/usr/bin/env python3
"""Render the README preview illustration (demo data, no real sessions).

Draws a sidebar mock that mirrors the shipped Workspaces grid and writes
docs/preview-dark.png / docs/preview-light.png. Pure Pillow, no browser.
"""
from PIL import Image, ImageDraw, ImageFont

FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
FONT_BOLD = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
SC = 2  # face index of Noto Sans CJK SC
S = 2   # supersampling

def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT, int(size * S), index=SC)

THEMES = {
    'dark': dict(bg='#0a0c0f', panel='#14181d', panel2='#1b2027', border='#242b33', divider='#20262d',
                 text='#e8eaed', sec='#b6bec8', ter='#7f8a96', dim='#5d666f',
                 accent='#4b8bf5', warn='#e0a72c', ok='#2fbf71', idle='#6b7480', gold='#e8b04b',
                 callout='#11151a', callout_border='#2b333c', leader='#3a434d'),
    'light': dict(bg='#f4f5f7', panel='#ffffff', panel2='#f1f3f6', border='#e2e5ea', divider='#e6e9ee',
                  text='#17191c', sec='#4b5563', ter='#8a939e', dim='#a6aeb8',
                  accent='#2563eb', warn='#b7791f', ok='#1f9d55', idle='#9aa3ad', gold='#b7791f',
                  callout='#ffffff', callout_border='#e2e5ea', leader='#c9cfd6'),
}

class Canvas:
    def __init__(self, w, h, c, transparent=False):
        self.c = c
        self.w, self.h = w, h
        self.img = Image.new('RGBA' if transparent else 'RGB', (w * S, h * S), (0, 0, 0, 0) if transparent else c['bg'])
        self.d = ImageDraw.Draw(self.img)

    def rrect(self, x, y, w, h, r, fill=None, outline=None, width=1):
        if fill is None and outline is None:
            return
        box = [x * S, y * S, (x + w) * S, (y + h) * S]
        if outline is None:
            self.d.rounded_rectangle(box, radius=r * S, fill=fill)
        else:
            self.d.rounded_rectangle(box, radius=r * S, fill=fill, outline=outline, width=int(width * S))

    def rect(self, x, y, w, h, fill):
        self.d.rectangle([x * S, y * S, (x + w) * S, (y + h) * S], fill=fill)

    def text(self, x, y, s, size=13, color=None, bold=False, anchor='la'):
        self.d.text((x * S, y * S), s, font=font(size, bold), fill=color or self.c['text'], anchor=anchor)

    def line(self, pts, color, width=1, dash=None):
        if dash:
            for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
                total = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
                step = dash[0] + dash[1]
                t = 0.0
                while t < total:
                    a, b = t / total, min(1.0, (t + dash[0]) / total)
                    self.d.line([(x1 + (x2 - x1) * a) * S, (y1 + (y2 - y1) * a) * S,
                                 (x1 + (x2 - x1) * b) * S, (y1 + (y2 - y1) * b) * S],
                                fill=color, width=int(width * S))
                    t += step
            return
        self.d.line([(x * S, y * S) for x, y in pts], fill=color, width=int(width * S), joint='curve')

    def dot(self, x, y, r, color):
        self.d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=color)

    def circle(self, x, y, r, fill=None, outline=None, width=1):
        self.d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=fill, outline=outline, width=int(width * S))

    def star(self, cx, cy, r, color, filled=True):
        import math
        pts = []
        for i in range(10):
            ang = -math.pi / 2 + i * math.pi / 5
            rad = r if i % 2 == 0 else r * 0.45
            pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
        if filled:
            self.d.polygon([(x * S, y * S) for x, y in pts], fill=color)
        else:
            self.d.polygon([(x * S, y * S) for x, y in pts], outline=color, width=int(1 * S))

    def save(self, path, w, h):
        self.img.resize((w * S, h * S), Image.LANCZOS).save(path)
        self.img.resize((w, h), Image.LANCZOS).save(path.replace('@2x', ''))

def glyph_search(cv, x, y, color):
    cv.circle(x, y, 4.2, outline=color, width=1.4)
    cv.line([(x + 3, y + 3), (x + 6.2, y + 6.2)], color, 1.4)

def glyph_chevrons(cv, x, y, color):
    cv.line([(x - 4.5, y - 1.6), (x, y - 5.6), (x + 4.5, y - 1.6)], color, 1.4)
    cv.line([(x - 4.5, y + 1.6), (x, y + 5.6), (x + 4.5, y + 1.6)], color, 1.4)

def glyph_open(cv, x, y, color):
    cv.line([(x + 1, y - 4.4), (x + 5.2, y - 4.4), (x + 5.2, y - 0.2)], color, 1.3)
    cv.line([(x + 5, y - 4.2), (x - 1.2, y + 2)], color, 1.3)
    cv.line([(x - 5, y - 1), (x - 5, y + 5), (x + 1, y + 5)], color, 1.3)

def glyph_star(cv, x, y, color):
    cv.star(x, y, 5.6, color, filled=True)

def glyph_warn(cv, x, y, color):
    cv.line([(x, y - 5), (x + 5.2, y + 4.2), (x - 5.2, y + 4.2), (x, y - 5)], color, 1.3)
    cv.line([(x, y - 1.6), (x, y + 1.2)], color, 1.3)
    cv.dot(x, y + 3, 0.8, color)

def glyph_play(cv, x, y, color):
    cv.circle(x, y, 5, outline=color, width=1.2)
    cv.d.polygon([((x - 1.4) * S, (y - 2.6) * S), ((x - 1.4) * S, (y + 2.6) * S), ((x + 2.6) * S, y * S)], fill=color)

def glyph_check(cv, x, y, color):
    cv.circle(x, y, 5, outline=color, width=1.2)
    cv.line([(x - 2.2, y + 0.2), (x - 0.4, y + 2), (x + 3, y - 2)], color, 1.4)

def glyph_clock(cv, x, y, color):
    cv.circle(x, y, 5, outline=color, width=1.2)
    cv.line([(x, y - 2.6), (x, y), (x + 2.2, y + 1.4)], color, 1.2)

def glyph_folder(cv, x, y, color):
    cv.d.rounded_rectangle([(x - 5.4) * S, (y - 3.6) * S, (x + 5.4) * S, (y + 4.2) * S], radius=1.6 * S, outline=color, width=int(1.2 * S))
    cv.line([(x - 5.4, y - 1.4), (x - 2.4, y - 1.4), (x - 1.4, y - 3.4)], color, 1.2)

def glyph_panel(cv, x, y, color):
    cv.d.rounded_rectangle([(x - 5) * S, (y - 4.4) * S, (x + 5) * S, (y + 4.4) * S], radius=1.6 * S, outline=color, width=int(1.2 * S))
    cv.line([(x - 1.2, y - 4.4), (x - 1.2, y + 4.4)], color, 1.2)

def glyph_plus(cv, x, y, color):
    cv.line([(x - 4, y), (x + 4, y)], color, 1.3)
    cv.line([(x, y - 4), (x, y + 4)], color, 1.3)

def glyph_grid(cv, x, y, color):
    for dx, dy in ((-2.6, -2.6), (1.6, -2.6), (-2.6, 1.6)):
        cv.d.rounded_rectangle([(x + dx - 1.6) * S, (y + dy - 1.6) * S, (x + dx + 1.8) * S, (y + dy + 1.8) * S],
                               radius=0.8 * S, outline=color, width=int(1.1 * S))
    glyph_plus(cv, x + 3.2, y + 3.2, color)

def glyph_sparkle(cv, x, y, color):
    cv.line([(x, y - 5), (x, y + 5)], color, 1.3)
    cv.line([(x - 5, y), (x + 5, y)], color, 1.3)
    cv.line([(x - 2.6, y - 2.6), (x + 2.6, y + 2.6)], color, 1.1)
    cv.line([(x - 2.6, y + 2.6), (x + 2.6, y - 2.6)], color, 1.1)

def glyph_loop(cv, x, y, color):
    cv.circle(x, y, 5, outline=color, width=1.2)
    cv.line([(x, y - 3.4), (x, y), (x + 2.4, y + 0.6)], color, 1.1)

def draw(theme):
    c = THEMES[theme]
    cv = Canvas(960, 900, c, transparent=True)
    x0, y0, W = 26, 26, 330
    inner = 14
    x = x0 + inner
    w = W - inner * 2
    y = y0 + 18

    # brand
    cv.rrect(x, y, 24, 24, 7, fill=c['accent'])
    cv.line([(x + 5, y + 14), (x + 9, y + 11), (x + 13, y + 15), (x + 19, y + 8)], '#ffffff', 1.6)
    cv.text(x + 32, y + 1, 'deepseek', 15, c['text'], bold=True)
    cv.text(x + 105, y + 3, 'HARNESS', 9, c['ter'])
    glyph_panel(cv, x + w - 8, y + 12, c['ter'])

    # new session
    y += 42
    cv.rrect(x, y, w, 36, 9, fill=c['panel2'], outline=c['border'])
    glyph_plus(cv, x + w / 2 - 26, y + 18, c['sec'])
    cv.text(x + w / 2 - 12, y + 9, '新会话', 13, c['text'])
    y += 52

    # panel rows
    for label, gl in (('插件', glyph_sparkle), ('自动化任务', glyph_loop)):
        cv.rrect(x, y, w, 32, 8)
        gl(cv, x + 14, y + 16, c['ter'])
        cv.text(x + 32, y + 7, label, 13, c['text'])
        y += 36
    cv.rrect(x, y, w, 32, 8)
    glyph_grid(cv, x + 14, y + 16, c['ter'])
    cv.text(x + 32, y + 7, '更多', 13, c['sec'])
    y += 44

    # section header
    header_y = y
    cv.text(x, y + 8, '最近会话', 14, c['ter'])
    cv.text(x + 66, y + 11, '3', 10, c['ter'])
    glyph_search(cv, x + w - 76, y + 18, c['sec'])
    glyph_chevrons(cv, x + w - 44, y + 18, c['sec'])
    glyph_open(cv, x + w - 12, y + 18, c['sec'])
    y += 38

    def category(icon, title, count, rows, icon_color=None):
        nonlocal y
        top = y
        icon(cv, x + 10, y + 17, icon_color or c['ter'])
        cv.text(x + 26, y + 7, title, 14, c['text'])
        cv.text(x + w - 6, y + 11, str(count), 10, c['ter'], anchor='ra')
        y += 34
        for dot_color, name, when, fav in rows:
            cv.dot(x + 14, y + 16, 4, dot_color)
            cv.text(x + 30, y + 6, name, 13, c['sec'])
            cv.text(x + w - 22, y + 10, when, 10, c['ter'], anchor='ra')
            if fav:
                cv.star(x + w - 8, y + 16, 4.6, c['gold'])
            y += 32
        y += 4
        return top

    fav_y = category(glyph_star, '收藏', 2, [
        (c['idle'], '客户方案评审 · 终稿', '2 小时前', True),
        (c['idle'], '多作者陪读方案调研', '昨天', True),
    ])
    pending_y = category(glyph_warn, '等待你的回应', 1, [
        (c['warn'], '登录超时排查', '刚刚', False),
    ], icon_color=c['warn'])
    running_y = category(glyph_play, '运行中', 1, [
        (c['accent'], '重构导出模块', '5 分钟前', False),
    ], icon_color=c['accent'])
    unread_y = category(glyph_check, '完成未读', 1, [
        (c['ok'], '周报生成脚本', '1 小时前', False),
    ], icon_color=c['ok'])
    recent_y = category(glyph_clock, '最近活跃', 5, [
        (c['idle'], '产品需求评审', '3 小时前', False),
        (c['idle'], '数据看板口径对齐', '昨天', False),
    ])
    cv.text(x + 30, y + 6, '展开其余 3 个会话', 12, c['ter'])
    y += 30

    # divider + official section
    cv.line([(x, y + 4), (x + w, y + 4)], c['divider'], 1)
    y += 12
    workspaces_y = y
    cv.text(x, y + 8, '工作区', 14, c['ter'])
    glyph_search(cv, x + w - 76, y + 18, c['ter'])
    glyph_chevrons(cv, x + w - 44, y + 18, c['ter'])
    glyph_plus(cv, x + w - 12, y + 18, c['ter'])
    y += 38

    cv.rrect(x, y, w, 34, 8)
    glyph_folder(cv, x + 10, y + 17, c['ter'])
    cv.text(x + 26, y + 7, '产品设计', 14, c['sec'])
    y += 34
    for name, when in (('交互稿走查', '3 天前'), ('埋点方案补充', '4 天前')):
        cv.dot(x + 14, y + 16, 3.4, c['dim'])
        cv.text(x + 30, y + 6, name, 13, c['dim'])
        cv.text(x + w - 6, y + 10, when, 10, c['dim'], anchor='ra')
        y += 32

    sidebar_h = (y + 14) - y0

    # compose: background + panel, then the content layer, then callouts
    base = Canvas(960, 900, c)
    base.rrect(x0, y0, W, sidebar_h, 16, fill=c['panel'], outline=c['border'])
    base.img = Image.alpha_composite(base.img.convert('RGBA'), cv.img)
    base.d = ImageDraw.Draw(base.img)
    cv = base

    # callouts
    cx = x0 + W + 46
    def callout(num, target_y, lines):
        box_h = 22 + 19 * len(lines)
        cv.rrect(cx, target_y - box_h / 2, 470, box_h, 10, fill=c['callout'], outline=c['callout_border'])
        cv.circle(cx + 20, target_y, 10, fill=c['accent'])
        cv.text(cx + 20, target_y - 7, str(num), 11, '#ffffff', bold=True, anchor='ma')
        for i, line in enumerate(lines):
            cv.text(cx + 38, target_y - box_h / 2 + 10 + i * 19, line, 12, c['sec'])
        cv.line([(cx - 2, target_y), (x0 + W + 6, target_y)], c['leader'], 1, dash=(4, 4))

    callout(1, header_y + 18, ['与「工作区」同一套网格与节奏', '整段可一键收起到一行，选择会被记住'])
    callout(2, fav_y + 51, ['每个会话行都有 ☆：含官方列表，一点即收藏'])
    callout(3, pending_y + 51, ['黄 = 等待授权 / 回答，蓝 = 运行中，绿 = 完成未读'])
    callout(4, workspaces_y + 18, ['官方会话区原样保留：搜索 / 菜单 / 拖拽排序'])

    # footer
    cv.text(x0, y0 + sidebar_h + 16, '示意图 · 演示数据，非真实会话', 11, c['ter'])
    out = f'docs/preview-{theme}.png'
    cv.img.resize((cv.w, cv.h), Image.LANCZOS).convert('RGB').save(out)
    print('wrote', out, (cv.w, cv.h))

for t in ('dark', 'light'):
    draw(t)
