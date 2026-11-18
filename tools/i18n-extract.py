#!/usr/bin/env python3
"""Collects every piece of website text that needs translating into data/i18n/en.json.
   Run after tools/build-pages.py. The same rules run in the browser (site/src.html, 'language switch'),
   so a key here matches the text there.  Translations live in data/i18n/<lang>.json as {key: translation}."""
import re, json, pathlib
from bs4 import BeautifulSoup, NavigableString, Comment
root = pathlib.Path(__file__).resolve().parent.parent
PAGES = ['index.html', 'temple.html', 'travel.html', 'things-to-do.html', 'membership.html']
INLINE = {'a', 'b', 'strong', 'em', 'i', 'small', 's', 'span', 'br', 'sup', 'u', 'time', 'mark', 'abbr'}
SKIP = {'script', 'style', 'svg', 'noscript', 'textarea', 'template', 'iframe', 'blockquote'}
ATTRS = ['alt', 'aria-label', 'placeholder', 'title']
def ws(t): return re.sub(r'\s+', ' ', t)
def canon(el):
    out = ''
    for c in el.children:
        if isinstance(c, Comment): continue
        if isinstance(c, NavigableString): out += ws(str(c))
        elif c.name == 'br': out += '<br>'
        else: out += '<' + c.name + '>' + canon(c) + '</' + c.name + '>'
    return out
def has_text(el): return any(isinstance(c, NavigableString) and not isinstance(c, Comment) and re.search(r'[A-Za-z]', str(c)) for c in el.children)
def is_unit(el):
    if not has_text(el): return False
    for d in el.descendants:
        if getattr(d, 'name', None) is None: continue
        if d.name not in INLINE or d.get('id') or d.name == 'button': return False
    return True
def worth(k):
    t = re.sub(r'<[^>]+>', ' ', k).strip()
    if not re.search(r'[A-Za-z]{2}', t): return False
    if re.fullmatch(r'[\w.+-]+@[\w.-]+', t) or re.fullmatch(r'@[\w.]+', t) or re.match(r'https?://', t): return False
    if re.fullmatch(r'(Train|Bus) [\w-]+ details', t): return False
    if re.fullmatch(r'[0-9:.\s→–-]*(AM|PM)[0-9:.\s→–-]*', t): return False
    if re.fullmatch(r'[A-Z]{4}0[A-Z0-9]{6}', t): return False   # IFSC
    return True
units, attrs = {}, {}
def walk(el, page):
    for c in el.children:
        if isinstance(c, Comment): continue
        if isinstance(c, NavigableString):
            t = ws(str(c)).strip()
            if t and worth(t): units.setdefault(t, set()).add(page)
            continue
        if c.name in SKIP or c.get('data-noi18n') is not None: continue
        for a in ATTRS:
            v = c.get(a)
            if v and worth(ws(v).strip()): attrs.setdefault(ws(v).strip(), set()).add(page)
        if c.name in ('select',):
            for o in c.find_all('option'):
                t = ws(o.get_text()).strip()
                if t and worth(t): units.setdefault(t, set()).add(page)
            continue
        if c.name in ('input',): continue
        if is_unit(c):
            k = canon(c).strip()
            if worth(k): units.setdefault(k, set()).add(page)
        else: walk(c, page)
meta = {}
for f in PAGES:
    soup = BeautifulSoup((root / f).read_text(encoding='utf-8'), 'lxml')
    walk(soup.body, f)
    meta[f] = {'title': soup.title.get_text(), 'description': soup.find('meta', attrs={'name': 'description'})['content']}
    for m in meta[f].values(): units.setdefault(m, set()).add(f)
out = {'units': sorted(units), 'attrs': sorted(set(attrs) - set(units))}
(root / 'data/i18n/en.json').write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(len(out['units']), 'units', sum(map(len, out['units'])), 'chars;', len(out['attrs']), 'attributes', sum(map(len, out['attrs'])), 'chars')
