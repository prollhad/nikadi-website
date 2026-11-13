/* Nikadi Guest House — guest bill (tax invoice).
   billHTML(d) returns a complete, self-contained HTML page. The same HTML is used
   for the screen, the PDF attached to the email, and the email body.
   All room prices are INCLUSIVE of GST. The room is always billed at the full
   tariff and any discount is shown as its own line. GST is then worked out
   backwards from the final amount (5% for rooms up to ₹7,500 a night:
   CGST 2.5% + SGST 2.5%, SAC 996311). */
(function (root) {
  var HOTEL = {
    name: 'Nikadi Guest House',
    company: 'A unit of Nikadi Projects Pvt. Ltd.',
    gstin: '19AAHCN7789F1ZR',
    address: ['Bhaktisiddhanta Saraswati Marg', 'Opp. ISKCON Gate No. 4 (Namahatta Bhavan)', 'Mayapur, Nadia, West Bengal 741313'],
    phone: '+91 75011 01137',
    email: 'nikadiguesthouse@gmail.com',
    web: 'www.nikadiguesthouse.com',
    gstRate: 5, sac: '996311'
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function r2(n) { return Math.round(n * 100) / 100; }
  function inr(n, dec) {
    var neg = n < 0; n = Math.abs(n);
    var s = dec ? n.toFixed(2) : String(Math.round(n)), p = s.split('.'), x = p[0];
    var last = x.slice(-3), rest = x.slice(0, -3);
    if (rest) last = ',' + last;
    x = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + last;
    return (neg ? '−' : '') + '₹' + x + (p[1] ? '.' + p[1] : '');
  }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function day(s) { var p = String(s).slice(0, 10).split('-'); return +p[2] + ' ' + MON[+p[1] - 1] + ' ' + p[0]; }
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

  /* d = {
       no, date, guest:{name, phone, email, city, gstin, company},
       room:{no, type}, checkin, checkout, nights, guests,
       tariff (full price per night, incl. GST),
       discounts:[{label, amount}],             // amount is positive; shown as minus
       items:[{label, qty, rate, free}],         // free:true shows "Complimentary"
       payments:[{date, label, method, ref, amount}],
       refunds:[{date, method, ref, amount}],
       member:{level, number, earned, balance, saved},
       staff, note }  */
  function compute(d) {
    var roomTotal = d.tariff * d.nights;
    var disc = (d.discounts || []).reduce(function (s, x) { return s + x.amount; }, 0);
    var extras = (d.items || []).reduce(function (s, x) { return s + (x.free ? 0 : x.qty * x.rate); }, 0);
    var total = roomTotal - disc + extras;
    var taxable = r2(total / (1 + HOTEL.gstRate / 100));
    var gst = r2(total - taxable), cgst = r2(gst / 2), sgst = r2(gst - cgst);
    var paid = (d.payments || []).reduce(function (s, x) { return s + x.amount; }, 0);
    var refunded = (d.refunds || []).reduce(function (s, x) { return s + x.amount; }, 0);
    return { roomTotal: roomTotal, disc: disc, extras: extras, total: total, taxable: taxable, cgst: cgst, sgst: sgst,
      paid: paid, refunded: refunded, due: r2(total - paid + refunded) };
  }

  function billHTML(d, opt) {
    opt = opt || {};
    var c = compute(d), g = d.guest || {}, m = d.member;
    var rows = '';
    rows += row('Room ' + esc(d.room.no) + ' · ' + esc(d.room.type),
      day(d.checkin) + ' – ' + day(d.checkout) + ' · ' + d.guests + (d.guests > 1 ? ' guests' : ' guest'),
      d.nights + (d.nights > 1 ? ' nights' : ' night'), inr(d.tariff), inr(c.roomTotal));
    (d.discounts || []).forEach(function (x) {
      rows += '<tr class="disc"><td><b>' + esc(x.label) + '</b>' + (x.note ? '<small>' + esc(x.note) + '</small>' : '') + '</td><td></td><td></td><td class="r">' + inr(-x.amount) + '</td></tr>';
    });
    (d.items || []).forEach(function (x) {
      rows += x.free
        ? '<tr class="free"><td><b>' + esc(x.label) + '</b><small>' + esc(x.note || 'With our compliments') + '</small></td><td class="c">' + x.qty + '</td><td class="r">—</td><td class="r">Complimentary</td></tr>'
        : row(esc(x.label), x.note ? esc(x.note) : '', x.qty, inr(x.rate), inr(x.qty * x.rate));
    });
    function row(a, sub, q, rate, amt) {
      return '<tr><td><b>' + a + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</td><td class="c">' + q + '</td><td class="r">' + rate + '</td><td class="r">' + amt + '</td></tr>';
    }
    var pays = (d.payments || []).map(function (p) {
      return '<tr><td>' + day(p.date) + '</td><td>' + esc(p.label) + '</td><td>' + esc(p.method) + (p.ref ? ' · <span class="mono">' + esc(p.ref) + '</span>' : '') + '</td><td class="r">' + inr(p.amount) + '</td></tr>';
    }).join('') + (d.refunds || []).map(function (p) {
      return '<tr><td>' + day(p.date) + '</td><td>Refund</td><td>' + esc(p.method) + (p.ref ? ' · <span class="mono">' + esc(p.ref) + '</span>' : '') + '</td><td class="r">' + inr(-p.amount) + '</td></tr>';
    }).join('');
    var settled = Math.abs(c.due) < 0.5;

    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Bill ' + esc(d.no) + ' · ' + HOTEL.name + '</title>' +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Jost:wght@400;500;600&display=swap">' +
      '<style>' + CSS + '</style></head><body><div class="sheet">' +

      '<header class="top"><div class="brand"><img class="logo" src="' + esc(opt.logo || LOGO_URL) + '" alt="Nikadi Guest House" width="170"><div class="sub">Sri Dham Mayapur</div></div>' +
      '<div class="doc"><div class="kind">Tax Invoice</div><div class="no">' + esc(d.no) + '</div><div class="dt">' + day(d.date) + '</div></div></header>' +

      '<section class="parties"><div><div class="lbl">Billed to</div><div class="who">' + esc(g.name) + '</div>' +
      (g.company ? '<div>' + esc(g.company) + '</div>' : '') +
      (g.phone ? '<div>' + esc(g.phone) + '</div>' : '') + (g.email ? '<div>' + esc(g.email) + '</div>' : '') +
      (g.city ? '<div>' + esc(g.city) + '</div>' : '') + (g.gstin ? '<div>GSTIN <span class="mono">' + esc(g.gstin) + '</span></div>' : '') + '</div>' +
      '<div><div class="lbl">Stay</div><div class="who">Room ' + esc(d.room.no) + '</div><div>' + esc(d.room.type) + '</div>' +
      '<div>In: ' + day(d.checkin) + (d.inTime ? ', ' + esc(d.inTime) : '') + '</div><div>Out: ' + day(d.checkout) + (d.outTime ? ', ' + esc(d.outTime) : '') + '</div></div>' +
      '<div class="from"><div class="lbl">From</div><div class="who">' + HOTEL.name + '</div><div>' + HOTEL.company + '</div>' +
      HOTEL.address.map(function (l) { return '<div>' + l + '</div>'; }).join('') + '<div>GSTIN <span class="mono">' + HOTEL.gstin + '</span></div></div></section>' +

      '<table class="lines"><thead><tr><th>Description</th><th class="c">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>' + rows + '</tbody></table>' +

      '<section class="sum"><div class="left">' +
      (m ? '<div class="member t-' + esc(m.key || 'gold') + '"><div class="mh"><span class="dot"></span>' + esc(m.level) + ' member' + (m.number ? ' · <span class="mono">' + esc(m.number) + '</span>' : '') + '</div>' +
        '<div class="mrow"><span>You saved on this stay</span><b>' + inr(m.saved) + '</b></div>' +
        '<div class="mrow"><span>Points earned</span><b>+' + m.earned + '</b></div>' +
        '<div class="mrow"><span>Points balance</span><b>' + m.balance + '</b></div>' +
        (m.next ? '<div class="mnext">' + esc(m.next) + '</div>' : '') + '</div>' : '') +
      '<div class="tax"><div class="lbl">Tax included in the total</div>' +
      '<div class="trow"><span>Taxable value (SAC ' + HOTEL.sac + ')</span><span>' + inr(c.taxable, 1) + '</span></div>' +
      '<div class="trow"><span>CGST 2.5%</span><span>' + inr(c.cgst, 1) + '</span></div>' +
      '<div class="trow"><span>SGST 2.5%</span><span>' + inr(c.sgst, 1) + '</span></div>' +
      '<div class="tnote">All prices include GST. Place of supply: West Bengal (19).</div></div></div>' +

      '<div class="right"><div class="srow"><span>Room charges</span><span>' + inr(c.roomTotal) + '</span></div>' +
      (c.disc ? '<div class="srow disc"><span>Discounts</span><span>' + inr(-c.disc) + '</span></div>' : '') +
      (c.extras ? '<div class="srow"><span>Extras</span><span>' + inr(c.extras) + '</span></div>' : '') +
      '<div class="srow total"><span>Total <small>incl. GST</small></span><span>' + inr(c.total) + '</span></div>' +
      '<div class="srow"><span>Paid</span><span>' + inr(-c.paid) + '</span></div>' +
      (c.refunded ? '<div class="srow"><span>Refunded</span><span>' + inr(c.refunded) + '</span></div>' : '') +
      '<div class="srow due ' + (settled ? 'ok' : '') + '"><span>' + (settled ? 'Balance' : c.due > 0 ? 'Balance to pay' : 'To refund') + '</span><span>' + inr(Math.abs(c.due)) + '</span></div>' +
      (settled ? '<div class="stamp">Paid in full</div>' : '') +
      '<div class="words">Rupees ' + words(c.total) + ' only</div></div></section>' +

      (pays ? '<section class="pays"><div class="lbl">Payments</div><table class="ptab">' + pays + '</table></section>' : '') +

      '<footer class="foot"><div class="thanks">Thank you for staying with us. Hare Krishna.</div>' +
      '<div class="fl">' + HOTEL.phone + ' · ' + HOTEL.email + ' · ' + HOTEL.web + '</div>' +
      '<div class="fs">' + (d.staff ? 'Checked out by ' + esc(d.staff) + ' · ' : '') + 'This is a computer-generated invoice and needs no signature.</div></footer>' +
      '</div></body></html>';
  }

  var LOGO_URL = 'https://www.nikadiguesthouse.com/img/brand/logo.png';

  var CSS = [
    '*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}',
    'body{margin:0;background:#eef1f2;color:#263034;font:13px/1.5 Jost,"Helvetica Neue",Arial,sans-serif}',
    '.sheet{max-width:820px;margin:24px auto;background:#ffffff;padding:40px 44px 32px;border-top:6px solid #156b82;box-shadow:0 2px 24px rgba(40,30,20,.08)}',
    '.mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.92em;letter-spacing:.02em}',
    '.lbl{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#7d8a8e;margin-bottom:6px;font-weight:500}',
    '.top{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;padding-bottom:22px;border-bottom:1px solid #dfe6e8}',
    '.brand{display:flex;flex-direction:column;gap:6px}.logo{width:170px;height:auto;display:block}',
    '.name{font-family:"Cormorant Garamond",Georgia,serif;font-size:30px;font-weight:600;letter-spacing:.22em;line-height:1;color:#22292c}',
    '.sub{font-size:10.5px;letter-spacing:.28em;text-transform:uppercase;color:#7d8a8e}',
    '.doc{text-align:right}.kind{font-family:"Cormorant Garamond",Georgia,serif;font-size:24px;font-weight:600;color:#22292c;line-height:1}',
    '.no{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;margin-top:8px;color:#4a5458}.dt{color:#748185;font-size:12.5px}',
    '.parties{display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:22px;padding:22px 0;color:#4a5458;font-size:12.5px;line-height:1.6}',
    '.who{font-size:15px;font-weight:600;color:#22292c;margin-bottom:2px}',
    '.from{border-left:1px solid #dfe6e8;padding-left:22px}',
    'table{border-collapse:collapse;width:100%}',
    '.lines th{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#7d8a8e;font-weight:500;text-align:left;padding:10px 10px;background:#eef5f7;border-top:1px solid #dfe6e8;border-bottom:1px solid #dfe6e8}',
    '.lines td{padding:12px 10px;border-bottom:1px solid #e9eef0;vertical-align:top}',
    '.lines td b{font-weight:500;color:#22292c}.lines small{display:block;color:#748185;font-size:11.5px;margin-top:2px}',
    '.c{text-align:center}.r{text-align:right;white-space:nowrap}',
    '.lines tr.disc td{color:#2f7a4f}.lines tr.disc td b{color:#2f7a4f}',
    '.lines tr.free td.r:last-child{color:#156b82;font-size:12px;letter-spacing:.04em}',
    '.sum{display:grid;grid-template-columns:1fr 300px;gap:28px;padding-top:22px}',
    '.left{display:flex;flex-direction:column;gap:16px}',
    '.member{border-radius:10px;padding:14px 16px;background:linear-gradient(135deg,#1d4f5e,#22292c);color:#e9eef0}',
    '.member .mh{font-weight:600;letter-spacing:.04em;margin-bottom:8px;display:flex;align-items:center;gap:8px;color:#e0be7a}',
    '.member .dot{width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#f1d48c,#b8893a)}',
    '.mrow{display:flex;justify-content:space-between;font-size:12.5px;padding:2px 0;color:#d8ccb9}.mrow b{color:#fff;font-weight:600}',
    '.mnext{margin-top:8px;padding-top:8px;border-top:1px solid rgba(224,190,122,.25);font-size:11.5px;color:#c9b99f}',
    '.tax{border:1px solid #dfe6e8;border-radius:10px;padding:12px 16px}',
    '.trow{display:flex;justify-content:space-between;font-size:12.5px;color:#4a5458;padding:2px 0}',
    '.tnote{font-size:11px;color:#7d8a8e;margin-top:6px}',
    '.right{font-size:13.5px}',
    '.srow{display:flex;justify-content:space-between;padding:6px 0;color:#4a5458}',
    '.srow.disc span:last-child{color:#2f7a4f}',
    '.srow.total{border-top:1px solid #22292c;margin-top:6px;padding-top:12px;font-size:19px;font-weight:600;color:#22292c}',
    '.srow.total small{font-size:11px;font-weight:400;color:#7d8a8e;letter-spacing:.04em}',
    '.srow.due{background:#eef5f7;margin-top:8px;padding:10px 12px;border-radius:8px;font-weight:600;color:#22292c}',
    '.srow.due.ok{background:#e9f3ec;color:#2f7a4f}',
    '.stamp{margin:14px 0 0 auto;width:max-content;border:2px solid #2f7a4f;color:#2f7a4f;padding:4px 14px;border-radius:6px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;font-size:11px;transform:rotate(-3deg)}',
    '.words{font-size:11.5px;color:#748185;margin-top:12px;font-style:italic;text-align:right}',
    '.pays{margin-top:26px}.ptab td{padding:7px 10px;border-bottom:1px solid #e9eef0;font-size:12.5px;color:#4a5458}',
    '.ptab td:first-child{padding-left:0;width:110px}.ptab td.r{padding-right:0;color:#22292c;font-weight:500}',
    '.foot{margin-top:30px;padding-top:18px;border-top:1px solid #dfe6e8;text-align:center}',
    '.thanks{font-family:"Cormorant Garamond",Georgia,serif;font-size:19px;color:#22292c;font-style:italic}',
    '.fl{font-size:12px;color:#4a5458;margin-top:6px}.fs{font-size:10.5px;color:#7d8a8e;margin-top:6px}',
    '@media (max-width:640px){.sheet{margin:0;padding:24px 18px}.parties{grid-template-columns:1fr 1fr}.from{grid-column:1/-1;border-left:0;padding-left:0;border-top:1px solid #dfe6e8;padding-top:14px}',
    '.sum{grid-template-columns:1fr}.right{order:-1}.top{flex-direction:column}.doc{text-align:left}.lines th:nth-child(3),.lines td:nth-child(3){display:none}}',
    '@media print{body{background:#fff}.sheet{box-shadow:none;margin:0;max-width:none}@page{size:A4;margin:12mm}}'
  ].join('');

  /* Short WhatsApp message that goes with the bill link. */
  function billWhatsApp(d, link) {
    var c = compute(d), g = d.guest || {}, m = d.member, first = String(g.name || '').split(' ')[0];
    return 'Hare Krishna ' + first + ' 🙏\n\nThank you for staying at *Nikadi Guest House*.\n\n' +
      '*Bill ' + d.no + '*\nRoom ' + d.room.no + ' · ' + d.nights + (d.nights > 1 ? ' nights' : ' night') + ' (' + day(d.checkin) + ' – ' + day(d.checkout) + ')\n' +
      'Total: *' + inr(c.total) + '* (incl. GST)\n' +
      (c.disc ? 'Discount: ' + inr(c.disc) + '\n' : '') +
      'Paid: ' + inr(c.paid) + (Math.abs(c.due) < .5 ? ' ✅ Paid in full' : '\nBalance: ' + inr(c.due)) + '\n' +
      (m ? '\n⭐ ' + m.level + ' member: +' + m.earned + ' points (balance ' + m.balance + ')\n' : '') +
      (link ? '\nYour bill: ' + link + '\n' : '') +
      '\nSafe travels, and we hope to welcome you back to Mayapur soon.\n— Nikadi Guest House · ' + HOTEL.phone;
  }

  root.NikadiBill = { billHTML: billHTML, billWhatsApp: billWhatsApp, compute: compute, words: words, inr: inr, HOTEL: HOTEL };
  if (typeof module !== 'undefined') module.exports = root.NikadiBill;
})(typeof window !== 'undefined' ? window : this);
