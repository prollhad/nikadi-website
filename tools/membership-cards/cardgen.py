"""Nikadi Guest House membership cards: print-ready vector PDFs.
Platinum: personalised PVC card (CMYK, 3 mm bleed).
Platinum Plus: metal card (separate spot-colour layers ENGRAVE / GOLD / PERSONALISE, die line, text as outlines).
All text is converted to outlines (no fonts needed at the printer)."""
import math, re, sys, json
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.colors import CMYKColor, CMYKColorSep, Color
from reportlab.graphics.barcode import qr as rlqr
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

FD = '/mnt/skills/examples/canvas-design/canvas-fonts/'
FONTS = {k: TTFont(FD + v) for k, v in {
    'display': 'Italiana-Regular.ttf', 'serif': 'InstrumentSerif-Regular.ttf', 'serifi': 'InstrumentSerif-Italic.ttf',
    'sans': 'WorkSans-Regular.ttf', 'sansb': 'WorkSans-Bold.ttf'}.items()}

W, H = 85.6 * mm, 53.98 * mm      # ISO/IEC 7810 ID-1 (CR80)
R = 3.18 * mm                      # corner radius
BLEED = 3 * mm
SAFE = 3.5 * mm

# ---------- text as outlines ----------
class RLPen(BasePen):
    def __init__(self, gs, path, x, y, s):
        super().__init__(gs); self.p, self.x, self.y, self.s = path, x, y, s
    def _t(self, pt): return self.x + pt[0] * self.s, self.y + pt[1] * self.s
    def _moveTo(self, pt): self.p.moveTo(*self._t(pt))
    def _lineTo(self, pt): self.p.lineTo(*self._t(pt))
    def _curveToOne(self, a, b, c): self.p.curveTo(*self._t(a), *self._t(b), *self._t(c))
    def _closePath(self): self.p.close()

def text_width(font, txt, size, track=0):
    f = FONTS[font]; cmap = f.getBestCmap(); hm = f['hmtx']; upm = f['head'].unitsPerEm
    w = sum(hm[cmap.get(ord(ch), cmap.get(32))][0] for ch in txt) * size / upm
    return w + track * size * max(0, len(txt) - 1)

def text(c, font, txt, x, y, size, color, track=0, align='left'):
    """Draw txt as filled outlines. track = extra letter spacing in em."""
    f = FONTS[font]; cmap = f.getBestCmap(); gs = f.getGlyphSet(); hm = f['hmtx']; upm = f['head'].unitsPerEm
    s = size / upm; tw = text_width(font, txt, size, track)
    if align == 'center': x -= tw / 2
    elif align == 'right': x -= tw
    p = c.beginPath()
    for ch in txt:
        g = cmap.get(ord(ch))
        if g is None: g = cmap.get(32)
        gs[g].draw(RLPen(gs, p, x, y, s))
        x += hm[g][0] * s + track * size
    c.setFillColor(color); c.drawPath(p, stroke=0, fill=1)
    return tw

# ---------- brand mark (vectorised from the logo) ----------
MARK_VB = (17, 12, 318, 345)
MARK = [  # (tone, points) in logo pixel space (y down)
    ('light', [(132,313),(172,312),(173,276),(169,276),(132,301)]),
    ('dark', None), ]
def load_mark():
    out = []
    for line in open(__import__('os').path.join(__import__('os').path.dirname(__file__), 'mark-raw.svg')):
        m = re.search(r'class="(\w+)" d="([^"]+)"', line)
        if not m: continue
        pts = [tuple(map(float, q.strip().split())) for q in m.group(2)[1:-2].split(' L')]
        out.append((m.group(1), pts))
    return out
MARK = [m for m in load_mark() if len(m[1]) < 10]   # blocks; the arc is redrawn smoothly below

