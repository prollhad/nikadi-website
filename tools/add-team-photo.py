#!/usr/bin/env python3
"""Adds a staff photo for the website's team wall, keeping it sharp.
   python3 tools/add-team-photo.py PHOTO.jpg "Full Name" "Role" "NGH-001"
   Makes img/team/<id>.jpg and .webp (portrait 4:5, 900 x 1125, high quality) and adds the person to data/team.json."""
import sys, json, pathlib, re
from PIL import Image, ImageOps
root = pathlib.Path(__file__).resolve().parent.parent
src, name, role, eid = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
W, H = 900, 1125
# crop to 4:5, keeping the top part (faces are usually in the upper half)
r = W / H
if im.width / im.height > r:
    nw = round(im.height * r); x = (im.width - nw) // 2; im = im.crop((x, 0, x + nw, im.height))
else:
    nh = round(im.width / r); y = max(0, min(im.height - nh, round((im.height - nh) * 0.25))); im = im.crop((0, y, im.width, y + nh))
if im.width > W: im = im.resize((W, H), Image.LANCZOS)
slug = re.sub(r'[^a-z0-9-]', '', eid.lower().replace(' ', '-')) or re.sub(r'[^a-z0-9]', '', name.lower())
out = root / 'img/team' / slug
out.parent.mkdir(parents=True, exist_ok=True)
im.save(str(out) + '.jpg', quality=90, optimize=True, progressive=True, subsampling=0)
im.save(str(out) + '.webp', quality=90, method=6)
f = root / 'data/team.json'
team = json.loads(f.read_text() or '[]')
team = [t for t in team if t.get('id') != eid]
team.append({'name': name, 'role': role, 'id': eid, 'photo': '/img/team/' + slug + '.jpg'})
f.write_text(json.dumps(team, ensure_ascii=False, indent=2) + '\n')
print('added', name, eid, '->', '/img/team/' + slug + '.jpg')
