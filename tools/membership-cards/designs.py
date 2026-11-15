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
# =========================================================== PLATINUM PLUS: Peacock feather (metal)
def _bez(p0, p1, p2, p3, t):
    u = 1 - t
    x = u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0]
    y = u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]
    dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0])
    dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1])
    d = math.hypot(dx, dy) or 1
    return (x, y), (dx / d, dy / d)
def ellipse(cx, cy, a, b, ang, n=72):
    ca, sa = math.cos(ang), math.sin(ang)
    return poly([(cx + a * math.cos(2 * math.pi * i / n) * ca - b * math.sin(2 * math.pi * i / n) * sa,
                  cy + a * math.cos(2 * math.pi * i / n) * sa + b * math.sin(2 * math.pi * i / n) * ca) for i in range(n)])
def teardrop(cx, cy, a, b, ang, point=.35, n=90):
    """egg/teardrop: pointed toward the base (negative local x)."""
    ca, sa = math.cos(ang), math.sin(ang); pts = []
    for i in range(n):
        th = 2 * math.pi * i / n; x = a * math.cos(th); y = b * math.sin(th)
        if x < 0: y *= (1 - point * (-x / a) ** 1.6); x *= 1 + point * .5 * (-x / a) ** 2
        pts.append((cx + x * ca - y * sa, cy + x * sa + y * ca))
    return poly(pts)
def feather(cv, p0, p1, p2, p3, s, E, G, Gb, lw=.12, eye_t=.82, nb=120, width=10.5, gold_barbs=True):
    # spine
    pts = [_bez(p0, p1, p2, p3, i / 100)[0] for i in range(101)]
    cv.stroke(poly(pts[:int(eye_t * 100) + 6], False), G, lw * 2.6, 'GOLD')
    (ex, ey), (tx, ty) = _bez(p0, p1, p2, p3, eye_t)
    ang = math.atan2(ty, tx)
    # barbs
    for i in range(nb):
        t = .04 + .96 * i / nb
        (x, y), (dx, dy) = _bez(p0, p1, p2, p3, t)
        nx, ny = -dy, dx
        env = math.sin(math.pi * min(1, t / 1.02) ** .85)
        L = s * (2.2 + width * env ** 1.2)
        if t > eye_t - .1: L *= 1 + .25 * math.exp(-((t - eye_t) / .08) ** 2)
        if t > eye_t: continue
        for sg in (1, -1):
            ex2 = x + sg * nx * L + dx * L * .72; ey2 = y + sg * ny * L + dy * L * .72
            c1 = (x + sg * nx * L * .55 + dx * L * .08, y + sg * ny * L * .55 + dy * L * .08)
            col, layer = (Gb, 'GOLD') if (gold_barbs and abs(t - eye_t) < .07 and i % 2 == 0) else (E, 'ENGRAVE')
            cv.stroke([('M', x, y), ('C', c1[0], c1[1], (c1[0] + ex2) / 2, (c1[1] + ey2) / 2, ex2, ey2)], col, lw, layer)
    # the eye (ocellus), centred a little beyond the spine point
    cx, cy = ex + tx * s * 1.2, ey + ty * s * 1.2
    # loose fibres radiating around the eye (the feather's halo)
    ca, sa = math.cos(ang), math.sin(ang)
    for k in range(150):
        th = -math.pi * .86 + 2 * math.pi * .86 * k / 149
        a0, b0 = s * 6.6, s * 5.4
        bx, by = a0 * math.cos(th), b0 * math.sin(th)
        Lh = s * (3.2 + 1.6 * math.sin(k * 1.7) ** 2) * (1 - .55 * abs(th) / math.pi)
        nxl, nyl = math.cos(th) / a0, math.sin(th) / b0; nl = math.hypot(nxl, nyl); nxl /= nl; nyl /= nl
        ex3, ey3 = bx + nxl * Lh + Lh * .25, by + nyl * Lh
        mx3, my3 = bx + nxl * Lh * .5, by + nyl * Lh * .5 + (Lh * .12 if th > 0 else -Lh * .12)
        P = lambda q: (cx + q[0] * ca - q[1] * sa, cy + q[0] * sa + q[1] * ca)
        col, layer = (Gb, 'GOLD') if k % 4 == 0 else (E, 'ENGRAVE')
        cv.stroke([('M',) + P((bx, by)), ('C',) + P((mx3, my3)) + P((mx3, my3)) + P((ex3, ey3))], col, lw * .8, layer)
    cv.fill(teardrop(cx, cy, s * 6.4, s * 5.2, ang), '#0b0b0c', 'KNOCKOUT')
    cv.stroke(teardrop(cx, cy, s * 6.4, s * 5.2, ang), G, lw * 2.4, 'GOLD')
    cv.stroke(teardrop(cx, cy, s * 5.7, s * 4.6, ang), G, lw * .9, 'GOLD')
    # engraved radial fibres in the outer band
    for k in range(64):
        th = 2 * math.pi * k / 64
        a1, b1, a2, b2 = s * 3.6, s * 2.9, s * 5.4, s * 4.35
        ca, sa = math.cos(ang), math.sin(ang)
        p_in = (a1 * math.cos(th), b1 * math.sin(th)); p_out = (a2 * math.cos(th), b2 * math.sin(th))
        P = lambda q: (cx + q[0] * ca - q[1] * sa, cy + q[0] * sa + q[1] * ca)
        cv.stroke(poly([P(p_in), P(p_out)], False), E, lw * .7, 'ENGRAVE')
    cv.stroke(teardrop(cx + tx * s * .5, cy + ty * s * .5, s * 3.5, s * 2.8, ang, .25), G, lw * 1.6, 'GOLD')
    cv.fill(teardrop(cx + tx * s * .9, cy + ty * s * .9, s * 2.3, s * 1.9, ang, .3), G, 'GOLD')
    # heart of the eye, left dark
    cv.fill(teardrop(cx + tx * s * 1.25, cy + ty * s * 1.25, s * 1.15, s * .95, ang, .3), '#0b0b0c', 'KNOCKOUT')
