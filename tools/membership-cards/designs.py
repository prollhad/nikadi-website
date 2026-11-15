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
def platinum_front(cv, m, art_only=False):
    cv.fill(rect(-3, -3, W + 6, H + 6), ('rad', 64, 30, 80, P_['bg']), 'BASE')
    clipped(cv, rect(-3, -3, W + 6, H + 6), lambda: lattice(cv, P_['lat']))
    inner = rrect(3.6, 3.6, W - 7.2, H - 7.2, 1.2)
    clipped(cv, inner, lambda: lace(cv, 70, 27, .8, P_['orn'], .15))
    cv.stroke(rrect(2.7, 2.7, W - 5.4, H - 5.4, 1.8), P_['plat2'], .3, 'FOIL')
    cv.stroke(inner, P_['plat2'], .12, 'FOIL')
    brand_row(cv, 7, H - 7 - 7.8, 7.8, {'dark': P_['plat'], 'light': P_['plat2'], 'arc': P_['plat2']}, 'gloock', 13.5, P_['plat'], P_['sub'], layer='FOIL', word_track=.2)
    T(cv, 'arsenal', 'P L A T I N U M   M E M B E R', 7, H - 21.6, 5.0, P_['plat'], .3, layer='FOIL')
    cv.stroke(poly([(7, H - 23.4), (19, H - 23.4)], False), P_['plat2'], .14, 'FOIL')
    if not art_only:
        T(cv, 'arsenal', m['name'].upper(), 7, 10.6, 8.4, P_['plat'], .16, layer='FOIL')
        T(cv, 'plexmono', m['no'], 7, 6.4, 5.0, P_['plat2'], .14, layer='FOIL')
        T(cv, 'work', 'SINCE ' + m['since'], 7 + text_width('plexmono', m['no'], 5.0, .14) + 4, 6.4, 3.6, P_['plat2'], .4, layer='FOIL')
def platinum_back(cv, m):
    cv.fill(rect(-3, -3, W + 6, H + 6), ('rad', 20, 40, 80, P_['bg']), 'BASE')
    clipped(cv, rect(-3, -3, W + 6, H + 6), lambda: lattice(cv, P_['lat']))
    clipped(cv, rrect(3.6, 3.6, W - 7.2, H - 7.2, 1.2), lambda: lace(cv, 30, 22, .8, '#2a4478', .13, 'INK'))
    cv.stroke(rrect(2.7, 2.7, W - 5.4, H - 5.4, 1.8), P_['plat2'], .3, 'FOIL')
    cv.stroke(rrect(3.6, 3.6, W - 7.2, H - 7.2, 1.2), P_['plat2'], .12, 'FOIL')
    back_common(cv, 'platinum', 'gloock', P_['plat'], P_['sub'], '#e9eef5', P_['plat2'], '#0c1a3a', '#eef2f7', P_['plat2'], '#a7b5c9', title_track=.2,
                right=W - 7.4)

# =========================================================== PLATINUM PLUS: Obsidian Star (metal)
X = dict(bg=[(0, '#0a0a0b'), (.5, '#1b1a1d'), (1, '#0a0a0b')], steel='#8f9297', bright='#d9dadc', gold='#d4b06a', gold2='#a8823f', gold3='#f0d99a')
def star_mandala(cv, cx, cy, s, E, G, lw, gold_core=True):
    # gold core: 8-petal lotus + ring
    petal_ring(cv, cx, cy, s, 8, 1.6, 6.8, .5, G, lw * 1.2, 'GOLD' if gold_core else 'ENGRAVE')
    ring(cv, cx, cy, s * 1.2, G, lw * 1.2, 'GOLD' if gold_core else 'ENGRAVE')
    ring(cv, cx, cy, s * 7.6, G, lw * 1.4, 'GOLD' if gold_core else 'ENGRAVE')
    # temple-arch star: 16 tall pointed arches + 16 short ones between (engraved)
    petal_ring(cv, cx, cy, s, 16, 7.6, 16.2, .2, E, lw, 'ENGRAVE')
    petal_ring(cv, cx, cy, s, 16, 7.6, 12.4, .16, E, lw * .8, 'ENGRAVE', rot=math.pi / 16, vein=False)
    ring(cv, cx, cy, s * 16.9, E, lw, 'ENGRAVE'); ring(cv, cx, cy, s * 17.5, E, lw * .6, 'ENGRAVE')
    petal_ring(cv, cx, cy, s, 32, 17.5, 23.8, .1, E, lw * .9, 'ENGRAVE')
    petal_ring(cv, cx, cy, s, 32, 17.5, 21.2, .1, E, lw * .55, 'ENGRAVE', rot=math.pi / 32, vein=False)
    ring(cv, cx, cy, s * 24.5, E, lw * 1.1, 'ENGRAVE'); ring(cv, cx, cy, s * 25.1, E, lw * .6, 'ENGRAVE')
    # fine lace of small interlaced rings
    for i in range(60):
        a = 2 * math.pi * i / 60
        cv.stroke(circle(cx + s * 26.7 * math.cos(a), cy + s * 26.7 * math.sin(a), s * 1.6), E, lw * .55, 'ENGRAVE')
    ring(cv, cx, cy, s * 28.3, E, lw * .8, 'ENGRAVE')
    dots(cv, cx, cy, s * 29.6, 72, s * .24, G, 'GOLD')
