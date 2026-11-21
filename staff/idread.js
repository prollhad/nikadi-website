/* Nikadi staff app: read the details off an ID document, on this device.
   Aadhaar: the QR code is read first (the secure QR of new cards and e-Aadhaar, or the older XML QR); if there is no QR, the printed text is read.
   PAN, voter card, bank passbook / cheque: the printed text is read (Tesseract, loaded only when needed).
   Nothing is sent anywhere: the picture stays on this device; only the reading tools are downloaded from public CDNs. */
(function (root) {
  /* ---------- Aadhaar number check (Verhoeff), so a misread number is never filled in ---------- */
  var VD = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
  var VP = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
  function verhoeff(num) { var c = 0, a = String(num).split('').reverse(); for (var i = 0; i < a.length; i++) c = VD[c][VP[i % 8][+a[i]]]; return c === 0; }
  function aadhaarOk(n) { return /^[2-9]\d{11}$/.test(n) && verhoeff(n); }

  function title(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/(^|[\s.'-])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }).replace(/\b(Ii|Iii|Iv)\b/g, function (r) { return r.toUpperCase(); }); }
  function ymd(d, m, y) { d = +d; m = +m; y = +y; if (!(d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1920 && y <= new Date().getFullYear())) return ''; return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
  function gender(g) { g = String(g || '').trim().toUpperCase(); return g === 'M' || g === 'MALE' ? 'Male' : g === 'F' || g === 'FEMALE' ? 'Female' : g === 'T' || g === 'TRANSGENDER' ? 'Other' : ''; }
  function careOf(co) { var m = /^\s*(S\/O|D\/O|W\/O|C\/O|SON OF|DAUGHTER OF|WIFE OF|CARE OF)[:\s,]*(.+)$/i.exec(String(co || '')); return m ? { rel: /W\/O|WIFE/i.test(m[1]) ? 'Husband' : /C\/O|CARE/i.test(m[1]) ? '' : 'Father', name: title(m[2].replace(/,\s*$/, '')) } : (co ? { rel: '', name: title(co) } : null); }
  function addr(parts) { var seen = {}, out = []; parts.forEach(function (p) { p = String(p || '').replace(/\s+/g, ' ').trim(); var k = p.toLowerCase(); if (p && !seen[k]) { seen[k] = 1; out.push(title(p).replace(/\b(\d{6})\b/, '$1')); } }); return out.join(', '); }

  /* ---------- Aadhaar QR ---------- */
  /* secure QR (2019 onwards): a long number → bytes → gzip → fields separated by byte 255 */
  function bigToBytes(digits) {
    var n = BigInt(digits), out = [];
    while (n > 0n) { out.push(Number(n & 255n)); n >>= 8n; }
    return new Uint8Array(out.reverse());
  }
  function gunzip(bytes) {
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('no_gzip'));
    var ds = new DecompressionStream('gzip'), w = ds.writable.getWriter(); w.write(bytes); w.close();
    return new Response(ds.readable).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  function secureFields(bytes) {
    var f = [], cur = [];
    for (var i = 0; i < bytes.length && f.length < 18; i++) { if (bytes[i] === 255) { f.push(String.fromCharCode.apply(null, cur)); cur = []; } else cur.push(bytes[i]); }
    var o = /^V\d$/.test(f[0]) ? 1 : 0; /* V2 / V3 QR start with a version field */
    var g = function (n) { return (f[n + o] || '').trim(); };
    var ref = g(1), dob = /^(\d{2})[-\/](\d{2})[-\/](\d{4})$/.exec(g(3)), co = careOf(g(5));
    return { source: 'Aadhaar QR', name: title(g(2)), dob: dob ? ymd(dob[1], dob[2], dob[3]) : '', gender: gender(g(4)), father: co && co.rel !== 'Husband' ? co.name : '', husband: co && co.rel === 'Husband' ? co.name : '',
      address: addr([g(8), g(13), g(7), g(9), g(15), g(11), g(14), g(6), g(12)]) + (g(10) ? ' ' + g(10) : ''), aadhaarLast4: /^\d{4}/.test(ref) ? ref.slice(0, 4) : '' };
  }
  function xmlFields(t) {
    var a = {}; t.replace(/(\w+)="([^"]*)"/g, function (m, k, v) { a[k.toLowerCase()] = v; });
    var co = careOf(a.co), dob = /^(\d{2})[-\/](\d{2})[-\/](\d{4})$/.exec(a.dob || '');
    return { source: 'Aadhaar QR', name: title(a.name), dob: dob ? ymd(dob[1], dob[2], dob[3]) : '', yob: a.yob || '', gender: gender(a.gender), father: co && co.rel !== 'Husband' ? co.name : '', husband: co && co.rel === 'Husband' ? co.name : '',
      address: addr([a.house, a.street, a.lm, a.loc, a.vtc, a.po, a.subdist, a.dist, a.state]) + (a.pc ? ' ' + a.pc : ''), aadhaar: aadhaarOk(a.uid || '') ? a.uid : '' };
  }
  function parseQr(text) {
    text = String(text || '').trim();
    if (/PrintLetterBarcodeData|uid="/.test(text)) return Promise.resolve(xmlFields(text));
    if (/^\d{200,}$/.test(text)) return gunzip(bigToBytes(text)).then(secureFields);
    return Promise.resolve(null);
  }
  var jsqrP = null;
  function jsqr() { if (root.jsQR) return Promise.resolve(root.jsQR); if (!jsqrP) jsqrP = new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'; s.onload = function () { ok(root.jsQR); }; s.onerror = function () { jsqrP = null; bad(new Error('qr_reader')); }; document.head.appendChild(s); }); return jsqrP; }
  function scaled(c, max) { var k = Math.min(1, max / Math.max(c.width, c.height)); if (k === 1) return c; var o = document.createElement('canvas'); o.width = Math.round(c.width * k); o.height = Math.round(c.height * k); o.getContext('2d').drawImage(c, 0, 0, o.width, o.height); return o; }
  function findQr(canvas) {
    var tryNative = root.BarcodeDetector ? new root.BarcodeDetector({ formats: ['qr_code'] }).detect(canvas).then(function (r) { return r && r[0] ? r[0].rawValue : ''; }, function () { return ''; }) : Promise.resolve('');
    return tryNative.then(function (v) {
      if (v) return v;
      return jsqr().then(function (J) {
        var sizes = [2000, 1400, 1000], i, c, d, r;
        for (i = 0; i < sizes.length; i++) { c = scaled(canvas, sizes[i]); d = c.getContext('2d').getImageData(0, 0, c.width, c.height); r = J(d.data, c.width, c.height, { inversionAttempts: 'attemptBoth' }); if (r && r.data) return r.data; }
        return '';
      }, function () { return ''; });
    });
  }

  /* ---------- printed text ---------- */
  var ocrP = null, worker = null;
  function ocr() { if (ocrP) return ocrP; ocrP = new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js'; s.onload = ok; s.onerror = function () { ocrP = null; bad(new Error('reader')); }; document.head.appendChild(s); })
    .then(function () { return root.Tesseract.createWorker('eng'); }).then(function (w) { worker = w; }); ocrP.catch(function () { ocrP = null; }); return ocrP; }
  function readText(canvas) { return ocr().then(function () { return worker.recognize(scaled(canvas, 2000)); }).then(function (r) { return (r && r.data && r.data.text) || ''; }); }
  var NOISE = /government|india|income tax|department|govt|unique|identification|authority|aadhaar|aadhar|enrolment|signature|permanent|account|number|card|election|commission|elector|photo|identity|male|female|dob|birth|year|address|help|www|uidai|vid\b/i;
  function nameLike(l) { return /^[A-Za-z][A-Za-z .'-]{2,40}$/.test(l) && l.split(/\s+/).length <= 5 && !NOISE.test(l) && /[aeiou]/i.test(l); }
  function parseText(kind, t) {
    var lines = String(t || '').split(/\n/).map(function (l) { return l.replace(/[|_~`"“”]+/g, ' ').replace(/\s+/g, ' ').trim(); }).filter(Boolean), all = lines.join('\n'), o = { source: 'printed text' }, m;
    var dob = /(?:DOB|D\.O\.B|Date of Birth|Birth)[^0-9]{0,12}(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/i.exec(all) || /\b(\d{2})[\/\-.](\d{2})[\/\-.](19\d\d|20[0-2]\d)\b/.exec(all);
    if (dob) o.dob = ymd(dob[1], dob[2], dob[3]);
    if (/aadhaar/i.test(kind)) {
      var digits = all.replace(/[^\d\s\n]/g, ' '), re = /(?:^|\D)(\d{4})\s?(\d{4})\s?(\d{4})(?!\s?\d)/g;
      while ((m = re.exec(digits))) { var n = m[1] + m[2] + m[3]; if (aadhaarOk(n)) { o.aadhaar = n; break; } }
      m = /\b(MALE|FEMALE|TRANSGENDER)\b/i.exec(all); if (m) o.gender = gender(m[1]);
      var di = -1; lines.forEach(function (l, i) { if (di < 0 && /(DOB|Date of Birth|Year of Birth)/i.test(l)) di = i; });
      for (var j = di - 1; j >= Math.max(0, di - 3); j--) if (nameLike(lines[j])) { o.name = title(lines[j]); break; }
      m = /Address\s*[:\-]?\s*([\s\S]{10,220}?\b\d{6}\b)/i.exec(all);
      if (m) { var a = m[1].replace(/\n/g, ', ').replace(/\s+/g, ' '); var co = /^(S\/O|D\/O|W\/O|C\/O)[:\s]*([^,]+),?\s*/i.exec(a); if (co) { var c2 = careOf(co[1] + ' ' + co[2]); if (c2 && c2.rel === 'Husband') o.husband = c2.name; else if (c2) o.father = c2.name; a = a.slice(co[0].length); } o.address = addr(a.split(',')); }
    } else if (kind === 'pan') {
      m = /\b([A-Z]{5}[0-9]{4}[A-Z])\b/.exec(all.toUpperCase().replace(/[^A-Z0-9\n ]/g, ' ')); if (m) o.pan = m[1];
      var ni = -1, fi = -1; lines.forEach(function (l, i) { if (ni < 0 && /^name\b|\/\s*name\b/i.test(l) && !/father/i.test(l)) ni = i; if (fi < 0 && /father/i.test(l)) fi = i; });
      if (ni >= 0 && lines[ni + 1] && nameLike(lines[ni + 1])) o.name = title(lines[ni + 1]);
      if (fi >= 0 && lines[fi + 1] && nameLike(lines[fi + 1])) o.father = title(lines[fi + 1]);
      if (!o.name) { var gi = -1; lines.forEach(function (l, i) { if (gi < 0 && /GOVT|INCOME TAX/i.test(l)) gi = i; }); var cand = lines.slice(gi + 1).filter(nameLike); if (cand[0]) o.name = title(cand[0]); if (cand[1] && !o.father) o.father = title(cand[1]); }
    } else if (kind === 'voter') {
      m = /\b([A-Z]{3}[0-9]{7})\b/.exec(all.toUpperCase().replace(/[^A-Z0-9\n ]/g, ' ')); if (m) o.voter = m[1];
      m = /(?:Elector'?s? Name|Name)\s*[:\-]\s*([A-Za-z .]{3,40})/i.exec(all); if (m && nameLike(m[1].trim())) o.name = title(m[1]);
      m = /(?:Father'?s?|Husband'?s?)\s*Name\s*[:\-]\s*([A-Za-z .]{3,40})/i.exec(all); if (m && nameLike(m[1].trim())) { if (/husband/i.test(m[0])) o.husband = title(m[1]); else o.father = title(m[1]); }
      m = /\b(MALE|FEMALE)\b/i.exec(all); if (m) o.gender = gender(m[1]);
    } else if (kind === 'bank') {
      m = /\b([A-Z]{4}0[A-Z0-9]{6})\b/.exec(all.toUpperCase().replace(/[^A-Z0-9\n ]/g, ' ')); if (m) o.ifsc = m[1];
      m = /(?:A\/?C|Account|Acc)\.?\s*(?:No|Number|#)?\.?\s*[:\-]?\s*(\d[\d ]{8,20}\d)/i.exec(all); if (m) o.accNo = m[1].replace(/\s/g, '');
      m = /(?:Name|Customer Name|A\/C Name)\s*[:\-]\s*([A-Za-z .]{3,40})/i.exec(all); if (m && nameLike(m[1].trim())) o.accName = title(m[1]);
    }
    Object.keys(o).forEach(function (k) { if (!o[k]) delete o[k]; });
    return o;
  }

  /* read(kind, picture) → Promise of { found fields } (empty object when nothing could be read) */
  function read(kind, out, src) {
    var qr = /aadhaar/.test(kind) ? findQr(src || out).then(function (t) { return t ? parseQr(t) : null; }).catch(function () { return null; }) : Promise.resolve(null);
    return qr.then(function (q) {
      return readText(out).then(function (t) { return parseText(kind, t); }, function () { return {}; }).then(function (p) {
        var r = {}; Object.keys(p).forEach(function (k) { r[k] = p[k]; }); if (q) Object.keys(q).forEach(function (k) { if (q[k]) r[k] = q[k]; });
        if (q && p.source) r.source = 'Aadhaar QR and printed text';
        if (r.aadhaarLast4 && r.aadhaar && r.aadhaar.slice(-4) !== r.aadhaarLast4) delete r.aadhaar; /* text misread: the QR's last 4 digits do not match */
        return r;
      });
    });
  }
  root.NikadiIdRead = { read: read, parseQr: parseQr, parseText: parseText, aadhaarOk: aadhaarOk, _secure: secureFields, _big: bigToBytes };
})(typeof window !== 'undefined' ? window : globalThis);
