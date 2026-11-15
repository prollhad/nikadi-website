"""Tiny two-backend vector engine for the Nikadi membership cards.
The same drawing code renders to:
  - PDF (reportlab, CMYK or named spot colours) for print, and
  - SVG for the member app (artwork only, or the whole card).
Units are millimetres, origin bottom-left. All text is drawn as outlines (fontTools)."""
import math, os
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

FD = '/mnt/skills/examples/canvas-design/canvas-fonts/'
_F = {}
FONT_FILES = {'italiana': 'Italiana-Regular.ttf', 'work': 'WorkSans-Regular.ttf', 'workb': 'WorkSans-Bold.ttf',
              'gloock': 'Gloock-Regular.ttf', 'crimson': 'CrimsonPro-Regular.ttf', 'crimsoni': 'CrimsonPro-Italic.ttf',
              'arsenal': 'ArsenalSC-Regular.ttf', 'poiret': 'PoiretOne-Regular.ttf', 'jura': 'Jura-Light.ttf',
              'plexmono': 'IBMPlexMono-Regular.ttf', 'instr': 'InstrumentSerif-Regular.ttf', 'instri': 'InstrumentSerif-Italic.ttf'}
def font(name):
    if name not in _F: _F[name] = TTFont(FD + FONT_FILES[name])
    return _F[name]

W, H, R = 85.6, 53.98, 3.18
PT = 25.4 / 72  # 1 pt in mm

class _Pen(BasePen):
    def __init__(self, gs, out, x, y, s, rot):
        super().__init__(gs); self.o, self.x, self.y, self.s = out, x, y, s
        self.c, self.sn = math.cos(rot), math.sin(rot)
    def t(self, p):
        X, Y = p[0] * self.s, p[1] * self.s
        return (self.x + X * self.c - Y * self.sn, self.y + X * self.sn + Y * self.c)
    def _moveTo(self, p): self.o.append(('M',) + self.t(p))
    def _lineTo(self, p): self.o.append(('L',) + self.t(p))
    def _curveToOne(self, a, b, c): self.o.append(('C',) + self.t(a) + self.t(b) + self.t(c))
    def _closePath(self): self.o.append(('Z',))

def text_width(fname, s, size_pt, track=0):
    f = font(fname); cm = f.getBestCmap(); hm = f['hmtx']; upm = f['head'].unitsPerEm
    sz = size_pt * PT
    return sum(hm[cm.get(ord(ch), cm.get(32))][0] for ch in s) * sz / upm + track * sz * max(0, len(s) - 1)

def text_cmds(fname, s, x, y, size_pt, track=0, align='left', rot=0):
    f = font(fname); cm = f.getBestCmap(); gs = f.getGlyphSet(); hm = f['hmtx']; upm = f['head'].unitsPerEm
    sz = size_pt * PT; sc = sz / upm; tw = text_width(fname, s, size_pt, track)
    off = {'left': 0, 'center': -tw / 2, 'right': -tw}[align]
    cr, sr = math.cos(rot), math.sin(rot)
    x += off * cr; y += off * sr
    out = []
    for ch in s:
        g = cm.get(ord(ch), cm.get(32))
        gs[g].draw(_Pen(gs, out, x, y, sc, rot))
        adv = hm[g][0] * sc + track * sz
        x += adv * cr; y += adv * sr
    return out

def hex2rgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))