def mark(c, x, y, h, light, dark, arc=None, only=None):
    """Draw the building mark with its bottom-left at (x, y), height h. only='light'|'dark'|'arc' to draw one tone."""
    vx, vy, vw, vh = MARK_VB; s = h / vh
    def P(px, py): return x + (px - vx) * s, y + (vy + vh - py) * s
    for tone, pts in MARK:
        if only and only != tone: continue
        p = c.beginPath(); p.moveTo(*P(*pts[0]))
        for q in pts[1:]: p.lineTo(*P(*q))
        p.close(); c.setFillColor(light if tone == 'light' else dark); c.drawPath(p, stroke=0, fill=1)
    if not only or only == 'arc':
        p = c.beginPath(); p.moveTo(*P(17, 356))
        a = P(176, 278); b = P(335, 356)
        p.curveTo(*_q2c(P(17, 356), a, b));
        a2 = P(176, 318); e = P(17, 356)
        p.curveTo(*_q2c(b, a2, e)); p.close()
        c.setFillColor(arc or light); c.drawPath(p, stroke=0, fill=1)
    return vw * s

def _q2c(p0, q, p2):
    c1 = (p0[0] + 2 / 3 * (q[0] - p0[0]), p0[1] + 2 / 3 * (q[1] - p0[1]))
    c2 = (p2[0] + 2 / 3 * (q[0] - p2[0]), p2[1] + 2 / 3 * (q[1] - p2[1]))
    return (*c1, *c2, *p2)

# ---------- helpers ----------
def card_path(c, x, y, w, h, r):
    p = c.beginPath(); p.roundRect(x, y, w, h, r); return p

def guilloche(c, cx, cy, r0, r1, color, lw=0.18, waves=18, lines=46, petals=7, clip=None):
    """Rosette of interlaced sine rings (security-print style)."""
    c.saveState()
    if clip is not None: c.clipPath(clip, stroke=0, fill=0)
    c.setStrokeColor(color); c.setLineWidth(lw); c.setLineJoin(1)
    for k in range(lines):
        ph = 2 * math.pi * k / lines
        p = c.beginPath()
        N = 900
        for i in range(N + 1):
            t = 2 * math.pi * i / N
            r = r0 + (r1 - r0) * (0.5 + 0.5 * math.sin(petals * t + ph)) * (0.85 + 0.15 * math.cos(waves * t))
            X, Y = cx + r * math.cos(t), cy + r * math.sin(t)
            (p.moveTo if i == 0 else p.lineTo)(X, Y)
        c.drawPath(p, stroke=1, fill=0)
    c.restoreState()

def ribbon(c, x0, x1, yc, color, n=26, amp=3.6 * mm, spread=1.4 * mm, lw=0.15, clip=None, fade=True):
    """Braided guilloche band across the card (interlaced sine strands)."""
    c.saveState()
    if clip is not None: c.clipPath(clip, stroke=0, fill=0)
    c.setStrokeColor(color); c.setLineWidth(lw); c.setLineJoin(1)
    w = x1 - x0
    for k in range(n):
        ph = 2 * math.pi * k / n
        p = c.beginPath()
        for i in range(401):
            u = i / 400; X = x0 + w * u
            env = math.sin(math.pi * u) ** 0.6 if fade else 1
            Y = yc + env * (amp * math.sin(2 * math.pi * 2.5 * u + ph) + spread * math.sin(2 * math.pi * 7.5 * u - 2 * ph))
            (p.moveTo if i == 0 else p.lineTo)(X, Y)
        c.drawPath(p, stroke=1, fill=0)
    c.restoreState()

def wave_lines(c, x0, y0, w, h, color, n=60, lw=0.12, amp=1.6 * mm, freq=2.2, clip=None):
    c.saveState()
    if clip is not None: c.clipPath(clip, stroke=0, fill=0)
    c.setStrokeColor(color); c.setLineWidth(lw)
    for k in range(n):
        yb = y0 + h * k / (n - 1)
        p = c.beginPath()
        for i in range(161):
            X = x0 + w * i / 160
            Y = yb + amp * math.sin(2 * math.pi * freq * i / 160 + k * 0.21) * math.sin(math.pi * i / 160)
            (p.moveTo if i == 0 else p.lineTo)(X, Y)
        c.drawPath(p, stroke=1, fill=0)
    c.restoreState()

