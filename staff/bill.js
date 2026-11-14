/* Nikadi Guest House — guest bill (GST tax invoice).
   NikadiBill.billHTML(d, opt) returns a complete, self-contained HTML page (screen, print / PDF).
   NikadiBill.billEmail(d) returns a simple table-based email body. billWhatsApp(d) returns message text.
   Prices are INCLUSIVE of GST. The room is billed at its full tariff and any discount is its own line.
   Tax is worked out backwards from the amount after discount, line by line, and summarised by HSN/SAC.
   Works in the browser and in Google Apps Script (no DOM needed). */
(function (root) {
  var HOTEL = {
    name: 'Nikadi Guest House',
    company: 'Nikadi Projects Private Limited',
    gstin: '19AAHCN7789F1ZR',
    pan: 'AAHCN7789F',
    state: 'West Bengal', stateCode: '19',
    address: ['Bhaktisiddhanta Saraswati Marg', 'Opp. ISKCON Gate No. 4 (Namahatta Bhavan)', 'Sri Dham Mayapur, Nadia, West Bengal 741313'],
    phone: '+91 75011 01137',
    email: 'nikadiguesthouse@gmail.com',
    web: 'www.nikadiguesthouse.com',
    logo: 'https://www.nikadiguesthouse.com/img/brand/logo.png',
    sign: 'https://www.nikadiguesthouse.com/img/brand/signature.png'
  };
  /* Government codes. Rooms: SAC 996311 "Room or unit accommodation services" (5% GST up to ₹7,500 a night). */
  var ROOM_HSN = '996311', ROOM_GST = 5;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function r2(n) { return Math.round(n * 100) / 100; }
  function grp(x) { var last = x.slice(-3), rest = x.slice(0, -3); return (rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' : '') + last; }
  function num(n) { var neg = n < 0; n = Math.abs(n); var p = n.toFixed(2).split('.'); return (neg ? '−' : '') + grp(p[0]) + '.' + p[1]; }
  function inr(n) { var neg = n < 0; return (neg ? '−' : '') + '₹' + grp(String(Math.round(Math.abs(n)))); }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function day(s) { if (!s) return ''; var p = String(s).slice(0, 10).split('-'); return (p[2].length < 2 ? '0' : '') + +p[2] + ' ' + MON[+p[1] - 1] + ' ' + p[0]; }
  function dayTime(s) {
    if (!s) return ''; var t = String(s).slice(11, 16);
    if (!t) return day(s);
    var h = +t.slice(0, 2), m = t.slice(3, 5);
    return day(s) + ', ' + ((h % 12) || 12) + ':' + m + (h < 12 ? ' AM' : ' PM');
  }
  function words(n) {
    n = Math.round(n);
    var a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    var b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function two(x) { return x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : ''); }
    function three(x) { return (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + two(x % 100); }
    if (!n) return 'Zero';
    var out = [], cr = Math.floor(n / 1e7), lk = Math.floor(n / 1e5) % 100, th = Math.floor(n / 1e3) % 100, rest = n % 1000;
    if (cr) out.push(three(cr) + ' Crore');
    if (lk) out.push(two(lk) + ' Lakh');
    if (th) out.push(two(th) + ' Thousand');
    if (rest) out.push(three(rest));
    return out.join(' ');
  }

  var TITLES = ['Mr.', 'Ms.', 'Mrs.', 'Dr.'];
  function cap(w) { w = String(w || ''); return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }
  function fullName(g) { return (g.title && TITLES.indexOf(g.title) >= 0 ? g.title + ' ' : '') + String(g.name || '').trim(); }
  /* "Mrs. Paul" when we know the title, otherwise the guest's full name. */
  function greetName(g) {
    var parts = String(g.name || '').trim().split(/\s+/), last = parts[parts.length - 1] || '';
    if (g.title && TITLES.indexOf(g.title) >= 0 && last && parts.length > 1) return g.title + ' ' + (last === last.toUpperCase() || last === last.toLowerCase() ? cap(last) : last);
    return parts.map(function (w) { return w === w.toLowerCase() ? cap(w) : w; }).join(' ') || 'Guest';
  }

  /* d = { no, date, id, url,
       guest:{name, phone, email, address, gstin, company},
       room:{no, type}, checkin, checkout, inAt, outAt, nights, guests, booking,
       tariff,                                    // full room price per night (incl. GST)
       discounts:[{label, note, amount}],         // positive amounts, taken off the room
       items:[{label, hsn, gst, qty, rate}],      // chargeable extras (incl. GST)
       payments:[{date, label, method, ref, amount}], refunds:[{date, method, ref, amount}],
       member:{level, earned, balance, saved}, staff } */
  function compute(d) {
    var roomGross = r2(d.tariff * d.nights);
    var disc = r2((d.discounts || []).reduce(function (s, x) { return s + Number(x.amount || 0); }, 0));
    var lines = [{ hsn: ROOM_HSN, gst: ROOM_GST, net: r2(roomGross - disc) }];
    (d.items || []).forEach(function (x) { lines.push({ hsn: x.hsn || '', gst: x.gst == null ? ROOM_GST : Number(x.gst), net: r2(x.qty * x.rate) }); });
    var by = {}, order = [];
    lines.forEach(function (l) {
      var k = l.hsn + '|' + l.gst;
      if (!by[k]) { by[k] = { hsn: l.hsn, gst: l.gst, total: 0 }; order.push(k); }
      by[k].total = r2(by[k].total + l.net);
    });
    var tax = order.map(function (k) {
      var g = by[k], taxable = r2(g.total / (1 + g.gst / 100)), t = r2(g.total - taxable), c = r2(t / 2);
      return { hsn: g.hsn, gst: g.gst, taxable: taxable, cgst: c, sgst: r2(t - c), tax: t, total: g.total };
    });
    var total = r2(lines.reduce(function (s, l) { return s + l.net; }, 0));
    var extras = r2(total - roomGross + disc);
    var sum = function (k) { return r2(tax.reduce(function (s, x) { return s + x[k]; }, 0)); };
    var paid = r2((d.payments || []).reduce(function (s, x) { return s + Number(x.amount || 0); }, 0));
    var refunded = r2((d.refunds || []).reduce(function (s, x) { return s + Number(x.amount || 0); }, 0));
    return { roomGross: roomGross, disc: disc, extras: extras, total: total, tax: tax, taxable: sum('taxable'), cgst: sum('cgst'), sgst: sum('sgst'), gstTotal: sum('tax'),
      paid: paid, refunded: refunded, due: r2(total - paid + refunded) };
  }

  function kv(k, v) { return v === '' || v == null ? '' : '<tr><th>' + k + '</th><td class="colon">:</td><td>' + v + '</td></tr>'; }

  function billHTML(d, opt) {
    opt = opt || {};
    var c = compute(d), g = d.guest || {}, m = d.member, sl = 0;
    var qr = d.url && root.NikadiQR ? root.NikadiQR.svg(d.url, { cls: 'qr-svg' }) : '';
    var settled = Math.abs(c.due) < 0.5;

    var rows = '<tr><td class="c">' + (++sl) + '</td><td class="mono">' + ROOM_HSN + '</td><td><b>Room accommodation</b><small>Room ' + esc(d.room.no) + ' · ' + esc(d.room.type) +
      ' · ' + day(d.checkin) + ' to ' + day(d.checkout) + ' · ' + d.guests + (d.guests > 1 ? ' guests' : ' guest') + '</small></td>' +
      '<td class="c">' + d.nights + ' Night' + (d.nights > 1 ? 's' : '') + '</td><td class="r">' + num(d.tariff) + '</td><td class="c">' + ROOM_GST + '%</td><td class="r">' + num(c.roomGross) + '</td></tr>';
    (d.discounts || []).forEach(function (x) {
      rows += '<tr class="disc"><td></td><td class="mono">' + ROOM_HSN + '</td><td><b>Less: ' + esc(x.label) + '</b>' + (x.note ? '<small>' + esc(x.note) + '</small>' : '') + '</td><td></td><td></td><td class="c">' + ROOM_GST + '%</td><td class="r">' + num(-x.amount) + '</td></tr>';
    });
    (d.items || []).forEach(function (x) {
      rows += '<tr><td class="c">' + (++sl) + '</td><td class="mono">' + esc(x.hsn || '—') + '</td><td><b>' + esc(x.label) + '</b>' + (x.note ? '<small>' + esc(x.note) + '</small>' : '') + '</td>' +
        '<td class="c">' + x.qty + ' ' + esc(x.unit || 'Nos') + '</td><td class="r">' + num(x.rate) + '</td><td class="c">' + (x.gst == null ? ROOM_GST : x.gst) + '%</td><td class="r">' + num(x.qty * x.rate) + '</td></tr>';
    });

    var taxRows = c.tax.map(function (t) {
      return '<tr><td class="mono">' + esc(t.hsn || '—') + '</td><td class="r">' + num(t.taxable) + '</td><td class="c">' + t.gst / 2 + '%</td><td class="r">' + num(t.cgst) + '</td><td class="c">' + t.gst / 2 + '%</td><td class="r">' + num(t.sgst) + '</td><td class="r">' + num(t.tax) + '</td><td class="r">' + num(t.total) + '</td></tr>';
    }).join('');

    var pays = (d.payments || []).map(function (p) {
      return '<tr><td>' + day(p.date) + '</td><td>' + esc(p.label) + '</td><td>' + esc(p.method) + '</td><td class="mono">' + esc(p.ref || '—') + '</td><td class="r">' + num(p.amount) + '</td></tr>';
    }).join('') + (d.refunds || []).map(function (p) {
      return '<tr><td>' + day(p.date) + '</td><td>Refund to guest</td><td>' + esc(p.method) + '</td><td class="mono">' + esc(p.ref || '—') + '</td><td class="r">' + num(-p.amount) + '</td></tr>';
    }).join('');

    var bar = opt.toolbar ? '<div class="toolbar"><span>Bill ' + esc(d.no) + '</span><span class="tb-btns">' +
      '<button type="button" onclick="if(window.nikadiPdf){window.nikadiPdf(this)}else{window.print()}">Download PDF</button>' +
      '<button type="button" class="tb-share" onclick="if(navigator.share){navigator.share({title:document.title,url:location.href}).catch(function(){})}else{navigator.clipboard&&navigator.clipboard.writeText(location.href);this.textContent=\'Link copied\'}">Share</button></span></div>' : '';

    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta name="robots" content="noindex,nofollow"><title>Tax Invoice ' + esc(d.no) + ' · ' + HOTEL.name + '</title>' +
      '<style>' + CSS + (opt.pdf ? PRINT : '') + '</style></head><body' + (opt.pdf ? ' class="pdf"' : '') + '>' + bar + '<div class="sheet">' +

      '<header class="top">' +
        '<div class="brand"><img class="logo" src="' + esc(opt.logo || HOTEL.logo) + '" alt="' + HOTEL.name + '" width="150"></div>' +
        (qr ? '<div class="qr">' + qr + '<span>Scan to view this bill online</span></div>' : '<div></div>') +
        '<div class="doc"><h1>TAX INVOICE</h1><div class="orig">Original for Recipient</div><table class="kv">' +
          kv('Invoice No.', '<b class="mono">' + esc(d.no) + '</b>') + kv('Invoice Date', day(d.date)) + kv('Room No.', esc(d.room.no)) +
          kv('Arrival', dayTime(d.inAt && String(d.inAt).slice(0, 10) === d.checkin ? d.inAt : d.checkin)) + kv('Departure', dayTime(d.outAt || d.checkout)) + kv('Guests (Pax)', d.guests) +
          kv('Booking Ref.', d.booking ? '<span class="mono">' + esc(d.booking) + '</span>' : '') +
        '</table></div>' +
      '</header>' +

      '<section class="parties">' +
        '<div class="party"><div class="lbl">Billed to</div><div class="who">' + esc(g.company || fullName(g)) + '</div>' +
          (g.company ? '<div>Guest: ' + esc(fullName(g)) + '</div>' : '') + (g.address ? '<div>' + esc(g.address) + '</div>' : '') +
          (g.phone ? '<div>Mobile: ' + esc(g.phone) + '</div>' : '') + (g.email ? '<div>Email: ' + esc(g.email) + '</div>' : '') +
          '<table class="kv sm">' + kv('Customer GSTIN', g.gstin ? '<span class="mono">' + esc(g.gstin) + '</span>' : 'Unregistered') +
          kv('Place of Supply', HOTEL.stateCode + ' (' + HOTEL.state + ')') + '</table></div>' +
        '<div class="party"><div class="lbl">Supplier</div><div class="who">' + HOTEL.company + '</div><div>' + HOTEL.name + '</div>' +
          HOTEL.address.map(function (l) { return '<div>' + l + '</div>'; }).join('') +
          '<table class="kv sm">' + kv('GSTIN', '<span class="mono">' + HOTEL.gstin + '</span>') + kv('PAN', '<span class="mono">' + HOTEL.pan + '</span>') +
          kv('State', HOTEL.state + ' (Code ' + HOTEL.stateCode + ')') + '</table></div>' +
      '</section>' +

      '<div class="tbl-wrap"><table class="lines"><thead><tr><th class="c">Sl.</th><th>HSN / SAC</th><th>Description</th><th class="c">Qty / UOM</th><th class="r">Rate (₹)</th><th class="c">GST</th><th class="r">Amount (₹)</th></tr></thead>' +
      '<tbody>' + rows + '</tbody><tfoot><tr><td colspan="6" class="r">Total (inclusive of GST)</td><td class="r">' + num(c.total) + '</td></tr></tfoot></table></div>' +
      '<p class="incl">All rates are inclusive of GST. Tax is not charged in addition to the amounts above.</p>' +

      '<section class="split">' +
        '<div class="taxbox"><div class="lbl">GST summary (included in the total)</div><div class="tbl-wrap"><table class="tax"><thead><tr><th>HSN / SAC</th><th class="r">Taxable value</th><th class="c">CGST</th><th class="r">CGST amt</th><th class="c">SGST</th><th class="r">SGST amt</th><th class="r">Total tax</th><th class="r">Amount</th></tr></thead>' +
          '<tbody>' + taxRows + '</tbody><tfoot><tr><td>Total</td><td class="r">' + num(c.taxable) + '</td><td></td><td class="r">' + num(c.cgst) + '</td><td></td><td class="r">' + num(c.sgst) + '</td><td class="r">' + num(c.gstTotal) + '</td><td class="r">' + num(c.total) + '</td></tr></tfoot></table></div>' +
          '<div class="small">IGST ₹0.00 · Cess ₹0.00 · Tax payable on reverse charge: No</div></div>' +
        '<div class="totals">' +
          '<div class="srow"><span>Room charges</span><span>' + num(c.roomGross) + '</span></div>' +
          (c.disc ? '<div class="srow"><span>Less: discount</span><span>' + num(-c.disc) + '</span></div>' : '') +
          (c.extras ? '<div class="srow"><span>Other charges</span><span>' + num(c.extras) + '</span></div>' : '') +
          '<div class="srow tot"><span>Invoice total</span><span>₹' + num(c.total) + '</span></div>' +
          '<div class="srow"><span>Amount received</span><span>' + num(-c.paid) + '</span></div>' +
          (c.refunded ? '<div class="srow"><span>Refunded</span><span>' + num(c.refunded) + '</span></div>' : '') +
          '<div class="srow bal' + (settled ? ' ok' : '') + '"><span>' + (settled ? 'Balance' : c.due > 0 ? 'Balance payable' : 'Refundable to guest') + '</span><span>₹' + num(Math.abs(c.due)) + '</span></div>' +
          (settled ? '<div class="stamp">Paid</div>' : '') +
          '<div class="words"><b>Amount in words:</b> Indian Rupees ' + words(c.total) + ' Only</div>' +
        '</div>' +
      '</section>' +

      (pays ? '<section class="pays"><div class="lbl">Payments received</div><div class="tbl-wrap"><table class="ptab"><thead><tr><th>Date</th><th>Particulars</th><th>Mode</th><th>Reference</th><th class="r">Amount (₹)</th></tr></thead><tbody>' + pays + '</tbody></table></div></section>' : '') +

      (m ? '<section class="member"><b>Nikadi Membership · ' + esc(m.level) + '</b>' +
        (m.saved ? '<span>Saved on this stay: <b>' + inr(m.saved) + '</b></span>' : '') +
        (m.earned != null ? '<span>Points earned: <b>' + m.earned + '</b></span>' : '') +
        (m.balance != null ? '<span>Points balance: <b>' + grp(String(m.balance)) + '</b></span>' : '') + '</section>' : '') +

      '<section class="decl"><div class="lbl">Declaration</div><p>We declare that this invoice shows the actual price of the services described and that all particulars are true and correct. ' +
        'I agree that my liability for this bill is not waived and agree to be held personally liable if the indicated person, company or association fails to pay any part of it. ' +
        'Any query about this bill must be raised within five days of departure.</p></section>' +

      '<section class="sign"><div class="gsig"><div class="line"></div>Guest signature<small>&nbsp;</small></div><div class="r"><img class="sig" src="' + esc(opt.sign || (opt.logo ? String(opt.logo).replace(/logo\.png$/, 'signature.png') : HOTEL.sign)) + '" alt="Signed for ' + HOTEL.company + ', Director"><div class="line"></div>Authorised signatory' +
        (d.staff ? '<small>Checked out by ' + esc(d.staff) + '</small>' : '') + '</div></section>' +

      '<footer class="foot"><div>' + HOTEL.company + ' · ' + HOTEL.name + ', ' + HOTEL.address.join(', ') + '</div>' +
        '<div>' + HOTEL.phone + ' · ' + HOTEL.email + ' · ' + HOTEL.web + '</div>' +
        '<div class="gen">This is a computer-generated invoice. ' + (d.id ? 'Verify it by scanning the QR code or at ' + HOTEL.web + '/bill.' : '') + '</div>' +
        '<div class="thanks">Thank you for staying with us. Hare Krishna.</div></footer>' +
      '</div></body></html>';
  }

  var PRINT = ['body{background:#fff;font-size:9.5px;line-height:1.3}.incl{margin-top:3px}.parties .kv.sm{margin-top:3px}.small{margin-top:3px}.decl p{font-size:9px}.foot{font-size:9px;line-height:1.45}.foot .thanks{font-size:10.5px;margin-top:3px}.words{margin-top:5px}.stamp{margin-top:5px}.top{gap:14px;padding-bottom:10px}.logo{width:120px}.qr-svg{width:96px;height:96px}.doc h1{font-size:18px}.parties{padding:10px 0;gap:18px}.who{font-size:11.5px}.lines{margin-top:10px}.lines td{padding:5px 6px}.lines th{padding:6px}.split{margin-top:10px}.tax td,.tax th,.ptab td,.ptab th{padding:3px 5px}.pays,.member,.decl{margin-top:10px}.sign{margin-top:8px}.sign .line{margin-top:2px}.sign .sig{width:185px}.foot>div:first-child{display:none}.stamp{display:none}.srow.tot{margin:3px 0}.srow.bal{margin-top:3px;padding:4px 6px}.lines tfoot td{padding:5px 6px}.kv th,.kv td,.kv td.colon{padding-top:0;padding-bottom:0}.party{line-height:1.35}.tax td,.tax th{padding:2px 5px}.ptab td,.ptab th{padding:2px 5px}.srow{padding:1px 0}.lines td{padding:4px 6px}.qr span{font-size:8px}.decl p{line-height:1.35}.split{gap:14px}.foot{margin-top:12px;padding-top:8px}.member{padding:6px 10px}.totals{padding:6px 10px}.srow{padding:2px 0}.srow.tot{font-size:13px;padding:5px 0}section,.totals,.taxbox,table{break-inside:avoid}.toolbar{display:none}.sheet{box-shadow:none;margin:0;max-width:none;padding:0;border-top-width:4px}',
    '.top{grid-template-columns:1fr auto 1.25fr}.parties{grid-template-columns:1fr 1fr}.split{grid-template-columns:1fr 250px}',
    '.lines th,.srow.bal,.lines tfoot td,.tax th,.ptab th,.member{-webkit-print-color-adjust:exact;print-color-adjust:exact}'].join('');

  var CSS = [
    '*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}',
    'body{margin:0;background:#e9ecee;color:#1d2326;font:12.5px/1.45 "Helvetica Neue",Helvetica,Arial,sans-serif}',
    '.sheet{max-width:860px;margin:24px auto;background:#fff;padding:34px 38px 26px;border-top:5px solid #156b82;box-shadow:0 1px 18px rgba(20,40,50,.10)}',
    '.mono{font-family:"SFMono-Regular",Menlo,Consolas,monospace;font-size:.95em}',
    '.lbl{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#156b82;font-weight:700;margin-bottom:6px}',
    'table{border-collapse:collapse;width:100%}.c{text-align:center}.r{text-align:right}',
    '.tbl-wrap{overflow-x:auto}.top>*,.parties>*,.split>*{min-width:0}',
    '.top{display:grid;grid-template-columns:1fr auto 1.25fr;gap:22px;align-items:start;padding-bottom:18px;border-bottom:2px solid #1d2326}',
    '.logo{width:150px;height:auto;display:block}',
    '.qr{display:flex;flex-direction:column;align-items:center;gap:4px}.qr-svg{width:118px;height:118px;display:block}.qr span{font-size:9.5px;color:#5c676c;letter-spacing:.02em}',
    '.doc h1{margin:0;font-size:22px;letter-spacing:.04em;font-weight:800}.orig{font-weight:700;font-size:12.5px;margin:2px 0 8px;color:#3d474b}',
    '.kv th{text-align:left;font-weight:600;color:#3d474b;padding:1.5px 10px 1.5px 0;white-space:nowrap;vertical-align:top;width:1%}',
    '.kv td{padding:1.5px 0}.kv td.colon{padding:1.5px 8px 1.5px 0;color:#8a9499;width:1%}',
    '.kv.sm{margin-top:6px}',
    '.parties{display:grid;grid-template-columns:1fr 1fr;gap:26px;padding:16px 0;border-bottom:1px solid #cfd6d9}',
    '.party{color:#3d474b;line-height:1.55}.who{font-weight:700;color:#1d2326;font-size:13.5px}',
    '.lines{margin-top:16px;border:1px solid #1d2326}',
    '.lines th{background:#1d2326;color:#fff;font-weight:600;font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;padding:8px 8px;text-align:left}',
    '.lines th.c{text-align:center}.lines th.r{text-align:right}',
    '.lines td{padding:8px;border-bottom:1px solid #dde3e5;border-right:1px solid #eef1f2;vertical-align:top}',
    '.lines td b{font-weight:600}.lines small{display:block;color:#66737a;font-size:11px;margin-top:2px}',
    '.lines tr.disc td{color:#1e6b46}.lines tfoot td{font-weight:700;background:#f2f5f6;border-top:1px solid #1d2326;padding:9px 8px}',
    '.incl{margin:6px 0 0;font-size:11px;color:#66737a}',
    '.split{display:grid;grid-template-columns:1fr 270px;gap:22px;margin-top:18px;align-items:start}',
    '.tax{border:1px solid #cfd6d9}.tax th{background:#f2f5f6;font-size:10px;text-transform:uppercase;letter-spacing:.03em;color:#3d474b;padding:6px;text-align:left;border-bottom:1px solid #cfd6d9}',
    '.tax th.r{text-align:right}.tax th.c{text-align:center}.tax td{padding:6px;border-bottom:1px solid #eef1f2;white-space:nowrap}.tax tfoot td{font-weight:700;border-top:1px solid #cfd6d9}',
    '.small{font-size:10.5px;color:#66737a;margin-top:6px}',
    '.totals{border:1px solid #cfd6d9;padding:10px 14px}',
    '.srow{display:flex;justify-content:space-between;gap:10px;padding:4px 0;color:#3d474b}',
    '.srow.tot{border-top:1.5px solid #1d2326;border-bottom:1.5px solid #1d2326;margin:6px 0;padding:8px 0;font-size:15px;font-weight:800;color:#1d2326}',
    '.srow.bal{font-weight:700;color:#1d2326;background:#f2f5f6;margin:6px -6px 0;padding:7px 6px}.srow.bal.ok{background:#e8f3ee;color:#1e6b46}',
    '.stamp{margin:10px 0 0 auto;width:max-content;border:2px solid #1e6b46;color:#1e6b46;padding:2px 16px;font-weight:800;letter-spacing:.3em;text-transform:uppercase;font-size:12px;transform:rotate(-4deg);border-radius:3px}',
    '.words{font-size:11px;color:#3d474b;margin-top:10px;line-height:1.4}',
    '.pays{margin-top:18px}.ptab th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.03em;color:#3d474b;background:#f2f5f6;padding:6px;border-bottom:1px solid #cfd6d9}',
    '.ptab th.r{text-align:right}.ptab td{padding:6px;border-bottom:1px solid #eef1f2}',
    '.member{margin-top:16px;display:flex;flex-wrap:wrap;gap:6px 22px;padding:9px 14px;border-left:3px solid #156b82;background:#f0f6f8;color:#3d474b}.member>b{color:#156b82}',
    '.decl{margin-top:16px}.decl p{margin:0;font-size:10.5px;color:#52606a;line-height:1.5}',
    '.sign{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:22px;font-size:11px;color:#3d474b}',
    '.sign{align-items:end}.sign .line{border-top:1px solid #1d2326;margin:4px 0 5px;height:0}.sign .r{text-align:right}.sign .sig{display:block;width:230px;max-width:100%;height:auto;margin:0 0 0 auto}.sign small{display:block;color:#8a9499;margin-top:2px}',
    '.foot{margin-top:24px;padding-top:12px;border-top:1px solid #cfd6d9;text-align:center;font-size:10.5px;color:#66737a;line-height:1.6}',
    '.foot .gen{color:#8a9499}.foot .thanks{margin-top:6px;font-size:12.5px;color:#156b82;font-weight:600}',
    '.toolbar{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px max(16px,env(safe-area-inset-left,0px));background:#1d2326;color:#fff;font-weight:600}',
    '.toolbar button{font:inherit;font-size:13px;border:0;border-radius:6px;padding:8px 14px;background:#156b82;color:#fff;cursor:pointer;margin-left:6px}.toolbar .tb-share{background:#3d474b}',
    '@media (max-width:700px){.sheet{margin:0;padding:20px 16px;box-shadow:none}.top{grid-template-columns:1fr auto}.doc{grid-column:1/-1}.parties,.split{grid-template-columns:1fr}',
    '.qr-svg{width:96px;height:96px}.lines{font-size:11.5px}.lines th:nth-child(1),.lines td:nth-child(1),.lines th:nth-child(6),.lines td:nth-child(6){display:none}.sign{gap:18px}}',
    '@media print{' + PRINT + '@page{size:A4;margin:9mm 10mm}}'
  ].join('');

  /* Email body: plain tables + inline styles so it looks right in Gmail and Outlook. The PDF bill is attached. */
  function billEmail(d) {
    var c = compute(d), g = d.guest || {}, m = d.member, paid = Math.abs(c.due) < .5;
    function p(t, st) { return '<tr><td style="padding:0 30px 14px;font-size:15px;color:#263034;line-height:1.65' + (st || '') + '">' + t + '</td></tr>'; }
    function row(a, b, strong) { return '<tr><td style="padding:7px 0;color:#4a5458;font-size:14px' + (strong ? ';font-weight:700;color:#1d2326' : '') + '">' + a + '</td><td align="right" style="padding:7px 0;font-size:14px;color:#1d2326' + (strong ? ';font-weight:700' : '') + '">' + b + '</td></tr>'; }
    return '<div style="background:#eef1f2;padding:28px 12px;font-family:Helvetica,Arial,sans-serif">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-top:4px solid #156b82">' +
      '<tr><td style="padding:28px 30px 18px"><img src="' + HOTEL.logo + '" width="130" alt="' + HOTEL.name + '" style="display:block;border:0"></td></tr>' +
      p('Dear ' + esc(greetName(g)) + ',') +
      p('Hare Krishna! 🙏') +
      p('Thank you so much for choosing Nikadi Guest House for your stay in Sri Dham Mayapur. It was a real pleasure to have you with us, and we hope your days in the Dham were peaceful and full of blessings.') +
      p('Your bill is attached to this email as a PDF.') +
      '<tr><td style="padding:4px 30px 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #dfe6e8;border-bottom:1px solid #dfe6e8">' +
        row('Tax invoice', '<span style="font-family:Menlo,Consolas,monospace">' + esc(d.no) + '</span>') +
        row('Stay', 'Room ' + esc(d.room.no) + ' · ' + day(d.checkin) + ' – ' + day(d.checkout)) +
        (c.disc ? row('You saved', inr(c.disc)) : '') +
        row('Total (incl. GST)', inr(c.total), true) +
        row(paid ? 'Payment' : c.due > 0 ? 'Balance due' : 'To be refunded to you', paid ? 'Paid in full ✓' : inr(Math.abs(c.due)), true) +
      '</table></td></tr>' +
      (m && m.earned ? p('As our ' + esc(m.level) + ' member, you earned <b>' + m.earned + ' points</b> on this stay' + (m.balance != null ? ' and now have <b>' + grp(String(m.balance)) + ' points</b>' : '') + '. Thank you for being part of the Nikadi family.') : '') +
      p('Whenever the Dham calls you back, we will be happy to welcome you again.') +
      p('With warm regards,<br><b>Team Nikadi Guest House</b><br>' + HOTEL.phone, ';padding-bottom:22px') +
      (d.url ? '<tr><td style="padding:0 30px 24px;font-size:13px;color:#66737a">You can also <a href="' + esc(d.url) + '" style="color:#156b82">view your bill online</a>.</td></tr>' : '') +
      '<tr><td style="padding:16px 30px 24px;border-top:1px solid #eef1f2;font-size:11.5px;color:#7d8a8e;line-height:1.6">' + HOTEL.company + ' · GSTIN ' + HOTEL.gstin + '<br>' + HOTEL.address.join(', ') + '<br>' + HOTEL.web + '</td></tr>' +
      '</table></div>';
  }
  function billEmailSubject(d) { return 'Thank you for staying with us · Your bill ' + d.no + ' · Nikadi Guest House'; }

  /* WhatsApp message sent together with the PDF bill. opt.link adds the online link (when the PDF can't be attached). */
  function billWhatsApp(d, opt) {
    opt = opt || {};
    var c = compute(d), g = d.guest || {}, m = d.member, paid = Math.abs(c.due) < .5;
    return 'Dear ' + greetName(g) + ',\n\n' +
      'Hare Krishna! 🙏\n\n' +
      'Thank you so much for staying with us at *Nikadi Guest House*. It was a real pleasure to have you, and we hope your time in Sri Dham Mayapur was peaceful and full of blessings.\n\n' +
      (opt.link ? 'Here is your bill:\n' : 'Your bill is attached as a PDF:\n') +
      '*Tax Invoice ' + d.no + '*\n' +
      'Total ' + inr(c.total) + ' (incl. GST) · ' + (paid ? 'Paid in full ✅' : c.due > 0 ? 'Balance due ' + inr(c.due) : 'To be refunded ' + inr(-c.due)) + '\n' +
      (opt.link && d.url ? d.url + '\n' : '') +
      (m && m.earned ? '\n⭐ As our ' + m.level + ' member, you earned ' + m.earned + ' points on this stay' + (m.balance != null ? '. Your balance is now ' + grp(String(m.balance)) + ' points' : '') + '.\n' : '') +
      '\nWhenever the Dham calls you back, we will be happy to welcome you again.\n\n' +
      'With warm regards,\nTeam Nikadi Guest House\n' + HOTEL.phone;
  }

  root.NikadiBill = { billHTML: billHTML, billEmail: billEmail, billEmailSubject: billEmailSubject, greetName: greetName, TITLES: TITLES, billWhatsApp: billWhatsApp, compute: compute, words: words, inr: inr, HOTEL: HOTEL, ROOM_HSN: ROOM_HSN, ROOM_GST: ROOM_GST };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.NikadiBill;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
