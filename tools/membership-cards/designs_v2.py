"""Platinum 'Padma' (silver lotus rising from the Ganga) and Platinum Plus 'Mandir' (gold Nagara temple at dusk).
Imported at the end of designs.py, replacing the earlier Platinum and Platinum Plus fronts."""
import math
from engine import *
from designs import T, brand_row, clipped, P_, X, _shw, ellipse

# ---------------------------------------------------------------- shared shapes
def petal(cx, by, ang, ln, wd, curl=0.0):
    """A lotus petal from its base (cx, by): ang = lean from vertical (radians, + = right), ln length, wd half-width."""
    ca, sa = math.cos(ang), math.sin(ang)
    def P(u, v):  # u along the petal, v across
        return (cx + u * sa + v * ca, by + u * ca - v * sa)
    tip = P(ln, curl)
    return [('M',) + P(0, 0),
            ('C',) + P(ln * .18, -wd * 1.05) + P(ln * .62, -wd * 1.02) + tip,
            ('C',) + P(ln * .62, wd * 1.02) + P(ln * .18, wd * 1.05) + P(0, 0), ('Z',)], P, tip

def waves(cv, y0, n, amp, color, lw, layer, x0=-3, x1=W + 3, step=.9, gap=1.25, phase=0):
    for k in range(n):
        y = y0 - k * gap; a = amp * (1 - k * .12); pts = []
        x = x0
        while x <= x1:
            pts.append((x, y + a * math.sin(x * .32 + k * .9 + phase)))
            x += step
        cv.stroke(poly(pts, False), color, lw * (1 - k * .1), layer)

def diya(cv, cx, cy, s, body, flame, flame2, layer_b, layer_f):
    cv.fill([('M', cx - s * 1.6, cy), ('C', cx - s * 1.2, cy - s * 1.1, cx + s * 1.2, cy - s * 1.1, cx + s * 1.6, cy),
             ('L', cx + s * 2.1, cy + s * .25), ('C', cx + s * .8, cy + s * .05, cx - s * .8, cy + s * .05, cx - s * 1.6, cy), ('Z',)], body, layer_b)
    cv.fill([('M', cx + s * 1.25, cy + s * .25), ('C', cx + s * .55, cy + s * 1.0, cx + s * 1.0, cy + s * 2.2, cx + s * 1.35, cy + s * 3.0),
             ('C', cx + s * 1.75, cy + s * 2.2, cx + s * 2.0, cy + s * 1.0, cx + s * 1.25, cy + s * .25), ('Z',)], flame, layer_f)
    cv.fill(ellipse(cx + s * 1.33, cy + s * .95, s * .22, s * .45, 0), flame2, layer_f)

# ================================================================ PLATINUM: Padma
def padma(cv, cx, by, s, fill_back, fill_front, line, line2, lw, layer='FOIL'):
    # back ring: wide fan of 9 petals
    for i, a in enumerate([-1.18, -.9, -.6, -.3, 0, .3, .6, .9, 1.18]):
        ln = s * (24 - abs(a) * 6.5); wd = s * (4.4 - abs(a) * .6)
        p, P, tip = petal(cx, by, a, ln, wd, curl=s * .5 * math.sin(a))
        cv.fill(p, fill_back, 'INK'); cv.stroke(p, line2, lw * .8, layer)
        cv.stroke([('M',) + P(ln * .12, 0), ('C',) + P(ln * .45, wd * .12) + P(ln * .75, wd * .05) + P(ln * .93, 0)], line2, lw * .45, layer)
    # front ring: 5 tall petals, brighter
    for a in (-.55, -.27, .27, .55, 0):
        ln = s * (19 - abs(a) * 5) if a else s * 21.5; wd = s * (4.6 - abs(a) * 1.0)
        p, P, tip = petal(cx, by - s * .6, a * .9, ln, wd)
        cv.fill(p, fill_front, 'INK'); cv.stroke(p, line, lw, layer)
        for v in (-.38, 0, .38):
            cv.stroke([('M',) + P(ln * .1, wd * v * .5), ('C',) + P(ln * .4, wd * v * 1.0) + P(ln * .7, wd * v * .8) + P(ln * .9, wd * v * .25)], line2, lw * .4, layer)
    # cupped sepals at the water line
    for sg in (-1, 1):
        p, P, tip = petal(cx + sg * s * 2.2, by - s * 1.2, sg * 1.42, s * 11, s * 2.6, curl=-sg * s * 1.6)
        cv.fill(p, fill_front, 'INK'); cv.stroke(p, line, lw * .9, layer)
    cv.stroke([('M', cx - s * 7, by - s * 1.3), ('C', cx - s * 3, by - s * 2.4, cx + s * 3, by - s * 2.4, cx + s * 7, by - s * 1.3)], line, lw * 1.1, layer)