def qr(c, data, x, y, size, dark, light=None):
    w = rlqr.QrCodeWidget(data, barLevel='M'); w.barFillColor = dark; w.barStrokeColor = dark
    b = w.getBounds(); bw, bh = b[2] - b[0], b[3] - b[1]
    d = Drawing(size, size, transform=[size / bw, 0, 0, size / bh, 0, 0]); d.add(w)
    if light is not None:
        c.setFillColor(light); c.rect(x, y, size, size, stroke=0, fill=1)
    renderPDF.draw(d, c, x, y)

def crop_marks(c, ox, oy, color):
    c.setStrokeColor(color); c.setLineWidth(0.25)
    L = 4 * mm; g = 1.5 * mm
    for (x, y) in [(ox, oy), (ox + W, oy), (ox, oy + H), (ox + W, oy + H)]:
        sx = -1 if x == ox else 1; sy = -1 if y == oy else 1
        c.line(x, y + sy * g, x, y + sy * (g + L)); c.line(x + sx * g, y, x + sx * (g + L), y)

BENEFITS = {
    'platinum': ['15% off every night, even on offer prices', '2 points for every ₹100 of room tariff',
                 'Free late check-out till 11 AM', 'Free room upgrade, when available', 'Free dental kit every stay'],
    'plus': ['20% off every night, even on offer prices', '4 points for every ₹100 of room tariff',
             'Free late check-out till 12 noon', 'Free extra mattress · room upgrade', 'Priority booking for Gaura Purnima & Kartik',
             'Your level is kept for 10 years'],
}

# =====================================================================
# PLATINUM: personalised PVC card, printed CMYK (+ optional silver foil)
# =====================================================================
P_BG1 = CMYKColor(.66, .48, .38, .82)    # deep graphite
P_BG2 = CMYKColor(.52, .36, .28, .52)    # lifted slate (top-right glow)
P_LINE = CMYKColor(.50, .34, .27, .48)   # guilloche, just above the ground
P_SIL = CMYKColor(.10, .05, .04, .08)    # platinum silver ink
P_SIL2 = CMYKColor(.28, .17, .13, .30)   # darker silver
P_MUTE = CMYKColor(.32, .20, .16, .30)
P_LINE2 = CMYKColor(.42, .28, .22, .40)
FOIL = CMYKColorSep(0, 0, 0, 1, spotName='SILVER_FOIL')

