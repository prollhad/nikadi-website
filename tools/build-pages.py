#!/usr/bin/env python3
"""Builds the website pages from site/src.html (the one master file).
   Edit site/src.html, then run:  python3 tools/build-pages.py
   Writes: index.html, temple.html, travel.html, things-to-do.html, membership.html, css/site.css, js/site.js"""
import re, pathlib, hashlib, json
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'site/src.html').read_text(encoding='utf-8')
BASE = 'https://www.nikadiguesthouse.com'

PAGES = {
  'index.html': {'url': '/', 'sections': ['home', 'overview', 'rooms', 'now', 'reviews', 'member-teaser', 'amenities', 'gallery', 'booking', 'faq', 'contact'],
    'title': 'Nikadi Guest House · Deluxe rooms opposite ISKCON Mayapur',
    'desc': 'Nikadi Guest House, Mayapur. Premium AC deluxe rooms opposite ISKCON Gate No. 4, an 8 minute walk from the Main ISKCON Temple. Live availability, member rates and our own cars.'},
  'temple.html': {'url': '/temple.html', 'sections': ['temple', 'festivals', 'meet'],
    'title': 'ISKCON Mayapur temple timings, live darshan & festivals · Nikadi Guest House',
    'desc': 'Daily ISKCON Mayapur temple program with what is happening now, darshan photos of Sri Sri Radha Madhava, and the festival calendar. From Nikadi Guest House, 8 minutes from the temple.',
    'banner': ('Sri Dham Mayapur', 'Temple & Darshan', 'Live temple timings, daily darshan and the festival calendar of Sri Mayapur Chandrodaya Mandir.', 'img/view-temple.jpg')},
  'travel.html': {'url': '/travel.html', 'sections': ['location', 'transport'],
    'title': 'Location & travel: find us, trains, buses and cars from Kolkata · Nikadi Guest House',
    'desc': 'Every train and bus from Howrah and Sealdah to Mayapur, our own cars for airport and station pickups, and the Gourdham Travels desk: tickets, money exchange, Western Union and MoneyGram.',
    'banner': ('Getting to Mayapur · travel desk', 'Location & travel', 'Where we are, the way in, live train times from Kolkata, our own cars and a full travel desk at the guest house.', 'img/view-street.jpg')},
  'about.html': {'url': '/about.html', 'sections': ['about', 'team', 'guests', 'rules'],
    'title': 'About Nikadi Guest House: our story, our team & house rules · Mayapur',
    'desc': 'Nikadi Guest House is a small, pure vegetarian guest house opposite ISKCON Gate No. 4 in Sri Dham Mayapur. Our story, the people who look after you, and the house rules.',
    'banner': ('Our home in the Dham', 'About Nikadi', 'A small, pure vegetarian guest house opposite ISKCON Gate No. 4, the people who look after you, and our house rules.', 'img/facade-night-wide.jpg')},
  'things-to-do.html': {'url': '/things-to-do.html', 'sections': ['explore', 'views'],
    'title': 'Things to do in Mayapur: holy places, ghats & prasadam · Nikadi Guest House',
    'desc': 'The holy places of Sri Dham Mayapur with walking and toto times from Nikadi Guest House: temples, Ganga ghats, the Goshala and the best prasadam.',
    'banner': ('Explore the Dham', 'Things to do in Mayapur', 'Holy places, ghats, the Goshala and prasadam halls, with walking and toto times from our door.', 'img/mahaprabhu.jpg')},
  'membership.html': {'url': '/membership.html', 'sections': ['membership'],
    'title': 'Nikadi Membership: Silver, Gold, Platinum & Platinum Plus · Nikadi Guest House',
    'desc': 'Join Nikadi Membership free: member rates up to 20% off every night, points on every stay, and four levels from Silver to Platinum Plus.',
    'banner': ('Members save up to 20%', 'Nikadi Membership', 'Four levels, member rates up to 20% off every night, and points on every stay. Free to join.', None)},
}
NAV = [('/#rooms', 'Rooms', None), ('/temple.html', 'Temple', 'temple.html'), ('/things-to-do.html', 'Things to do', 'things-to-do.html'),
       ('/travel.html', 'Getting to Mayapur · travel desk', 'travel.html'), ('/membership.html', 'Membership', 'membership.html'), ('/#reviews', 'Reviews', None),
       ('/about.html', 'About', 'about.html'), ('/#contact', 'Contact', None)]

# ---- split the master file ----
hdr_at = src.index('<div class="offerbar"')
hero_at = src.index('<section class="hero"')
foot_at = src.index('<script type="application/ld+json">')
head, header, body, tail = src[:hdr_at], src[hdr_at:hero_at], src[hero_at:foot_at], src[foot_at:]

secs = {}
for m in re.finditer(r'^<section\b[^>]*\bid="([\w-]+)"[^>]*>.*?^</section>\n', body, flags=re.S | re.M):
    secs[m.group(1)] = m.group(0)
used = [s for p in PAGES.values() for s in p['sections']]
missing_all = [k for k in secs if k not in used]
assert not missing_all, ('sections not placed on any page', missing_all)

