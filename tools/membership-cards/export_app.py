"""Export the app/website card artwork: python3 export_app.py  -> app/icons/card-<tier>.svg (front, no personal details)."""
import os, re
from engine import SVG
from designs import TIERS
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'app', 'icons')
M = {'name': '', 'no': '', 'since': ''}
for t, (front, back) in TIERS.items():
    sv = SVG(); front(sv, M, art_only=True); s = sv.svg()
    s = re.sub(r' width="[^"]+" height="[^"]+"', ' preserveAspectRatio="xMidYMid slice"', s, count=1)
    open(os.path.join(OUT, 'card-%s.svg' % t), 'w').write(s); print(t, len(s))
