"""Build print files for all four Nikadi membership cards.
python3 build2.py OUTDIR [name] [number] [year]"""
import sys, os, subprocess, zipfile
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import CMYKColor, CMYKColorSep
from reportlab.lib.utils import simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont as RLTT
from engine import *
from designs import TIERS
pdfmetrics.registerFont(RLTT('WS', FD + 'WorkSans-Regular.ttf')); pdfmetrics.registerFont(RLTT('WSB', FD + 'WorkSans-Bold.ttf')); pdfmetrics.registerFont(RLTT('IT', FD + 'Italiana-Regular.ttf'))
INK = CMYKColor(0, 0, 0, .9); GREY = CMYKColor(0, 0, 0, .55); RULE = CMYKColor(0, 0, 0, .15)
B = 3  # bleed mm
SPOT = {'FOIL': CMYKColorSep(0, .25, .8, .1, spotName='FOIL'), 'ENGRAVE': CMYKColorSep(0, 0, 0, 1, spotName='ENGRAVE'),
        'GOLD': CMYKColorSep(0, .3, .9, .1, spotName='GOLD_24K'), 'PERSONALISE': CMYKColorSep(0, 1, 0, 0, spotName='PERSONALISE')}
DIE = CMYKColorSep(1, 0, 0, 0, spotName='DIELINE')
CMYK = {'#0a0a0b': (.72, .62, .56, .96), '#1b1a1d': (.7, .62, .55, .86), '#0b1524': (.95, .78, .45, .7), '#2a0610': (.35, .95, .7, .72)}
NAMES = {'silver': 'Silver', 'gold': 'Gold', 'platinum': 'Platinum', 'plus': 'Platinum Plus'}

def para(c, x, y, lines, size=8.2, lead=11.2, width=174 * mm):
    for ln in lines:
        ind = ln.startswith('  '); ln = ln.strip(); xi = x + (4 * mm if ind else 0)
        for part in simpleSplit(ln, 'WS', size, width - (xi - x)):
            c.setFont('WS', size); c.setFillColor(INK); c.drawString(xi, y, part); y -= lead
        y -= 2
    return y

def draw_card(c, ox, oy, fn, m, layer=None, clip_round=False):
    cv = PDF(c, ox, oy, cmyk=CMYK, layer=layer, spot=SPOT)
    if clip_round: cv.begin_clip(rrect(0, 0, W, H, R))
    fn(cv, m)
    if clip_round: cv.end_clip()

def spec(c, title, sub, tier_rows, info, notes):
    c.setPageSize(A4); pw, ph = A4
    c.setFillColor(INK); c.setFont('IT', 24); c.drawString(18 * mm, ph - 26 * mm, title)
    c.setFont('WS', 9.5); c.setFillColor(GREY); c.drawString(18 * mm, ph - 33 * mm, sub)
    c.setStrokeColor(RULE); c.setLineWidth(.6); c.line(18 * mm, ph - 37 * mm, pw - 18 * mm, ph - 37 * mm)
    y = ph - 44 * mm
    sc = .82 if len(tier_rows) > 1 else 1
    for fns, lab in tier_rows:
        y -= H * sc * mm
        x = 18 * mm
        for fn in fns:
            c.saveState(); c.translate(x, y); c.scale(sc, sc); draw_card(c, 0, 0, fn, M, clip_round=True); c.restoreState()
            x += (W * sc + 8) * mm
        c.setFont('WS', 7.5); c.setFillColor(GREY); c.drawString(x - 2 * mm, y + H * sc * mm / 2, lab)
        y -= 7 * mm
    y -= 2 * mm
    c.setFont('WSB', 10); c.setFillColor(INK); c.drawString(18 * mm, y, 'Specification'); y -= 6.5 * mm
    for k, v in info:
        c.setFont('WS', 8.2); c.setFillColor(GREY); c.drawString(18 * mm, y, k); c.setFillColor(INK); c.drawString(62 * mm, y, v); y -= 5 * mm
    y -= 3 * mm
    c.setFont('WSB', 10); c.setFillColor(INK); c.drawString(18 * mm, y, 'Notes for the printer'); y -= 6.5 * mm
    para(c, 18 * mm, y, notes)
    c.setFont('WS', 7); c.setFillColor(GREY); c.drawString(18 * mm, 12 * mm, 'Nikadi Guest House  ·  Nikadi Projects Pvt. Ltd.  ·  +91 75011 01137  ·  nikadiguesthouse@gmail.com')
    c.showPage()