def plus_front(cv, m, art_only=False):
    cv.fill(rrect(0, 0, W, H, R), ('lin', 0, 0, W, H, X['bg']), 'BASE')
    clipped(cv, rrect(0, 0, W, H, R), lambda: feather(cv, (W + 3, -4), (W - 6, 14), (W - 4, 30), (53, H - 5.5), 1.0, X['steel'], X['gold'], X['gold3']))
    brand_row(cv, 6, H - 6 - 8.2, 8.2, {'dark': X['gold3'], 'light': X['gold2'], 'arc': X['gold']}, 'gloock', 13.5, X['gold3'], X['steel'], layer='GOLD', word_track=.2, sub=False)
    T(cv, 'work', 'GUEST HOUSE  ·  SRI DHAM MAYAPUR', 6, H - 18.0, 3.2, X['steel'], .32, layer='ENGRAVE')
    T(cv, 'arsenal', 'P L A T I N U M   P L U S', 6, H - 24.4, 5.2, X['gold3'], .3, layer='GOLD')
    cv.stroke(poly([(6, H - 26.2), (18, H - 26.2)], False), X['gold'], .14, 'GOLD')
    if not art_only:
        T(cv, 'arsenal', m['name'].upper(), 6, 10.6, 8.0, X['bright'], .14, layer='PERSONALISE')
        T(cv, 'plexmono', m['no'], 6, 6.4, 4.8, X['steel'], .14, layer='PERSONALISE')
        T(cv, 'work', 'SINCE ' + m['since'], 6 + text_width('plexmono', m['no'], 4.8, .14) + 3.4, 6.4, 3.4, X['gold'], .4, layer='PERSONALISE')
def plus_back(cv, m):
    cv.fill(rrect(0, 0, W, H, R), ('lin', 0, H, W, 0, X['bg']), 'BASE')
    clipped(cv, rect(0, 0, 13, H), lambda: feather(cv, (6.5, -3), (5.2, 14), (7.8, 28), (6.4, H - 7.5), .52, X['steel'], X['gold'], X['gold3'], eye_t=.86, nb=90, width=9))
    L = 16
    T(cv, 'gloock', 'NIKADI MEMBERSHIP', L, H - 8.6, 8.2, X['gold3'], .2, layer='GOLD')
    T(cv, 'work', 'PLATINUM PLUS  ·  YOUR PRIVILEGES', L, H - 12.0, 3.6, X['steel'], .36, layer='ENGRAVE')
    y = H - 16.8
    for b in BEN['plus']:
        cv.fill(circle(L + .55, y + .85, .32), X['gold'], 'GOLD')
        T(cv, 'work', b, L + 2, y, 4.7, X['bright'], .01, layer='ENGRAVE'); y -= 3.2
    qs = 13; qx = W - 6 - qs; qy = H - 10.5 - qs - 2.5
    cv.fill(rect(qx - 1.4, qy - 1.4, qs + 2.8, qs + 2.8), X['bright'], 'ENGRAVE')
    cv.fill(qr_cmds(APP_URL, qx, qy, qs), '#0a0a0b', 'KNOCKOUT')
    T(cv, 'work', 'YOUR CARD & POINTS', qx + qs / 2, qy - 4.3, 3.2, X['steel'], .24, align='center', layer='ENGRAVE')
    cv.stroke(poly([(L, 10.2), (W - 6, 10.2)], False), X['gold2'], .1, 'GOLD')
    T(cv, 'work', '+91 75011 01137   ·   www.nikadiguesthouse.com   ·   Opp. ISKCON Gate No. 4', (L + W - 6) / 2, 7.1, 3.8, X['bright'], .04, align='center', layer='ENGRAVE')
    T(cv, 'work', 'Personal and not transferable. Metal card: please do not bend. If found, return to Nikadi Guest House.', (L + W - 6) / 2, 4.6, 2.9, X['steel'], .02, align='center', layer='ENGRAVE')

TIERS = {'silver': (silver_front, silver_back), 'gold': (gold_front, gold_back), 'platinum': (platinum_front, platinum_back), 'plus': (plus_front, plus_back)}