def platinum_front(cv, m, art_only=False):
    full = rect(-3, -3, W + 6, H + 6)
    cv.fill(full, ('rad', W / 2, 26, 64, [(0, '#24457f'), (.55, '#13295a'), (1, '#07122b')]), 'BASE')
    cx = W / 2
    def art():
        # moonlit halo and fine rays behind the lotus
        for r, c in ((31, '#17336a'), (25, '#1a3972'), (19, '#1d3e7a')):
            cv.fill(circle(cx, 14, r), c, 'INK')
        for i in range(48):
            a = math.pi * i / 47
            cv.stroke(poly([(cx + 19.5 * math.cos(a), 14 + 19.5 * math.sin(a)), (cx + 31 * math.cos(a), 14 + 31 * math.sin(a))], False), '#254a8b', .07, 'INK')
        cv.stroke(arc(cx, 14, 31.4, 0, math.pi), P_['plat2'], .12, 'FOIL')
        cv.stroke(arc(cx, 14, 19.2, 0, math.pi), '#3a5d9c', .1, 'INK')
        # the Ganga
        cv.fill(rect(-3, -3, W + 6, 14.6), ('lin', 0, 14.6, 0, -3, [(0, '#10275a'), (1, '#07122b')]), 'INK')
        waves(cv, 13.4, 7, .55, '#3c5f9f', .11, 'INK')
        waves(cv, 13.4, 2, .55, P_['plat2'], .12, 'FOIL', x0=cx - 22, x1=cx + 22)
        padma(cv, cx, 13.4, .4, '#183a76', '#21478a', P_['plat'], P_['plat2'], .14)
        # reflection
        for k, wdt in enumerate((10, 7, 4.5)):
            cv.stroke(poly([(cx - wdt, 10.6 - k * 1.3), (cx + wdt, 10.6 - k * 1.3)], False), '#5878b2', .1, 'INK')
        # two diyas on the water
        for x in (13.5, W - 15.5):
            diya(cv, x, 14.2, .9, P_['plat2'], '#f4d58f', '#fff4d6', 'FOIL', 'INK')
        # small stars
        for x, y, r in ((9, 46, .16), (16, 50, .1), (24, 44.5, .12), (W - 10, 47, .16), (W - 18, 50.5, .1), (W - 25, 44, .12), (6, 38, .1), (W - 6, 37, .1)):
            cv.fill(circle(x, y, r), P_['plat'], 'FOIL')
    clipped(cv, full, art)
    # inset double frame with small lotus-bud corners (silver foil)
    cv.stroke(rrect(2.6, 2.6, W - 5.2, H - 5.2, 1.9), P_['plat2'], .16, 'FOIL')
    cv.stroke(rrect(3.5, 3.5, W - 7.0, H - 7.0, 1.4), '#5d77a6', .08, 'FOIL')
    for (x, y, sx, sy) in ((3.5, 3.5, 1, 1), (W - 3.5, 3.5, -1, 1), (3.5, H - 3.5, 1, -1), (W - 3.5, H - 3.5, -1, -1)):
        cv.stroke([('M', x + sx * 2.2, y), ('C', x + sx * 1.1, y + sy * .2, x + sx * .2, y + sy * 1.1, x, y + sy * 2.2)], P_['plat'], .14, 'FOIL')
        cv.fill(circle(x + sx * 1.15, y + sy * 1.15, .28), P_['plat'], 'FOIL')
    # lockup: NIKADI with the building mark standing over N-I-K, as in the logo
    SH = [(0, '#ffffff'), (.35, '#dfe6f0'), (.55, '#9eacc2'), (.75, '#eef2f7'), (1, '#b9c4d4')]
    pt = 14.5; tr = .2
    wd = text_width('gloock', 'NIKADI', pt, tr); x0 = cx - wd / 2; yb = 31.6
    wnik = text_width('gloock', 'NIK', pt, tr) - tr * pt * PT
    mh = wnik / .92
    mw = mh * 318 / 345
    shapes, mw = mark_shapes(x0 + (wnik - mw) / 2, yb + 5.75, mh)
    for t, c in shapes: cv.fill(c, {'dark': ('lin', 0, yb + 5.6 + mh, 0, yb + 5.6, SH), 'light': '#8f9fb8', 'arc': ('lin', x0, 0, x0 + wnik, 0, SH)}[t], 'FOIL')
    T(cv, 'gloock', 'NIKADI', x0, yb, pt, ('lin', x0, yb + 6, x0 + wd, yb, SH), tr, layer='FOIL')
    T(cv, 'arsenal', 'P L A T I N U M', cx, 27.4, 5.0, P_['plat'], .32, align='center', layer='FOIL')
    T(cv, 'work', 'SRI DHAM MAYAPUR', cx, 24.0, 3.0, P_['sub'], .42, align='center', layer='FOIL')
    for sg in (-1, 1):
        cv.stroke(poly([(cx + sg * 12.2, 25.0), (cx + sg * 18.0, 25.0)], False), P_['plat2'], .1, 'FOIL')
        cv.fill([('M', cx + sg * 11.6, 25.45), ('L', cx + sg * 12.05, 25.0), ('L', cx + sg * 11.6, 24.55), ('L', cx + sg * 11.15, 25.0), ('Z',)], P_['plat'], 'FOIL')
    if not art_only:
        T(cv, 'arsenal', m['name'].upper(), 6, 6.0, 7.0, P_['plat'], .14, layer='FOIL')
        T(cv, 'plexmono', m['no'], W - 6, 6.0, 4.8, P_['plat2'], .12, align='right', layer='FOIL')
        T(cv, 'work', 'SINCE ' + m['since'], W - 6, 9.6, 3.3, P_['sub'], .4, align='right', layer='FOIL')
        T(cv, 'work', 'MEMBER', 6, 9.6, 3.3, P_['sub'], .42, layer='FOIL')