def art(c, fn, m, layer=None):
    pw, ph = (W + 2 * B) * mm, (H + 2 * B) * mm
    c.setPageSize((pw, ph)); c.setTrimBox((B * mm, B * mm, (B + W) * mm, (B + H) * mm)); c.setBleedBox((0, 0, pw, ph))
    draw_card(c, B * mm, B * mm, fn, m, layer=layer); c.showPage()

def layer_page(c, fn, m, layer, label):
    pad = 6
    c.setPageSize(((W + 2 * pad) * mm, (H + 2 * pad) * mm))
    if fn: draw_card(c, pad * mm, pad * mm, fn, m, layer=layer)
    c.saveState(); c.setStrokeColor(DIE); c.setLineWidth(.25)
    c.roundRect(pad * mm, pad * mm, W * mm, H * mm, R * mm, stroke=1, fill=0)
    c.setFont('WS', 4.2); c.setFillColor(DIE); c.drawString(pad * mm, 2 * mm, label); c.restoreState(); c.showPage()

def pvc_pdf(path, m):
    c = canvas.Canvas(path); c.setTitle('Nikadi membership cards · Silver, Gold, Platinum · print file'); c.setAuthor('Nikadi Guest House')
    spec(c, 'Nikadi membership cards', 'Silver · Gold · Platinum  ·  printed PVC cards  ·  print-ready artwork from page 2',
         [((TIERS[t][0], TIERS[t][1]), NAMES[t]) for t in ('silver', 'gold', 'platinum')],
         [('Size', 'CR80 / ISO ID-1: 85.60 × 53.98 mm, corner radius 3.18 mm'),
          ('Material', '760 micron PVC, soft-touch matte lamination both sides'),
          ('Print', 'CMYK both sides; each artwork page is 91.6 × 59.98 mm (3 mm bleed), vector'),
          ('Gold card', 'Gold lines and lettering in GOLD hot-foil (FOIL page), or CMYK gold if no foil'),
          ('Platinum card', 'Logo, NIKADI, PLATINUM and corners in SILVER hot-foil (FOIL page), or CMYK'),
          ('Personalised', 'Name, member number, year joined (front, bottom-left)')],
         ['Pages: 1 this sheet · 2-3 SILVER front/back · 4-5 GOLD front/back · 6 GOLD front foil · 7-8 PLATINUM front/back · 9 PLATINUM front foil.',
          'Everything is vector: text is converted to outlines and there are no photos, so it prints sharp at any resolution. Keep the 3 mm bleed and trim to the TrimBox.',
          'Foil pages: the spot colour FOIL marks the hot-foil areas, in the same position as the CMYK front (gold foil for Gold, silver foil for Platinum).',
          'Very fine lines (0.08 to 0.15 mm, lotus and sunburst) are intended. Please keep them and do not thicken them more than your minimum.',
          'Personalisation: the name is in capitals, 8.4 pt, 6 mm (Gold 7 mm) from the left edge. The number and year sit on the line below.',
          'The QR code on each back opens www.nikadiguesthouse.com/app/ (member card, points and bookings). Please test-scan it on the proof.',
          'Please send a printed proof of each level before the full run.'])
    for t in ('silver', 'gold', 'platinum'):
        f, b = TIERS[t]
        art(c, f, m); art(c, b, m)
        if t in ('gold', 'platinum'): art(c, f, m, layer='FOIL')
    c.save()