def platinum_front(c, ox, oy, m, foil_only=False):
    clip = card_path(c, ox - BLEED, oy - BLEED, W + 2 * BLEED, H + 2 * BLEED, 0)
    sil = FOIL if foil_only else P_SIL
    if not foil_only:
        c.saveState(); c.clipPath(clip, stroke=0, fill=0)
        c.linearGradient(ox - BLEED, oy - BLEED, ox + W + BLEED, oy + H + BLEED, (P_BG1, P_BG1, P_BG2), (0, .45, 1), extend=True)
        c.restoreState()
        ribbon(c, ox - BLEED, ox + W + BLEED, oy + 26 * mm, P_LINE2, n=30, lw=0.16, clip=clip, fade=False)
    # brand
    mh = 9.2 * mm
    mw = mark(c, ox + 6 * mm, oy + H - 6 * mm - mh, mh, sil, sil if foil_only else P_SIL2, sil)
    tx = ox + 6 * mm + mw + 2.6 * mm
    text(c, 'display', 'NIKADI', tx, oy + H - 11.6 * mm, 17, sil, track=.12)
    text(c, 'sans', 'GUEST HOUSE  ·  SRI DHAM MAYAPUR', tx + .3 * mm, oy + H - 14.6 * mm, 3.9, sil if foil_only else P_MUTE, track=.32)
    # level
    text(c, 'display', 'PLATINUM', ox + W - 6 * mm, oy + H - 10.4 * mm, 9.5, sil, track=.32, align='right')
    if not foil_only:
        c.setStrokeColor(P_SIL2); c.setLineWidth(.35); c.line(ox + W - 6 * mm - 8 * mm, oy + H - 12.6 * mm, ox + W - 6 * mm, oy + H - 12.6 * mm)
        text(c, 'sans', 'MEMBER', ox + W - 6 * mm, oy + H - 15.3 * mm, 3.7, P_MUTE, track=.42, align='right')
    # personalised
    if not foil_only:
        text(c, 'sans', 'MEMBER', ox + 6 * mm, oy + 14.6 * mm, 3.5, P_MUTE, track=.42)
        text(c, 'sans', m['name'].upper(), ox + 6 * mm, oy + 9.6 * mm, 8.6, P_SIL, track=.14)
        text(c, 'sans', 'NO.  ' + m['no'], ox + 6 * mm, oy + 5.6 * mm, 4.6, P_SIL2, track=.24)
        text(c, 'sans', 'MEMBER SINCE', ox + W - 6 * mm, oy + 9.6 * mm + 4.6, 3.5, P_MUTE, track=.42, align='right')
        text(c, 'display', m['since'], ox + W - 6 * mm, oy + 5.6 * mm, 11, P_SIL, track=.1, align='right')

def platinum_back(c, ox, oy, m):
    clip = card_path(c, ox - BLEED, oy - BLEED, W + 2 * BLEED, H + 2 * BLEED, 0)
    c.saveState(); c.clipPath(clip, stroke=0, fill=0)
    c.linearGradient(ox - BLEED, oy + H + BLEED, ox + W + BLEED, oy - BLEED, (P_BG1, P_BG1, P_BG2), (0, .5, 1), extend=True)
    c.restoreState()
    wave_lines(c, ox - BLEED, oy + H - 8 * mm, W + 2 * BLEED, 11 * mm, P_LINE, n=16, lw=0.14, amp=0.8 * mm, clip=clip)
    text(c, 'display', 'NIKADI MEMBERSHIP', ox + 6 * mm, oy + H - 8.2 * mm, 8.2, P_SIL, track=.28)
    text(c, 'sans', 'PLATINUM  ·  YOUR PRIVILEGES', ox + 6 * mm, oy + H - 11.6 * mm, 3.8, P_MUTE, track=.36)
    y = oy + H - 17.2 * mm
    for b in BENEFITS['platinum']:
        c.setFillColor(P_SIL2); c.circle(ox + 6.6 * mm, y + 1.15, .45 * mm / 1.4, stroke=0, fill=1)
        text(c, 'sans', b, ox + 8.2 * mm, y, 5.2, P_SIL, track=.01); y -= 3.55 * mm
    # QR
    qs = 15 * mm; qx = ox + W - 6 * mm - qs; qy = oy + H - 9 * mm - qs - 3.2 * mm
    c.setFillColor(P_SIL); c.roundRect(qx - 1.3 * mm, qy - 1.3 * mm, qs + 2.6 * mm, qs + 2.6 * mm, 1.2 * mm, stroke=0, fill=1)
    qr(c, 'https://www.nikadiguesthouse.com/app/', qx, qy, qs, P_BG1)
    text(c, 'sans', 'YOUR CARD & POINTS', qx + qs / 2, qy - 4.2 * mm, 3.4, P_MUTE, track=.24, align='center')
    c.setStrokeColor(P_SIL2); c.setLineWidth(.3); c.line(ox + 6 * mm, oy + 9.6 * mm, ox + W - 6 * mm, oy + 9.6 * mm)
    text(c, 'sans', '+91 75011 01137   ·   www.nikadiguesthouse.com   ·   Opp. ISKCON Gate No. 4, Sri Dham Mayapur', ox + W / 2, oy + 6.6 * mm, 4.15, P_SIL, track=.04, align='center')
    text(c, 'sans', 'Personal and not transferable. Show this card at reception. If found, please return it to Nikadi Guest House.', ox + W / 2, oy + 3.8 * mm, 3.25, P_MUTE, track=.02, align='center')