# ================================================================ PLATINUM PLUS: Mandir
GOLDV = [(0, '#f6e4ad'), (.45, '#d8b465'), (1, '#8f6a2c')]
GOLDS = [(0, '#d9b76c'), (1, '#7a5824')]
DARK = '#3a2a10'

def shikhara_gold(cv, cx, base, w, h, lw, tiers=13, ribs=(.38, .72), flag=True, mini=True):
    hw = w / 2; N = 60
    L = [(cx - _shw(hw, i / N), base + h * i / N) for i in range(N + 1)]
    Rr = [(cx + _shw(hw, i / N), base + h * i / N) for i in range(N + 1)]
    outline = poly(L + Rr[::-1])
    cv.fill(outline, ('lin', cx - hw, 0, cx + hw, 0, [(0, '#8f6a2c'), (.3, '#e9cf8c'), (.5, '#f7e7b4'), (.72, '#d2ad5e'), (1, '#7d5b25')]), 'GOLD')
    # rathas (vertical projections) as shaded strips
    for f in ribs:
        for sg in (-1, 1):
            cv.stroke(poly([(cx + sg * f * _shw(hw, i / N), base + h * i / N) for i in range(int(N * .97) + 1)], False), DARK, lw * .55, 'ENGRAVE')
    cv.stroke(poly([(cx, base), (cx, base + h * .97)], False), DARK, lw * .35, 'ENGRAVE')
    for k in range(1, tiers):
        t = k / tiers; y = base + h * t; x = _shw(hw, t)
        cv.stroke(poly([(cx - x, y), (cx + x, y)], False), DARK, lw * (.45 if k % 3 else .8), 'ENGRAVE')
        if k % 3 == 0:
            for sg in (-1, 1):
                for ff in (.2, .55, .88):
                    cv.fill(circle(cx + sg * x * ff, y + h / tiers * .5, .13), DARK, 'ENGRAVE')
    if mini:
        for sg in (-1, 1):
            for tf, sc in ((.1, .4), (.33, .28)):
                y0 = base + h * tf; xx = cx + sg * _shw(hw, tf) * .8
                ww = w * sc * .55; hh = h * sc * .62
                ML = [(xx - _shw(ww / 2, i / 30), y0 + hh * i / 30) for i in range(31)]
                MR = [(xx + _shw(ww / 2, i / 30), y0 + hh * i / 30) for i in range(31)]
                mo = poly(ML + MR[::-1])
                cv.fill(mo, ('lin', xx - ww / 2, 0, xx + ww / 2, 0, [(0, '#7d5b25'), (.5, '#ecd395'), (1, '#7d5b25')]), 'GOLD')
                for k in range(1, 6):
                    t = k / 6; cv.stroke(poly([(xx - _shw(ww / 2, t), y0 + hh * t), (xx + _shw(ww / 2, t), y0 + hh * t)], False), DARK, lw * .35, 'ENGRAVE')
                cv.fill(ellipse(xx, y0 + hh + .25, ww * .22, .3, 0), '#f6e4ad', 'GOLD')
    # amalaka, kalash, chakra and flag
    top = base + h; aw = _shw(hw, 1) * 1.55; ah = h * .055
    cv.fill(ellipse(cx, top + ah * .55, aw, ah, 0), ('lin', cx - aw, 0, cx + aw, 0, [(0, '#8f6a2c'), (.5, '#f7e7b4'), (1, '#8f6a2c')]), 'GOLD')
    for k in range(-5, 6):
        x = cx + aw * k / 6 * .95; q = ah * .85 * math.sqrt(max(0, 1 - (k / 6) ** 2))
        cv.stroke(poly([(x, top + ah * .55 - q), (x, top + ah * .55 + q)], False), DARK, lw * .4, 'ENGRAVE')
    ky = top + ah * 1.1; ks = h * .045
    cv.fill(ellipse(cx, ky + ks * .9, ks * .95, ks * .85, 0), '#f1d998', 'GOLD')
    cv.fill(poly([(cx - ks * .35, ky + ks * 1.6), (cx + ks * .35, ky + ks * 1.6), (cx + ks * .5, ky + ks * 2.1), (cx - ks * .5, ky + ks * 2.1)]), '#d8b465', 'GOLD')
    # Sudarshan chakra on the kalash
    cy2 = ky + ks * 3.0; rr = ks * .75
    cv.stroke(circle(cx, cy2, rr), '#f6e4ad', lw * .9, 'GOLD'); cv.fill(circle(cx, cy2, rr * .25), '#f6e4ad', 'GOLD')
    for i in range(8):
        a = math.pi * i / 4
        cv.stroke(poly([(cx + rr * .25 * math.cos(a), cy2 + rr * .25 * math.sin(a)), (cx + rr * math.cos(a), cy2 + rr * math.sin(a))], False), '#f6e4ad', lw * .5, 'GOLD')
    if flag:
        px = cx + ks * .25; py0 = cy2 + rr; py1 = py0 + h * .24
        cv.stroke(poly([(px, py0), (px, py1)], False), '#f1d998', lw * .9, 'GOLD')
        fw, fh = h * .22, h * .1
        cv.fill([('M', px, py1), ('C', px + fw * .35, py1 + fh * .15, px + fw * .62, py1 - fh * .12, px + fw, py1 - fh * .32),
                 ('C', px + fw * .64, py1 - fh * .55, px + fw * .35, py1 - fh * .8, px, py1 - fh), ('Z',)], ('lin', px, 0, px + fw, 0, [(0, '#f6e4ad'), (1, '#c99a45')]), 'GOLD')

