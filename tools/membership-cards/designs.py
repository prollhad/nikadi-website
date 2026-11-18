"""Four membership card designs (front + back). Units mm, origin bottom-left.
Every draw call carries a production layer tag:
  BASE (card colour, never a production layer), INK (printed), FOIL (hot-foil on PVC),
  ENGRAVE / GOLD / PERSONALISE (metal card)."""
import math
from engine import *

def clipped(cv, clip, fn):
    cv.begin_clip(clip); fn(); cv.end_clip()

# ---------- shared bits ----------
def T(cv, fname, s, x, y, pt, color, track=0, align='left', layer='INK', rot=0):
    cv.fill(text_cmds(fname, s, x, y, pt, track, align, rot), color, layer)
    return text_width(fname, s, pt, track)

def brand_row(cv, x, y, mh, tones, word_font, word_pt, word_color, sub_color, sub=True, layer='INK', word_track=.16, gap=2.4):
    shapes, mw = mark_shapes(x, y, mh)
    for t, c in shapes: cv.fill(c, tones[t], layer)
    tx = x + mw + gap
    T(cv, word_font, 'NIKADI', tx, y + mh * .24, word_pt, word_color, word_track, layer=layer)
    if sub: T(cv, 'work', 'GUEST HOUSE  ·  SRI DHAM MAYAPUR', tx + .2, y - .2, 3.5, sub_color, .3, layer=layer)
    return tx

def personal(cv, m, name_c, sub_c, num_c, x=6, right=None, year_font='italiana', year_c=None, layer='INK', name_font='work', lab_layer=None):
    right = right if right is not None else W - 6
    T(cv, 'work', 'MEMBER', x, 15.0, 3.3, sub_c, .42, layer=lab_layer or layer)
    T(cv, name_font, m['name'].upper(), x, 9.7, 8.4, name_c, .15, layer=layer)
    T(cv, 'plexmono', m['no'], x, 5.4, 5.2, num_c, .14, layer=layer)
    T(cv, 'work', 'MEMBER SINCE', right, 12.4, 3.3, sub_c, .42, align='right', layer=lab_layer or layer)
    T(cv, year_font, m['since'], right, 5.4, 11, year_c or name_c, .1, align='right', layer=layer)

def qr_cmds(data, x, y, size):
    from reportlab.graphics.barcode.qrencoder import QRCode, QRErrorCorrectLevel
    q = QRCode(None, QRErrorCorrectLevel.M); q.addData(data); q.make()
    n = q.getModuleCount(); s = size / n; out = []
    for r in range(n):
        c = 0
        while c < n:
            if q.isDark(r, c):
                c0 = c
                while c < n and q.isDark(r, c): c += 1
                out += rect(x + c0 * s, y + (n - 1 - r) * s, (c - c0) * s + .002, s + .002)
            else: c += 1
    return out

APP_URL = 'https://www.nikadiguesthouse.com/app/'
CONTACT = '+91 75011 01137   ·   www.nikadiguesthouse.com   ·   Opp. ISKCON Gate No. 4, Sri Dham Mayapur'
BEN = {
    'silver': ['5% off every night, even on offer prices', '1 point for every ₹100 of room tariff', '100 welcome points when you join',
               'Member-only offers on WhatsApp', '50 bonus points in your birthday month'],
    'gold': ['10% off every night, even on offer prices', '1.5 points for every ₹100 of room tariff', 'Early check-in from 9 AM, when available',
             '100 bonus points in your birthday month', 'Plus every Silver benefit'],
    'platinum': ['15% off every night, even on offer prices', '2 points for every ₹100 of room tariff', 'Free late check-out till 11 AM',
                 'Free room upgrade, when available', 'Free dental kit every stay'],
    'plus': ['20% off every night, even on offer prices', '4 points for every ₹100 of room tariff', 'Free late check-out till 12 noon',
             'Free extra mattress · room upgrade', 'Priority booking for Gaura Purnima & Kartik', 'Your level is kept for 10 years'],
}

def back_common(cv, tier, title_font, title_c, sub_c, text_c, bullet_c, qr_dark, qr_light, line_c, legal_c, title_track=.26, layer='INK',
                qr_layer=None, light_layer=None, tl='NIKADI MEMBERSHIP', label=None, right=None):
    right = right if right is not None else W - 6
    T(cv, title_font, tl, 6, H - 8.4, 8.2, title_c, title_track, layer=layer)
    T(cv, 'work', (label or tier.upper()) + '  ·  YOUR PRIVILEGES', 6, H - 11.8, 3.6, sub_c, .36, layer=layer)
    y = H - 17.0
    for b in BEN[tier]:
        cv.fill(circle(6.55, y + .85, .32), bullet_c, layer)
        T(cv, 'work', b, 8.0, y, 5.0, text_c, .01, layer=layer); y -= 3.35 if tier == 'plus' else 3.6
    qs = 14.5; qx = right - qs; qy = H - 10.5 - qs - 2.5
    if qr_light is not None:
        cv.fill(rrect(qx - 1.4, qy - 1.4, qs + 2.8, qs + 2.8, 1.0), qr_light, light_layer or layer)
    cv.fill(qr_cmds(APP_URL, qx, qy, qs), qr_dark, qr_layer or layer)
    T(cv, 'work', 'YOUR CARD & POINTS', qx + qs / 2, qy - 4.3, 3.2, sub_c, .24, align='center', layer=layer)
    cv.stroke(poly([(6, 10.0), (right, 10.0)], False), line_c, .1, layer)
    T(cv, 'work', CONTACT, (6 + right) / 2, 6.9, 4.0, text_c, .04, align='center', layer=layer)
    T(cv, 'work', 'Personal and not transferable. Show it at reception. If found, please return it to Nikadi Guest House.', (6 + right) / 2, 4.1, 3.1, legal_c, .02, align='center', layer=layer)