# =====================================================================
# PLATINUM PLUS: metal card (black PVD stainless steel)
# Layers: ENGRAVE (laser, shows bright steel) / GOLD_24K (gold plating or gold fill) / PERSONALISE (engraved per card)
# =====================================================================
M_BLACK = CMYKColor(.7, .6, .55, .95)
M_STEEL = CMYKColor(.18, .12, .1, .28)
M_GOLD = CMYKColor(.12, .32, .78, .12)
M_GOLD2 = CMYKColor(.05, .18, .55, .02)
SEP = {'ENGRAVE': CMYKColorSep(0, 0, 0, 1, spotName='ENGRAVE'),
       'GOLD_24K': CMYKColorSep(0, .3, .9, .1, spotName='GOLD_24K'),
       'PERSONALISE': CMYKColorSep(0, 1, 0, 0, spotName='PERSONALISE'),
       'DIELINE': CMYKColorSep(1, 0, 0, 0, spotName='DIELINE')}

def plus_front(c, ox, oy, m, layer=None):
    """layer None = colour proof; else draw only that layer in its spot colour."""
    E = SEP['ENGRAVE'] if layer else M_STEEL
    G = SEP['GOLD_24K'] if layer else M_GOLD
    PZ = SEP['PERSONALISE'] if layer else M_STEEL
    clip = card_path(c, ox, oy, W, H, R)
    if layer is None:
        c.saveState(); c.clipPath(clip, stroke=0, fill=0)
        c.linearGradient(ox, oy, ox + W, oy + H, (M_BLACK, CMYKColor(.68, .58, .52, .82), M_BLACK), (0, .55, 1), extend=True)
        c.restoreState()
    if layer in (None, 'ENGRAVE'):
        ribbon(c, ox + 2.4 * mm, ox + W - 2.4 * mm, oy + 26 * mm, E, n=30, lw=0.12, clip=clip)
        c.saveState(); c.setStrokeColor(E); c.setLineWidth(.3)
        c.roundRect(ox + 2.4 * mm, oy + 2.4 * mm, W - 4.8 * mm, H - 4.8 * mm, R - 1 * mm, stroke=1, fill=0); c.restoreState()
        text(c, 'sans', 'GUEST HOUSE  ·  SRI DHAM MAYAPUR', ox + 6 * mm + 10.4 * mm, oy + H - 14.8 * mm, 3.9, E, track=.32)
        text(c, 'sans', 'MEMBER', ox + 6 * mm, oy + 14.6 * mm, 3.5, E, track=.42)
        text(c, 'sans', 'MEMBER SINCE', ox + W - 6 * mm, oy + 9.6 * mm + 4.6, 3.5, E, track=.42, align='right')
        text(c, 'sans', 'KEPT FOR 10 YEARS', ox + W - 6 * mm, oy + H - 15.4 * mm, 3.5, E, track=.36, align='right')
    if layer in (None, 'GOLD_24K'):
        mh = 9.6 * mm
        mw = mark(c, ox + 6 * mm, oy + H - 6 * mm - mh, mh, G, G if layer else M_GOLD2, G)
        text(c, 'display', 'NIKADI', ox + 6 * mm + mw + 2.6 * mm, oy + H - 11.8 * mm, 17.5, G, track=.12)
        text(c, 'display', 'PLATINUM PLUS', ox + W - 6 * mm, oy + H - 10.4 * mm, 8.6, G, track=.26, align='right')
        if layer is None or layer == 'GOLD_24K':
            c.setStrokeColor(G); c.setLineWidth(.35); c.line(ox + W - 6 * mm - 10 * mm, oy + H - 12.6 * mm, ox + W - 6 * mm, oy + H - 12.6 * mm)
    if layer in (None, 'PERSONALISE'):
        text(c, 'sans', m['name'].upper(), ox + 6 * mm, oy + 9.6 * mm, 8.6, PZ if layer else CMYKColor(.08, .05, .04, .06), track=.14)
        text(c, 'sans', 'NO.  ' + m['no'], ox + 6 * mm, oy + 5.6 * mm, 4.6, PZ, track=.24)
        text(c, 'display', m['since'], ox + W - 6 * mm, oy + 5.6 * mm, 11, PZ if layer else M_GOLD, track=.1, align='right')

