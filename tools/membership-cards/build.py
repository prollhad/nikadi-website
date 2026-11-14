import sys
from cardgen import *
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont as RLTT
pdfmetrics.registerFont(RLTT('WS', FD + 'WorkSans-Regular.ttf'))
pdfmetrics.registerFont(RLTT('WSB', FD + 'WorkSans-Bold.ttf'))
pdfmetrics.registerFont(RLTT('IT', FD + 'Italiana-Regular.ttf'))
INK = CMYKColor(0, 0, 0, .9); GREY = CMYKColor(0, 0, 0, .55); RULE = CMYKColor(0, 0, 0, .15)

from reportlab.lib.utils import simpleSplit
def para(c, x, y, lines, size=8.6, lead=12.2, font='WS', color=INK, width=174 * mm):
    for ln in lines:
        ind = len(ln) - len(ln.lstrip(' ')); ln = ln.strip(); xi = x + (4 * mm if ind else 0)
        for part in simpleSplit(ln, font, size, width - (xi - x)):
            c.setFont(font, size); c.setFillColor(color); c.drawString(xi, y, part); y -= lead
        y -= 2
    return y

def proof(c, fn, x, y, m, scale, clipround=True, **kw):
    c.saveState(); c.translate(x, y); c.scale(scale, scale)
    if clipround: c.clipPath(card_path(c, 0, 0, W, H, R), stroke=0, fill=0)
    fn(c, 0, 0, m, **kw); c.restoreState()

def spec_page(c, title, sub, fronts, info, notes):
    c.setPageSize(A4); pw, ph = A4
    c.setFillColor(INK); c.setFont('IT', 24); c.drawString(18 * mm, ph - 26 * mm, title)
    c.setFont('WS', 9.5); c.setFillColor(GREY); c.drawString(18 * mm, ph - 33 * mm, sub)
    c.setStrokeColor(RULE); c.setLineWidth(.6); c.line(18 * mm, ph - 37 * mm, pw - 18 * mm, ph - 37 * mm)
    sc = 1.0; y = ph - 44 * mm - H * sc
    x = 18 * mm
    for (fn, m, lab, kw) in fronts:
        proof(c, fn, x, y, m, sc, **kw)
        c.setFont('WS', 7.5); c.setFillColor(GREY); c.drawString(x, y - 5 * mm, lab)
        x += W * sc + 10 * mm
    yy = y - 16 * mm
    c.setFont('WSB', 10); c.setFillColor(INK); c.drawString(18 * mm, yy, 'Specification'); yy -= 7 * mm
    for k, v in info:
        c.setFont('WS', 8.4); c.setFillColor(GREY); c.drawString(18 * mm, yy, k)
        c.setFillColor(INK); c.drawString(62 * mm, yy, v); yy -= 5.2 * mm
    yy -= 3 * mm
    c.setFont('WSB', 10); c.setFillColor(INK); c.drawString(18 * mm, yy, 'Notes for the printer'); yy -= 7 * mm
    para(c, 18 * mm, yy, notes, size=8.2, lead=11.4)
    c.setFont('WS', 7); c.setFillColor(GREY); c.drawString(18 * mm, 12 * mm, 'Nikadi Guest House  ·  Nikadi Projects Pvt. Ltd.  ·  +91 75011 01137  ·  nikadiguesthouse@gmail.com')
    c.showPage()

def art_page(c, fn, m, label, bleed=True, **kw):
    pad = BLEED if bleed else 6 * mm
    pw, ph = W + 2 * pad, H + 2 * pad
    c.setPageSize((pw, ph))
    if bleed:
        c.setTrimBox((pad, pad, pad + W, pad + H)); c.setBleedBox((0, 0, pw, ph))
    fn(c, pad, pad, m, **kw)
    if not bleed:
        dieline(c, pad, pad, SEP['DIELINE'])
        c.setFont('WS', 4.2); c.setFillColor(SEP['DIELINE']); c.drawString(pad, 2 * mm, label)
    c.showPage()

