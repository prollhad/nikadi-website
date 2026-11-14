/* Nikadi Staff — ID copies on one A4 page.
   Page 1 "ID cards": 3 people × front and back, each slot the real size of an Aadhaar / driving licence card (85.6 × 54 mm).
   Page 2 "Passport & visa": passport front (photo page), passport back and visa, each the size of a passport page (125 × 88 mm).
   Photos never leave this device: the card is found, cut out of the background, straightened, sharpened and placed here.
   Staff can drag a photo onto a box, tap it to take / choose a photo, or paste. "Adjust" lets them move the 4 corners by hand. */
(function (root) {
  var PX_PER_MM = 300 / 25.4; // print quality: 300 dpi
  var LAYOUTS = {
    id: { title: 'ID cards', w: 85.6, h: 54, rows: 3, cols: 2, gapX: 10, gapY: 12,
      slots: ['Person 1 · front', 'Person 1 · back', 'Person 2 · front', 'Person 2 · back', 'Person 3 · front', 'Person 3 · back'] },
    pp: { title: 'Passport & visa', w: 125, h: 88, rows: 3, cols: 1, gapX: 0, gapY: 8,
      slots: ['Passport · front (photo page)', 'Passport · back (last page)', 'Visa'] }
  };

  /* ---------------- image helpers ---------------- */
  function loadImage(src) { return new Promise(function (ok, bad) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = bad; im.src = src; }); }
  function fileToImage(file) {
    return new Promise(function (ok, bad) { var fr = new FileReader(); fr.onload = function () { loadImage(fr.result).then(ok, bad); }; fr.onerror = bad; fr.readAsDataURL(file); });
  }
  function canvasOf(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  /* the original photo, limited to 2600 px on the long side (keeps detail, keeps memory sane on phones) */
  function baseCanvas(im) {
    var k = Math.min(1, 2600 / Math.max(im.naturalWidth || im.width, im.naturalHeight || im.height));
    var c = canvasOf(Math.round((im.naturalWidth || im.width) * k), Math.round((im.naturalHeight || im.height) * k));
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    return c;
  }

  /* ---------------- find the card in the photo ----------------
     1. Shrink to ~700 px. 2. Learn the background colour from the photo's edges.
     3. Mark pixels that differ from the background (Otsu threshold), clean up, keep the biggest blob.
     4. Simplify its outline to 4 corners. Returns corners in the original photo's pixels, or null. */
  function detect(src) {
    var k = Math.min(1, 700 / Math.max(src.width, src.height)), W = Math.max(2, Math.round(src.width * k)), H = Math.max(2, Math.round(src.height * k));
    var c = canvasOf(W, H), x = c.getContext('2d'); x.drawImage(src, 0, 0, W, H);
    var d = x.getImageData(0, 0, W, H).data, n = W * H;
    var bw = Math.max(2, Math.round(Math.min(W, H) * 0.04)), rs = [], gs = [], bs = [];
    for (var y = 0; y < H; y++) for (var xx = 0; xx < W; xx++) {
      if (xx >= bw && xx < W - bw && y >= bw && y < H - bw) continue;
      if ((xx + y) % 2) continue;
      var i = (y * W + xx) * 4; rs.push(d[i]); gs.push(d[i + 1]); bs.push(d[i + 2]);
    }
    function med(a) { a.sort(function (p, q) { return p - q; }); return a[a.length >> 1] || 0; }
    var br = med(rs), bg = med(gs), bb = med(bs);
    /* difference from background + local edges */
    var dist = new Float32Array(n), lum = new Float32Array(n);
    for (var p = 0; p < n; p++) {
      var r = d[p * 4], g = d[p * 4 + 1], b = d[p * 4 + 2];
      lum[p] = 0.299 * r + 0.587 * g + 0.114 * b;
      dist[p] = Math.sqrt((r - br) * (r - br) + (g - bg) * (g - bg) + (b - bb) * (b - bb));
    }
    /* background texture (wood, cloth) has its own spread: use edge-strip spread as noise floor */
    var hist = new Uint32Array(256);
    for (p = 0; p < n; p++) hist[Math.min(255, dist[p] | 0)]++;
    /* threshold: just above the background's own variation (wood grain, cloth), so coloured bands on the card's edge are kept */
    var edgeD = [];
    for (y = 0; y < H; y += 2) for (xx = 0; xx < W; xx += 2) { if (xx >= bw && xx < W - bw && y >= bw && y < H - bw) continue; edgeD.push(dist[y * W + xx]); }
    edgeD.sort(function (p1, q1) { return p1 - q1; });
    var noise = edgeD[Math.floor(edgeD.length * 0.97)] || 0;
    var thr = Math.min(otsu(hist, n), Math.max(20, noise * 1.25 + 8));
    var mask = new Uint8Array(n);
    for (p = 0; p < n; p++) mask[p] = dist[p] > thr ? 1 : 0;
    mask = closeMask(mask, W, H, Math.max(2, Math.round(Math.min(W, H) / 120)));
    var blob = biggestBlob(mask, W, H);
    if (!blob || blob.area < n * 0.08 || blob.area > n * 0.985) return null;
    var hull = convexHull(blob.edge);
    var quad = toQuad(hull);
    if (!quad) return null;
    /* the quad must cover most of the blob, otherwise it is not a card shape */
    if (polyArea(quad) < blob.area * 0.8 || polyArea(quad) > blob.area * 1.35) return null;
    return order(quad.map(function (q) { return { x: q.x / k, y: q.y / k }; }));
  }
  function otsu(hist, total) {
    var sum = 0, i; for (i = 0; i < 256; i++) sum += i * hist[i];
    var sumB = 0, wB = 0, best = 0, t = 30;
    for (i = 0; i < 256; i++) {
      wB += hist[i]; if (!wB) continue; var wF = total - wB; if (!wF) break;
      sumB += i * hist[i]; var mB = sumB / wB, mF = (sum - sumB) / wF, between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) { best = between; t = i; }
    }
    return Math.max(18, t);
  }
  function closeMask(m, W, H, r) { return erode(dilate(m, W, H, r), W, H, r); }
  function dilate(m, W, H, r) { return boxPass(m, W, H, r, 1); }
  function erode(m, W, H, r) { return boxPass(m, W, H, r, 0); }
  function boxPass(m, W, H, r, dil) {
    /* separable max/min filter with running counts */
    var t = new Uint8Array(m.length), o = new Uint8Array(m.length), x, y, cnt, need = dil ? 1 : 2 * r + 1;
    for (y = 0; y < H; y++) {
      cnt = 0; var row = y * W;
      for (x = -r; x < W + r; x++) {
        if (x + r < W && x + r >= 0) cnt += m[row + x + r];
        else if (!dil) cnt += 0; // outside counts as empty
        if (x - r - 1 >= 0 && x - r - 1 < W) cnt -= m[row + x - r - 1];
        if (x >= 0 && x < W) t[row + x] = dil ? (cnt > 0 ? 1 : 0) : (cnt >= Math.min(need, Math.min(x + r, W - 1) - Math.max(x - r, 0) + 1) ? 1 : 0);
      }
    }
    for (x = 0; x < W; x++) {
      cnt = 0;
      for (y = -r; y < H + r; y++) {
        if (y + r < H && y + r >= 0) cnt += t[(y + r) * W + x];
        if (y - r - 1 >= 0 && y - r - 1 < H) cnt -= t[(y - r - 1) * W + x];
        if (y >= 0 && y < H) o[y * W + x] = dil ? (cnt > 0 ? 1 : 0) : (cnt >= Math.min(need, Math.min(y + r, H - 1) - Math.max(y - r, 0) + 1) ? 1 : 0);
      }
    }
    return o;
  }
  function biggestBlob(m, W, H) {
    var lab = new Int32Array(m.length), best = null, cur = 0, stack = new Int32Array(m.length);
    for (var s = 0; s < m.length; s++) {
      if (!m[s] || lab[s]) continue;
      cur++; var sp = 0, area = 0, edge = []; stack[sp++] = s; lab[s] = cur;
      while (sp) {
        var p = stack[--sp], x = p % W, y = (p / W) | 0; area++;
        var isEdge = false;
        for (var k = 0; k < 4; k++) {
          var nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0);
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) { isEdge = true; continue; }
          var q = ny * W + nx;
          if (!m[q]) { isEdge = true; continue; }
          if (!lab[q]) { lab[q] = cur; stack[sp++] = q; }
        }
        if (isEdge) edge.push({ x: x, y: y });
      }
      if (!best || area > best.area) best = { area: area, edge: edge };
    }
    return best;
  }
  function convexHull(pts) {
    pts = pts.slice().sort(function (a, b) { return a.x - b.x || a.y - b.y; });
    function cross(o, a, b) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); }
    var lower = [], upper = [], i;
    for (i = 0; i < pts.length; i++) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) lower.pop(); lower.push(pts[i]); }
    for (i = pts.length - 1; i >= 0; i--) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) upper.pop(); upper.push(pts[i]); }
    upper.pop(); lower.pop(); return lower.concat(upper);
  }
  /* best 4-corner polygon inside the hull: largest-area quadrilateral using hull points (cards with rounded corners still give their 4 corners) */
  function toQuad(h) {
    if (h.length < 4) return null;
    if (h.length > 80) { var step = h.length / 80, s = []; for (var t = 0; t < 80; t++) s.push(h[Math.floor(t * step)]); h = s; }
    var n = h.length, best = 0, bq = null;
    for (var a = 0; a < n; a++) {
      var b = (a + 1) % n, c = (a + 2) % n, dd = (a + 3) % n;
      for (var i1 = 1; i1 < n - 2; i1++) {
        b = (a + i1) % n;
        /* for fixed a and b, pick c, d maximising area with a forward scan */
        for (var i2 = i1 + 1; i2 < n - 1; i2++) {
          c = (a + i2) % n;
          var tri1 = Math.abs(cr(h[a], h[b], h[c]));
          var bestD = 0;
          for (var i3 = i2 + 1; i3 < n; i3++) { var dIdx = (a + i3) % n, ar = Math.abs(cr(h[a], h[c], h[dIdx])); if (ar > bestD) { bestD = ar; dd = dIdx; } }
          var area = (tri1 + bestD) / 2;
          if (area > best) { best = area; bq = [h[a], h[b], h[c], h[dd]]; }
        }
      }
      if (a > 20 && n > 40) break; // enough starting points for a near-rectangle
    }
    return bq;
  }
  function cr(o, a, b) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); }
  function polyArea(q) { var s = 0; for (var i = 0; i < q.length; i++) { var j = (i + 1) % q.length; s += q[i].x * q[j].y - q[j].x * q[i].y; } return Math.abs(s) / 2; }
  /* order corners: top-left, top-right, bottom-right, bottom-left */
  function order(q) {
    var cx = 0, cy = 0; q.forEach(function (p) { cx += p.x / 4; cy += p.y / 4; });
    q = q.slice().sort(function (a, b) { return Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx); }); // clockwise starting at the left-ish/top-ish
    var tl = 0, m = Infinity; q.forEach(function (p, i) { if (p.x + p.y < m) { m = p.x + p.y; tl = i; } });
    return [q[tl], q[(tl + 1) % 4], q[(tl + 2) % 4], q[(tl + 3) % 4]];
  }

  /* ---------------- straighten (perspective) ---------------- */
  function homography(src, dst) { // maps dst (rect) -> src (quad)
    var A = [], B = [];
    for (var i = 0; i < 4; i++) {
      var x = dst[i].x, y = dst[i].y, u = src[i].x, v = src[i].y;
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); B.push(v);
    }
    var h = solve(A, B); h.push(1); return h;
  }
  function solve(A, B) {
    var n = B.length, M = A.map(function (r, i) { return r.concat([B[i]]); });
    for (var c = 0; c < n; c++) {
      var p = c; for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      var t = M[c]; M[c] = M[p]; M[p] = t;
      for (r = 0; r < n; r++) { if (r === c) continue; var f = M[r][c] / M[c][c]; for (var k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map(function (r, i) { return r[n] / r[i]; });
  }
  function warp(src, quad, W, H) {
    var h = homography(quad, [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }]);
    var sd = src.getContext('2d').getImageData(0, 0, src.width, src.height).data, SW = src.width, SH = src.height;
    var out = canvasOf(W, H), ox = out.getContext('2d'), od = ox.createImageData(W, H), o = od.data;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var X = x + 0.5, Y = y + 0.5, w = h[6] * X + h[7] * Y + 1, u = (h[0] * X + h[1] * Y + h[2]) / w - 0.5, v = (h[3] * X + h[4] * Y + h[5]) / w - 0.5;
      var x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0, i = (y * W + x) * 4;
      if (x0 < 0 || y0 < 0 || x0 >= SW - 1 || y0 >= SH - 1) { o[i] = o[i + 1] = o[i + 2] = 255; o[i + 3] = 255; continue; }
      var a = (y0 * SW + x0) * 4, b = a + 4, c = a + SW * 4, dd = c + 4;
      for (var k = 0; k < 3; k++) o[i + k] = (sd[a + k] * (1 - fx) + sd[b + k] * fx) * (1 - fy) + (sd[c + k] * (1 - fx) + sd[dd + k] * fx) * fy;
      o[i + 3] = 255;
    }
    ox.putImageData(od, 0, 0);
    return out;
  }
  /* ---------------- clean up: even out light and sharpen ---------------- */
  function enhance(c) {
    var x = c.getContext('2d'), id = x.getImageData(0, 0, c.width, c.height), d = id.data, n = c.width * c.height;
    /* levels: stretch 0.5 % – 99.5 % luminance */
    var hist = new Uint32Array(256); for (var p = 0; p < n; p++) hist[(0.299 * d[p * 4] + 0.587 * d[p * 4 + 1] + 0.114 * d[p * 4 + 2]) | 0]++;
    var lo = 0, hi = 255, acc = 0; for (lo = 0; lo < 255 && (acc += hist[lo]) < n * 0.005; lo++);
    acc = 0; for (hi = 255; hi > 0 && (acc += hist[hi]) < n * 0.005; hi--);
    if (hi - lo < 40) { lo = 0; hi = 255; }
    var sc = 255 / (hi - lo);
    for (p = 0; p < n * 4; p++) { if ((p & 3) === 3) continue; d[p] = Math.max(0, Math.min(255, (d[p] - lo) * sc)); }
    /* unsharp mask (3×3 blur, amount 0.7) */
    var W = c.width, H = c.height, s = new Uint8ClampedArray(d);
    for (var y = 1; y < H - 1; y++) for (var xx = 1; xx < W - 1; xx++) for (var k = 0; k < 3; k++) {
      var i = (y * W + xx) * 4 + k;
      var blur = (s[i] * 4 + (s[i - 4] + s[i + 4] + s[i - W * 4] + s[i + W * 4]) * 2 + s[i - W * 4 - 4] + s[i - W * 4 + 4] + s[i + W * 4 - 4] + s[i + W * 4 + 4]) / 16;
      d[i] = s[i] + 0.7 * (s[i] - blur);
    }
    x.putImageData(id, 0, 0);
    return c;
  }
  /* make the final card image for a slot */
  function render(src, quad, L, rot) {
    var W = Math.round(L.w * PX_PER_MM * 0.85), H = Math.round(L.h * PX_PER_MM * 0.85); // ~255 dpi: sharp in print, light in memory
    var q = quad || [{ x: 0, y: 0 }, { x: src.width, y: 0 }, { x: src.width, y: src.height }, { x: 0, y: src.height }];
    /* turn so the long side of the card is across */
    var top = dist(q[0], q[1]) + dist(q[2], q[3]), side = dist(q[1], q[2]) + dist(q[3], q[0]);
    if (side > top * 1.05) q = [q[3], q[0], q[1], q[2]];
    if ((rot || 0) % 2) q = [q[2], q[3], q[0], q[1]]; // "rotate" turns the card upside down
    return enhance(warp(src, q, W, H));
  }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  /* ---------------- the page ---------------- */
  function mount(el, opt) {
    opt = opt || {};
    var token = {}; el._idc = token;
    function alive() { return el.isConnected && el._idc === token; }
    var st = opt.stay || null;
    var state = { kind: opt.kind || 'id', slots: { id: [], pp: [] }, info: { guest: st ? st.guest : '', room: st ? String(st.room) : '', date: opt.today || '' } };
    /* saved copies of this stay: load them into their boxes */
    if (st && opt.load) opt.load().then(function (list) {
      (list || []).forEach(function (x) {
        if (!LAYOUTS[x.kind] || state.slots[x.kind][x.slot]) return;
        var s = { fid: x.id, loading: true, saved: true, by: x.by, at: x.at };
        state.slots[x.kind][x.slot] = s;
        opt.fetch(x.id).then(function (data) { s.out = data; s.loading = false; if (state.slots[x.kind][x.slot] === s) draw(); }, function () { s.loading = false; s.failed = true; draw(); });
      });
      draw();
    }, function () { if (opt.toast) opt.toast('Could not load the saved ID copies'); });
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function draw() {
      if (!alive()) return;
      var L = LAYOUTS[state.kind], S = state.slots[state.kind];
      el.innerHTML = '<div class="idc-top"><div class="seg idc-kind">' + Object.keys(LAYOUTS).map(function (k) { return '<button type="button" data-kind="' + k + '" aria-pressed="' + (k === state.kind) + '">' + LAYOUTS[k].title + '</button>'; }).join('') + '</div>' +
        (st ? '<div class="idc-stay"><b>Room ' + esc(st.room) + ' · ' + esc(st.guest) + '</b><span>' + esc(opt.stayLine || '') + '</span></div>' :
        '<div class="idc-info"><input class="input" id="idc-g" placeholder="Guest name (printed on top, optional)" maxlength="60" value="' + esc(state.info.guest) + '"><input class="input" id="idc-r" placeholder="Room" maxlength="10" value="' + esc(state.info.room) + '"></div>') +
        '<div class="idc-actions"><button class="btn btn-gold" type="button" id="idc-print">🖨 Print A4</button><button class="btn btn-line" type="button" id="idc-pdf">Download PDF</button><button class="btn btn-quiet" type="button" id="idc-clear">Clear page</button></div></div>' +
        '<p class="small">Drag a photo of the ID onto a box, or tap a box to take / choose a photo. The ID is found, cut out from the background, straightened and sharpened automatically. Tap <b>Adjust</b> if the corners need fixing. ' +
        (st ? 'Each copy is <b>saved to this stay</b> (private Google Drive folder “Nikadi Guest IDs”), so you can open and print it again later.' : 'Photos stay on this device only and are not saved anywhere.') + '</p>' +
        '<div class="idc-sheet idc-' + state.kind + '"><div class="idc-page">' +
        '<div class="idc-head"><b>Nikadi Guest House</b><span>' + esc([state.info.guest, state.info.room ? 'Room ' + state.info.room : '', state.info.date].filter(Boolean).join(' · ')) + '</span></div>' +
        '<div class="idc-grid" style="grid-template-columns:repeat(' + L.cols + ',' + L.w + 'mm);column-gap:' + L.gapX + 'mm;row-gap:' + L.gapY + 'mm">' +
        L.slots.map(function (name, i) {
          var s = S[i];
          return '<div class="idc-slot' + (s ? ' full' : '') + '" data-i="' + i + '" style="width:' + L.w + 'mm;height:' + L.h + 'mm" tabindex="0" role="button" aria-label="' + esc(name) + '">' +
            (s && s.out ? '<img alt="' + esc(name) + '" src="' + s.out + '">' : s ? '<span class="idc-ph"><small>' + (s.failed ? 'Could not open the saved copy' : 'Opening saved copy…') + '</small></span>' : '<span class="idc-ph"><b>' + esc(name) + '</b><small>Drop photo here or tap</small></span>') +
            '<span class="idc-tag">' + esc(name) + '</span>' +
            (st && s ? '<span class="idc-st ' + (s.saving ? 'ing' : s.saved ? 'ok' : 'bad') + '">' + (s.saving ? 'Saving…' : s.saved ? 'Saved ✓' : '<button type="button" data-retry="' + i + '">Not saved · retry</button>') + '</span>' : '') +
            (s && s.out ? '<span class="idc-tools"><button type="button" data-adj="' + i + '">Adjust</button><button type="button" data-rot="' + i + '">↻</button><button type="button" data-del="' + i + '">✕</button></span>' : '') + '</div>';
        }).join('') + '</div></div></div><input type="file" accept="image/*" id="idc-file" hidden>';
      fit();
      var file = el.querySelector('#idc-file'), target = -1;
      el.querySelectorAll('[data-kind]').forEach(function (b) { b.onclick = function () { state.kind = b.dataset.kind; draw(); }; });
      function head() { el.querySelector('.idc-head span').textContent = [state.info.guest, state.info.room ? 'Room ' + state.info.room : '', state.info.date].filter(Boolean).join(' · '); }
      if (!st) {
        el.querySelector('#idc-g').oninput = function () { state.info.guest = this.value; head(); };
        el.querySelector('#idc-r').oninput = function () { state.info.room = this.value; head(); };
      }
      var clr = el.querySelector('#idc-clear');
      if (st) clr.remove(); else clr.onclick = function () { state.slots[state.kind] = []; draw(); };
      el.querySelector('#idc-print').onclick = function () { printPage(); };
      el.querySelector('#idc-pdf').onclick = function () { pdfPage(this); };
      el.querySelectorAll('.idc-slot').forEach(function (sl) {
        var i = +sl.dataset.i;
        sl.onclick = function (e) { if (e.target.closest('.idc-tools,.idc-st')) return; var cur = state.slots[state.kind][i]; if (cur && cur.loading) return; target = i; file.click(); };
        sl.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); target = i; file.click(); } };
        sl.ondragover = function (e) { e.preventDefault(); sl.classList.add('over'); };
        sl.ondragleave = function () { sl.classList.remove('over'); };
        sl.ondrop = function (e) { e.preventDefault(); sl.classList.remove('over'); var f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) take(i, f); };
      });
      file.onchange = function () { if (file.files[0] && target >= 0) take(target, file.files[0]); file.value = ''; };
      el.querySelectorAll('[data-del]').forEach(function (b) {
        b.onclick = function () {
          var i = +b.dataset.del, s = state.slots[state.kind][i];
          if (st && s && s.fid) {
            if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Remove?'; b.classList.add('sure'); setTimeout(function () { if (b.isConnected) { b.dataset.sure = ''; b.textContent = '✕'; b.classList.remove('sure'); } }, 3000); return; }
            opt.remove(s.fid).then(function () { if (opt.toast) opt.toast('Removed'); }, function () { if (opt.toast) opt.toast('Could not remove it'); });
          }
          state.slots[state.kind][i] = null; draw();
        };
      });
      el.querySelectorAll('[data-rot]').forEach(function (b) { b.onclick = function () { var kind = state.kind, i = +b.dataset.rot, s = state.slots[kind][i]; withSrc(s).then(function () { s.rot = (s.rot || 0) + 1; s.out = render(s.src, s.quad, LAYOUTS[kind], s.rot).toDataURL('image/jpeg', 0.9); draw(); store(kind, i, s); }); }; });
      el.querySelectorAll('[data-retry]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.retry; store(state.kind, i, state.slots[state.kind][i]); }; });
      el.querySelectorAll('[data-adj]').forEach(function (b) { b.onclick = function () { adjust(+b.dataset.adj); }; });
    }
    /* paste a photo: goes into the first empty box */
    document.addEventListener('paste', function (e) {
      if (!alive() || document.querySelector('.idc-adj')) return;
      var f = Array.prototype.slice.call((e.clipboardData && e.clipboardData.files) || []).filter(function (x) { return /^image\//.test(x.type); })[0];
      if (!f) return;
      var S = state.slots[state.kind], L = LAYOUTS[state.kind], i = 0; while (i < L.slots.length && S[i]) i++;
      if (i < L.slots.length) take(i, f);
    });
    /* a saved copy has no original photo on this device: use the saved picture itself for Adjust / rotate */
    function withSrc(s) {
      if (s.src) return Promise.resolve(s);
      return loadImage(s.out).then(function (im) { s.src = baseCanvas(im); s.quad = null; s.rot = 0; return s; });
    }
    /* save one box to the stay (replaces what was saved in that box before) */
    function store(kind, i, s) {
      if (!st || !opt.save || !s || !s.out) return;
      s.saving = true; s.saved = false; draw();
      var n = (s.ver = (s.ver || 0) + 1);
      opt.save(kind, i, s.out).then(function (r) {
        if (s.ver !== n) return; s.saving = false; s.saved = true; s.fid = r && r.id; if (state.slots[kind][i] === s) draw();
      }, function () { if (s.ver !== n) return; s.saving = false; s.saved = false; if (state.slots[kind][i] === s) draw(); if (opt.toast) opt.toast('Could not save the ID copy. Tap retry.'); });
    }
    function busy(i, on) { var sl = el.querySelector('.idc-slot[data-i="' + i + '"]'); if (sl) sl.classList.toggle('busy', on); }
    function take(i, f) {
      var kind = state.kind;
      busy(i, true);
      fileToImage(f).then(function (im) {
        setTimeout(function () {
          var src = baseCanvas(im), quad = null;
          try { quad = detect(src); } catch (e) { quad = null; }
          var s = { src: src, quad: quad, rot: 0, auto: !!quad };
          s.out = render(src, quad, LAYOUTS[kind], 0).toDataURL('image/jpeg', 0.9);
          var old = state.slots[kind][i]; if (old && old.fid) s.fid = old.fid;
          state.slots[kind][i] = s; draw(); store(kind, i, s);
          if (!quad && opt.toast) opt.toast('Could not find the ID edges. Tap Adjust to set the corners.');
        }, 30);
      }, function () { busy(i, false); if (opt.toast) opt.toast('That photo could not be opened'); });
    }
    /* manual corners */
    function adjust(i) {
      var kind = state.kind; withSrc(state.slots[kind][i]).then(function (s) { adjustNow(i, kind, s); });
    }
    function adjustNow(i, kind, s) {
      var L = LAYOUTS[kind];
      var ov = document.createElement('div'); ov.className = 'idc-adj';
      var maxW = Math.min(window.innerWidth - 32, 900), maxH = window.innerHeight - 170, k = Math.min(maxW / s.src.width, maxH / s.src.height);
      var W = Math.round(s.src.width * k), H = Math.round(s.src.height * k);
      var q = (s.quad || [{ x: s.src.width * 0.1, y: s.src.height * 0.1 }, { x: s.src.width * 0.9, y: s.src.height * 0.1 }, { x: s.src.width * 0.9, y: s.src.height * 0.9 }, { x: s.src.width * 0.1, y: s.src.height * 0.9 }]).map(function (p) { return { x: p.x * k, y: p.y * k }; });
      ov.innerHTML = '<div class="idc-adj-in"><p>Drag the 4 dots onto the corners of the ID.</p><div class="idc-adj-pic" style="width:' + W + 'px;height:' + H + 'px"><canvas width="' + W + '" height="' + H + '"></canvas>' +
        [0, 1, 2, 3].map(function (n) { return '<span class="dot" data-n="' + n + '"></span>'; }).join('') + '</div>' +
        '<div class="idc-adj-btns"><button class="btn btn-quiet" type="button" data-a="auto">Find automatically</button><button class="btn btn-quiet" type="button" data-a="full">Use whole photo</button><button class="btn btn-quiet" type="button" data-a="cancel">Cancel</button><button class="btn btn-gold" type="button" data-a="ok">Done</button></div></div>';
      document.body.appendChild(ov);
      var cv = ov.querySelector('canvas'), cx = cv.getContext('2d'), dots = ov.querySelectorAll('.dot');
      function paint() {
        cx.drawImage(s.src, 0, 0, W, H);
        cx.fillStyle = 'rgba(0,0,0,.45)'; cx.beginPath(); cx.rect(0, 0, W, H); cx.moveTo(q[0].x, q[0].y); for (var j = 3; j >= 0; j--) cx.lineTo(q[j].x, q[j].y); cx.closePath(); cx.fill('evenodd');
        cx.strokeStyle = '#e0be7a'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(q[0].x, q[0].y); for (j = 1; j < 4; j++) cx.lineTo(q[j].x, q[j].y); cx.closePath(); cx.stroke();
        dots.forEach(function (d, j) { d.style.left = q[j].x + 'px'; d.style.top = q[j].y + 'px'; });
      }
      paint();
      dots.forEach(function (d) {
        d.onpointerdown = function (e) {
          e.preventDefault(); d.setPointerCapture(e.pointerId); var n = +d.dataset.n, box = cv.getBoundingClientRect();
          d.onpointermove = function (ev) { q[n] = { x: Math.max(0, Math.min(W, ev.clientX - box.left)), y: Math.max(0, Math.min(H, ev.clientY - box.top)) }; paint(); };
          d.onpointerup = function () { d.onpointermove = null; };
        };
      });
      ov.querySelectorAll('[data-a]').forEach(function (b) {
        b.onclick = function () {
          var a = b.dataset.a;
          if (a === 'auto') { var f = detect(s.src); if (f) { q = f.map(function (p) { return { x: p.x * k, y: p.y * k }; }); paint(); } else if (opt.toast) opt.toast('Could not find it. Please drag the dots.'); return; }
          if (a === 'full') { q = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }]; paint(); return; }
          if (a === 'ok') { s.quad = order(q.map(function (p) { return { x: p.x / k, y: p.y / k }; })); s.rot = 0; s.out = render(s.src, s.quad, L, 0).toDataURL('image/jpeg', 0.9); draw(); store(kind, i, s); }
          ov.remove();
        };
      });
    }
    /* scale the A4 preview to the screen */
    function fit() {
      if (!alive()) return;
      var sh = el.querySelector('.idc-sheet'), pg = el.querySelector('.idc-page'); if (!sh || !pg) return;
      var mmPx = 96 / 25.4, k = Math.min(1, (sh.clientWidth - 2) / (210 * mmPx));
      pg.style.transform = 'scale(' + k + ')'; sh.style.height = (297 * mmPx * k + 2) + 'px';
    }
    window.addEventListener('resize', fit);
    function pageHTML() {
      var L = LAYOUTS[state.kind], S = state.slots[state.kind];
      return '<!doctype html><html><head><meta charset="utf-8"><title>ID copies · ' + esc(state.info.guest || L.title) + '</title><style>' +
        '@page{size:A4;margin:0}html,body{margin:0;background:#fff;font-family:Helvetica,Arial,sans-serif;color:#222}' +
        '.page{width:210mm;height:296mm;box-sizing:border-box;padding:12mm 14mm;display:flex;flex-direction:column;align-items:center}' +
        '.head{width:100%;display:flex;justify-content:space-between;font-size:9pt;border-bottom:.3mm solid #999;padding-bottom:2mm;margin-bottom:' + (state.kind === 'id' ? 10 : 6) + 'mm}' +
        '.grid{display:grid;grid-template-columns:repeat(' + L.cols + ',' + L.w + 'mm);column-gap:' + L.gapX + 'mm;row-gap:' + L.gapY + 'mm}' +
        '.slot{width:' + L.w + 'mm;height:' + L.h + 'mm;position:relative}.slot img{width:100%;height:100%;display:block;border-radius:' + (state.kind === 'id' ? '3mm' : '1mm') + '}' +
        '.slot.empty{border:.2mm dashed #bbb}.lab{position:absolute;left:0;bottom:-4.2mm;font-size:7pt;color:#777}' +
        '</style></head><body><div class="page"><div class="head"><b>Nikadi Guest House</b><span>' + esc([state.info.guest, state.info.room ? 'Room ' + state.info.room : '', state.info.date].filter(Boolean).join(' · ')) + '</span></div><div class="grid">' +
        L.slots.map(function (name, i) { var s = S[i] && S[i].out ? S[i] : null; return '<div class="slot' + (s ? '' : ' empty') + '">' + (s ? '<img src="' + s.out + '">' : '') + '<span class="lab">' + esc(name) + '</span></div>'; }).join('') +
        '</div></div></body></html>';
    }
    function printPage() {
      var w = window.open('', '_blank'); if (!w) { if (opt.toast) opt.toast('Allow pop-ups to print'); return; }
      w.document.open(); w.document.write(pageHTML()); w.document.close();
      var imgs = Array.prototype.slice.call(w.document.images);
      Promise.all(imgs.map(function (im) { return im.complete ? 0 : new Promise(function (r) { im.onload = im.onerror = r; }); })).then(function () { setTimeout(function () { w.focus(); w.print(); }, 250); });
    }
    function pdfPage(btn) {
      var L = LAYOUTS[state.kind], S = state.slots[state.kind];
      function go() {
        var pdf = new root.jspdf.jsPDF({ unit: 'mm', format: 'a4' }), left = (210 - (L.cols * L.w + (L.cols - 1) * L.gapX)) / 2, top = state.kind === 'id' ? 34 : 26;
        pdf.setFontSize(9); pdf.text('Nikadi Guest House', 14, 16);
        var info = [state.info.guest, state.info.room ? 'Room ' + state.info.room : '', state.info.date].filter(Boolean).join(' · ');
        if (info) pdf.text(info, 196, 16, { align: 'right' });
        pdf.setDrawColor(150); pdf.line(14, 19, 196, 19);
        L.slots.forEach(function (name, i) {
          var r = Math.floor(i / L.cols), c = i % L.cols, x = left + c * (L.w + L.gapX), y = top + r * (L.h + L.gapY);
          if (S[i] && S[i].out) pdf.addImage(S[i].out, 'JPEG', x, y, L.w, L.h, undefined, 'FAST'); else { pdf.setDrawColor(190); pdf.rect(x, y, L.w, L.h); }
          pdf.setFontSize(7); pdf.setTextColor(120); pdf.text(name, x, y + L.h + 3.5); pdf.setTextColor(0);
        });
        pdf.save('ID-copies' + (state.info.room ? '-Room-' + state.info.room : '') + (state.info.guest ? '-' + state.info.guest.replace(/[^A-Za-z0-9]+/g, '-') : '') + '.pdf');
      }
      if (root.jspdf) return go();
      btn.disabled = true;
      var sc = document.createElement('script'); sc.src = (opt.base || '') + 'vendor/jspdf.umd.min.js';
      sc.onload = function () { btn.disabled = false; go(); }; sc.onerror = function () { btn.disabled = false; if (opt.toast) opt.toast('Could not load the PDF maker'); };
      document.head.appendChild(sc);
    }
    draw();
    return { state: state, detect: detect, layouts: LAYOUTS };
  }
  root.NikadiID = { mount: mount, detect: detect, render: render, baseCanvas: baseCanvas, LAYOUTS: LAYOUTS };
})(window);
