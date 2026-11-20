/* Nikadi admin — "Accounts for the CA": pick a period, see the figures, download one PDF and the spreadsheet files.
   GST is worked out from every invoice exactly as the printed bill does (NikadiBill.compute, prices inclusive of GST).
   NkAccounts.open(ctx) where ctx = { app, post, tok, head, nav, wire, esc, login } from the admin page. */
(function () {
  var C = null, R = null, P = null, busy = false;
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
    var ex = { total: 0, by: {}, withBill: 0 };
    r.expenses.forEach(function (x) { ex.total = r2(ex.total + x.amount); var k = (x.group || 'Other') + ' › ' + (x.category || 'Other'); ex.by[k] = r2((ex.by[k] || 0) + x.amount); if (x.hasBill) ex.withBill++; mon(String(x.date).slice(0, 7)).expenses = r2(mon(String(x.date).slice(0, 7)).expenses + x.amount); });
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
  function draw() {
    var e = C.esc, pr = presets(), h = C.head('Accounts for the CA', 'Sales with GST, money received, expenses and commission for any period. Make one PDF and the spreadsheet files to send.') + C.nav('accounts');
    h += '<div class="card"><div class="ch"><h2>Choose the period</h2></div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">' + pr.map(function (p, i) { return '<button class="btn' + (P && P[0] === p[1] && P[1] === p[2] ? ' btn-gold' : '') + '" type="button" data-pre="' + i + '">' + p[0] + '</button>'; }).join('') + '</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end"><label class="small">One month<br><select class="in" id="acM" style="max-width:200px"><option value="">Pick a month</option>' + months().map(function (m) { return '<option value="' + m[0] + '">' + m[1] + '</option>'; }).join('') + '</select></label>' +
      '<label class="small">Financial year<br><select class="in" id="acF" style="max-width:200px"><option value="">Pick a year</option>' + [0, 1, 2, 3].map(function (i) { var y = fyOf(istToday()) - i; return '<option value="' + y + '">' + fyName(y) + ' (Apr ' + y + ' to Mar ' + (y + 1) + ')</option>'; }).join('') + '</select></label>' +
      '<label class="small">From<br><input class="in" id="acA" type="date" style="max-width:170px" value="' + (P ? P[0] : '') + '"></label><label class="small">To<br><input class="in" id="acB" type="date" style="max-width:170px" value="' + (P ? P[1] : '') + '"></label>' +
      '<button class="btn btn-gold" type="button" id="acGo">Show</button></div><p class="err" id="acErr" role="alert"></p></div>';
    if (busy) h += '<div class="card"><p class="empty">Collecting the records…</p></div>';
    else if (R) {
      var t = R.tot;
      h += '<div class="sec"><div><p class="kick">' + nice(P[0]) + ' to ' + nice(P[1]) + '</p><h2>Figures for this period</h2></div></div>' +
        '<div class="card"><div class="ch"><h2>Files for your CA</h2><span class="small">made on this device, nothing is sent anywhere</span></div><div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="btn btn-gold" type="button" id="acPdf">Download the full PDF report</button><button class="btn" type="button" data-csv="sales">Sales register (Excel)</button><button class="btn" type="button" data-csv="hsn">GST summary by HSN (Excel)</button><button class="btn" type="button" data-csv="receipts">Money received (Excel)</button><button class="btn" type="button" data-csv="expenses">Expenses (Excel)</button><button class="btn" type="button" data-csv="commission">Commission (Excel)</button><button class="btn" type="button" id="acAll">All files at once</button></div>' +
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
        '<div class="card"><div class="ch"><h2>Also in the report</h2></div><div class="rows"><div class="row"><span class="t">Laundry bills</span><span class="v">' + rs(R.lau) + '</span></div><div class="row"><span class="t">Advances kept from no-shows and cancellations (no invoice was made)</span><span class="v">' + rs(R.kept) + '</span></div><div class="row"><span class="t">Expense entries with a bill photo on file</span><span class="v">' + R.ex.withBill + ' of ' + R.r.expenses.length + '</span></div></div>' +
        '<p class="small" style="margin-top:12px">Sales are taken from the invoices made at check-out, by invoice date. A guest still in the house has no invoice yet. Expenses are the amounts entered in the staff app: the GST paid on purchases is not recorded separately, so your CA will need the purchase bills for input credit.</p></div>';
    }
    C.app.innerHTML = h; C.wire(); window.scrollTo(0, 0);
    function go(a, b) { var er = document.getElementById('acErr'); if (!a || !b) { er.textContent = 'Choose both dates.'; return; } if (a > b) { er.textContent = 'The first date is after the second.'; return; } load(a, b); }
    [].forEach.call(C.app.querySelectorAll('[data-pre]'), function (b) { b.onclick = function () { var p = pr[b.dataset.pre]; go(p[1], p[2]); }; });
    document.getElementById('acM').onchange = function () { var v = this.value; if (!v) return; var y = +v.slice(0, 4), m = +v.slice(5, 7), end = ymd(y, m, lastDay(y, m)), t = istToday(); go(ymd(y, m, 1), end > t ? t : end); };
    document.getElementById('acF').onchange = function () { var y = +this.value; if (!y) return; var end = ymd(y + 1, 3, 31), t = istToday(); go(ymd(y, 4, 1), end > t ? t : end); };
    document.getElementById('acGo').onclick = function () { go(document.getElementById('acA').value, document.getElementById('acB').value); };
    if (R && !busy) {
      document.getElementById('acPdf').onclick = function () { var b = this; b.disabled = true; b.textContent = 'Making the PDF…'; pdf().then(function () { b.disabled = false; b.textContent = 'Download the full PDF report'; }, function (er) { b.disabled = false; b.textContent = 'Could not make the PDF. Try again'; console.error(er); }); };
      [].forEach.call(C.app.querySelectorAll('[data-csv]'), function (b) { b.onclick = function () { csv(b.dataset.csv); }; });
      document.getElementById('acAll').onclick = function () { var list = ['sales', 'hsn', 'receipts', 'expenses', 'commission'], i = 0; pdf().then(function next() { if (i < list.length) { csv(list[i++]); setTimeout(next, 500); } }); };
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
    else if (kind === 'expenses') { name = 'Expenses'; head = ['Date', 'Group', 'Category', 'What was bought or paid for', 'Qty', 'Amount', 'Paid by', 'Bill / transaction no.', 'Shop or payee', 'Bill photo on file', 'Note'];
      rows = R.r.expenses.map(function (x) { return [x.date, x.group, x.category, x.item, x.qty, x.amount.toFixed(2), x.method, x.ref, x.shop, x.hasBill ? 'Yes' : 'No', x.note]; })
        .concat(R.r.laundry.map(function (x) { return [x.date, 'Laundry', 'Laundry bill', 'Laundry', '', x.total.toFixed(2), '', '', '', '', (x.paid ? 'Paid. ' : 'Not marked paid. ') + x.note]; })); }
    else { name = 'Commission'; head = ['Date', 'Name', 'Driver or broker', 'Phone', 'Vehicle no.', 'For guest', 'Room / booking', 'Amount', 'Paid by', 'Transaction no.', 'Note'];
      rows = R.r.commissions.map(function (x) { return [x.date, x.name, x.type, x.phone, x.vehicle, x.guest, x.room, x.amount.toFixed(2), x.method, x.ref, x.note]; }); }
    save(new Blob([csvText(head, rows)], { type: 'text/csv;charset=utf-8' }), fname(name, 'csv'));
  }
  var jsp = null;
  function tool() { if (jsp) return jsp; jsp = new Promise(function (ok, bad) { if (window.jspdf) return ok(); var s = document.createElement('script'); s.src = '/staff/vendor/jspdf.umd.min.js'; s.onload = function () { ok(); }; s.onerror = function () { jsp = null; bad(new Error('pdf_tool')); }; document.head.appendChild(s); }); return jsp; }
  /* the PDF uses the built-in Latin font, so names in other scripts are shown as they can be */
  function lat(v) { return String(v == null ? '' : v).replace(/₹/g, 'Rs ').replace(/[›→]/g, '>').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/·/g, '-').replace(/[^\x20-\x7e\xa0-\xff]/g, '?'); }
  function pdf() { return tool().then(function () {
    var H = (window.NikadiBill || {}).HOTEL || {}, doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' }), W = 297, Ht = 210, M = 12, y = M, t = R.tot;
    function need(h) { if (y + h > Ht - 14) { doc.addPage(); y = M; } }
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
      rows.forEach(function (r, i) { if (y + 5.2 > Ht - 14) { doc.addPage(); y = M; head(); } line(r, false, i % 2 ? [245, 246, 249] : null); });
      if (foot) { if (y + 5.2 > Ht - 14) { doc.addPage(); y = M; head(); } line(foot, 1, [236, 226, 200]); }
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
      ['Expenses and purchases entered', money(R.ex.total), R.r.expenses.length + ' entries, ' + R.ex.withBill + ' with a bill photo'], ['Laundry bills', money(R.lau), R.r.laundry.length + ' bills'], ['Commission paid to drivers and brokers', money(R.com), R.r.commissions.length + ' entries']]);
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
    table([['Date', 22], ['Group', 30], ['Category', 32], ['What was bought or paid for', 62], ['Shop or payee', 40], ['Bill / txn no.', 30], ['Paid by', 20], ['Bill photo', 16], ['Amount', 26, 'r']], R.r.expenses.map(function (x) { return [nice(x.date), x.group, x.category, x.item + (x.qty ? ' x ' + x.qty : ''), x.shop, x.ref, x.method, x.hasBill ? 'Yes' : 'No', money(x.amount)]; }), ['Total', '', '', '', '', '', '', '', money(R.ex.total)]);
    if (R.r.laundry.length) { table([['Laundry bill date', 40], ['Paid', 30], ['Note', 120], ['Amount', 36, 'r']], R.r.laundry.map(function (x) { return [nice(x.date), x.paid ? 'Yes' : 'Not marked', x.note, money(x.total)]; }), ['Total laundry', '', '', money(R.lau)]); }
    para('GST paid on purchases is not recorded separately in these records. Input tax credit should be taken from the purchase bills themselves; bill photos are kept for the entries marked Yes.', 8.5);
    h1('10. Commission paid to drivers and brokers');
    table([['Date', 24], ['Name', 50], ['Driver / broker', 28], ['Phone', 30], ['Vehicle no.', 28], ['For guest', 44], ['Paid by', 22], ['Transaction no.', 30], ['Amount', 26, 'r']], R.r.commissions.map(function (x) { return [nice(x.date), x.name, x.type, x.phone, x.vehicle, x.guest, x.method, x.ref, money(x.amount)]; }), ['Total', '', '', '', '', '', '', '', money(R.com)]);
    h1('Notes');
    para('1. All room and item prices are inclusive of GST. The taxable value and tax are worked out backwards from each invoice, line by line, and added up by HSN / SAC, exactly as printed on the invoice.', 8.5);
    para('2. Sales are by invoice date. Invoices are made at check-out, so a stay that crosses the end of the period is in the period of its invoice.', 8.5);
    para('3. Money received is by the date it was received, so it will not equal sales for the same period (advances, and balances paid later).', 8.5);
    para('4. All supplies are within West Bengal (state code 19): CGST and SGST only. This statement is prepared from the guest house records for the use of the Chartered Accountant; it is not a return.', 8.5);
    if (R.sales.some(function (s) { return s.est; })) para('5. A few invoices had no line details on record; their GST is estimated at 5% of the invoice value. They are marked in the sales register file.', 8.5);
    var n = doc.getNumberOfPages(); for (var i = 1; i <= n; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(120, 120, 120); doc.text(lat((H.company || '') + '  -  GSTIN ' + (H.gstin || '') + '  -  ' + nice(P[0]) + ' to ' + nice(P[1])), M, Ht - 7); doc.text('Page ' + i + ' of ' + n, W - M, Ht - 7, { align: 'right' }); }
    save(doc.output('blob'), fname('Accounts-for-CA', 'pdf'));
  }); }

  window.NkAccounts = { open: function (ctx) { C = ctx; if (!P) { var p = presets()[0]; load(p[1], p[2]); } else draw(); }, _build: build };
})();