def platinum_pdf(path, m):
    c = canvas.Canvas(path); c.setTitle('Nikadi Platinum card · print file'); c.setAuthor('Nikadi Guest House')
    spec_page(c, 'Nikadi Platinum · member card', 'Personalised PVC card · front and back · print-ready artwork (pages 2 to 4)',
        [(platinum_front, m, 'Front (actual size)', {}), (platinum_back, m, 'Back (actual size)', {})],
        [('Size', 'CR80 / ISO ID-1: 85.60 × 53.98 mm, corner radius 3.18 mm'),
         ('Material', '760 micron white PVC, matte or soft-touch lamination both sides'),
         ('Print', 'CMYK, both sides. Artwork pages are 91.6 × 59.98 mm (3 mm bleed each side)'),
         ('Silver foil (optional)', 'Page 4: spot colour SILVER_FOIL = hot-foil areas on the front'),
         ('Personalised fields', 'Member name, member number, member-since year (front)'),
         ('Quantity', 'One card per Platinum member; name, number and year are sent with each order')],
        ['Pages: 1 this sheet · 2 FRONT (CMYK, with bleed) · 3 BACK (CMYK, with bleed) · 4 FRONT silver-foil layer (optional).',
         'All text is converted to outlines; no fonts are needed. Keep the 3 mm bleed; trim to the TrimBox.',
         'Personalisation (front, bottom-left), aligned 6 mm from the left edge:',
         '    Name: upper case, 8.6 pt Work Sans, letter-spacing 14%, platinum silver, baseline 9.6 mm from the bottom edge',
         '    Number: "NO.  NK-P-0001", 4.6 pt, letter-spacing 24%, baseline 5.6 mm from the bottom edge',
         '    Member since (right-aligned 6 mm from the right edge): year, 11 pt Italiana, baseline 5.6 mm from the bottom edge',
         'The QR code on the back opens www.nikadiguesthouse.com/app/ (member card, points and bookings). Please test-scan the proof.',
         'Please send a printed proof before the full run. Colours: dark graphite ground with platinum-silver text.'])
    art_page(c, platinum_front, m, 'FRONT')
    art_page(c, platinum_back, m, 'BACK')
    art_page(c, lambda cc, x, y, mm_: platinum_front(cc, x, y, mm_, foil_only=True), m, 'FOIL')
    c.save()

def plus_pdf(path, m):
    c = canvas.Canvas(path); c.setTitle('Nikadi Platinum Plus metal card · production file'); c.setAuthor('Nikadi Guest House')
    spec_page(c, 'Nikadi Platinum Plus · metal card', 'Black stainless-steel card, laser engraved, 24k gold details · production layers on pages 4 to 9',
        [(plus_front, m, 'Front (colour proof, actual size)', {}), (plus_back, m, 'Back (colour proof, actual size)', {})],
        [('Size', 'CR80: 85.60 × 53.98 mm, corner radius 3.18 mm, thickness 0.8 mm'),
         ('Material', 'Stainless steel, matte black PVD coating (front and back)'),
         ('ENGRAVE (spot)', 'Laser engraving through the black coating: shows bright brushed steel'),
         ('GOLD_24K (spot)', '24k gold plating / gold colour fill: logo, NIKADI, PLATINUM PLUS, year'),
         ('PERSONALISE (spot)', 'Laser engraved per card: member name, member number, year'),
         ('DIELINE (spot)', 'Cut line / card outline only, do not engrave'),
         ('Edges', 'Polished or black edges (supplier\'s recommendation)')],
        ['Pages: 1 this sheet · 2 FRONT proof · 3 BACK proof · 4 FRONT ENGRAVE · 5 FRONT GOLD_24K · 6 FRONT PERSONALISE',
         '7 BACK ENGRAVE · 8 BACK GOLD_24K · 9 DIELINE. All layers are 1:1, vector, text converted to outlines, same position on every page.',
         'Every layer page is the card plus a 6 mm margin; the DIELINE outline is drawn on each page to register the layers.',
         'Fine guilloche lines on the front are 0.12 pt (about 0.04 mm): engrave as single-pass hairlines; widen to your minimum if needed.',
         'QR code (back): the square is ENGRAVED and the modules are left black, so it reads like a normal QR code. Please test-scan.',
         'Personalisation (front): name upper case 8.6 pt, 6 mm from the left edge, baseline 9.6 mm from the bottom;',
         '    number "NO.  NK-PP-0001" 4.6 pt, baseline 5.6 mm; year 11 pt right-aligned 6 mm from the right edge, baseline 5.6 mm (gold).',
         'No magnetic stripe or chip. Please send a photo proof of the first card before the full run.'])
    # colour proofs
    for fn in (plus_front, plus_back):
        c.setPageSize((W + 12 * mm, H + 12 * mm)); c.setFillColor(CMYKColor(0, 0, 0, .06)); c.rect(0, 0, W + 12 * mm, H + 12 * mm, stroke=0, fill=1)
        proof(c, fn, 6 * mm, 6 * mm, m, 1); c.showPage()
    for fn, layer, lab in ((plus_front, 'ENGRAVE', 'FRONT · ENGRAVE (laser)'), (plus_front, 'GOLD_24K', 'FRONT · GOLD_24K'),
                           (plus_front, 'PERSONALISE', 'FRONT · PERSONALISE (per card)'), (plus_back, 'ENGRAVE', 'BACK · ENGRAVE (laser)'),
                           (plus_back, 'GOLD_24K', 'BACK · GOLD_24K')):
        art_page(c, lambda cc, x, y, mm_, fn=fn, layer=layer: fn(cc, x, y, mm_, layer=layer), m, lab, bleed=False)
    art_page(c, lambda cc, x, y, mm_: None, m, 'DIELINE · cut / card outline', bleed=False)
    c.save()

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    platinum_pdf(out + '/Nikadi-Platinum-Card-Print.pdf', {'name': 'Radha Sharma', 'no': 'NK-P-0001', 'since': '2026'})
    plus_pdf(out + '/Nikadi-Platinum-Plus-Metal-Card.pdf', {'name': 'Radha Sharma', 'no': 'NK-PP-0001', 'since': '2026'})
    print('ok')