# ---------------------------------------------------------------- backends
class SVG:
    def __init__(self, w=W, h=H, bleed=0):
        self.w, self.h, self.b = w, h, bleed; self.defs = []; self.body = []; self.n = 0
    def _y(self, y): return self.h - y
    def _d(self, cmds):
        o = []
        for c in cmds:
            if c[0] == 'Z': o.append('Z')
            elif c[0] in 'ML': o.append('%s%.3f %.3f' % (c[0], c[1], self._y(c[2])))
            else: o.append('C%.3f %.3f %.3f %.3f %.3f %.3f' % (c[1], self._y(c[2]), c[3], self._y(c[4]), c[5], self._y(c[6])))
        return ''.join(o)
    def _paint(self, p):
        if isinstance(p, str): return p
        self.n += 1; gid = 'g%d' % self.n
        if p[0] == 'lin':
            _, x0, y0, x1, y1, stops = p
            self.defs.append('<linearGradient id="%s" gradientUnits="userSpaceOnUse" x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f">%s</linearGradient>' % (
                gid, x0, self._y(y0), x1, self._y(y1), ''.join('<stop offset="%.3f" stop-color="%s"/>' % (o, c) for o, c in stops)))
        else:
            _, cx, cy, r, stops = p
            self.defs.append('<radialGradient id="%s" gradientUnits="userSpaceOnUse" cx="%.2f" cy="%.2f" r="%.2f">%s</radialGradient>' % (
                gid, cx, self._y(cy), r, ''.join('<stop offset="%.3f" stop-color="%s"/>' % (o, c) for o, c in stops)))
        return 'url(#%s)' % gid
    def fill(self, cmds, paint, layer=None): self.body.append('<path d="%s" fill="%s"/>' % (self._d(cmds), self._paint(paint)))
    def stroke(self, cmds, paint, lw, layer=None, cap='round'):
        self.body.append('<path d="%s" fill="none" stroke="%s" stroke-width="%.3f" stroke-linecap="%s" stroke-linejoin="round"/>' % (self._d(cmds), self._paint(paint), lw, cap))
    def begin_clip(self, cmds):
        self.n += 1; cid = 'c%d' % self.n
        self.defs.append('<clipPath id="%s"><path d="%s"/></clipPath>' % (cid, self._d(cmds)))
        self.body.append('<g clip-path="url(#%s)">' % cid)
    def end_clip(self): self.body.append('</g>')
    def svg(self):
        b = self.b
        return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%.2f %.2f %.2f %.2f" width="%.2fmm" height="%.2fmm">' % (-b, -b, self.w + 2 * b, self.h + 2 * b, self.w + 2 * b, self.h + 2 * b)
                + ('<defs>%s</defs>' % ''.join(self.defs) if self.defs else '') + ''.join(self.body) + '</svg>')