def metal_pdf(path, m):
    f, b = TIERS['plus']
    c = canvas.Canvas(path); c.setTitle('Nikadi Platinum Plus metal card · production file'); c.setAuthor('Nikadi Guest House')
    spec(c, 'Nikadi Platinum Plus · metal card', 'Black stainless steel, laser engraved, 24k gold details · production layers from page 4',
         [((f, b), '')],
         [('Size', 'CR80: 85.60 × 53.98 mm, corner radius 3.18 mm, 0.8 mm thick'),
          ('Material', 'Stainless steel, matte black PVD coating both sides'),
          ('ENGRAVE (spot)', 'Laser engraving through the coating: ripples, small text, QR square'),
          ('GOLD_24K (spot)', '24k gold plating or gold fill: logo, NIKADI, PLATINUM PLUS, side rule'),
          ('PERSONALISE (spot)', 'Engraved per card: member name, member number, year'),
          ('DIELINE (spot)', 'Card outline only, do not engrave')],
         ['Pages: 1 this sheet · 2 FRONT proof · 3 BACK proof · 4 FRONT ENGRAVE · 5 FRONT GOLD_24K · 6 FRONT PERSONALISE · 7 BACK ENGRAVE · 8 BACK GOLD_24K · 9 DIELINE.',
          'All layers are 1:1, vector, with text converted to outlines. Every layer page is the card plus a 6 mm margin, and the die line is on each page to register the layers.',
          'The front ripples are concentric hairlines 0.1 mm wide and 0.95 mm apart. Engrave them as single-pass lines.',
          'The QR square on the back is ENGRAVED and the modules are left black, so it reads like a normal QR code. Please test-scan the first card.',
          'No magnetic stripe or chip. Please send a photo of the first finished card before the full run.'])
    for fn in (f, b):
        c.setPageSize(((W + 12) * mm, (H + 12) * mm)); c.setFillColor(CMYKColor(0, 0, 0, .06)); c.rect(0, 0, (W + 12) * mm, (H + 12) * mm, stroke=0, fill=1)
        draw_card(c, 6 * mm, 6 * mm, fn, m, clip_round=True); c.showPage()
    for fn, lay, lab in ((f, 'ENGRAVE', 'FRONT · ENGRAVE (laser)'), (f, 'GOLD', 'FRONT · GOLD_24K'), (f, 'PERSONALISE', 'FRONT · PERSONALISE (per card)'),
                         (b, 'ENGRAVE', 'BACK · ENGRAVE (laser)'), (b, 'GOLD', 'BACK · GOLD_24K')):
        layer_page(c, fn, m, lay, lab)
    layer_page(c, None, m, None, 'DIELINE · card outline')
    c.save()

def png_1200(outdir, m):
    """1200 dpi PNG of every side, with 3 mm bleed (for printers that ask for images)."""
    files = []
    for t, (f, b) in TIERS.items():
        for side, fn in (('front', f), ('back', b)):
            sv = SVG(bleed=B if t != 'plus' else 0); fn(sv, m)
            sp = os.path.join(outdir, '_%s-%s.svg' % (t, side)); open(sp, 'w').write(sv.svg())
            wpx = round((W + (2 * B if t != 'plus' else 0)) / 25.4 * 1200)
            pp = os.path.join(outdir, 'Nikadi-%s-%s-1200dpi.png' % (NAMES[t].replace(' ', ''), side))
            subprocess.run(['rsvg-convert', '-w', str(wpx), '-o', pp, sp], check=True); os.remove(sp)
            subprocess.run(['python3', '-c', 'from PIL import Image;im=Image.open("%s");im.save("%s",dpi=(1200,1200))' % (pp, pp)], check=True)
            files.append(pp)
    z = os.path.join(outdir, 'Nikadi-Membership-Cards-1200dpi-PNG.zip')
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zz:
        for p in files: zz.write(p, os.path.basename(p)); os.remove(p)
    return z

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    M = {'name': sys.argv[2] if len(sys.argv) > 2 else 'Radha Sharma', 'no': sys.argv[3] if len(sys.argv) > 3 else 'NK 0001 2026', 'since': sys.argv[4] if len(sys.argv) > 4 else '2026'}
    pvc_pdf(os.path.join(out, 'Nikadi-Membership-Cards-Silver-Gold-Platinum.pdf'), M)
    metal_pdf(os.path.join(out, 'Nikadi-Platinum-Plus-Metal-Card.pdf'), M)
    print(png_1200(out, M))