def plus_front(cv, m, art_only=False):
    cv.fill(rrect(0, 0, W, H, R), ('lin', 0, 0, W, H, X['bg']), 'BASE')
    inner = rrect(3.6, 3.6, W - 7.2, H - 7.2, 1.2)
    clipped(cv, inner, lambda: star_mandala(cv, 70, 27, .8, X['steel'], X['gold'], .14))
    cv.stroke(rrect(2.7, 2.7, W - 5.4, H - 5.4, 1.8), X['gold'], .3, 'GOLD')
    cv.stroke(inner, X['steel'], .12, 'ENGRAVE')
    brand_row(cv, 7, H - 7 - 7.8, 7.8, {'dark': X['gold3'], 'light': X['gold2'], 'arc': X['gold']}, 'gloock', 13.5, X['gold3'], X['steel'], layer='GOLD', word_track=.2, sub=False)
    T(cv, 'work', 'GUEST HOUSE  ·  SRI DHAM MAYAPUR', 7 + 7.8 * 318 / 345 + 2.6, H - 15.2, 3.5, X['steel'], .3, layer='ENGRAVE')
    T(cv, 'arsenal', 'P L A T I N U M   P L U S', 7, H - 21.6, 5.0, X['gold3'], .3, layer='GOLD')
    cv.stroke(poly([(7, H - 23.4), (19, H - 23.4)], False), X['gold'], .14, 'GOLD')
    if not art_only:
        T(cv, 'arsenal', m['name'].upper(), 7, 10.6, 8.4, X['bright'], .16, layer='PERSONALISE')
        T(cv, 'plexmono', m['no'], 7, 6.4, 5.0, X['steel'], .14, layer='PERSONALISE')
        T(cv, 'work', 'SINCE ' + m['since'], 7 + text_width('plexmono', m['no'], 5.0, .14) + 4, 6.4, 3.6, X['gold'], .4, layer='PERSONALISE')
def plus_back(cv, m):
    cv.fill(rrect(0, 0, W, H, R), ('lin', 0, H, W, 0, X['bg']), 'BASE')
    cv.stroke(rrect(2.7, 2.7, W - 5.4, H - 5.4, 1.8), X['gold'], .3, 'GOLD')
    cv.stroke(rrect(3.6, 3.6, W - 7.2, H - 7.2, 1.2), X['steel'], .12, 'ENGRAVE')
    T(cv, 'gloock', 'NIKADI MEMBERSHIP', 7, H - 8.6, 8.2, X['gold3'], .2, layer='GOLD')
    T(cv, 'work', 'PLATINUM PLUS  ·  YOUR PRIVILEGES', 7, H - 12.0, 3.6, X['steel'], .36, layer='ENGRAVE')
    y = H - 16.8
    for b in BEN['plus']:
        cv.fill(circle(7.55, y + .85, .32), X['gold'], 'GOLD')
        T(cv, 'work', b, 9.0, y, 4.8, X['bright'], .01, layer='ENGRAVE'); y -= 3.25
    qs = 13.5; qx = W - 7.4 - qs; qy = H - 10.5 - qs - 2.5
    cv.fill(rect(qx - 1.4, qy - 1.4, qs + 2.8, qs + 2.8), X['bright'], 'ENGRAVE')
    cv.fill(qr_cmds(APP_URL, qx, qy, qs), '#0a0a0b', 'KNOCKOUT')
    T(cv, 'work', 'YOUR CARD & POINTS', qx + qs / 2, qy - 4.3, 3.2, X['steel'], .24, align='center', layer='ENGRAVE')
    cv.stroke(poly([(7, 10.2), (W - 7.4, 10.2)], False), X['gold2'], .1, 'GOLD')
    T(cv, 'work', CONTACT, (7 + W - 7.4) / 2, 7.1, 3.9, X['bright'], .04, align='center', layer='ENGRAVE')
    T(cv, 'work', 'Personal and not transferable. Metal card: please do not bend. If found, return to Nikadi Guest House.', (7 + W - 7.4) / 2, 4.6, 3.0, X['steel'], .02, align='center', layer='ENGRAVE')

TIERS = {'silver': (silver_front, silver_back), 'gold': (gold_front, gold_back), 'platinum': (platinum_front, platinum_back), 'plus': (plus_front, plus_back)}