# =========================================================== SILVER: Pearl
S = dict(bg=[(0, '#f7f8f9'), (.42, '#dde1e5'), (.6, '#f4f5f7'), (1, '#c4cad1')], line='#aeb5be', hi='#ffffff',
         ink='#23272c', sub='#6c737c', mdark='#2b3036', mlight='#8b929b')
def silver_front(cv, m, art_only=False):
    full = rect(-3, -3, W + 6, H + 6)
    cv.fill(full, ('lin', 0, H, W, 0, S['bg']), 'BASE')
    def art():
        for k, (col, lw) in enumerate((('#e6e9ec', .5), ('#ffffff', .3), (S['line'], .18))):
            shapes, _ = mark_shapes(52 - k * .35, 2.2 + k * .35, 46)
            for _, c in shapes: cv.stroke(c, col, lw, 'INK')
        for i in range(7):
            y = 4.5 + i * .9
            cv.stroke(poly([(46 + i * 1.2, y), (W - 2 - i * 1.2, y)], False), '#d2d6db', .08, 'INK')
    clipped(cv, rect(-3, -3, W + 6, H + 6), art)
    brand_row(cv, 6, H - 6 - 7.6, 7.6, {'dark': S['mdark'], 'light': S['mlight'], 'arc': S['mlight']}, 'italiana', 15, S['ink'], S['sub'])
    T(cv, 'italiana', 'S I L V E R   M E M B E R', 6, H - 21.6, 6.2, S['ink'], .18)
    cv.stroke(poly([(6, H - 23.4), (17, H - 23.4)], False), S['sub'], .12)
    if not art_only:
        T(cv, 'work', m['name'].upper(), 6, 10.6, 8.4, S['ink'], .15)
        T(cv, 'plexmono', m['no'], 6, 6.4, 5.0, S['sub'], .14)
        T(cv, 'work', 'SINCE ' + m['since'], 6 + text_width('plexmono', m['no'], 5.0, .14) + 4, 6.4, 3.6, S['sub'], .4)
def silver_back(cv, m):
    cv.fill(rect(-3, -3, W + 6, H + 6), ('lin', 0, 0, W, H, S['bg']), 'BASE')
    shapes, _ = mark_shapes(58, 13, 34)
    for _, c in shapes: cv.stroke(c, '#c9ced5', .14)
    back_common(cv, 'silver', 'italiana', S['ink'], S['sub'], S['ink'], S['mlight'], S['ink'], '#ffffff', '#b9bfc7', S['sub'])

# =========================================================== GOLD: Lotus
G = dict(bg=[(0, '#7a2036'), (.5, '#4c1020'), (1, '#2a0610')], gold='#d9b56a', gold2='#a8813e', gold3='#efd594', faint='#7d3a2c')
def lotus(cv, cx, cy, s, color, lw, layer='FOIL'):
    rings = [(8, 2.6, 9.6, .52), (16, 8.4, 15.6, .30), (24, 14.2, 21.4, .21), (32, 20.4, 27.0, .155)]
    for n, r0, r1, wd in rings:
        for i in range(n):
            a = 2 * math.pi * i / n + (math.pi / n if n % 16 == 0 else 0)
            def P(r, da): return (cx + s * r * math.cos(a + da), cy + s * r * math.sin(a + da))
            b1, b2, tip = P(r0, -wd), P(r0, wd), P(r1, 0)
            c1, c2 = P(r0 + (r1 - r0) * .55, -wd * 1.05), P(r1 - (r1 - r0) * .15, -wd * .35)
            c3, c4 = P(r1 - (r1 - r0) * .15, wd * .35), P(r0 + (r1 - r0) * .55, wd * 1.05)
            cv.stroke([('M',) + b1, ('C',) + c1 + c2 + tip, ('C',) + c3 + c4 + b2], color, lw, layer)
            # inner vein
            cv.stroke(poly([P(r0 + (r1 - r0) * .2, 0), P(r1 - (r1 - r0) * .25, 0)], False), color, lw * .6, layer)
    for r in (1.6, 2.5, 8.2, 14.0, 20.2, 27.6, 28.6):
        cv.stroke(circle(cx, cy, s * r), color, lw * (1.3 if r in (27.6, 2.5) else .8), layer)
    for i in range(72):
        a = 2 * math.pi * i / 72
        cv.fill(circle(cx + s * 30.2 * math.cos(a), cy + s * 30.2 * math.sin(a), s * .28), color, layer)