class PDF:
    """reportlab backend. colour(hex) -> CMYK by table (or naive). layer filter for metal production pages."""
    def __init__(self, c, ox, oy, cmyk=None, layer=None, spot=None):
        from reportlab.lib.units import mm
        self.c, self.ox, self.oy, self.mm = c, ox, oy, mm; self.cmyk = cmyk or {}; self.layer = layer; self.spot = spot or {}
    def col(self, h):
        from reportlab.lib.colors import CMYKColor
        if h in self.cmyk: return CMYKColor(*self.cmyk[h])
        r, g, b = hex2rgb(h); k = 1 - max(r, g, b)
        if k >= 1: return CMYKColor(0, 0, 0, 1)
        return CMYKColor((1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k)
    def _P(self, x, y): return self.ox + x * self.mm, self.oy + y * self.mm
    def _path(self, cmds):
        p = self.c.beginPath()
        for c in cmds:
            if c[0] == 'M': p.moveTo(*self._P(c[1], c[2]))
            elif c[0] == 'L': p.lineTo(*self._P(c[1], c[2]))
            elif c[0] == 'C': p.curveTo(*self._P(c[1], c[2]), *self._P(c[3], c[4]), *self._P(c[5], c[6]))
            else: p.close()
        return p
    def begin_clip(self, cmds):
        self.c.saveState(); self.c.clipPath(self._path(cmds), stroke=0, fill=0)
    def end_clip(self): self.c.restoreState()
    def _skip(self, layer):
        if self.layer is None: return False
        if layer == 'KNOCKOUT' and self.layer == 'ENGRAVE': return False
        return layer != self.layer
    def _setfill(self, paint, layer):
        if self.layer is not None:
            from reportlab.lib.colors import CMYKColor
            self.c.setFillColor(CMYKColor(0, 0, 0, 0) if layer == 'KNOCKOUT' else self.spot[self.layer]); return None
        if isinstance(paint, str): self.c.setFillColor(self.col(paint)); return None
        return paint
    def fill(self, cmds, paint, layer=None):
        if self._skip(layer): return
        g = self._setfill(paint, layer); p = self._path(cmds)
        if g is None: self.c.drawPath(p, stroke=0, fill=1); return
        self.c.saveState(); self.c.clipPath(p, stroke=0, fill=0)
        if g[0] == 'lin':
            _, x0, y0, x1, y1, stops = g
            self.c.linearGradient(*self._P(x0, y0), *self._P(x1, y1), [self.col(s[1]) for s in stops], [s[0] for s in stops], extend=True)
        else:
            _, cx, cy, r, stops = g
            self.c.radialGradient(*self._P(cx, cy), r * self.mm, [self.col(s[1]) for s in stops], [s[0] for s in stops], extend=True)
        self.c.restoreState()
    def stroke(self, cmds, paint, lw, layer=None, cap='round'):
        if self._skip(layer): return
        if self.layer is not None: self.c.setStrokeColor(self.spot[self.layer])
        else: self.c.setStrokeColor(self.col(paint if isinstance(paint, str) else paint[-1][-1][1]))
        self.c.setLineWidth(lw * self.mm); self.c.setLineCap(1 if cap == 'round' else 0); self.c.setLineJoin(1)
        self.c.drawPath(self._path(cmds), stroke=1, fill=0)

# ---------------------------------------------------------------- shapes
def rect(x, y, w, h): return [('M', x, y), ('L', x + w, y), ('L', x + w, y + h), ('L', x, y + h), ('Z',)]
def rrect(x, y, w, h, r):
    k = 0.5523 * r
    return [('M', x + r, y), ('L', x + w - r, y), ('C', x + w - r + k, y, x + w, y + r - k, x + w, y + r), ('L', x + w, y + h - r),
            ('C', x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h), ('L', x + r, y + h),
            ('C', x + r - k, y + h, x, y + h - r + k, x, y + h - r), ('L', x, y + r), ('C', x, y + r - k, x + r - k, y, x + r, y), ('Z',)]
def circle(cx, cy, r):
    k = 0.5523 * r
    return [('M', cx + r, cy), ('C', cx + r, cy + k, cx + k, cy + r, cx, cy + r), ('C', cx - k, cy + r, cx - r, cy + k, cx - r, cy),
            ('C', cx - r, cy - k, cx - k, cy - r, cx, cy - r), ('C', cx + k, cy - r, cx + r, cy - k, cx + r, cy), ('Z',)]
def poly(pts, close=True):
    o = [('M',) + tuple(pts[0])] + [('L',) + tuple(p) for p in pts[1:]]
    return o + ([('Z',)] if close else [])
def arc(cx, cy, r, a0, a1, n=None):
    n = n or max(8, int(abs(a1 - a0) / (math.pi / 90)))
    return poly([(cx + r * math.cos(a0 + (a1 - a0) * i / n), cy + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)], close=False)

# ---------------------------------------------------------------- brand mark (vector re-draw of the Nikadi logo)
_MARK = None
def _load_mark():
    import re
    out = []
    here = os.path.dirname(os.path.abspath(__file__))
    for line in open(os.path.join(here, 'mark-raw.svg')):
        m = re.search(r'class="(\w+)" d="([^"]+)"', line)
        if m and m.group(2).count('L') < 10:
            out.append((m.group(1), [tuple(map(float, q.strip().split())) for q in m.group(2)[1:-2].split(' L')]))
    return out
def mark_shapes(x, y, h):
    """Return [(tone, cmds)] for the building mark, bottom-left at (x, y), height h mm. tones: dark, light, arc."""
    global _MARK
    if _MARK is None: _MARK = _load_mark()
    vx, vy, vw, vh = 17, 12, 318, 345; s = h / vh
    P = lambda px, py: (x + (px - vx) * s, y + (vy + vh - py) * s)
    out = [(t, poly([P(*q) for q in pts])) for t, pts in _MARK]
    def q2c(p0, q, p2): return (p0[0] + 2 / 3 * (q[0] - p0[0]), p0[1] + 2 / 3 * (q[1] - p0[1]), p2[0] + 2 / 3 * (q[0] - p2[0]), p2[1] + 2 / 3 * (q[1] - p2[1]), p2[0], p2[1])
    a, b, c, d = P(17, 356), P(176, 278), P(335, 356), P(176, 318)
    out.append(('arc', [('M',) + a, ('C',) + q2c(a, b, c), ('C',) + q2c(c, d, a), ('Z',)]))
    return out, vw * s