def roof_gold(cv, cx, base, w, slabs, lw):
    y = base; sw = w
    for k in range(slabs):
        hh = .95 - k * .03
        cv.fill(rect(cx - sw / 2, y, sw, hh), ('lin', cx - sw / 2, 0, cx + sw / 2, 0, [(0, '#7a5824'), (.5, '#e2c27a'), (1, '#7a5824')]), 'GOLD')
        cv.stroke(poly([(cx - sw / 2, y), (cx + sw / 2, y)], False), DARK, lw * .4, 'ENGRAVE')
        y += hh; sw *= .84
    cv.fill(ellipse(cx, y + .35, sw * .62, .36, 0), '#f1d998', 'GOLD')
    cv.fill(ellipse(cx, y + 1.15, .5, .45, 0), '#f1d998', 'GOLD')
    cv.fill(poly([(cx - .14, y + 1.5), (cx, y + 2.4), (cx + .14, y + 1.5)]), '#f1d998', 'GOLD')

def mandir(cv, lw=.14):
    cx = 64.5
    # warm halo behind the tower
    for r, c in ((27, '#1a1610'), (21, '#211b12'), (15.5, '#2a2215'), (10.5, '#342916')):
        cv.fill(circle(cx, 30, r), c, 'BASE')
    for i in range(60):
        a = math.pi * (i + .5) / 60
        cv.stroke(poly([(cx + 16 * math.cos(a), 30 + 16 * math.sin(a)), (cx + 26 * math.cos(a), 30 + 26 * math.sin(a))], False), '#3b3018', .06, 'ENGRAVE')
    cv.stroke(arc(cx, 30, 26.6, 0, math.pi), '#8f6a2c', .1, 'GOLD')
    # platform and steps
    for k, (y, x0) in enumerate(((1.4, 39.0), (2.8, 40.5), (4.2, 42.0))):
        cv.fill(rect(x0, y, W + 3 - x0, 1.2), ('lin', 0, y + 1.2, 0, y, [(0, '#c9a35a'), (1, '#6e4f20')]), 'GOLD')
    # pillared hall
    cv.fill(rect(42.0, 5.4, W + 3 - 42, 8.0), '#16140f', 'BASE')
    cv.fill(rect(42.0, 13.0, W + 3 - 42, 1.3), ('lin', 0, 14.3, 0, 13, GOLDS), 'GOLD')
    x = 43.6
    while x < W + 2:
        if abs(x - cx) > 3.4:
            cv.fill(rect(x - .45, 5.4, .9, 7.6), ('lin', x - .45, 0, x + .45, 0, [(0, '#7a5824'), (.5, '#e2c27a'), (1, '#7a5824')]), 'GOLD')
            cv.fill(rect(x - .8, 12.3, 1.6, .7), '#d8b465', 'GOLD')
        x += 3.0
    # glowing doorway
    cv.fill(rect(cx - 2.6, 5.4, 5.2, 6.4), '#d8b465', 'GOLD')
    cv.fill([('M', cx - 1.8, 5.4), ('L', cx - 1.8, 9.6), ('C', cx - 1.8, 11.0, cx + 1.8, 11.0, cx + 1.8, 9.6), ('L', cx + 1.8, 5.4), ('Z',)],
            ('rad', cx, 7.2, 3.6, [(0, '#fff3cf'), (.55, '#f3cf7c'), (1, '#b9862f')]), 'GOLD')
    for k in range(9):
        xx = cx - 2.4 + 4.8 * k / 8
        cv.fill(circle(xx, 12.25, .26), '#fff0c4', 'GOLD')
    # lamps along the plinth
    for xx in range(44, int(W) + 2, 3):
        cv.fill(circle(xx + .5, 4.85, .2), '#fff0c4', 'GOLD')
    roof_gold(cv, cx - 15.0, 14.3, 12.0, 7, lw)
    roof_gold(cv, cx + 15.0, 14.3, 9.0, 6, lw)
    shikhara_gold(cv, cx - 25.0, 14.3, 5.2, 8.0, lw * .8, tiers=6, ribs=(.5,), flag=False, mini=False)
    shikhara_gold(cv, cx, 14.3, 15.5, 24.0, lw)
    for x, y, r in ((44, 48, .2), (50, 44, .12), (79, 49, .22), (82.5, 42, .12), (74, 47.5, .1), (47, 39.5, .1), (83, 33, .14), (41, 30, .1)):
        cv.fill(circle(x, y, r), '#f1d998' if r > .15 else '#a99a7a', 'GOLD')