def gold_front(cv, m, art_only=False):
    cv.fill(rect(-3, -3, W + 6, H + 6), ('rad', 64, 30, 78, G['bg']), 'BASE')
    inner = rrect(3.6, 3.6, W - 7.2, H - 7.2, 1.2)
    clipped(cv, inner, lambda: lotus(cv, 69.5, 27, .74, G['gold2'], .15))
    cv.stroke(rrect(2.7, 2.7, W - 5.4, H - 5.4, 1.8), G['gold'], .3, 'FOIL')
    cv.stroke(inner, G['gold'], .12, 'FOIL')
    brand_row(cv, 7, H - 7 - 7.8, 7.8, {'dark': G['gold3'], 'light': G['gold2'], 'arc': G['gold']}, 'gloock', 13.5, G['gold3'], G['gold'], layer='FOIL', word_track=.2)
    T(cv, 'arsenal', 'G O L D   M E M B E R', 7, H - 21.6, 5.0, G['gold3'], .3, layer='FOIL')
    cv.stroke(poly([(7, H - 23.4), (19, H - 23.4)], False), G['gold'], .14, 'FOIL')
    if not art_only:
        T(cv, 'arsenal', m['name'].upper(), 7, 10.6, 8.4, G['gold3'], .16, layer='FOIL')
        T(cv, 'plexmono', m['no'], 7, 6.4, 5.0, G['gold'], .14, layer='FOIL')
        T(cv, 'work', 'SINCE ' + m['since'], 7 + text_width('plexmono', m['no'], 5.0, .14) + 4, 6.4, 3.6, G['gold'], .4, layer='FOIL')
def gold_back(cv, m):
    cv.fill(rect(-3, -3, W + 6, H + 6), ('rad', 20, 40, 80, G['bg']), 'BASE')
    clipped(cv, rrect(3.6, 3.6, W - 7.2, H - 7.2, 1.2), lambda: lotus(cv, 30, 22, .78, '#6a2232', .13, 'INK'))
    cv.stroke(rrect(2.7, 2.7, W - 5.4, H - 5.4, 1.8), G['gold'], .3, 'FOIL')
    cv.stroke(rrect(3.6, 3.6, W - 7.2, H - 7.2, 1.2), G['gold'], .12, 'FOIL')
    back_common(cv, 'gold', 'gloock', G['gold3'], G['gold'], '#f1e3c4', G['gold'], '#3a0a16', '#f3e6c4', G['gold2'], '#cbb488', title_track=.2,
                layer='INK', right=W - 7.4)

# =========================================================== PLATINUM: Deco
# =========================================================== shared ornament parts
def petal_ring(cv, cx, cy, s, n, r0, r1, wd, color, lw, layer, rot=0, vein=True, pointed=True):
    for i in range(n):
        a = 2 * math.pi * i / n + rot
        def P(r, da): return (cx + s * r * math.cos(a + da), cy + s * r * math.sin(a + da))
        b1, b2, tip = P(r0, -wd), P(r0, wd), P(r1, 0)
        k = .35 if pointed else .9
        c1, c2 = P(r0 + (r1 - r0) * .55, -wd * 1.05), P(r1 - (r1 - r0) * .15, -wd * k)
        c3, c4 = P(r1 - (r1 - r0) * .15, wd * k), P(r0 + (r1 - r0) * .55, wd * 1.05)
        cv.stroke([('M',) + b1, ('C',) + c1 + c2 + tip, ('C',) + c3 + c4 + b2], color, lw, layer)
        if vein: cv.stroke(poly([P(r0 + (r1 - r0) * .2, 0), P(r1 - (r1 - r0) * .28, 0)], False), color, lw * .6, layer)
def ring(cv, cx, cy, r, color, lw, layer): cv.stroke(circle(cx, cy, r), color, lw, layer)
def dots(cv, cx, cy, r, n, d, color, layer, rot=0):
    for i in range(n):
        a = 2 * math.pi * i / n + rot
        cv.fill(circle(cx + r * math.cos(a), cy + r * math.sin(a), d), color, layer)

# =========================================================== PLATINUM: Sapphire Lace
P_ = dict(bg=[(0, '#22427a'), (.5, '#142a57'), (1, '#08142f')], lat='#1e3664', orn='#9aa9c2', plat='#e6ebf2', plat2='#b3bfcf', sub='#9fb0c8')
def lace(cv, cx, cy, s, color, lw, layer='FOIL'):
    petal_ring(cv, cx, cy, s, 12, 1.8, 6.6, .42, color, lw, layer)
    ring(cv, cx, cy, s * 1.3, color, lw, layer); ring(cv, cx, cy, s * 7.4, color, lw * 1.2, layer)
    # interlaced circles (lace)
    for i in range(24):
        a = 2 * math.pi * i / 24
        cv.stroke(circle(cx + s * 11.2 * math.cos(a), cy + s * 11.2 * math.sin(a), s * 3.9), color, lw * .8, layer)
    ring(cv, cx, cy, s * 15.4, color, lw * 1.1, layer)
    # pointed arches
    petal_ring(cv, cx, cy, s, 24, 15.4, 22.6, .13, color, lw, layer, rot=math.pi / 24)
    petal_ring(cv, cx, cy, s, 24, 16.2, 20.2, .07, color, lw * .7, layer, rot=math.pi / 24, vein=False)
    ring(cv, cx, cy, s * 23.4, color, lw * 1.2, layer)
    # scalloped edge
    n = 48
    for i in range(n):
        a0 = 2 * math.pi * i / n; a1 = 2 * math.pi * (i + 1) / n; am = (a0 + a1) / 2
        p0 = (cx + s * 23.4 * math.cos(a0), cy + s * 23.4 * math.sin(a0)); p1 = (cx + s * 23.4 * math.cos(a1), cy + s * 23.4 * math.sin(a1))
        q = (cx + s * 26.4 * math.cos(am), cy + s * 26.4 * math.sin(am))
        cv.stroke([('M',) + p0, ('C', p0[0] + (q[0] - p0[0]) * .9, p0[1] + (q[1] - p0[1]) * .9, p1[0] + (q[0] - p1[0]) * .9, p1[1] + (q[1] - p1[1]) * .9) + p1], color, lw, layer)
    dots(cv, cx, cy, s * 27.6, 48, s * .3, color, layer, rot=math.pi / 48)
    dots(cv, cx, cy, s * 29.4, 96, s * .16, color, layer)
