#!/usr/bin/env python3
"""Merges the translation batches (data/i18n/work/tNN.json: {index: [bn, hi, ru, zh, es]}) into
   data/i18n/<lang>.json, after checking that every translation keeps the same inline tags as the English."""
import json, re, pathlib, glob
root = pathlib.Path(__file__).resolve().parent.parent
items = json.loads((root / 'data/i18n/work/items.json').read_text())
en = json.loads((root / 'data/i18n/en.json').read_text())
units = set(en['units'])
LANGS = ['bn', 'hi', 'ru', 'zh', 'es']
out = {l: {'units': {}, 'attrs': {}} for l in LANGS}
def tags(s): return sorted(re.findall(r'<(/?\w+)>', s))
bad = 0
for f in sorted(glob.glob(str(root / 'data/i18n/work/t*.json'))):
    for k, v in json.loads(pathlib.Path(f).read_text()).items():
        src = items[int(k)]
        for l, t in zip(LANGS, v):
            if not t: continue
            if tags(t) != tags(src): print('TAGS', f.split('/')[-1], k, l, src[:60], '|', t[:60]); bad += 1; continue
            out[l]['units' if src in units else 'attrs'][src] = t
# strings the page scripts write (live status, prices, calendar): data/i18n/work/extra.json, {english: [bn, hi, ru, zh, es]}.
# {0} {1} stand for numbers and {D} for a duration such as "2 h 5 min". A batch translation wins over an extra.
ex = root / 'data/i18n/work/extra.json'
if ex.exists():
    for k, v in json.loads(ex.read_text()).items():
        for l, t in zip(LANGS, v):
            if not t: continue
            if tags(t) != tags(k) or sorted(re.findall(r'\{\w+\}', t)) != sorted(re.findall(r'\{\w+\}', k)): print('EXTRA', k[:60], l, t[:60]); bad += 1; continue
            if k not in out[l]['attrs']: out[l]['units'].setdefault(k, t)
for l in LANGS:
    (root / 'data/i18n' / (l + '.json')).write_text(json.dumps(out[l], ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print({l: len(out[l]['units']) + len(out[l]['attrs']) for l in LANGS}, 'of', len(items), 'bad', bad)