# ---- css and js out to shared files ----
st = re.search(r'<style>\n(.*?)</style>\n', head, flags=re.S)
css = st.group(1)
(root / 'css/site.css').write_text(css, encoding='utf-8')
cv = hashlib.md5(css.encode()).hexdigest()[:8]
head = head.replace(st.group(0), '<link rel="stylesheet" href="/css/site.css?v=' + cv + '">\n')

scripts = []
def grab(m):
    tag = m.group(0)
    if 'application/ld+json' in tag: return tag
    if re.match(r'<script src=', tag): scripts.append(('src', re.match(r'<script src="([^"]+)"', tag).group(1))); return ''
    scripts.append(('inline', m.group(1))); return ''
tail = re.sub(r'<script(?: src="[^"]*")?>(.*?)</script>\n?', grab, tail, flags=re.S)
srcs = [v for k, v in scripts if k == 'src']
js = '\n'.join('/* part ' + str(i) + ' */\ntry{\n' + v + '\n}catch(e){console.error("[nikadi part ' + str(i) + ']",e);}' for i, v in enumerate(v for k, v in scripts if k == 'inline'))
(root / 'js/site.js').write_text(js, encoding='utf-8')
jv = hashlib.md5(js.encode()).hexdigest()[:8]
tags = ''.join('<script src="' + ('/' + s if not s.startswith('http') else s) + '"></script>\n' for s in srcs) + '<script src="/js/site.js?v=' + jv + '"></script>\n'
tail = tail.replace('</body>', tags + '</body>')

# ---- which page holds which id (for links between pages) ----
idpage = {}
for name, p in PAGES.items():
    for s in p['sections']:
        if s in secs:
            for i in re.findall(r'\bid="([\w-]+)"', secs[s]): idpage.setdefault(i, name)
def purl(name): return PAGES[name]['url']

SHOW = ['img/rooms/double-04.jpg', 'img/rooms/double-01.jpg', 'img/rooms/double-02.jpg', 'img/rooms/double-05.jpg']
def banner(b):
    k, h, t, img = b
    imgs = ''.join('<img src="' + u + '" alt="' + ('Deluxe room at Nikadi Guest House' if i == 0 else '') + '"' + (' aria-hidden="true"' if i else '') + ' loading="' + ('eager' if i == 0 else 'lazy') + '" decoding="async"' + (' class="on"' if i == 0 else '') + '>' for i, u in enumerate(SHOW))
    return ('<section class="pg-hero"><div class="wrap pg-grid"><div class="pg-copy"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><span aria-current="page">' + h + '</span></nav>'
            '<p class="kicker rule">' + k + '</p><h1>' + h + '</h1><p>' + t + '</p></div>'
            '<a class="pg-show" href="/#rooms" aria-label="See our rooms">' + imgs + '<span class="pg-show-tag">Our deluxe rooms ›</span></a></div></section>\n')

for name, p in PAGES.items():
    h = head
    h = re.sub(r'<title>.*?</title>', '<title>' + p['title'] + '</title>', h)
    h = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="' + p['desc'] + '">', h)
    h = re.sub(r'<meta property="og:url" content="[^"]*">', '<meta property="og:url" content="' + BASE + p['url'] + '">\n<link rel="canonical" href="' + BASE + p['url'] + '">', h)
    h = re.sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="' + p['title'] + '">', h)
    nav = ''.join('<a href="' + u + '"' + (' aria-current="page"' if f == name else '') + '>' + l + '</a>' for u, l, f in NAV)
    hd = re.sub(r'(<nav class="main" aria-label="Sections">\s*).*?(\s*</nav>)', lambda m: m.group(1) + nav + m.group(2), header, count=1, flags=re.S)
    hd = hd.replace('<a class="brand" href="#home">', '<a class="brand" href="/">')
    main = (banner(p['banner']) if p.get('banner') else '') + ''.join(secs[s] for s in p['sections'] if s in secs)
    out = h + hd + main + tail
    out = out.replace('<body class="', '<body data-page="' + name.replace('.html', '') + '" class="') if '<body class="' in out else out.replace('<body>', '<body data-page="' + name.replace('.html', '') + '">')
    def fix(m):
        i = m.group(2)
        t = idpage.get(i)
        if t and t != name: return m.group(1) + purl(t) + '#' + i + '"'
        return m.group(0)
    out = re.sub(r'(href=")#([\w-]+)"', fix, out)
    # old links like nikadiguesthouse.com/#temple keep working: send them to the section's new page
    moved = {i: PAGES[t]['url'] for i, t in idpage.items() if t != name and not i.startswith(('ci', 'co'))}
    out = out.replace('</head>', '<script>(function(){var M=' + json.dumps(moved, separators=(',', ':')) + ',h=location.hash.slice(1);if(h&&M[h])location.replace(M[h]+"#"+h);})();</script>\n</head>', 1)
    out = out.replace('<!doctype html>\n', '<!doctype html>\n<!-- GENERATED by tools/build-pages.py from site/src.html. Edit site/src.html, then run the script. -->\n', 1)
    (root / name).write_text(out, encoding='utf-8')
    print(name, len(out) // 1024, 'KB', 'sections:', ','.join(s for s in p['sections'] if s in secs))
print('css', len(css) // 1024, 'KB  js', len(js) // 1024, 'KB  scripts', srcs)