def lattice(cv, color, layer='INK', step=4.2):
    for k in range(-30, 30):
        x = k * step
        cv.stroke(poly([(x, -3), (x + H + 6, H + 3)], False), color, .08, layer)
        cv.stroke(poly([(x + H + 6, -3), (x, H + 3)], False), color, .08, layer)
# --- Platinum front: Jharokha (temple arch window)
def arch_path(cx, base, half, spring, apex):
    """Pointed (two-centred) arch: vertical sides up to 'spring', curves meeting at 'apex'. Returns cmds (open at the bottom)."""
    k = .56
    L = cx - half; Rr = cx + half
    return [('M', L, base), ('L', L, spring),
            ('C', L, spring + (apex - spring) * k, cx - half * .28, apex - (apex - spring) * .18, cx, apex),
            ('C', cx + half * .28, apex - (apex - spring) * .18, Rr, spring + (apex - spring) * k, Rr, spring),
            ('L', Rr, base)]
def cusps(cv, cx, half, spring, color, lw, layer, n=5):
    # small cusped lobes along the inside of the side walls
    for side in (-1, 1):
        x = cx + side * half
        for i in range(n):
            y0 = spring - 3.4 - i * 3.0
            cv.stroke([('M', x, y0), ('C', x - side * 1.4, y0 + .2, x - side * 1.4, y0 + 2.8, x, y0 + 3.0)], color, lw, layer)
def jharokha(cv, cx, color, color2, lw, layer='FOIL'):
    base, half, spring, apex = 13.2, 17.5, 32.5, 48.6
    cv.stroke(arch_path(cx, base, half, spring, apex), color, lw * 1.9, layer)
    cv.stroke(arch_path(cx, base, half - 1.1, spring, apex - 1.6), color, lw * .8, layer)
    cv.stroke(arch_path(cx, base, half - 2.3, spring - .2, apex - 3.4), color2, lw * .6, layer)
    cusps(cv, cx, half - 2.3, spring, color2, lw * .6, layer, n=6)
    # base plinth
    cv.stroke(poly([(cx - half - 2.2, base), (cx + half + 2.2, base)], False), color, lw * 1.6, layer)
    cv.stroke(poly([(cx - half - 1.2, base - .9), (cx + half + 1.2, base - .9)], False), color, lw * .7, layer)
    for i in range(15):
        x = cx - half - 1.2 + (2 * half + 2.4) * i / 14
        cv.fill(circle(x, base - 1.9, .22), color, layer)
    # lotus finial at the apex
    petal_ring(cv, cx, apex + 1.3, 1, 8, .35, 1.6, .5, color, lw * .7, layer, rot=math.pi / 8, vein=False)
    # side pillars with small lotus capitals
    for side in (-1, 1):
        x = cx + side * (half + 4.6)
        cv.stroke(poly([(x, base), (x, spring - 2)], False), color2, lw * .8, layer)
        cv.stroke(poly([(x - .8, base), (x - .8, spring - 2)], False), color2, lw * .4, layer)
        cv.stroke(poly([(x + .8, base), (x + .8, spring - 2)], False), color2, lw * .4, layer)
        petal_ring(cv, x, spring - .4, 1, 6, .3, 1.4, .55, color2, lw * .6, layer, rot=math.pi / 2, vein=False)
        dots(cv, x, spring - .4, 2.1, 12, .14, color2, layer)

def platinum_front(cv, m, art_only=False):
    cv.fill(rect(-3, -3, W + 6, H + 6), ('rad', W / 2, 30, 70, P_['bg']), 'BASE')
    clipped(cv, rect(-3, -3, W + 6, H + 6), lambda: lattice(cv, P_['lat'], step=3.6))
    cx = W / 2
    clipped(cv, rect(-3, -3, W + 6, H + 6), lambda: lace(cv, cx, 30, 1.25, '#1f3a72', .16, 'INK'))
    # soft panel inside the arch
    cv.fill(arch_path(cx, 13.2, 15.2, 32.3, 45.2) + [('Z',)], '#173064', 'INK')
    jharokha(cv, cx, P_['plat2'], P_['orn'], .14)
    shapes, mw = mark_shapes(cx - 2.8, 33.6, 6.6)
    for t, c in shapes: cv.fill(c, {'dark': P_['plat'], 'light': P_['plat2'], 'arc': P_['plat2']}[t], 'FOIL')
    T(cv, 'gloock', 'NIKADI', cx, 26.4, 13.5, P_['plat'], .2, align='center', layer='FOIL')
    T(cv, 'arsenal', 'P L A T I N U M', cx, 21.6, 5.0, P_['plat2'], .3, align='center', layer='FOIL')
    T(cv, 'work', 'SRI DHAM MAYAPUR', cx, 17.4, 3.2, P_['sub'], .4, align='center', layer='FOIL')
    if not art_only:
        T(cv, 'arsenal', m['name'].upper(), 6, 6.0, 7.0, P_['plat'], .14, layer='FOIL')
        T(cv, 'plexmono', m['no'], W - 6, 6.0, 4.8, P_['plat2'], .12, align='right', layer='FOIL')
        T(cv, 'work', 'SINCE ' + m['since'], W - 6, 9.6, 3.3, P_['sub'], .4, align='right', layer='FOIL')
        T(cv, 'work', 'MEMBER', 6, 9.6, 3.3, P_['sub'], .42, layer='FOIL')