def rosette(cv, cx, cy, r0, amp, m, n, color, lw, layer, pts=480, rot=0):
    for j in range(n):
        ph = 2 * math.pi * j / (m * n) + rot
        cmds = []
        for i in range(pts + 1):
            t = 2 * math.pi * i / pts
            r = r0 + amp * math.sin(m * t + ph * m)
            cmds.append((cx + r * math.cos(t), cy + r * math.sin(t)))
        cv.stroke(poly(cmds, False), color, lw, layer)

def lotus_badge(cv, cx, cy, s, G, G2, layer='GOLD'):
    for i in range(8):
        a = math.pi / 2 + 2 * math.pi * i / 8
        p, P, tip = petal(cx, cy, a - math.pi / 2, s * 3.1, s * 1.05)
        cv.fill(p, ('lin', cx, cy + s * 3, cx, cy, [(0, '#f7e7b4'), (1, '#b48a3e')]), layer)
    for i in range(8):
        a = math.pi / 2 + 2 * math.pi * (i + .5) / 8
        p, P, tip = petal(cx, cy, a - math.pi / 2, s * 2.2, s * .8)
        cv.fill(p, '#8a6a2c', layer)
    cv.fill(circle(cx, cy, s * .75), ('rad', cx - s * .2, cy + s * .2, s * .9, [(0, '#fff3cf'), (1, '#c9a35a')]), layer)
    for k in range(10):
        a = 2 * math.pi * k / 10
        cv.fill(circle(cx + s * .48 * math.cos(a), cy + s * .48 * math.sin(a), s * .07), '#7a5824', layer)

