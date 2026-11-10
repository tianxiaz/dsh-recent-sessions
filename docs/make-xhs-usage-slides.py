#!/usr/bin/env python3
"""Render the remaining 小红书 usage slides (1080x1440 each)."""
from PIL import Image, ImageDraw, ImageFont

FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
BOLD = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
SC, S = 2, 2

def f(size, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, size * S, index=SC)

W, H = 1080, 1440
BG, INK, MUTED, FAINT = '#f6f7f9', '#14171b', '#4b5563', '#8a939e'
ACCENT, WARN, OK, IDLE = '#1f5fd0', '#b7791f', '#1f9d55', '#9aa3ad'
CARD, BORDER = '#ffffff', '#e2e5ea'

class Slide:
    def __init__(self):
        self.img = Image.new('RGB', (W * S, H * S), BG)
        self.d = ImageDraw.Draw(self.img)

    def rr(self, x, y, w, h, r, fill=None, outline=None, width=1):
        box = [x * S, y * S, (x + w) * S, (y + h) * S]
        if fill is None and outline is None:
            return
        if outline is None:
            self.d.rounded_rectangle(box, radius=r * S, fill=fill)
        else:
            self.d.rounded_rectangle(box, radius=r * S, fill=fill, outline=outline, width=int(width * S))

    def tx(self, x, y, s, size=30, color=INK, bold=False):
        self.d.text((x * S, y * S), s, font=f(size, bold), fill=color)

    def dot(self, x, y, r, color):
        self.d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=color)

    def line(self, pts, color, width=2):
        self.d.line([(x * S, y * S) for x, y in pts], fill=color, width=int(width * S))

    def circle(self, x, y, r, color, width=2):
        self.d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], outline=color, width=int(width * S))

    def save(self, name):
        self.img.resize((W, H), Image.LANCZOS).save(f'docs/{name}')
        print('wrote docs/' + name)

def header(s, badge, title, sub):
    s.rr(72, 88, 300, 52, 26, fill='#eef1f5')
    s.tx(94, 100, badge, 26, MUTED)
    s.tx(72, 172, title, 76, INK, True)
    s.tx(72, 268, sub, 30, MUTED)

def card(s, y=420, h=520):
    s.rr(72, y, W - 144, h, 20, fill=CARD, outline=BORDER)

def row(s, y, dot_color, title, time, active=False, locate=False, archive=False):
    x, w = 104, W - 208
    s.rr(x, y, w, 84, 12, fill='#f3f5f8' if active else None)
    if locate:
        s.circle(x + 30, y + 42, 12, ACCENT)
        s.line([(x + 30, y + 26), (x + 30, y + 58)], ACCENT, 2)
        s.line([(x + 14, y + 42), (x + 46, y + 42)], ACCENT, 2)
    else:
        s.dot(x + 30, y + 42, 7, dot_color)
    s.tx(x + 56, y + 26, title, 30, INK if active else MUTED)
    s.tx(x + w - 96, y + 30, time, 24, FAINT)
    if archive:
        s.rr(x + w - 62, y + 28, 28, 28, 6, outline=ACCENT, width=2)
        s.line([(x + w - 56, y + 42), (x + w - 42, y + 42)], ACCENT, 2)

def footer(s, text):
    s.rr(72, H - 240, W - 144, 132, 18, fill='#eef1f5')
    s.tx(104, H - 212, text, 32, INK, True)

def credit(s):
    s.tx(72, H - 66, 'dsh-recent-sessions · MIT', 22, FAINT)

# ---- slide 2: 先看黄点
s = Slide()
header(s, '步骤 ①', '先看黄点', '黄点 = 现在卡在你这里的事')
card(s, h=620)
row(s, 470, OK, '周报生成脚本', '1 小时前')
row(s, 566, WARN, '登录超时排查', '刚刚', active=True)
row(s, 662, IDLE, '产品需求评审', '3 小时前')
s.tx(104, 800, '① 等待授权 / ② 待回答 —— 都算黄点', 26, MUTED)
s.tx(104, 846, '先把这一类清掉，别的先不管', 26, MUTED)
s.tx(104, 918, '绿点 = 完成未读，灰色 = 空闲', 26, FAINT)
footer(s, '黄点清零，再干别的')
credit(s)
s.save('xiaohongshu-usage-2.png')

# ---- slide 3: 悬停点准星
s = Slide()
header(s, '步骤 ②', '悬停，点准星', '直接定位到它属于哪个工作区')
card(s, h=560)
row(s, 470, IDLE, '登录超时排查', '刚刚', active=True, locate=True)
s.tx(104, 600, '点击准星后：', 26, MUTED)
s.rr(104, 650, W - 208, 76, 12, fill='#eef1f5')
s.tx(124, 672, '工作区  2611-西交利物浦-HR 智能体项目', 26, MUTED)
s.tx(104, 756, '列表自动滚动到该项目并展开，闪一下高亮', 24, FAINT)
footer(s, '不用自己翻目录')
credit(s)
s.save('xiaohongshu-usage-3.png')

# ---- slide 4: 归档清空
s = Slide()
header(s, '步骤 ③', '处理完，归档', '清完只剩「正在做」')
card(s, h=560)
row(s, 470, OK, '周报生成脚本', '1 小时前', active=True, archive=True)
s.tx(104, 600, '归档后绿点消失，列表自动变短', 26, MUTED)
s.rr(104, 660, W - 208, 132, 14, fill='#eef1f5')
s.tx(128, 686, '清完之后', 24, MUTED)
s.tx(128, 726, '黄点归零 · 绿点归档 · 只留下正在做的事', 30, INK, True)
footer(s, '侧栏是待办台，不是会话垃圾桶')
credit(s)
s.save('xiaohongshu-usage-4.png')

# ---- slide 5: 装好
s = Slide()
header(s, '安装', '三步装好', '一次性，两分钟')
card(s, y=420, h=560)
s.tx(104, 470, '1）DSH → Plugins → Discover', 30, INK, True)
s.tx(104, 528, '2）Add index source，粘贴下面这行', 30, INK, True)
s.rr(104, 586, W - 208, 96, 12, fill='#eef1f5')
s.tx(128, 608, 'tianxiaz.github.io/dsh-recent-sessions', 26, MUTED)
s.tx(128, 644, '/market/index.json', 26, MUTED)
s.tx(104, 712, '3）装完 Cmd+Shift+R 硬刷新一次', 30, INK, True)
s.tx(104, 790, '开源 MIT · 纯前端 · 不联网', 26, FAINT)
footer(s, '装完就能按黄点清了')
credit(s)
s.save('xiaohongshu-usage-5.png')