def platinum_back(cv, m):
    cv.fill(rect(-3, -3, W + 6, H + 6), ('rad', 20, 40, 80, P_['bg']), 'BASE')
    clipped(cv, rect(-3, -3, W + 6, H + 6), lambda: lattice(cv, P_['lat'], step=3.6))
    cv.stroke(rrect(2.7, 2.7, W - 5.4, H - 5.4, 1.8), P_['plat2'], .25, 'FOIL')
    back_common(cv, 'platinum', 'gloock', P_['plat'], P_['sub'], '#e9eef5', P_['plat2'], '#0c1a3a', '#eef2f7', P_['plat2'], '#a7b5c9', title_track=.2,
                right=W - 7.4)

# =========================================================== PLATINUM PLUS: Jali (metal)
X = dict(bg=[(0, '#0a0a0b'), (.5, '#1b1a1d'), (1, '#0a0a0b')], steel='#8f9297', bright='#d9dadc', gold='#d4b06a', gold2='#a8823f', gold3='#f0d99a')
def octagram(cx, cy, r):
    a = [cx + r * math.cos(math.pi / 4 * i + math.pi / 8) for i in range(8)]
    pts = [(cx + r * math.cos(math.pi / 4 * i), cy + r * math.sin(math.pi / 4 * i)) for i in range(8)]
    sq1 = [pts[0], pts[2], pts[4], pts[6]]; sq2 = [pts[1], pts[3], pts[5], pts[7]]
    return poly(sq1), poly(sq2)
def jali(cv, x0, x1, y0, y1, g, E, lw):
    j = 0
    y = y0
    while y <= y1 + g:
        x = x0 + (g / 2 if j % 2 else 0)
        while x <= x1 + g:
            s1, s2 = octagram(x, y, g * .42)
            cv.stroke(s1, E, lw, 'ENGRAVE'); cv.stroke(s2, E, lw, 'ENGRAVE')
            x += g
        y += g * .5; j += 1
# =========================================================== PLATINUM PLUS: Temple (metal)
def ellipse(cx, cy, a, b, ang, n=72):
    ca, sa = math.cos(ang), math.sin(ang)
    return poly([(cx + a * math.cos(2 * math.pi * i / n) * ca - b * math.sin(2 * math.pi * i / n) * sa,
                  cy + a * math.cos(2 * math.pi * i / n) * sa + b * math.sin(2 * math.pi * i / n) * ca) for i in range(n)])
def _onion(cx, base, w, h):
    hw = w / 2
    return [('M', cx - hw, base),
            ('C', cx - hw * 1.18, base + h * .34, cx - hw * .95, base + h * .56, cx - hw * .42, base + h * .74),
            ('C', cx - hw * .16, base + h * .84, cx - hw * .04, base + h * .93, cx, base + h),
            ('C', cx + hw * .04, base + h * .93, cx + hw * .16, base + h * .84, cx + hw * .42, base + h * .74),
            ('C', cx + hw * .95, base + h * .56, cx + hw * 1.18, base + h * .34, cx + hw, base), ('Z',)]
def _onion_x(w, h, f):
    """half-width of the onion at height fraction f (approx, for bands)."""
    import bisect
    prof = [(0, .5), (.15, .57), (.3, .585), (.45, .55), (.6, .45), (.74, .21), (.85, .09), (1, 0)]
    for i in range(len(prof) - 1):
        if prof[i][0] <= f <= prof[i + 1][0]:
            a, b = prof[i], prof[i + 1]; return w * (a[1] + (b[1] - a[1]) * (f - a[0]) / (b[0] - a[0]))
    return 0
def kalash(cv, cx, y, s, G):
    cv.fill(ellipse(cx, y + s * .5, s * .55, s * .32, 0), G, 'GOLD')
    cv.fill(ellipse(cx, y + s * 1.25, s * .42, s * .42, 0), G, 'GOLD')
    cv.fill(ellipse(cx, y + s * 1.95, s * .3, s * .22, 0), G, 'GOLD')
    cv.fill(poly([(cx - s * .16, y + s * 2.1), (cx, y + s * 3.6), (cx + s * .16, y + s * 2.1)]), G, 'GOLD')
    cv.fill(poly([(cx - s * .09, y + s * 2.6), (cx - s * .09, y + s * 2.75), (cx + s * .09, y + s * 2.75), (cx + s * .09, y + s * 2.6)]), '#0b0b0c', 'KNOCKOUT')
def temple_dome(cv, cx, base, w, h, E, G, lw, ribs=9, bands=(.2, .42, .62)):
    path = _onion(cx, base, w, h)
    cv.fill(path, '#0d0d0e', 'KNOCKOUT')
    for k in range(1, ribs):
        f = -1 + 2 * k / ribs
        cv.stroke([('M', cx + w / 2 * f, base), ('C', cx + w / 2 * f * 1.12, base + h * .4, cx + w / 2 * f * .55, base + h * .7, cx, base + h)], E, lw * .45, 'ENGRAVE')
    for fb in bands:
        hx = _onion_x(w, h, fb)
        cv.stroke([('M', cx - hx, base + h * fb), ('C', cx - hx * .5, base + h * fb - h * .03, cx + hx * .5, base + h * fb - h * .03, cx + hx, base + h * fb)], E, lw * .5, 'ENGRAVE')
    cv.stroke(path, E, lw * 1.2, 'ENGRAVE')
    # lotus ring at the base of the dome (gold)
    n = max(6, int(w / 1.3))
    for i in range(n):
        x0 = cx - w / 2 + w * i / n; x1 = cx - w / 2 + w * (i + 1) / n; xm = (x0 + x1) / 2
        cv.stroke([('M', x0, base), ('C', x0, base + h * .07, xm, base + h * .09, xm, base + h * .1), ('C', xm, base + h * .09, x1, base + h * .07, x1, base)], G, lw * .6, 'GOLD')
    kalash(cv, cx, base + h - .2, h * .085, G)