def plus_front(cv, m, art_only=False):
    full = rrect(0, 0, W, H, R)
    cv.fill(full, ('lin', 0, H, W, 0, [(0, '#0b0b0d'), (.45, '#18181b'), (.6, '#202024'), (1, '#0a0a0c')]), 'BASE')
    cx, cy = W - 19.5, H / 2 - 1
    def art():
        # brushed steel: fine horizontal hairlines
        for k in range(0, 270):
            y = -1 + k * .21
            col = '#1d1d21' if k % 3 else '#232328'
            cv.stroke(poly([(-2, y), (W + 2, y)], False), col, .045, 'ENGRAVE')
        # soft sheen behind the rosette
        # guilloche rosette, engraved steel, with a gold inner band
        rosette(cv, cx, cy, 26.5, 1.9, 22, 9, '#5d6066', .05, 'ENGRAVE')
        rosette(cv, cx, cy, 21.0, 1.6, 18, 9, '#73767c', .05, 'ENGRAVE', rot=.2)
        rosette(cv, cx, cy, 15.6, 1.3, 15, 8, '#8f9297', .05, 'ENGRAVE', rot=.4)
        rosette(cv, cx, cy, 10.6, 1.0, 12, 8, '#b59050', .055, 'GOLD', rot=.1)
        for r, c, w in ((29.0, '#46484d', .06), (23.9, '#5a5c61', .05), (18.4, '#6a6d72', .05), (13.1, '#a8823f', .07), (7.9, '#d4b06a', .09), (7.2, '#a8823f', .05)):
            cv.stroke(circle(cx, cy, r), c, w, 'GOLD' if c.startswith('#a8') or c.startswith('#d4') else 'ENGRAVE')
        for k in range(72):
            a = 2 * math.pi * k / 72
            cv.fill(circle(cx + 13.1 * math.cos(a), cy + 13.1 * math.sin(a), .1), '#d4b06a', 'GOLD')
        lotus_badge(cv, cx, cy, 1.9, '#d4b06a', '#8a6a2c')
    clipped(cv, full, art)
    # thin gold rule down the card, and the lettering
    brand_row(cv, 6, H - 6 - 8.2, 8.2, {'dark': X['gold3'], 'light': X['gold2'], 'arc': X['gold']}, 'gloock', 13.5, ('lin', 0, H - 5, 0, H - 14, [(0, '#f8e7b5'), (.5, '#d4b06a'), (1, '#a8823f')]), X['steel'], layer='GOLD', word_track=.2, sub=False)
    T(cv, 'arsenal', 'P L A T I N U M   P L U S', 6, H - 19.6, 5.0, X['gold3'], .3, layer='GOLD')
    cv.stroke(poly([(6, H - 21.4), (17, H - 21.4)], False), X['gold'], .14, 'GOLD')
    T(cv, 'work', 'SRI DHAM MAYAPUR', 6, H - 24.6, 3.2, X['steel'], .4, layer='ENGRAVE')
    if not art_only:
        T(cv, 'arsenal', m['name'].upper(), 6, 12.4, 7.8, X['bright'], .14, layer='PERSONALISE')
        T(cv, 'plexmono', m['no'], 6, 8.2, 4.6, X['steel'], .14, layer='PERSONALISE')
        T(cv, 'work', 'SINCE ' + m['since'], 6, 4.6, 3.1, X['gold'], .4, layer='PERSONALISE')