def plus_back(c, ox, oy, m, layer=None):
    E = SEP['ENGRAVE'] if layer else M_STEEL
    G = SEP['GOLD_24K'] if layer else M_GOLD
    clip = card_path(c, ox, oy, W, H, R)
    if layer is None:
        c.saveState(); c.clipPath(clip, stroke=0, fill=0)
        c.linearGradient(ox, oy + H, ox + W, oy, (M_BLACK, CMYKColor(.68, .58, .52, .82), M_BLACK), (0, .5, 1), extend=True)
        c.restoreState()
    if layer in (None, 'GOLD_24K'):
        text(c, 'display', 'NIKADI MEMBERSHIP', ox + 6 * mm, oy + H - 8.2 * mm, 8.2, G, track=.28)
    if layer in (None, 'ENGRAVE'):
        c.saveState(); c.setStrokeColor(E); c.setLineWidth(.3)
        c.roundRect(ox + 2.4 * mm, oy + 2.4 * mm, W - 4.8 * mm, H - 4.8 * mm, R - 1 * mm, stroke=1, fill=0); c.restoreState()
        text(c, 'sans', 'PLATINUM PLUS  ·  YOUR PRIVILEGES', ox + 6 * mm, oy + H - 11.6 * mm, 3.8, E, track=.36)
        y = oy + H - 16.4 * mm
        for b in BENEFITS['plus']:
            c.setFillColor(E); c.circle(ox + 6.6 * mm, y + 1.15, .45 * mm / 1.4, stroke=0, fill=1)
            text(c, 'sans', b, ox + 8.2 * mm, y, 4.9, E, track=.01); y -= 3.2 * mm
        # QR: engrave the light square, leave the modules black, so it scans the normal way round
        qs = 14 * mm; qx = ox + W - 6.5 * mm - qs; qy = oy + 15.2 * mm
        c.setFillColor(E); c.rect(qx - 1.4 * mm, qy - 1.4 * mm, qs + 2.8 * mm, qs + 2.8 * mm, stroke=0, fill=1)
        qr(c, 'https://www.nikadiguesthouse.com/app/', qx, qy, qs, CMYKColor(0, 0, 0, 0) if layer else M_BLACK)
        c.setStrokeColor(E); c.setLineWidth(.3); c.line(ox + 6 * mm, oy + 10.2 * mm, ox + W - 6 * mm, oy + 10.2 * mm)
        text(c, 'sans', '+91 75011 01137   ·   www.nikadiguesthouse.com   ·   Opp. ISKCON Gate No. 4, Sri Dham Mayapur', ox + W / 2, oy + 7.2 * mm, 4.1, E, track=.04, align='center')
        text(c, 'sans', 'Personal and not transferable. Metal card: please do not bend. If found, return to Nikadi Guest House.', ox + W / 2, oy + 4.5 * mm, 3.2, E, track=.02, align='center')

def dieline(c, ox, oy, color):
    c.saveState(); c.setStrokeColor(color); c.setLineWidth(.25); c.roundRect(ox, oy, W, H, R, stroke=1, fill=0); c.restoreState()