def drum(cv, cx, y0, w, hgt, E, lw):
    cv.stroke(rect(cx - w / 2, y0, w, hgt), E, lw * .8, 'ENGRAVE')
    n = max(3, int(w / 1.7))
    for j in range(n):
        x = cx - w / 2 + w * (j + .5) / n
        cv.stroke(poly([(x - .32, y0 + .5), (x - .32, y0 + hgt * .62)], False), E, lw * .4, 'ENGRAVE')
        cv.stroke(poly([(x + .32, y0 + .5), (x + .32, y0 + hgt * .62)], False), E, lw * .4, 'ENGRAVE')
        cv.stroke(arc(x, y0 + hgt * .62, .32, 0, math.pi), E, lw * .4, 'ENGRAVE')
    cv.stroke(poly([(cx - w / 2 - .4, y0 + hgt), (cx + w / 2 + .4, y0 + hgt)], False), E, lw * .9, 'ENGRAVE')
def cusped_arch(cv, x, y, w, h, E, lw):
    hw = w / 2
    cv.stroke([('M', x - hw, y), ('L', x - hw, y + h * .55), ('C', x - hw, y + h * .85, x - hw * .3, y + h * .95, x, y + h),
               ('C', x + hw * .3, y + h * .95, x + hw, y + h * .85, x + hw, y + h * .55), ('L', x + hw, y)], E, lw, 'ENGRAVE')
def temple2(cv, E, G, lw=.14):
    cx = 63.5
    # halo behind the main dome
    pass
    # steps / plinth
    for y, x0, x1 in ((2.6, 41.5, W + 2), (4.2, 43, W + 2), (5.8, 44.5, W + 2)):
        cv.stroke(poly([(x0, y), (x1, y)], False), E, lw * (1.1 if y > 5 else .7), 'ENGRAVE')
    # colonnade with cusped arches
    cv.stroke(poly([(44.5, 14.6), (W + 2, 14.6)], False), E, lw * 1.1, 'ENGRAVE')
    cv.stroke(poly([(44.5, 15.6), (W + 2, 15.6)], False), E, lw * .5, 'ENGRAVE')
    x = 46.4
    while x < W + 2:
        cusped_arch(cv, x, 5.8, 2.4, 7.2, E, lw * .6); x += 3.2
    for xx in range(46, int(W) + 3, 2):
        cv.fill(circle(xx + .5, 15.1, .14), G, 'GOLD')
    # side towers + domes
    for sx in (-1, 1):
        tx = cx + sx * 15.5
        drum(cv, tx, 15.6, 6.2, 3.4, E, lw)
        temple_dome(cv, tx, 19.0, 7.0, 9.4, E, G, lw, ribs=7, bands=(.22, .45))
        tx2 = cx + sx * 25.5
        if tx2 < W - 1:
            drum(cv, tx2, 15.6, 3.6, 2.4, E, lw)
            temple_dome(cv, tx2, 18.0, 4.0, 5.6, E, G, lw * .8, ribs=5, bands=(.3,))
    # main tower + dome
    drum(cv, cx, 15.6, 13.4, 5.2, E, lw)
    temple_dome(cv, cx, 20.8, 14.8, 19.0, E, G, lw * 1.1, ribs=11, bands=(.18, .36, .56))
    # a few stars
    for (x, y, r) in ((44, 47, .18), (52, 44, .12), (77, 48.5, .2), (82, 41, .12), (71, 46, .1), (48, 38.5, .1), (80.5, 34, .14)):
        cv.fill(circle(x, y, r), G if r > .17 else E, 'GOLD' if r > .17 else 'ENGRAVE')
# ---------- Hindu temple (Nagara style): shikhara, amalaka, kalash, dhwaja, mandapa
def _shw(hw, t, top=.2):
    """half-width of a curvilinear shikhara at height fraction t."""
    return hw * (top + (1 - top) * (1 - t ** 1.3) ** .5)
