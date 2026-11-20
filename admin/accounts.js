/* Nikadi admin — "Accounts for the CA": pick a period, see the figures, download one PDF and the spreadsheet files.
   GST is worked out from every invoice exactly as the printed bill does (NikadiBill.compute, prices inclusive of GST).
   NkAccounts.open(ctx) where ctx = { app, post, tok, head, nav, wire, esc, login } from the admin page. */
(function () {
  var C = null, R = null, P = null, busy = false, MODE = 'accounts', OWN = '19AAHCN7789F1ZR';
  var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }
  function istToday() { var d = new Date(Date.now() + 330 * 60000); return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); }
  function lastDay(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function nice(d) { var p = String(d).split('-'); return Number(p[2]) + ' ' + MON[p[1] - 1].slice(0, 3) + ' ' + p[0]; }
  function r2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
  function money(n) { return (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function rs(n) { return '₹' + money(n); }
  /* the financial year runs 1 April to 31 March */
  function fyOf(t) { var y = +t.slice(0, 4), m = +t.slice(5, 7); return m >= 4 ? y : y - 1; }
  function fyName(y) { return 'FY ' + y + '-' + String(y + 1).slice(2); }
  function presets() {
    var t = istToday(), y = +t.slice(0, 4), m = +t.slice(5, 7), fy = fyOf(t), out = [];
    var pm = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y;
    out.push(['This month', ymd(y, m, 1), t], ['Last month', ymd(py, pm, 1), ymd(py, pm, lastDay(py, pm))]);
    var qs = m >= 10 ? 10 : m >= 7 ? 7 : m >= 4 ? 4 : 1; // quarters of the financial year: Apr-Jun, Jul-Sep, Oct-Dec, Jan-Mar
    out.push(['This quarter', ymd(y, qs, 1), t]);
    var ls = qs === 1 ? 10 : qs - 3, ly = qs === 1 ? y - 1 : y;
    out.push(['Last quarter', ymd(ly, ls, 1), ymd(ly, ls + 2, lastDay(ly, ls + 2))]);
    out.push([fyName(fy) + ' so far', ymd(fy, 4, 1), t], [fyName(fy - 1) + ' (full year)', ymd(fy - 1, 4, 1), ymd(fy, 3, 31)]);
    return out;
  }
  function months() { var t = istToday(), y = +t.slice(0, 4), m = +t.slice(5, 7), o = []; for (var i = 0; i < 36; i++) { o.push([y + '-' + pad(m), MON[m - 1] + ' ' + y]); m--; if (m < 1) { m = 12; y--; } } return o; }

  /* ---------- figures ---------- */
  function build(r) {
    var H = window.NikadiBill, sales = [], hsn = {}, byMonth = {}, tot = { n: 0, taxable: 0, cgst: 0, sgst: 0, gst: 0, total: 0, b2bN: 0, b2bTaxable: 0, b2bGst: 0, b2bTotal: 0 };
    function mon(k) { return byMonth[k] || (byMonth[k] = { m: k, n: 0, taxable: 0, cgst: 0, sgst: 0, total: 0, received: 0, refunded: 0, expenses: 0, commission: 0 }); }
    function add(b, manual) {
      var d = b.d, c = null; try { if (d && H) c = H.compute(d); } catch (e) { c = null; }
      if (!c) { var tx = r2(b.total / 1.05); c = { total: b.total, taxable: tx, cgst: r2((b.total - tx) / 2), sgst: r2(b.total - tx - r2((b.total - tx) / 2)), gstTotal: r2(b.total - tx), tax: [{ hsn: '996311', gst: 5, taxable: tx, cgst: r2((b.total - tx) / 2), sgst: r2(b.total - tx - r2((b.total - tx) / 2)), tax: r2(b.total - tx), total: b.total }], est: true }; }
      var g = (d && d.guest) || {}, row = { no: b.no || '', date: String(b.at).slice(0, 10), guest: g.name || b.guest || '', gstin: String(g.gstin || '').toUpperCase(), company: g.company || '', room: d && d.room ? d.room.no : (b.room || ''), nights: d ? d.nights : '',
        taxable: c.taxable, cgst: c.cgst, sgst: c.sgst, gst: c.gstTotal, total: c.total, manual: !!manual, est: !!c.est };
      sales.push(row);
      c.tax.forEach(function (x) { var k = (x.hsn || '—') + '|' + x.gst, h = hsn[k] || (hsn[k] = { hsn: x.hsn || '—', gst: x.gst, taxable: 0, cgst: 0, sgst: 0, tax: 0, total: 0 }); ['taxable', 'cgst', 'sgst', 'tax', 'total'].forEach(function (f) { h[f] = r2(h[f] + x[f]); }); });
      tot.n++; ['taxable', 'cgst', 'sgst', 'total'].forEach(function (f) { tot[f] = r2(tot[f] + row[f]); }); tot.gst = r2(tot.gst + row.gst);
      if (row.gstin) { tot.b2bN++; tot.b2bTaxable = r2(tot.b2bTaxable + row.taxable); tot.b2bGst = r2(tot.b2bGst + row.gst); tot.b2bTotal = r2(tot.b2bTotal + row.total); }
      var m = mon(row.date.slice(0, 7)); m.n++; ['taxable', 'cgst', 'sgst', 'total'].forEach(function (f) { m[f] = r2(m[f] + row[f]); });
    }
    r.bills.forEach(function (b) { add(b, false); }); r.ownBills.forEach(function (b) { add(b, true); });
    sales.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : String(a.no) < String(b.no) ? -1 : 1; });
    var rec = { in: 0, out: 0, by: {} }, receipts = [], refunds = [];
    r.payments.forEach(function (p) { var d = String(p.at).slice(0, 10), k = p.method || 'Not said';
      if (p.amount >= 0) { rec.in = r2(rec.in + p.amount); rec.by[k] = r2((rec.by[k] || 0) + p.amount); mon(d.slice(0, 7)).received = r2(mon(d.slice(0, 7)).received + p.amount); receipts.push(p); }
      else { rec.out = r2(rec.out - p.amount); mon(d.slice(0, 7)).refunded = r2(mon(d.slice(0, 7)).refunded - p.amount); refunds.push(p); } });
    var ex = { total: 0, by: {}, withBill: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, gstN: 0, unchecked: 0 };
    r.expenses.forEach(function (x) { ex.total = r2(ex.total + x.amount); var k = (x.group || 'Other') + ' › ' + (x.category || 'Other'); ex.by[k] = r2((ex.by[k] || 0) + x.amount); if (x.hasBill) ex.withBill++; if (x.cgst + x.sgst + x.igst > 0 || x.gstin) { ex.gstN++; ex.taxable = r2(ex.taxable + x.taxable); ex.cgst = r2(ex.cgst + x.cgst); ex.sgst = r2(ex.sgst + x.sgst); ex.igst = r2(ex.igst + x.igst); if (/not checked/.test(x.gstBy)) ex.unchecked++; } mon(String(x.date).slice(0, 7)).expenses = r2(mon(String(x.date).slice(0, 7)).expenses + x.amount); });
    var com = 0; r.commissions.forEach(function (x) { com = r2(com + x.amount); mon(String(x.date).slice(0, 7)).commission = r2(mon(String(x.date).slice(0, 7)).commission + x.amount); });
    var lau = 0; r.laundry.forEach(function (x) { lau = r2(lau + x.total); });
    var kept = 0; r.kept.forEach(function (x) { kept = r2(kept + x.kept); });
    function top(o) { return Object.keys(o).map(function (k) { return [k, o[k]]; }).sort(function (a, b) { return b[1] - a[1]; }); }
    return { r: r, sales: sales, hsn: Object.keys(hsn).map(function (k) { return hsn[k]; }).sort(function (a, b) { return b.total - a.total; }), tot: tot, months: Object.keys(byMonth).sort().map(function (k) { return byMonth[k]; }),
      rec: rec, recBy: top(rec.by), receipts: receipts, refunds: refunds, ex: ex, exBy: top(ex.by), com: com, lau: lau, kept: kept };
  }
  function mname(k) { var p = k.split('-'); return MON[p[1] - 1].slice(0, 3) + ' ' + p[0]; }

  /* ---------- screen ---------- */
  function tile(l, n, s) { return '<div class="tile"><div class="l">' + l + '</div><div class="n" style="font-size:1.7rem">' + n + '</div><div class="s">' + (s || '&nbsp;') + '</div></div>'; }
  function tbl(headers, rows, foot) { return '<div class="tw"><table><thead><tr>' + headers.map(function (h) { return '<th' + (h[1] ? ' class="n"' : '') + '>' + h[0] + '</th>'; }).join('') + '</tr></thead><tbody>' +
    rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td' + (headers[i][1] ? ' class="n"' : '') + '>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + (foot ? '<tr class="sub">' + foot.map(function (c, i) { return '<td' + (headers[i][1] ? ' class="n"' : '') + '>' + c + '</td>'; }).join('') + '</tr>' : '') + '</tbody></table></div>'; }
  function chooser(pr) { var h = '';
    h += '<div class="card"><div class="ch"><h2>Choose the period</h2></div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">' + pr.map(function (p, i) { return '<button class="btn' + (P && P[0] === p[1] && P[1] === p[2] ? ' btn-gold' : '') + '" type="button" data-pre="' + i + '">' + p[0] + '</button>'; }).join('') + '</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end"><label class="small">One month<br><select class="in" id="acM" style="max-width:200px"><option value="">Pick a month</option>' + months().map(function (m) { return '<option value="' + m[0] + '">' + m[1] + '</option>'; }).join('') + '</select></label>' +
      '<label class="small">Financial year<br><select class="in" id="acF" style="max-width:200px"><option value="">Pick a year</option>' + [0, 1, 2, 3].map(function (i) { var y = fyOf(istToday()) - i; return '<option value="' + y + '">' + fyName(y) + ' (Apr ' + y + ' to Mar ' + (y + 1) + ')</option>'; }).join('') + '</select></label>' +
      '<label class="small">From<br><input class="in" id="acA" type="date" style="max-width:170px" value="' + (P ? P[0] : '') + '"></label><label class="small">To<br><input class="in" id="acB" type="date" style="max-width:170px" value="' + (P ? P[1] : '') + '"></label>' +
      '<button class="btn btn-gold" type="button" id="acGo">Show</button></div><p class="err" id="acErr" role="alert"></p></div>';
    return h; }
  function chooserWire(pr) {
    function go(a, b) { var er = document.getElementById('acErr'); if (!a || !b) { er.textContent = 'Choose both dates.'; return; } if (a > b) { er.textContent = 'The first date is after the second.'; return; } load(a, b); }
    [].forEach.call(C.app.querySelectorAll('[data-pre]'), function (b) { b.onclick = function () { var p = pr[b.dataset.pre]; go(p[1], p[2]); }; });
    document.getElementById('acM').onchange = function () { var v = this.value; if (!v) return; var y = +v.slice(0, 4), m = +v.slice(5, 7), end = ymd(y, m, lastDay(y, m)), t = istToday(); go(ymd(y, m, 1), end > t ? t : end); };
    document.getElementById('acF').onchange = function () { var y = +this.value; if (!y) return; var end = ymd(y + 1, 3, 31), t = istToday(); go(ymd(y, 4, 1), end > t ? t : end); };
    document.getElementById('acGo').onclick = function () { go(document.getElementById('acA').value, document.getElementById('acB').value); };
  }
  /* ---- who sends the accounts: one director, with the company stamp and signature on every page ---- */
  var SIGNER = { name: 'Prollhad Paul', title: 'Director', company: 'Nikadi Projects Private Limited' };
  var SENT = 'Accounts sent by one of the directors: ' + SIGNER.name + ', ' + SIGNER.title + ', ' + SIGNER.company;
  var SG = null, sgP = null;
  function sgOne(u) { return u ? imgSize(u).then(function (z) { return z ? { u: u, w: z[0], h: z[1] } : null; }) : Promise.resolve(null); }
  /* the stamp with signature already used on the guest bills is the one used here, unless another is added below */
  function sgBill(f) { return fetch('/img/brand/' + f).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (b) { return new Promise(function (ok) { var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.onerror = function () { ok(''); }; fr.readAsDataURL(b); }); }).then(sgOne, function () { return null; }); }
  function signLoad() { if (sgP) return sgP; sgP = C.post({ action: 'deskCaSignGet', token: C.tok() }).then(function (r) { if (!r.ok) throw new Error(r.error); return Promise.all([sgOne(r.stamp), sgOne(r.sign)]); }).then(function (a) { return Promise.all([a[0] || sgBill('stamp.png'), a[1] || sgBill('sign.png')]).then(function (d) { return { stamp: d[0], sign: d[1], own: { stamp: !!a[0], sign: !!a[1] } }; }); }).then(function (o) { SG = o; return SG; }, function () { sgP = null; SG = SG || { stamp: null, sign: null, own: {} }; return SG; }); return sgP; }
  /* bottom right corner of a page: stamp, signature, then the director's name. The page keeps this corner free. */
  function signPage(doc, W, Ht, M) { var x1 = W - M, g = SG || {};
    function put(o, bw, bh, right, bottom) { if (!o) return 0; var sc = Math.min(bw / o.w, bh / o.h), w = o.w * sc, h = o.h * sc; try { doc.addImage(o.u, /png/.test(o.u.slice(0, 30)) ? 'PNG' : 'JPEG', right - w, bottom - h, w, h, undefined, 'FAST'); } catch (er) { return 0; } return w; }
    var own = g.own || {};
    if (g.stamp && !own.stamp) { /* our stamp has the company name on top and Director below, with the space between them for the signature */
      var sw0 = 56, sh0 = sw0 * g.stamp.h / g.stamp.w, top = Ht - 17.5 - sh0, left = x1 - sw0; put(g.stamp, sw0, sh0, x1, Ht - 17.5);
      if (g.sign) { var bw = sw0 * .751, bh = sh0 * .58, sc = Math.min(bw / g.sign.w, bh / g.sign.h), w2 = g.sign.w * sc, h2 = g.sign.h * sc; try { doc.addImage(g.sign.u, /png/.test(g.sign.u.slice(0, 30)) ? 'PNG' : 'JPEG', left + sw0 * .178 + (bw - w2) / 2, top + sh0 * .225 + (bh - h2) / 2, w2, h2, undefined, 'FAST'); } catch (er) {} } }
    else { var sw = put(g.sign, 40, 14, x1, Ht - 18.5); put(g.stamp, 22, 19, x1 - (sw ? sw + 4 : 0), Ht - 17.5); }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.8); doc.setTextColor(30, 30, 30); doc.text(lat(SIGNER.name + ', ' + SIGNER.title), x1, Ht - 14.6, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(70, 70, 70); doc.text(lat(SIGNER.company + ' - sent by one of the directors'), x1, Ht - 11.4, { align: 'right' }); }
  /* a photo or scan is made small enough to store; a white paper background is made see-through so only the ink shows */
  function sgPrep(file) { return new Promise(function (ok, bad) { var fr = new FileReader(); fr.onerror = bad; fr.onload = function () { var im = new Image(); im.onerror = bad; im.onload = function () {
    function make(max) { var sc = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * sc)); c.height = Math.max(1, Math.round(im.naturalHeight * sc)); var x = c.getContext('2d'); x.drawImage(im, 0, 0, c.width, c.height);
      try { var d = x.getImageData(0, 0, c.width, c.height), p = d.data; for (var i = 0; i < p.length; i += 4) { var m = Math.min(p[i], p[i + 1], p[i + 2]); if (m > 205) p[i + 3] = Math.round(p[i + 3] * Math.max(0, (255 - m) / 50)); } x.putImageData(d, 0, 0); } catch (er) {}
      return c.toDataURL('image/png'); }
    var u = make(640); if (u.length > 380000) u = make(420); if (u.length > 380000) u = make(280); ok(u); }; im.src = fr.result; }; fr.readAsDataURL(file); }); }
  function signCard() { var g = SG; function slot(k, t) { var o = g && g[k], own = o && g.own && g.own[k]; return '<div style="flex:1;min-width:210px"><b style="font-weight:500">' + t + '</b><div style="margin:8px 0;height:86px;border:1px dashed var(--line);border-radius:10px;display:flex;align-items:center;justify-content:center;background:#fff">' + (o ? '<img alt="' + t + ' on file" src="' + o.u + '" style="max-height:78px;max-width:92%">' : '<span style="color:#666;font-size:.86rem">' + (g ? 'Not added yet' : 'Checking…') + '</span>') + '</div>' +
      '<label class="btn" style="cursor:pointer">' + (own ? 'Change' : o ? 'Use a different one' : 'Add a photo or scan') + '<input type="file" accept="image/*" data-sg="' + k + '" style="position:absolute;width:1px;height:1px;opacity:0"></label>' + (own ? ' <button class="btn" type="button" data-sgx="' + k + '">Remove</button>' : '') + '</div>'; }
    return '<div class="card" id="sgCard"><div class="ch"><h2>Stamp and signature on the files</h2><span class="small">bottom corner of every PDF page</span></div><p class="small" style="margin-top:0">Every file says: ' + C.esc(SENT) + '. The company stamp and your signature below, the same ones as on the guest bills, are placed on each page: the signature goes in the space between the company name and Director. To use a different stamp or signature, add a photo of it on white paper; it is then stored privately on the server.' + (g && !g.stamp && !g.sign ? ' Until one is added, the corner is left empty so you can stamp and sign a print by hand.' : '') + '</p><div style="display:flex;gap:16px;flex-wrap:wrap">' + slot('stamp', 'Company stamp') + slot('sign', 'Signature') + '</div><p class="small" id="sgMsg" role="status"></p></div>'; }
  function signWire() { var card = document.getElementById('sgCard'); if (!card) return;
    function redo(msg) { var c = document.getElementById('sgCard'); if (!c) return; var d = document.createElement('div'); d.innerHTML = signCard(); c.replaceWith(d.firstChild); signWire(); if (msg) document.getElementById('sgMsg').textContent = msg; }
    function send(k, data) { var m = document.getElementById('sgMsg'); m.textContent = 'Saving…'; return C.post({ action: 'deskCaSignSave', token: C.tok(), which: k, data: data }).then(function (r) { if (!r.ok) { m.textContent = r.error === 'bad_image' ? 'That picture could not be used. Try a clear photo on white paper.' : 'Could not save. Please try again.'; return; } return sgOne(data).then(function (o) { SG = null; sgP = null; return signLoad(); }).then(function () { redo(data ? 'Saved. It will be on every PDF you make from now.' : 'Removed.'); }); }, function () { m.textContent = 'No connection. Please try again.'; }); }
    card.querySelectorAll('[data-sg]').forEach(function (i) { i.onchange = function () { var f = i.files && i.files[0]; if (!f) return; sgPrep(f).then(function (u) { send(i.dataset.sg, u); }, function () { document.getElementById('sgMsg').textContent = 'That picture could not be opened.'; }); }; });
    card.querySelectorAll('[data-sgx]').forEach(function (b) { b.onclick = function () { send(b.dataset.sgx, ''); }; });
    if (!SG) signLoad().then(function () { redo(); }); }
  function draw() { if (MODE === 'bills') return drawBills();
    var e = C.esc, pr = presets(), h = C.head('Accounts for the CA', 'Sales with GST, money received, expenses and commission for any period. Make one PDF and the spreadsheet files to send.') + C.nav('accounts');
    h += chooser(pr) + signCard();
    if (busy) h += '<div class="card"><p class="empty">Collecting the records…</p></div>';
    else if (R) {
      var t = R.tot;
      h += '<div class="sec"><div><p class="kick">' + nice(P[0]) + ' to ' + nice(P[1]) + '</p><h2>Figures for this period</h2></div></div>' +
        '<div class="card"><div class="ch"><h2>Files for your CA</h2><span class="small">each file opens on screen first; you download it only if it looks right</span></div><div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="btn btn-gold" type="button" id="acPdf">See the full PDF report</button><button class="btn" type="button" data-csv="sales">Sales register (Excel)</button><button class="btn" type="button" data-csv="hsn">GST summary by HSN (Excel)</button><button class="btn" type="button" data-csv="receipts">Money received (Excel)</button><button class="btn" type="button" data-csv="expenses">Expenses (Excel)</button><button class="btn" type="button" data-csv="commission">Commission (Excel)</button><button class="btn" type="button" id="acAll">See all files together</button></div>' +
        '<p class="small" style="margin-top:10px">The Excel files are CSV files: they open in Excel, Google Sheets and Tally imports. Send them by WhatsApp or email from your downloads.</p></div>' +
        '<div class="tiles">' + tile('Sales (invoice value)', rs(t.total), t.n + ' invoices') + tile('Taxable value', rs(t.taxable), 'before GST') + tile('GST collected', rs(t.gst), 'CGST ' + rs(t.cgst) + ' · SGST ' + rs(t.sgst)) + tile('Money received', rs(R.rec.in), R.rec.out ? 'refunded ' + rs(R.rec.out) : 'no refunds') + tile('Expenses', rs(R.ex.total), R.r.expenses.length + ' entries') + tile('Commission paid', rs(R.com), R.r.commissions.length + ' entries') + '</div>' +
        '<div class="card"><div class="ch"><h2>GST on sales, by HSN / SAC</h2><span class="small">for GSTR-1 and GSTR-3B</span></div>' + (R.hsn.length ? tbl([['HSN / SAC'], ['GST rate', 1], ['Taxable value', 1], ['CGST', 1], ['SGST', 1], ['Total GST', 1], ['Invoice value', 1]],
          R.hsn.map(function (x) { return [e(x.hsn), x.gst + '%', money(x.taxable), money(x.cgst), money(x.sgst), money(x.tax), money(x.total)]; }), ['Total', '', money(t.taxable), money(t.cgst), money(t.sgst), money(t.gst), money(t.total)]) : '<p class="empty">No invoices in this period.</p>') +
        '<p class="small" style="margin-top:10px">To registered businesses (B2B, with GSTIN): ' + t.b2bN + ' invoices, taxable ' + rs(t.b2bTaxable) + ', GST ' + rs(t.b2bGst) + '. To others (B2C): ' + (t.n - t.b2bN) + ' invoices, taxable ' + rs(r2(t.taxable - t.b2bTaxable)) + ', GST ' + rs(r2(t.gst - t.b2bGst)) + '. IGST and cess: nil.</p></div>' +
        '<div class="card"><div class="ch"><h2>Month by month</h2></div>' + (R.months.length ? tbl([['Month'], ['Invoices', 1], ['Taxable value', 1], ['CGST', 1], ['SGST', 1], ['Invoice value', 1], ['Received', 1], ['Refunded', 1], ['Expenses', 1], ['Commission', 1]],
          R.months.map(function (m) { return [mname(m.m), m.n, money(m.taxable), money(m.cgst), money(m.sgst), money(m.total), money(m.received), money(m.refunded), money(m.expenses), money(m.commission)]; }),
          ['Total', t.n, money(t.taxable), money(t.cgst), money(t.sgst), money(t.total), money(R.rec.in), money(R.rec.out), money(R.ex.total), money(R.com)]) : '<p class="empty">Nothing in this period.</p>') + '</div>' +
        '<div class="grid"><div class="card"><div class="ch"><h2>Money received, by mode</h2></div>' + (R.recBy.length ? tbl([['Mode'], ['Amount', 1]], R.recBy.map(function (x) { return [e(x[0]), money(x[1])]; }), ['Total', money(R.rec.in)]) : '<p class="empty">Nothing received.</p>') + '</div>' +
        '<div class="card"><div class="ch"><h2>Expenses, by kind</h2></div>' + (R.exBy.length ? tbl([['Group › category'], ['Amount', 1]], R.exBy.map(function (x) { return [e(x[0]), money(x[1])]; }), ['Total', money(R.ex.total)]) : '<p class="empty">No expenses entered.</p>') + '</div></div>' +
        '<div class="card"><div class="ch"><h2>Also in the report</h2></div><div class="rows"><div class="row"><span class="t">Laundry bills</span><span class="v">' + rs(R.lau) + '</span></div><div class="row"><span class="t">Advances kept from no-shows and cancellations (no invoice was made)</span><span class="v">' + rs(R.kept) + '</span></div><div class="row"><span class="t">Expense entries with a bill photo on file</span><span class="v">' + R.ex.withBill + ' of ' + R.r.expenses.length + '</span></div><div class="row"><span class="t">GST paid on purchases, from the ' + R.ex.gstN + ' bills entered (input GST)</span><span class="v">' + rs(r2(R.ex.cgst + R.ex.sgst + R.ex.igst)) + '</span></div></div>' +
        '<p class="small" style="margin-top:12px">Sales are taken from the invoices made at check-out, by invoice date. A guest still in the house has no invoice yet. GST on purchases comes from the bills entered on the <a class="lnk" href="#bills">Purchase bills</a> page; ' + (R.ex.unchecked ? R.ex.unchecked + ' of them were read by the computer and are not checked yet.' : 'purchases without GST details are shown with the amount only.') + '</p></div>';
    }
    C.app.innerHTML = h; C.wire(); signWire(); window.scrollTo(0, 0);
    chooserWire(pr);
    if (R && !busy) {
      document.getElementById('acPdf').onclick = function () { var b = this; b.disabled = true; b.textContent = 'Making the PDF…'; pdf().then(function (f) { b.disabled = false; b.textContent = 'See the full PDF report'; preview([f]); }, function (er) { b.disabled = false; b.textContent = 'Could not make the PDF. Try again'; console.error(er); }); };
      [].forEach.call(C.app.querySelectorAll('[data-csv]'), function (b) { b.onclick = function () { preview([csv(b.dataset.csv)]); }; });
      document.getElementById('acAll').onclick = function () { var b = this; b.disabled = true; pdf().then(function (f) { b.disabled = false; preview([f].concat(['sales', 'hsn', 'receipts', 'expenses', 'commission'].map(csv))); }, function () { b.disabled = false; }); };
    }
  }
  function load(a, b) { P = [a, b]; R = null; busy = true; draw();
    C.post({ action: 'deskCaReport', token: C.tok(), from: a, to: b }).then(function (r) { busy = false;
      if (!r.ok) { if (r.error === 'not_logged_in' || r.error === 'session_expired') return C.login(); draw(); document.getElementById('acErr').textContent = r.error === 'not_allowed' ? 'Only the owner can see the accounts.' : r.error === 'too_long' ? 'That period is too long. Choose three years or less.' : 'Could not load (' + r.error + ').'; return; }
      R = build(r); draw(); }, function () { busy = false; draw(); document.getElementById('acErr').textContent = 'No connection. Try again.'; });
  }

  /* ---------- files ---------- */
  function save(blob, name) { var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); }
  function fname(kind, ext) { return 'Nikadi-' + kind + '-' + P[0] + '-to-' + P[1] + '.' + ext; }
  function csvText(head, rows) { function q(v) { v = v == null ? '' : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; } return '﻿' + [head].concat(rows).map(function (r) { return r.map(q).join(','); }).join('\r\n'); }
  function csv(kind) {
    var H = window.NikadiBill ? window.NikadiBill.HOTEL : {}, head, rows, name;
    if (kind === 'sales') { name = 'Sales-register'; head = ['Invoice no.', 'Invoice date', 'Customer', 'Customer GSTIN', 'Company', 'Place of supply', 'Room', 'Nights', 'Taxable value', 'CGST', 'SGST', 'IGST', 'Total GST', 'Invoice value', 'Type', 'Note'];
      rows = R.sales.map(function (s) { return [s.no, s.date, s.guest, s.gstin, s.company, (H.stateCode || '19') + '-' + (H.state || 'West Bengal'), s.room, s.nights, s.taxable.toFixed(2), s.cgst.toFixed(2), s.sgst.toFixed(2), '0.00', s.gst.toFixed(2), s.total.toFixed(2), s.gstin ? 'B2B' : 'B2C', (s.manual ? 'Invoice made by the owner. ' : '') + (s.est ? 'GST estimated at 5% (bill details missing).' : '')]; }); }
    else if (kind === 'hsn') { name = 'GST-summary-by-HSN'; head = ['HSN / SAC', 'GST rate %', 'Taxable value', 'CGST', 'SGST', 'IGST', 'Total GST', 'Invoice value'];
      rows = R.hsn.map(function (x) { return [x.hsn, x.gst, x.taxable.toFixed(2), x.cgst.toFixed(2), x.sgst.toFixed(2), '0.00', x.tax.toFixed(2), x.total.toFixed(2)]; }); }
    else if (kind === 'receipts') { name = 'Money-received'; head = ['Date and time', 'Amount', 'Received or refunded', 'Mode', 'Reference no.', 'Guest', 'Room', 'Booking', 'Note'];
      rows = R.r.payments.map(function (p) { return [p.at, p.amount.toFixed(2), p.amount < 0 ? 'Refunded' : 'Received', p.method, p.ref, p.guest, p.room, p.booking, p.note]; }); }
    else if (kind === 'expenses') { name = 'Expenses'; head = ['Expense no.', 'Date', 'Group', 'Category', 'What was bought or paid for', 'Qty', 'Amount', 'Paid by', 'Transaction no.', 'Shop or payee', 'Supplier GSTIN', 'Supplier bill no.', 'Taxable value', 'CGST', 'SGST', 'IGST', 'GST details', 'Bill photo on file', 'Note'];
      rows = R.r.expenses.map(function (x) { var g = x.cgst + x.sgst + x.igst > 0 || x.gstin; return [x.id, x.date, x.group, x.category, x.item, x.qty, x.amount.toFixed(2), x.method, x.ref, x.shop, x.gstin, x.billNo, g ? x.taxable.toFixed(2) : '', g ? x.cgst.toFixed(2) : '', g ? x.sgst.toFixed(2) : '', g ? x.igst.toFixed(2) : '', x.gstBy, x.hasBill ? 'Yes' : 'No', x.note]; })
        .concat(R.r.laundry.map(function (x) { return ['', x.date, 'Laundry', 'Laundry bill', 'Laundry', '', x.total.toFixed(2), '', '', '', '', '', '', '', '', '', '', '', (x.paid ? 'Paid. ' : 'Not marked paid. ') + x.note]; })); }
    else { name = 'Commission'; head = ['Date', 'Name', 'Driver or broker', 'Phone', 'Vehicle no.', 'For guest', 'Room / booking', 'Amount', 'Paid by', 'Transaction no.', 'Note'];
      rows = R.r.commissions.map(function (x) { return [x.date, x.name, x.type, x.phone, x.vehicle, x.guest, x.room, x.amount.toFixed(2), x.method, x.ref, x.note]; }); }
    return { name: fname(name, 'csv'), kind: 'csv', label: name.replace(/-/g, ' '), head: head, rows: rows, note: SENT, blob: new Blob([csvText(head, rows.concat([[], [SENT]]))], { type: 'text/csv;charset=utf-8' }) };
  }
  /* Look before you download: every file opens here first. PDFs are shown page by page as they will print; Excel files as a table. */
  function preview(files) {
    files = files.filter(Boolean); if (!files.length) return; var e = C.esc, cur = 0, urls = [], ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:60;background:#0d0b0a;display:flex;flex-direction:column';
    ov.innerHTML = '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:max(10px,env(safe-area-inset-top)) 14px 10px;border-bottom:1px solid var(--line)"><b id="pvName" style="font-weight:500;flex:1;min-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></b>' +
      '<button class="btn btn-gold" type="button" id="pvGet">Download this file</button>' + (files.length > 1 ? '<button class="btn" type="button" id="pvAll">Download all ' + files.length + '</button>' : '') + '<button class="btn" type="button" id="pvX">Close</button></div>' +
      (files.length > 1 ? '<div id="pvTabs" style="display:flex;gap:6px;flex-wrap:wrap;padding:8px 14px;border-bottom:1px solid var(--line)"></div>' : '') + '<div id="pvBody" style="flex:1;min-height:0;overflow:auto;background:#1b1714"></div>';
    document.body.appendChild(ov); var body = ov.querySelector('#pvBody'), prevOv = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden';
    function close() { urls.forEach(function (u) { URL.revokeObjectURL(u); }); document.documentElement.style.overflow = prevOv; ov.remove(); document.removeEventListener('keydown', key); }
    function key(ev) { if (ev.key === 'Escape') close(); } document.addEventListener('keydown', key);
    function show(i) { cur = i; var f = files[i]; ov.querySelector('#pvName').textContent = f.name + '  ·  ' + (f.blob.size > 1048576 ? (f.blob.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(f.blob.size / 1024)) + ' KB');
      if (files.length > 1) ov.querySelector('#pvTabs').innerHTML = files.map(function (x, k) { return '<button class="btn' + (k === i ? ' btn-gold' : '') + '" type="button" data-k="' + k + '" style="padding:5px 12px;font-size:.86rem">' + e(x.label || x.name) + '</button>'; }).join('');
      if (f.kind === 'csv') { var max = 500; body.innerHTML = '<div style="padding:14px"><p class="small" style="margin:0 0 10px">' + f.rows.length + ' rows' + (f.rows.length > max ? ', the first ' + max + ' shown here; the file has all of them' : '') + '. This is exactly what the file contains.</p>' + (f.rows.length ? '<div class="tw"><table><thead><tr>' + f.head.map(function (h) { return '<th>' + e(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + f.rows.slice(0, max).map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + e(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' : '<p class="empty">This file has only its heading row: there is nothing of this kind in the period.</p>') + (f.note ? '<p class="small" style="margin-top:12px">Last line of the file: ' + e(f.note) + '</p>' : '') + '</div>'; return; }
      body.innerHTML = '<p class="empty" style="padding:14px">Opening the pages…</p>'; pages(f).then(function (ok) { if (cur !== i) return; if (!ok) { var u = URL.createObjectURL(f.blob); urls.push(u); body.innerHTML = '<iframe title="' + e(f.name) + '" src="' + u + '" style="width:100%;height:100%;border:0;background:#fff"></iframe>'; } }); }
    /* each PDF page is drawn as a picture, so it shows the same on a phone as on a computer */
    function pages(f) { if (!pdfjs) pdfjs = import('/staff/vendor/pdf.min.mjs').then(function (m) { m.GlobalWorkerOptions.workerSrc = '/staff/vendor/pdf.worker.min.mjs'; return m; }); var my = cur;
      return pdfjs.then(function (m) { return f.blob.arrayBuffer().then(function (ab) { return m.getDocument({ data: ab }).promise; }).then(function (doc) { if (cur !== my) return true; body.innerHTML = '<p class="small" style="text-align:center;margin:10px 0 0">' + doc.numPages + ' page' + (doc.numPages > 1 ? 's' : '') + '</p><div id="pvPages" style="display:grid;gap:12px;justify-items:center;padding:12px"></div>'; var box = body.querySelector('#pvPages'), n = 0;
          function next() { if (cur !== my || n >= doc.numPages || !box.isConnected) return true; n++; return doc.getPage(n).then(function (pg) { var w = Math.min(1100, body.clientWidth - 24), v0 = pg.getViewport({ scale: 1 }), sc = w / v0.width, dpr = Math.min(2, window.devicePixelRatio || 1), v = pg.getViewport({ scale: sc * dpr }), cv = document.createElement('canvas'); cv.width = v.width; cv.height = v.height; cv.style.cssText = 'width:' + Math.round(v.width / dpr) + 'px;max-width:100%;height:auto;background:#fff;border-radius:4px;box-shadow:0 6px 24px rgba(0,0,0,.5)'; box.appendChild(cv); return pg.render({ canvasContext: cv.getContext('2d'), viewport: v }).promise; }).then(next); }
          return next(); }); }).then(function () { return true; }, function () { pdfjs = null; return false; }); }
    ov.querySelector('#pvX').onclick = close; ov.querySelector('#pvGet').onclick = function () { save(files[cur].blob, files[cur].name); };
    if (files.length > 1) { ov.querySelector('#pvAll').onclick = function () { var k = 0; (function nx() { if (k < files.length) { save(files[k].blob, files[k].name); k++; setTimeout(nx, 500); } })(); }; ov.querySelector('#pvTabs').onclick = function (ev) { var b = ev.target.closest('[data-k]'); if (b) show(Number(b.dataset.k)); }; }
    show(0);
  }
  var pdfjs = null;
  var jsp = null;
  function tool() { if (jsp) return jsp; jsp = new Promise(function (ok, bad) { if (window.jspdf) return ok(); var s = document.createElement('script'); s.src = '/staff/vendor/jspdf.umd.min.js'; s.onload = function () { ok(); }; s.onerror = function () { jsp = null; bad(new Error('pdf_tool')); }; document.head.appendChild(s); }); return jsp; }
  /* the PDF uses the built-in Latin font, so names in other scripts are shown as they can be */
  function lat(v) { return String(v == null ? '' : v).replace(/₹/g, 'Rs ').replace(/[›→]/g, '>').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/·/g, '-').replace(/[^\x20-\x7e\xa0-\xff]/g, '?'); }
  function pdf() { return Promise.all([tool(), signLoad()]).then(function () {
    var H = (window.NikadiBill || {}).HOTEL || {}, doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' }), W = 297, Ht = 210, M = 12, y = M, t = R.tot;
    function need(h) { if (y + h > Ht - 36) { doc.addPage(); y = M; } }
    function h1(s) { need(14); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(20, 30, 60); doc.text(lat(s), M, y + 5); y += 8; doc.setDrawColor(190, 150, 70); doc.setLineWidth(.5); doc.line(M, y, W - M, y); y += 4; }
    function para(s, size) { doc.setFont('helvetica', 'normal'); doc.setFontSize(size || 9); doc.setTextColor(50, 50, 50); var l = doc.splitTextToSize(lat(s), W - 2 * M); need(l.length * 4 + 2); doc.text(l, M, y + 3); y += l.length * 4 + 2; }
    /* cols: [title, width mm, 'r' for right-aligned]; long text is cut to its column */
    function table(cols, rows, foot) {
      var tw = cols.reduce(function (s, c) { return s + c[1]; }, 0), sc = Math.min(1, (W - 2 * M) / tw), xs = [], x = M; cols.forEach(function (c) { xs.push(x); x += c[1] * sc; });
      function fit(s, w) { s = lat(s); if (doc.getTextWidth(s) <= w - 2) return s; while (s.length > 1 && doc.getTextWidth(s + '..') > w - 2) s = s.slice(0, -1); return s + '..'; }
      function line(cells, bold, fill) { if (fill) { doc.setFillColor(fill[0], fill[1], fill[2]); doc.rect(M, y, tw * sc, 5.2, 'F'); } doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(7.6); doc.setTextColor(bold === 2 ? 255 : 30, bold === 2 ? 255 : 30, bold === 2 ? 255 : 30);
        cells.forEach(function (c, i) { var w = cols[i][1] * sc, s = fit(c, w); if (cols[i][2] === 'r') doc.text(s, xs[i] + w - 1.2, y + 3.6, { align: 'right' }); else doc.text(s, xs[i] + 1.2, y + 3.6); }); y += 5.2; }
      function head() { line(cols.map(function (c) { return c[0]; }), 2, [28, 40, 78]); }
      need(16); head();
      rows.forEach(function (r, i) { if (y + 5.2 > Ht - 36) { doc.addPage(); y = M; head(); } line(r, false, i % 2 ? [245, 246, 249] : null); });
      if (foot) { if (y + 5.2 > Ht - 36) { doc.addPage(); y = M; head(); } line(foot, 1, [236, 226, 200]); }
      y += 5;
    }
    /* cover */
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(20, 30, 60); doc.text(lat(H.company || 'Nikadi Projects Private Limited'), M, y + 7); y += 11;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(60, 60, 60); doc.text(lat('Unit: ' + (H.name || 'Nikadi Guest House') + '   |   GSTIN ' + (H.gstin || '') + '   |   PAN ' + (H.pan || '')), M, y + 4); y += 5.5;
    doc.text(lat((H.address || []).join(', ')), M, y + 4); y += 9;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(150, 110, 30); doc.text('Accounts statement for GST filing', M, y + 5); y += 8;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(30, 30, 30); doc.text(lat('Period: ' + nice(P[0]) + ' to ' + nice(P[1]) + '      Prepared on ' + nice(String(R.r.made).slice(0, 10)) + ' from the guest house records. All amounts in Indian Rupees.'), M, y + 4); y += 10;
    h1('1. Summary');
    table([['Particulars', 150], ['Amount (Rs)', 50, 'r'], ['Remarks', 77]], [
      ['Sales: total invoice value (inclusive of GST)', money(t.total), t.n + ' tax invoices'], ['Taxable value of sales', money(t.taxable), ''], ['CGST on sales', money(t.cgst), ''], ['SGST on sales', money(t.sgst), ''], ['Total GST on sales (output tax)', money(t.gst), 'IGST nil, cess nil'],
      ['Money received from guests', money(R.rec.in), R.receipts.length + ' receipts'], ['Refunds paid to guests', money(R.rec.out), R.refunds.length + ' refunds'], ['Advances kept from no-shows and cancellations', money(R.kept), R.r.kept.length + ' bookings, no invoice made'],
      ['Expenses and purchases entered', money(R.ex.total), R.r.expenses.length + ' entries, ' + R.ex.withBill + ' with a bill photo'], ['GST paid on purchases (input GST, from bills entered)', money(r2(R.ex.cgst + R.ex.sgst + R.ex.igst)), R.ex.gstN + ' bills' + (R.ex.unchecked ? ', ' + R.ex.unchecked + ' not checked yet' : '')], ['Laundry bills', money(R.lau), R.r.laundry.length + ' bills'], ['Commission paid to drivers and brokers', money(R.com), R.r.commissions.length + ' entries']]);
    h1('2. GST on outward supplies, by HSN / SAC (GSTR-1 table 12, GSTR-3B table 3.1)');
    table([['HSN / SAC', 40], ['GST rate', 25, 'r'], ['Taxable value', 45, 'r'], ['CGST', 38, 'r'], ['SGST', 38, 'r'], ['IGST', 25, 'r'], ['Total GST', 38, 'r'], ['Invoice value', 45, 'r']],
      R.hsn.map(function (x) { return [x.hsn, x.gst + '%', money(x.taxable), money(x.cgst), money(x.sgst), '0.00', money(x.tax), money(x.total)]; }), ['Total', '', money(t.taxable), money(t.cgst), money(t.sgst), '0.00', money(t.gst), money(t.total)]);
    table([['Supplies to', 110], ['Invoices', 30, 'r'], ['Taxable value', 50, 'r'], ['GST', 45, 'r'], ['Invoice value', 50, 'r']], [
      ['Registered persons (B2B, customer GSTIN on the invoice)', t.b2bN, money(t.b2bTaxable), money(t.b2bGst), money(t.b2bTotal)], ['Unregistered persons (B2C)', t.n - t.b2bN, money(r2(t.taxable - t.b2bTaxable)), money(r2(t.gst - t.b2bGst)), money(r2(t.total - t.b2bTotal))]], ['Total', t.n, money(t.taxable), money(t.gst), money(t.total)]);
    h1('3. Month by month');
    table([['Month', 30], ['Invoices', 20, 'r'], ['Taxable value', 34, 'r'], ['CGST', 28, 'r'], ['SGST', 28, 'r'], ['Invoice value', 34, 'r'], ['Received', 32, 'r'], ['Refunded', 28, 'r'], ['Expenses', 30, 'r'], ['Commission', 28, 'r']],
      R.months.map(function (m) { return [mname(m.m), m.n, money(m.taxable), money(m.cgst), money(m.sgst), money(m.total), money(m.received), money(m.refunded), money(m.expenses), money(m.commission)]; }),
      ['Total', t.n, money(t.taxable), money(t.cgst), money(t.sgst), money(t.total), money(R.rec.in), money(R.rec.out), money(R.ex.total), money(R.com)]);
    doc.addPage(); y = M; h1('4. Sales register: every tax invoice');
    table([['Invoice no.', 34], ['Date', 22], ['Customer', 58], ['Customer GSTIN', 36], ['Room', 14, 'r'], ['Nights', 14, 'r'], ['Taxable value', 28, 'r'], ['CGST', 22, 'r'], ['SGST', 22, 'r'], ['Invoice value', 28, 'r']],
      R.sales.map(function (s) { return [s.no, nice(s.date), s.company ? s.guest + ' (' + s.company + ')' : s.guest, s.gstin || 'Unregistered', s.room, s.nights, money(s.taxable), money(s.cgst), money(s.sgst), money(s.total)]; }), ['Total', '', t.n + ' invoices', '', '', '', money(t.taxable), money(t.cgst), money(t.sgst), money(t.total)]);
    var b2b = R.sales.filter(function (s) { return s.gstin; });
    if (b2b.length) { h1('5. Invoices to registered persons (B2B)'); table([['Invoice no.', 36], ['Date', 24], ['Company / customer', 80], ['Customer GSTIN', 42], ['Taxable value', 32, 'r'], ['CGST', 24, 'r'], ['SGST', 24, 'r'], ['Invoice value', 32, 'r']],
      b2b.map(function (s) { return [s.no, nice(s.date), s.company || s.guest, s.gstin, money(s.taxable), money(s.cgst), money(s.sgst), money(s.total)]; }), ['Total', '', '', '', money(t.b2bTaxable), money(r2(t.b2bGst / 2)), money(r2(t.b2bGst - r2(t.b2bGst / 2))), money(t.b2bTotal)]); }
    doc.addPage(); y = M; h1('6. Money received from guests');
    table([['Mode', 80], ['Amount (Rs)', 50, 'r']], R.recBy.map(function (x) { return [x[0], money(x[1])]; }), ['Total received', money(R.rec.in)]);
    table([['Date and time', 34], ['Guest', 56], ['Room', 16, 'r'], ['Mode', 28], ['Reference no.', 44], ['Note', 64], ['Amount', 30, 'r']], R.receipts.map(function (p) { return [p.at, p.guest || (p.booking ? 'Booking ' + p.booking : ''), p.room, p.method, p.ref, p.note, money(p.amount)]; }), ['Total', '', '', '', '', '', money(R.rec.in)]);
    if (R.refunds.length) { h1('7. Refunds paid to guests'); table([['Date and time', 34], ['Guest', 56], ['Room', 16, 'r'], ['Mode', 28], ['Reference no.', 44], ['Reason', 64], ['Amount', 30, 'r']], R.refunds.map(function (p) { return [p.at, p.guest || (p.booking ? 'Booking ' + p.booking : ''), p.room, p.method, p.ref, p.note, money(-p.amount)]; }), ['Total', '', '', '', '', '', money(R.rec.out)]); }
    if (R.r.kept.length) { h1('8. Advances kept from no-shows and cancellations'); table([['Closed on', 28], ['Booking', 34], ['Guest', 70], ['Status', 30], ['Check-in date', 30], ['Advance paid', 30, 'r'], ['Refunded', 26, 'r'], ['Kept', 28, 'r']], R.r.kept.map(function (x) { return [nice(x.date), x.id, x.guest, x.status, x.checkin, money(x.advance), money(x.refunded), money(x.kept)]; }), ['Total', '', '', '', '', '', '', money(R.kept)]);
      para('No tax invoice was made for these amounts. Please decide the GST treatment of forfeited advances.', 8.5); }
    doc.addPage(); y = M; h1('9. Expenses and purchases');
    table([['Group > category', 110], ['Amount (Rs)', 50, 'r']], R.exBy.map(function (x) { return [x[0], money(x[1])]; }), ['Total', money(R.ex.total)]);
    table([['Expense no.', 24], ['Date', 20], ['What was bought or paid for', 48], ['Shop or payee', 38], ['Bill no.', 24], ['Supplier GSTIN', 32], ['Taxable', 22, 'r'], ['CGST', 18, 'r'], ['SGST', 18, 'r'], ['IGST', 16, 'r'], ['Photo', 12], ['Amount', 24, 'r']], R.r.expenses.map(function (x) { var g = x.cgst + x.sgst + x.igst > 0 || x.gstin; return [x.id, nice(x.date), x.item + (x.qty ? ' x ' + x.qty : ''), x.shop, x.billNo || x.ref, x.gstin, g ? money(x.taxable) : '', g ? money(x.cgst) : '', g ? money(x.sgst) : '', g ? money(x.igst) : '', x.hasBill ? 'Yes' : 'No', money(x.amount)]; }), ['Total', '', '', '', '', R.ex.gstN + ' with GST', money(R.ex.taxable), money(R.ex.cgst), money(R.ex.sgst), money(R.ex.igst), '', money(R.ex.total)]);
    if (R.r.laundry.length) { table([['Laundry bill date', 40], ['Paid', 30], ['Note', 120], ['Amount', 36, 'r']], R.r.laundry.map(function (x) { return [nice(x.date), x.paid ? 'Yes' : 'Not marked', x.note, money(x.total)]; }), ['Total laundry', '', '', money(R.lau)]); }
    para('GST on purchases (input GST) is shown for the ' + R.ex.gstN + ' purchases whose supplier bill details were entered: CGST ' + money(R.ex.cgst) + ', SGST ' + money(R.ex.sgst) + ', IGST ' + money(R.ex.igst) + '.' + (R.ex.unchecked ? ' ' + R.ex.unchecked + ' of these were read from the bill photo by the computer and have not been checked by a person yet.' : '') + ' Please confirm every credit against the bill itself; the bill copies are sent as a separate PDF, in the order of the expense numbers above.', 8.5);
    h1('10. Commission paid to drivers and brokers');
    table([['Date', 24], ['Name', 50], ['Driver / broker', 28], ['Phone', 30], ['Vehicle no.', 28], ['For guest', 44], ['Paid by', 22], ['Transaction no.', 30], ['Amount', 26, 'r']], R.r.commissions.map(function (x) { return [nice(x.date), x.name, x.type, x.phone, x.vehicle, x.guest, x.method, x.ref, money(x.amount)]; }), ['Total', '', '', '', '', '', '', '', money(R.com)]);
    h1('Notes');
    para('1. All room and item prices are inclusive of GST. The taxable value and tax are worked out backwards from each invoice, line by line, and added up by HSN / SAC, exactly as printed on the invoice.', 8.5);
    para('2. Sales are by invoice date. Invoices are made at check-out, so a stay that crosses the end of the period is in the period of its invoice.', 8.5);
    para('3. Money received is by the date it was received, so it will not equal sales for the same period (advances, and balances paid later).', 8.5);
    para('4. All supplies are within West Bengal (state code 19): CGST and SGST only. This statement is prepared from the guest house records for the use of the Chartered Accountant; it is not a return.', 8.5);
    if (R.sales.some(function (s) { return s.est; })) para('5. A few invoices had no line details on record; their GST is estimated at 5% of the invoice value. They are marked in the sales register file.', 8.5);
    var n = doc.getNumberOfPages(); for (var i = 1; i <= n; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(120, 120, 120); doc.text(lat((H.company || '') + '  -  GSTIN ' + (H.gstin || '') + '  -  ' + nice(P[0]) + ' to ' + nice(P[1])), M, Ht - 7); doc.text('Page ' + i + ' of ' + n, W - M, Ht - 7, { align: 'right' }); signPage(doc, W, Ht, M); }
    return { name: fname('Accounts-for-CA', 'pdf'), kind: 'pdf', label: 'Full report (PDF)', blob: doc.output('blob') };
  }); }

  /* ================= Purchase bills: GST from the supplier's bill, and the bill copies as PDF files ================= */
  function hasGst(x) { return x.cgst + x.sgst + x.igst > 0 || !!x.gstin; }
  function drawBills() {
    var e = C.esc, pr = presets(), h = C.head('Purchase bills', 'The supplier bills behind your expenses: their GST for input credit, and the bill copies as PDF files for your CA.') + C.nav('bills') + chooser(pr);
    if (busy) h += '<div class="card"><p class="empty">Collecting the records…</p></div>';
    else if (R) {
      var L = R.r.expenses, withPh = L.filter(function (x) { return x.photos > 0; }), toRead = withPh.filter(function (x) { return !hasGst(x); }), ex = R.ex;
      h += '<div class="sec"><div><p class="kick">' + nice(P[0]) + ' to ' + nice(P[1]) + '</p><h2>Purchases in this period</h2></div></div>' +
        '<div class="tiles">' + tile('Purchases', rs(ex.total), L.length + ' entries') + tile('With a bill photo', withPh.length + ' of ' + L.length, '') + tile('GST details entered', ex.gstN + ' of ' + L.length, ex.unchecked ? ex.unchecked + ' not checked yet' : 'all checked') + tile('GST paid on purchases', rs(r2(ex.cgst + ex.sgst + ex.igst)), 'CGST ' + rs(ex.cgst) + ' · SGST ' + rs(ex.sgst) + (ex.igst ? ' · IGST ' + rs(ex.igst) : '')) + '</div>' +
        '<div class="card"><div class="ch"><h2>Read the GST from the bill photos</h2></div><p class="small">The computer reads each bill photo and fills in the supplier GSTIN, bill number and GST amounts. Photos of bills are often unclear, so every bill it reads is marked "not checked" until you open it, compare it with the photo and save.</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn btn-gold" type="button" id="pbRead"' + (toRead.length ? '' : ' disabled') + '>Read ' + toRead.length + ' bill' + (toRead.length === 1 ? '' : 's') + ' not yet entered</button></div><p class="small" id="pbProg" style="margin-top:8px"></p></div>' +
        '<div class="card"><div class="ch"><h2>Bill copies for your CA</h2><span class="small">opens on screen first, then you choose to download</span></div><p class="small">Every page carries the expense number, the bill number, date, shop and amount, and each file starts with a list, so a bill can be found and matched quickly.</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn btn-gold" type="button" id="pbOne"' + (withPh.length ? '' : ' disabled') + '>See one PDF with all ' + withPh.length + ' bills</button><button class="btn" type="button" id="pbMon"' + (withPh.length ? '' : ' disabled') + '>See one PDF for each month</button><button class="btn" type="button" data-csv="expenses">Purchases with GST (Excel)</button></div><p class="small" id="pbPdf" style="margin-top:8px"></p></div>' +
        '<div class="card"><div class="ch"><h2>Every purchase</h2><span class="small">tap one to see its bill and enter or check the GST</span></div>' + (L.length ? '<div class="tw"><table><thead><tr><th>Expense no.</th><th>Date</th><th>Shop or payee</th><th>What</th><th>Bill no.</th><th class="n">Amount</th><th>Supplier GSTIN</th><th class="n">Taxable</th><th class="n">CGST</th><th class="n">SGST</th><th class="n">IGST</th><th>Bill photo</th><th>GST details</th></tr></thead><tbody>' +
          L.slice().reverse().map(function (x) { var g = hasGst(x); return '<tr class="go" data-exp="' + e(x.id) + '"><td>' + e(x.id) + '</td><td>' + nice(x.date) + '</td><td>' + e(x.shop) + '</td><td class="w">' + e(x.item) + '</td><td>' + e(x.billNo || x.ref) + '</td><td class="n">' + money(x.amount) + '</td><td>' + e(x.gstin) + '</td><td class="n">' + (g ? money(x.taxable) : '') + '</td><td class="n">' + (g ? money(x.cgst) : '') + '</td><td class="n">' + (g ? money(x.sgst) : '') + '</td><td class="n">' + (g ? money(x.igst) : '') + '</td><td>' + (x.photos ? x.photos + ' photo' + (x.photos > 1 ? 's' : '') : '<span class="tag">none</span>') + '</td><td>' + (!g ? '<span class="tag">not entered</span>' : /not checked/.test(x.gstBy) ? '<span class="tag bad">read, not checked</span>' : '<span class="tag on">checked</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="empty">No purchases entered in this period.</p>') + '</div>';
    }
    C.app.innerHTML = h; C.wire(); chooserWire(pr);
    if (R && !busy) {
      [].forEach.call(C.app.querySelectorAll('tr[data-exp]'), function (r) { r.onclick = function () { editor(r.dataset.exp); }; });
      [].forEach.call(C.app.querySelectorAll('[data-csv]'), function (b) { b.onclick = function () { preview([csv(b.dataset.csv)]); }; });
      document.getElementById('pbRead').onclick = readAll; document.getElementById('pbOne').onclick = function () { billsPdf(false); }; document.getElementById('pbMon').onclick = function () { billsPdf(true); };
    }
  }
  function expOf(id) { return R.r.expenses.filter(function (x) { return x.id === id; })[0]; }
  function refresh() { R = build(R.r); }
  var phCache = {};
  function photosOf(id) { if (phCache[id]) return Promise.resolve(phCache[id]); return C.post({ action: 'deskExpensePhoto', token: C.tok(), id: id }).then(function (r) { if (!r.ok) throw new Error(r.error); var l = (r.photos || []).filter(function (p) { return p && p.data; }).map(function (p) { return /^data:/.test(p.data) ? p.data : 'data:image/jpeg;base64,' + p.data; }); phCache[id] = l; return l; }); }
  function saveGst(x, v, auto) { return C.post({ action: 'deskExpenseGst', token: C.tok(), id: x.id, gstin: v.gstin, billNo: v.billNo, taxable: v.taxable, cgst: v.cgst, sgst: v.sgst, igst: v.igst, auto: auto ? 1 : 0, clear: v.clear ? 1 : 0 }).then(function (r) { if (!r.ok) throw new Error(r.error); ['gstin', 'billNo', 'taxable', 'cgst', 'sgst', 'igst', 'gstBy'].forEach(function (f) { x[f] = r[f]; }); refresh(); return r; }); }

  /* ----- reading a bill photo ----- */
  var ocrP = null, worker = null;
  function ocr() { if (ocrP) return ocrP; ocrP = new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js'; s.onload = ok; s.onerror = function () { ocrP = null; bad(new Error('reader')); }; document.head.appendChild(s); })
    .then(function () { return window.Tesseract.createWorker('eng'); }).then(function (w) { worker = w; }); ocrP.catch(function () { ocrP = null; }); return ocrP; }
  function readText(urls) { return ocr().then(function () { var t = '', i = 0; function next() { if (i >= urls.length) return t; return worker.recognize(urls[i++]).then(function (r) { t += '\n' + ((r.data && r.data.text) || ''); return next(); }); } return next(); }); }
  /* pick the GST details out of the words read from a bill; anything doubtful is left empty rather than guessed */
  function parseGst(text, amount) {
    var T = String(text || '').toUpperCase().replace(/[|]/g, ' '), lines = T.split(/\n+/), out = { gstin: '', billNo: '', taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    var gs = (T.replace(/[ \t]/g, '').match(/\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]/g) || []).filter(function (g) { return g !== OWN; }); if (gs.length) out.gstin = gs[0];
    function nums(l) { var o = [], m, re = /(\d[\d,]*\.\d{1,2}|\d[\d,]*)(\s*%)?/g; while ((m = re.exec(l))) { if (m[2]) continue; var v = parseFloat(m[1].replace(/,/g, '')); if (!isNaN(v)) o.push(v); } return o; }
    function amtOn(re, not) { var best = 0; lines.forEach(function (l) { if (!re.test(l) || (not && not.test(l))) return; var n = nums(l.replace(/\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]/g, ' ')).filter(function (v) { return v > 0 && (!amount || v <= amount); }); if (n.length) best = Math.max(best, n[n.length - 1]); }); return best; }
    out.cgst = amtOn(/C\.?\s?G\.?S\.?T/, /GSTIN/); out.sgst = amtOn(/(S|UT)\.?\s?G\.?S\.?T/, /GSTIN/); out.igst = amtOn(/I\.?\s?G\.?S\.?T/, /GSTIN/); out.taxable = amtOn(/TAXABLE|SUB\s*-?\s*TOTAL|BASIC\s+AMOUNT/);
    if (out.cgst && !out.sgst) out.sgst = out.cgst; if (out.sgst && !out.cgst) out.cgst = out.sgst;
    var g = out.cgst + out.sgst + out.igst;
    if (amount && (g > amount * .3 || g <= 0)) { out.cgst = out.sgst = out.igst = 0; g = 0; }
    if (g && amount && (!out.taxable || Math.abs(out.taxable + g - amount) > Math.max(2, amount * .02))) out.taxable = r2(amount - g);
    if (!g) out.taxable = 0;
    var m = T.match(/(?:INVOICE|BILL|INV|RECEIPT)\.?\s*(?:NO|NUMBER|NUM|#)\.?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\/\-]{2,20})/); if (m) out.billNo = m[1];
    out.found = !!(out.gstin || g); return out;
  }
  function readAll() {
    var todo = R.r.expenses.filter(function (x) { return x.photos > 0 && !hasGst(x); }), pg = document.getElementById('pbProg'), btn = document.getElementById('pbRead'), i = 0, got = 0; if (!todo.length) return;
    btn.disabled = true; pg.textContent = 'Getting the reader ready (first time takes a little longer)…';
    function next() { if (i >= todo.length) { pg.textContent = ''; drawBills(); var p2 = document.getElementById('pbProg'); if (p2) p2.textContent = 'Finished: GST details found on ' + got + ' of ' + todo.length + ' bills. Open each one to check it against the photo.'; return; }
      var x = todo[i++]; if (document.getElementById('pbProg')) document.getElementById('pbProg').textContent = 'Reading bill ' + i + ' of ' + todo.length + ' (' + x.shop + ')…';
      return photosOf(x.id).then(readText).then(function (t) { var v = parseGst(t, x.amount); if (!v.found) return; got++; return saveGst(x, v, true); }).catch(function () {}).then(next); }
    ocr().then(next, function () { btn.disabled = false; pg.textContent = 'The reader could not be loaded. Check the internet and try again.'; });
  }
  /* ----- one purchase: its bill photos and its GST details ----- */
  function editor(id) {
    var x = expOf(id), e = C.esc, ov = document.createElement('div'); ov.style.cssText = 'position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.72);overflow:auto;padding:max(16px,env(safe-area-inset-top)) 16px 40px';
    ov.innerHTML = '<div class="card" style="max-width:1000px;margin:0 auto"><div class="ch"><h2>Expense ' + e(x.id) + '</h2><button class="btn" type="button" data-x>Close</button></div>' +
      '<p class="small">' + nice(x.date) + ' · ' + e(x.shop || 'no shop given') + ' · ' + e(x.item) + ' · <b style="color:var(--ink)">' + rs(x.amount) + '</b> paid by ' + e(x.method) + (x.ref ? ' · ref ' + e(x.ref) : '') + '</p>' +
      '<div class="grid" style="margin-top:14px"><div id="edPh"><p class="empty">' + (x.photos ? 'Opening the bill photo…' : 'No bill photo was attached to this expense. You can still type the GST details from the paper bill.') + '</p></div><div><div style="display:grid;gap:10px">' +
      [['gstin', 'Supplier GSTIN', 'text'], ['billNo', 'Supplier bill no.', 'text'], ['taxable', 'Taxable value (₹)', 'number'], ['cgst', 'CGST (₹)', 'number'], ['sgst', 'SGST (₹)', 'number'], ['igst', 'IGST (₹)', 'number']].map(function (f) { return '<label class="small">' + f[1] + '<br><input class="in" style="max-width:none" id="ed_' + f[0] + '" type="' + f[2] + '"' + (f[2] === 'number' ? ' step="0.01" min="0" inputmode="decimal"' : ' autocapitalize="characters" spellcheck="false"') + ' value="' + e(f[2] === 'number' ? (x[f[0]] || '') : (x[f[0]] || (f[0] === 'billNo' ? '' : ''))) + '"></label>'; }).join('') +
      '</div><p class="small" id="edSum" style="margin-top:8px"></p><p class="err" id="edErr" role="alert"></p><div style="display:flex;gap:8px;flex-wrap:wrap">' + (x.photos ? '<button class="btn" type="button" id="edRead">Read from the photo</button>' : '') + '<button class="btn btn-gold" type="button" id="edSave">Save as checked</button><button class="btn" type="button" id="edClear">Remove GST details</button></div>' +
      '<p class="small" style="margin-top:10px">' + (x.gstBy ? 'Now: ' + e(x.gstBy) + '.' : 'No GST details entered yet.') + ' Leave the GST boxes empty for a bill with no GST on it.</p></div></div></div>';
    document.body.appendChild(ov);
    function q(k) { return ov.querySelector('#ed_' + k); }
    function vals() { return { gstin: q('gstin').value.trim().toUpperCase(), billNo: q('billNo').value.trim(), taxable: Number(q('taxable').value) || 0, cgst: Number(q('cgst').value) || 0, sgst: Number(q('sgst').value) || 0, igst: Number(q('igst').value) || 0 }; }
    function sum() { var v = vals(), g = r2(v.cgst + v.sgst + v.igst), t = r2(v.taxable + g); if (g && !v.taxable) { ov.querySelector('#edSum').textContent = 'Taxable value left empty: it will be saved as ' + rs(r2(x.amount - g)) + ' (the expense minus the GST).'; return; } ov.querySelector('#edSum').textContent = g ? 'Taxable + GST = ' + rs(t) + (Math.abs(t - x.amount) > 1 ? ' (the expense is ' + rs(x.amount) + ': check the figures)' : ' (matches the expense)') : ''; }
    ['taxable', 'cgst', 'sgst', 'igst'].forEach(function (k) { q(k).oninput = sum; }); sum();
    function close() { ov.remove(); drawBills(); }
    ov.querySelector('[data-x]').onclick = close; ov.onclick = function (ev) { if (ev.target === ov) close(); };
    function err(m) { ov.querySelector('#edErr').textContent = m; }
    function why(c) { return c === 'bad_gstin' ? 'That GSTIN is not 15 characters in the right pattern.' : c === 'gst_too_big' ? 'The GST is more than the expense amount.' : c === 'not_allowed' ? 'Only the owner or manager can save this.' : 'Could not save (' + c + ').'; }
    ov.querySelector('#edSave').onclick = function () { var v = vals(); err(''); if ((v.cgst || v.sgst || v.igst) && !v.taxable) { v.taxable = r2(x.amount - v.cgst - v.sgst - v.igst); } saveGst(x, v, false).then(close, function (er) { err(why(er.message)); }); };
    ov.querySelector('#edClear').onclick = function () { saveGst(x, { clear: 1 }, false).then(close, function (er) { err(why(er.message)); }); };
    if (x.photos) {
      photosOf(id).then(function (l) { ov.querySelector('#edPh').innerHTML = l.length ? l.map(function (u) { return '<a href="' + u + '" target="_blank" rel="noopener"><img src="' + u + '" alt="Bill photo" style="width:100%;border-radius:10px;border:1px solid var(--line);margin-bottom:10px"></a>'; }).join('') : '<p class="empty">The bill photo could not be opened.</p>'; }, function () { ov.querySelector('#edPh').innerHTML = '<p class="empty">The bill photo could not be opened.</p>'; });
      ov.querySelector('#edRead').onclick = function () { var b = this; b.disabled = true; b.textContent = 'Reading…'; err('');
        photosOf(id).then(readText).then(function (t) { var v = parseGst(t, x.amount); b.disabled = false; b.textContent = 'Read from the photo'; if (!v.found) { err('No GST details could be read from this photo. Please type them from the bill.'); return; }
          if (v.gstin) q('gstin').value = v.gstin; if (v.billNo && !q('billNo').value) q('billNo').value = v.billNo; ['taxable', 'cgst', 'sgst', 'igst'].forEach(function (k) { if (v[k]) q(k).value = v[k]; }); sum(); err('Read from the photo. Compare with the bill, correct anything wrong, then save.'); },
          function () { b.disabled = false; b.textContent = 'Read from the photo'; err('The reader could not be loaded. Check the internet and try again.'); }); };
    }
  }
  /* ----- the bill copies as PDF: a list first, then every bill photo under a header that names it ----- */
  function imgSize(u) { return new Promise(function (ok) { var im = new Image(); im.onload = function () { ok([im.naturalWidth, im.naturalHeight]); }; im.onerror = function () { ok(null); }; im.src = u; }); }
  function billsPdf(perMonth) {
    var note = document.getElementById('pbPdf'), all = R.r.expenses.filter(function (x) { return x.photos > 0; }), groups = [];
    if (perMonth) { var by = {}; all.forEach(function (x) { (by[x.date.slice(0, 7)] = by[x.date.slice(0, 7)] || []).push(x); }); Object.keys(by).sort().forEach(function (k) { groups.push([k, by[k]]); }); } else groups.push(['', all]);
    var done = 0, gi = 0, files = []; [].forEach.call(C.app.querySelectorAll('#pbOne,#pbMon'), function (b) { b.disabled = true; });
    function finish(msg) { [].forEach.call(C.app.querySelectorAll('#pbOne,#pbMon'), function (b) { b.disabled = false; }); if (document.getElementById('pbPdf')) document.getElementById('pbPdf').textContent = msg; }
    function one() { if (gi >= groups.length) { finish(groups.length + ' file' + (groups.length > 1 ? 's' : '') + ' with ' + all.length + ' bills ready. Look through them, then download.'); return preview(files); }
      var key = groups[gi][0], list = groups[gi][1]; gi++;
      var H = (window.NikadiBill || {}).HOTEL || {}, doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' }), W = 210, Ht = 297, M = 12, PER = 42, idxPages = Math.ceil(list.length / PER), pageOf = {}, pno = idxPages + 1;
      list.forEach(function (x) { pageOf[x.id] = pno; pno += x.photos; });
      var title = 'Purchase bills: ' + (key ? mname(key) : nice(P[0]) + ' to ' + nice(P[1]));
      function foot() { var n = doc.getNumberOfPages(); for (var i = 1; i <= n; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(120, 120, 120); doc.text(lat((H.company || '') + '  -  GSTIN ' + (H.gstin || '') + '  -  ' + title), M, Ht - 6); doc.text('Page ' + i + ' of ' + n, W - M, Ht - 6, { align: 'right' }); signPage(doc, W, Ht, M); } }
      function fit(t, w) { t = lat(t); if (doc.getTextWidth(t) <= w) return t; while (t.length > 1 && doc.getTextWidth(t + '..') > w) t = t.slice(0, -1); return t + '..'; }
      /* the list */
      for (var pi = 0; pi < idxPages; pi++) { if (pi) doc.addPage(); var y = M;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(20, 30, 60); doc.text(lat(H.company || 'Nikadi Projects Private Limited'), M, y + 5); y += 8;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(150, 110, 30); doc.text(lat(title + '   (' + list.length + ' bills)'), M, y + 4); y += 8;
        var cols = [['Expense no.', 26], ['Date', 22], ['Shop or payee', 46], ['Bill no.', 28], ['Supplier GSTIN', 32], ['GST', 14], ['Amount', 22], ['Page', 10]], xs = [], xx = M; cols.forEach(function (c) { xs.push(xx); xx += c[1] * (186 / 200); });
        doc.setFillColor(28, 40, 78); doc.rect(M, y, 186, 5.4, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.6); doc.setTextColor(255, 255, 255); cols.forEach(function (c, i) { doc.text(c[0], xs[i] + 1, y + 3.7); }); y += 5.4;
        doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
        list.slice(pi * PER, pi * PER + PER).forEach(function (x, ri) { if (ri % 2) { doc.setFillColor(245, 246, 249); doc.rect(M, y, 186, 5.2, 'F'); } var g = r2(x.cgst + x.sgst + x.igst), cells = [x.id, nice(x.date), x.shop, x.billNo || x.ref, x.gstin, g ? money(g) : '', money(x.amount), String(pageOf[x.id])];
          cells.forEach(function (c, i) { doc.text(fit(c, cols[i][1] * (186 / 200) - 2), xs[i] + 1, y + 3.6); }); y += 5.2; }); }
      /* the bills */
      var xi = 0;
      function nextExp() { if (xi >= list.length) { foot(); files.push({ name: 'Nikadi-Purchase-bills-' + (key || P[0] + '-to-' + P[1]) + '.pdf', kind: 'pdf', label: key ? mname(key) + ' bills' : 'All bills', blob: doc.output('blob') }); return setTimeout(one, 50); }
        var x = list[xi++]; done++; if (document.getElementById('pbPdf')) document.getElementById('pbPdf').textContent = 'Collecting bill ' + done + ' of ' + all.length + '…';
        return photosOf(x.id).then(function (urls) { var k = 0; function nextPh() { if (k >= Math.max(1, x.photos)) return nextExp(); var u = urls[k]; k++;
            doc.addPage(); var y = M; doc.setFillColor(28, 40, 78); doc.rect(M, y, 186, 15, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
            doc.text(lat('Expense no. ' + x.id + (x.billNo || x.ref ? '    Bill no. ' + (x.billNo || x.ref) : '') + (x.photos > 1 ? '    (photo ' + k + ' of ' + x.photos + ')' : '')), M + 3, y + 6); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.6);
            var g = r2(x.cgst + x.sgst + x.igst); doc.text(fit(nice(x.date) + '   ' + (x.shop || '') + '   ' + x.item + '   Rs ' + money(x.amount) + (x.gstin ? '   GSTIN ' + x.gstin : '') + (g ? '   Taxable ' + money(x.taxable) + '  CGST ' + money(x.cgst) + '  SGST ' + money(x.sgst) + (x.igst ? '  IGST ' + money(x.igst) : '') : ''), 180), M + 3, y + 11.5); y += 18;
            if (!u) { doc.setTextColor(120, 30, 30); doc.setFontSize(10); doc.text('The photo of this bill could not be opened.', M, y + 8); return nextPh(); }
            return imgSize(u).then(function (sz) { if (!sz) { doc.setTextColor(120, 30, 30); doc.setFontSize(10); doc.text('The photo of this bill could not be opened.', M, y + 8); return nextPh(); }
              var mw = 186, mh = Ht - y - 36, sc = Math.min(mw / sz[0], mh / sz[1]), w = sz[0] * sc, hh = sz[1] * sc; try { doc.addImage(u, /png/.test(u.slice(0, 30)) ? 'PNG' : 'JPEG', M + (mw - w) / 2, y, w, hh, undefined, 'FAST'); } catch (er) { doc.setTextColor(120, 30, 30); doc.setFontSize(10); doc.text('The photo of this bill could not be placed on the page.', M, y + 8); } return nextPh(); }); }
          return nextPh(); }, function () { for (var j = 0; j < x.photos; j++) { doc.addPage(); doc.setTextColor(120, 30, 30); doc.setFontSize(10); doc.text(lat('Expense no. ' + x.id + ': the bill photo could not be fetched.'), M, M + 8); } return nextExp(); }); }
      return nextExp(); }
    note.textContent = 'Getting ready…'; Promise.all([tool(), signLoad()]).then(one, function () { finish('The PDF maker could not be loaded. Check the internet and try again.'); });
  }

  /* ---- Backup: one file with every record, kept by the owner outside the system ---- */
  var BK = null, bkBusy = false;
  function crcT() { var t = [], n, c, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; }
  /* a plain .zip (files stored as they are), so no extra tool has to be loaded */
  function zip(files) { var T = crcT(), enc = new TextEncoder(), parts = [], cen = [], off = 0, d = new Date(), dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(), tm = (d.getHours() << 11) | (d.getMinutes() << 5);
    files.forEach(function (f) { var nm = enc.encode(f.name), b = f.bytes, c = 0xFFFFFFFF, i; for (i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); c = (c ^ 0xFFFFFFFF) >>> 0;
      var h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, tm, true); h.setUint16(12, dt, true); h.setUint32(14, c, true); h.setUint32(18, b.length, true); h.setUint32(22, b.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
      var g = new DataView(new ArrayBuffer(46)); g.setUint32(0, 0x02014b50, true); g.setUint16(4, 20, true); g.setUint16(6, 20, true); g.setUint16(8, 0x0800, true); g.setUint16(10, 0, true); g.setUint16(12, tm, true); g.setUint16(14, dt, true); g.setUint32(16, c, true); g.setUint32(20, b.length, true); g.setUint32(24, b.length, true); g.setUint16(28, nm.length, true); g.setUint32(42, off, true);
      parts.push(h.buffer, nm, b); cen.push(g.buffer, nm); off += 30 + nm.length + b.length; });
    var cl = 0; cen.forEach(function (x) { cl += x.byteLength; }); var e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cl, true); e.setUint32(16, off, true);
    return new Blob(parts.concat(cen, [e.buffer]), { type: 'application/zip' }); }
  function bkFiles() { var day = String(BK.made || '').slice(0, 10); return Object.keys(BK.tables).map(function (k) { var t = BK.tables[k], nm = String(t.name || k).replace(/[^A-Za-z0-9]+/g, '-');
    return { name: 'Nikadi-backup-' + day + '-' + nm + '.csv', kind: 'csv', label: t.name || k, head: t.cols, rows: t.rows, blob: new Blob([csvText(t.cols, t.rows)], { type: 'text/csv;charset=utf-8' }) }; }).filter(function (f) { return f.rows.length; }); }
  function bkZip() { var enc = new TextEncoder(), day = String(BK.made || '').slice(0, 10), fs = Object.keys(BK.tables).map(function (k) { var t = BK.tables[k]; return { name: 'excel-files/' + String(t.name || k).replace(/[^A-Za-z0-9]+/g, '-') + '.csv', bytes: enc.encode(csvText(t.cols, t.rows)) }; });
    fs.push({ name: 'everything.json', bytes: enc.encode(JSON.stringify(BK)) });
    fs.push({ name: 'READ-ME.txt', bytes: enc.encode('Nikadi Guest House: full backup of the records\r\nMade ' + BK.made + ' by ' + BK.by + '\r\n\r\nexcel-files: one file for each kind of record. They open in Excel or Google Sheets.\r\neverything.json: the same records in one file, the kind a programmer uses to put the data back into a system.\r\n\r\nNot in this backup: staff PINs and passwords (on purpose), and photos, ID copies and bill PDFs, which are kept in the Google Drive folders.\r\nKeep this file somewhere private. It has guest names, phone numbers and money records.\r\n') });
    return { blob: zip(fs), name: 'Nikadi-backup-' + day + '.zip' }; }
  function drawBackup() { var e = C.esc, h = C.head('Backup', 'A copy of every record, saved by you') + C.nav('backup') + '<div class="card"><h2 style="margin-top:0">Download everything</h2><p>This makes one file with every record the system holds: bookings, stays, bills, payments, expenses, commission, laundry, stock, staff, attendance, members and their points, website visits. Old records from the archive are included.</p>' +
      '<p class="small">Keep one copy every month in two places, for example your computer and a pen drive, or your Google Drive. With that file your records are safe even if this whole system were lost. The file has guest details, so keep it private. PINs and passwords are never put in it. Photos, ID copies and bill PDFs stay in Google Drive and are not in this file.</p>' +
      '<p><button class="btn btn-gold" type="button" id="bkGo"' + (bkBusy ? ' disabled' : '') + '>' + (bkBusy ? 'Collecting the records…' : BK ? 'Make a fresh backup' : 'Make the backup now') + '</button></p><p class="small" id="bkMsg" role="status"></p></div>';
    if (BK) { var ks = Object.keys(BK.tables), tot = 0; ks.forEach(function (k) { tot += BK.tables[k].rows.length; });
      h += '<div class="card"><h2 style="margin-top:0">Backup made ' + e(BK.made) + '</h2><p>' + tot.toLocaleString('en-IN') + ' records in ' + ks.length + ' lists.</p><p style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-gold" type="button" id="bkZip">Download the backup (one zip file)</button><button class="btn" type="button" id="bkSee">Look inside first</button></p>' +
        '<div class="tw"><table style="min-width:0;width:100%"><thead><tr><th>List</th><th style="text-align:right">Records</th></tr></thead><tbody>' + ks.map(function (k) { var t = BK.tables[k]; return '<tr><td>' + e(t.name || k) + '</td><td style="text-align:right">' + t.rows.length.toLocaleString('en-IN') + '</td></tr>'; }).join('') + '</tbody></table></div></div>'; }
    C.app.innerHTML = h; C.wire();
    C.app.querySelector('#bkGo').onclick = function () { bkBusy = true; drawBackup(); C.post({ action: 'deskBackupAll', token: C.tok() }).then(function (r) { bkBusy = false; if (!r.ok) { if (r.error === 'auth') return C.login(); drawBackup(); C.app.querySelector('#bkMsg').textContent = r.error === 'not_allowed' ? 'Only the owner can make a backup.' : 'Could not make the backup. Please try again.'; return; } BK = r; drawBackup(); },
      function () { bkBusy = false; drawBackup(); C.app.querySelector('#bkMsg').textContent = 'No connection. Please try again.'; }); };
    if (BK) { C.app.querySelector('#bkZip').onclick = function () { var z = bkZip(); save(z.blob, z.name); }; C.app.querySelector('#bkSee').onclick = function () { preview(bkFiles()); }; }
  }
  window.NkAccounts = { _zip: zip, open: function (ctx, mode) { C = ctx; MODE = mode || 'accounts'; if (MODE === 'backup') return drawBackup(); if (!P) { var p = presets()[0]; load(p[1], p[2]); } else draw(); }, _build: build, _parse: function (t, a) { return parseGst(t, a); } };
})();
