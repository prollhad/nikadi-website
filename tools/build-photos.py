"""Writes staff/photos.json: every website photo, sorted into the same folders as "Photos of GH" in Drive.
Run after adding photos to img/ (build-staff.py runs it too)."""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDER = ['Deluxe Double (king bed)', 'Deluxe Twin', 'Large Twin', 'Reception', 'Common spaces', 'Building & views', 'Other']
def cat(path):
    f = path.split('/')[-1].lower()
    if re.match(r'img/(brand|google|hero)/', path) or path.startswith('img/rooms/t/'): return ''
    if path.startswith('img/rooms/large'): return 'Large Twin'
    if path.startswith('img/rooms/double'): return 'Deluxe Double (king bed)'
    if path.startswith('img/rooms/twin'): return 'Deluxe Twin'
    if 'reception' in f: return 'Reception'
    if re.search(r'corridor|stair|landing|fire|first-aid|security|mahaprabhu|lobby|common|dining|terrace|roof', f): return 'Common spaces'
    if re.search(r'facade|view|walkup|street|temple|building|outside|sign', f): return 'Building & views'
    return 'Other'
def name(path):
    f = path.split('/')[-1]; base, ext = os.path.splitext(f)
    m = re.match(r'^(double|twin|large(?:-twin)?)-(\d+)$', base, re.I)
    if m: return {'double': 'Deluxe Double', 'twin': 'Deluxe Twin'}.get(m.group(1).lower(), 'Large Twin') + ' ' + m.group(2) + ext.lower()
    return re.sub(r'\b\w', lambda c: c.group(0).upper(), re.sub(r'^hotel-', '', base).replace('-', ' ')) + ext.lower()
out = []
for dp, dn, fn in os.walk(os.path.join(ROOT, 'img')):
    for f in sorted(fn):
        if not re.search(r'\.(jpe?g|png|webp)$', f, re.I): continue
        p = os.path.relpath(os.path.join(dp, f), ROOT).replace(os.sep, '/'); c = cat(p)
        if not c: continue
        t = p.replace('img/rooms/', 'img/rooms/t/')
        out.append({'cat': c, 'name': name(p), 'src': '/' + p, 'thumb': '/' + (t if t != p and os.path.exists(os.path.join(ROOT, t)) else p)})
out.sort(key=lambda x: (ORDER.index(x['cat']), x['name']))
json.dump({'folders': [c for c in ORDER if any(x['cat'] == c for x in out)], 'photos': out}, open(os.path.join(ROOT, 'staff', 'photos.json'), 'w'), ensure_ascii=False, indent=0)
print(len(out), 'photos')