def shikhara(cv, cx, base, w, h, E, G, lw, tiers=14, ribs=(.36, .7), flag=True, mini=True):
    hw = w / 2; N = 60
    L = [(cx - _shw(hw, i / N), base + h * i / N) for i in range(N + 1)]
    Rr = [(cx + _shw(hw, i / N), base + h * i / N) for i in range(N + 1)]
    outline = poly(L + Rr[::-1])
    cv.fill(outline, '#0d0d0e', 'KNOCKOUT')
    cv.stroke(outline, E, lw * 1.2, 'ENGRAVE')
    # vertical rathas (ribs) following the curve
    for f in ribs:
        for sg in (-1, 1):
            cv.stroke(poly([(cx + sg * f * _shw(hw, i / N), base + h * i / N) for i in range(int(N * .96) + 1)], False), E, lw * .5, 'ENGRAVE')
    cv.stroke(poly([(cx, base), (cx, base + h * .97)], False), E, lw * .35, 'ENGRAVE')
    # horizontal bhumi tiers
    for k in range(1, tiers):
        t = k / tiers; y = base + h * t; x = _shw(hw, t)
        cv.stroke(poly([(cx - x, y), (cx + x, y)], False), E, lw * (.55 if k % 3 else .8), 'ENGRAVE')
        if k % 3 == 0:
            for sg in (-1, 1):
                cv.fill(circle(cx + sg * x * .53, y + h / tiers * .5, .16), E, 'ENGRAVE')
    # miniature shikharas (urushringa) clustered on the shoulders
    if mini:
        for sg in (-1, 1):
            for j, (tf, sc) in enumerate(((.12, .42), (.36, .3))):
                y0 = base + h * tf; xx = cx + sg * _shw(hw, tf) * .78
                ww = w * sc * .55; hh = h * sc * .62
                ML = [(xx - _shw(ww / 2, i / 30), y0 + hh * i / 30) for i in range(31)]
                MR = [(xx + _shw(ww / 2, i / 30), y0 + hh * i / 30) for i in range(31)]
                mo = poly(ML + MR[::-1]); cv.fill(mo, '#0d0d0e', 'KNOCKOUT'); cv.stroke(mo, E, lw * .8, 'ENGRAVE')
                for k in range(1, 6):
                    t = k / 6; cv.stroke(poly([(xx - _shw(ww / 2, t), y0 + hh * t), (xx + _shw(ww / 2, t), y0 + hh * t)], False), E, lw * .4, 'ENGRAVE')
                cv.fill(ellipse(xx, y0 + hh + .25, ww * .2, .28, 0), G, 'GOLD')
    # amalaka: ribbed disc
    top = base + h; aw = _shw(hw, 1) * 1.5; ah = h * .055
    cv.fill(ellipse(cx, top + ah * .55, aw, ah, 0), '#0d0d0e', 'KNOCKOUT')
    cv.stroke(ellipse(cx, top + ah * .55, aw, ah, 0), G, lw, 'GOLD')
    for k in range(-5, 6):
        x = cx + aw * k / 6 * .95
        cv.stroke(poly([(x, top + ah * .55 - ah * .85 * math.sqrt(max(0, 1 - (k / 6) ** 2))), (x, top + ah * .55 + ah * .85 * math.sqrt(max(0, 1 - (k / 6) ** 2)))], False), G, lw * .45, 'GOLD')
    # kalash
    ky = top + ah * 1.1; ks = h * .045
    cv.fill(ellipse(cx, ky + ks * .9, ks * .95, ks * .85, 0), G, 'GOLD')
    cv.fill(poly([(cx - ks * .35, ky + ks * 1.6), (cx + ks * .35, ky + ks * 1.6), (cx + ks * .5, ky + ks * 2.1), (cx - ks * .5, ky + ks * 2.1)]), G, 'GOLD')
    cv.fill(poly([(cx - ks * .22, ky + ks * 2.1), (cx, ky + ks * 3.3), (cx + ks * .22, ky + ks * 2.1)]), G, 'GOLD')
    # dhwaja (flag)
    if flag:
        px = cx + ks * .9; py0 = ky + ks * 1.4; py1 = py0 + h * .3
        cv.stroke(poly([(px, py0), (px, py1)], False), G, lw * .9, 'GOLD')
        fw, fh = h * .2, h * .1
        cv.fill([('M', px, py1), ('C', px + fw * .35, py1 + fh * .12, px + fw * .6, py1 - fh * .18, px + fw, py1 - fh * .3),
                 ('C', px + fw * .62, py1 - fh * .52, px + fw * .35, py1 - fh * .78, px, py1 - fh), ('Z',)], G, 'GOLD')
def mandapa(cv, cx, base, w, slabs, E, G, lw):
    """stepped pyramidal roof (phamsana) with a small amalaka + kalash."""
    y = base; sw = w
    for k in range(slabs):
        hh = .95 - k * .03
        cv.fill(rect(cx - sw / 2, y, sw, hh), '#0d0d0e', 'KNOCKOUT')
        cv.stroke(rect(cx - sw / 2, y, sw, hh), E, lw * .7, 'ENGRAVE')
        y += hh; sw *= .84
    aw = sw * .7
    cv.stroke(ellipse(cx, y + .35, aw, .38, 0), G, lw * .8, 'GOLD')
    cv.fill(ellipse(cx, y + 1.15, .5, .45, 0), G, 'GOLD')
    cv.fill(poly([(cx - .14, y + 1.5), (cx, y + 2.4), (cx + .14, y + 1.5)]), G, 'GOLD')
def hindu_temple(cv, E, G, lw=.14):
    cx = 64.5
    # stepped jagati platform
    for y, x0 in ((2.6, 40.5), (4.0, 42), (5.4, 43.5)):
        cv.stroke(poly([(x0, y), (W + 2, y)], False), E, lw * .8, 'ENGRAVE')
    # pillared hall
    cv.stroke(poly([(43.5, 13.2), (W + 2, 13.2)], False), E, lw * 1.1, 'ENGRAVE')
    cv.stroke(poly([(43.5, 14.1), (W + 2, 14.1)], False), E, lw * .55, 'ENGRAVE')
    x = 45
    while x < W + 2:
        if abs(x - cx) > 3.2:
            cv.stroke(poly([(x, 5.4), (x, 12.2)], False), E, lw * .7, 'ENGRAVE')
            cv.stroke(poly([(x - .7, 12.2), (x + .7, 12.2), (x + .4, 13.2), (x - .4, 13.2), (x - .7, 12.2)], False), E, lw * .5, 'ENGRAVE')
            cv.stroke(poly([(x - .55, 5.4), (x - .55, 6.2), (x + .55, 6.2), (x + .55, 5.4)], False), E, lw * .4, 'ENGRAVE')
        x += 3.0
    # central doorway with toran garland (gold)
    cv.stroke(poly([(cx - 2.4, 5.4), (cx - 2.4, 11.0), (cx + 2.4, 11.0), (cx + 2.4, 5.4)], False), E, lw, 'ENGRAVE')
    cv.stroke(poly([(cx - 1.6, 5.4), (cx - 1.6, 10.2), (cx + 1.6, 10.2), (cx + 1.6, 5.4)], False), E, lw * .5, 'ENGRAVE')
    for k in range(7):
        xx = cx - 2.1 + 4.2 * k / 6
        cv.stroke(arc(xx, 11.9, .35, math.pi, 2 * math.pi), G, lw * .6, 'GOLD')
    # mandapa roof (left) + small shrine (right)
    mandapa(cv, cx - 15.5, 14.1, 12.5, 7, E, G, lw)
    mandapa(cv, cx + 15.5, 14.1, 9.0, 6, E, G, lw)
    # main shikhara
    shikhara(cv, cx, 14.1, 15.5, 24.5, E, G, lw * 1.05)
    # side mini temple far left
    shikhara(cv, cx - 25, 14.1, 5.4, 8.2, E, G, lw * .8, tiers=6, ribs=(.5,), flag=False, mini=False)

def plus_front(cv, m, art_only=False):
    cv.fill(rrect(0, 0, W, H, R), ('lin', 0, H, 0, 0, [(0, '#060607'), (.6, '#141416'), (1, '#1d1c20')]), 'BASE')
    clipped(cv, rrect(0, 0, W, H, R), lambda: hindu_temple(cv, X['steel'], X['gold']))
    brand_row(cv, 6, H - 6 - 8.2, 8.2, {'dark': X['gold3'], 'light': X['gold2'], 'arc': X['gold']}, 'gloock', 13.5, X['gold3'], X['steel'], layer='GOLD', word_track=.2, sub=False)
    T(cv, 'arsenal', 'P L A T I N U M   P L U S', 6, H - 19.6, 5.0, X['gold3'], .3, layer='GOLD')
    cv.stroke(poly([(6, H - 21.4), (17, H - 21.4)], False), X['gold'], .14, 'GOLD')
    T(cv, 'work', 'SRI DHAM MAYAPUR', 6, H - 24.6, 3.2, X['steel'], .4, layer='ENGRAVE')
    if not art_only:
        T(cv, 'arsenal', m['name'].upper(), 6, 12.4, 7.8, X['bright'], .14, layer='PERSONALISE')
        T(cv, 'plexmono', m['no'], 6, 8.2, 4.6, X['steel'], .14, layer='PERSONALISE')
        T(cv, 'work', 'SINCE ' + m['since'], 6, 4.6, 3.1, X['gold'], .4, layer='PERSONALISE')
def plus_back(cv, m):
    cv.fill(rrect(0, 0, W, H, R), ('lin', 0, H, W, 0, X['bg']), 'BASE')
    cv.stroke(rrect(2.7, 2.7, W - 5.4, H - 5.4, 1.8), X['gold'], .2, 'GOLD')
    L = 7
    _ms, _mw = mark_shapes(L - .4, H - 12.0, 5.0)
    for _t, _c in _ms: cv.fill(_c, {'dark': X['gold2'], 'light': X['gold3'], 'arc': X['gold']}[_t], 'GOLD')
    T(cv, 'gloock', 'NIKADI MEMBERSHIP', L + 6, H - 10.6, 8.2, X['gold3'], .2, layer='GOLD')
    T(cv, 'work', 'PLATINUM PLUS  ·  YOUR PRIVILEGES', L + 6, H - 14.0, 3.6, X['steel'], .36, layer='ENGRAVE')
    y = H - 19.0
    for b in BEN['plus']:
        cv.fill(circle(L + .55, y + .85, .32), X['gold'], 'GOLD')
        T(cv, 'work', b, L + 2, y, 4.7, X['bright'], .01, layer='ENGRAVE'); y -= 3.2
    qs = 13; qx = W - 7.4 - qs; qy = H - 11 - qs - 2.5
    cv.fill(rect(qx - 1.4, qy - 1.4, qs + 2.8, qs + 2.8), X['bright'], 'ENGRAVE')
    cv.fill(qr_cmds(APP_URL, qx, qy, qs), '#0a0a0b', 'KNOCKOUT')
    T(cv, 'work', 'YOUR CARD & POINTS', qx + qs / 2, qy - 4.3, 3.2, X['steel'], .24, align='center', layer='ENGRAVE')
    cv.stroke(poly([(L, 10.2), (W - 7.4, 10.2)], False), X['gold2'], .1, 'GOLD')
    T(cv, 'work', CONTACT, (L + W - 7.4) / 2, 7.1, 3.8, X['bright'], .04, align='center', layer='ENGRAVE')
    T(cv, 'work', 'Personal and not transferable. Metal card: please do not bend. If found, return to Nikadi Guest House.', (L + W - 7.4) / 2, 4.5, 2.9, X['steel'], .02, align='center', layer='ENGRAVE')

TIERS = {'silver': (silver_front, silver_back), 'gold': (gold_front, gold_back), 'platinum': (platinum_front, platinum_back), 'plus': (plus_front, plus_back)}

# v2 (Nov 2026): Platinum "Padma" and Platinum Plus "Mandir" replace the earlier fronts
import designs_v2 as _v2
TIERS['platinum'] = (_v2.platinum_front, platinum_back)
TIERS['plus'] = (_v2.plus_front, plus_back)
