/* Nikadi staff app: Salaries and payslips (owner only).
   Monthly salary sheet worked out from each employee's monthly rate, unpaid days, extra earnings and deductions,
   then official payslips (PDF, signed and stamped) and a salary register for the CA. Opened from the Employees page. */
(function () {
  var C, MONTH = null, DATA = null, BUSY = false;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var CO = { name: 'Nikadi Projects Private Limited', unit: 'Nikadi Guest House', cin: 'U70109WB2021PTC247589', gstin: '19AAHCN7789F1ZR',
    regd: 'ISKCON Hulorghat Housing Complex, Srimayapur, West Bengal 741313',
    addr: 'Bhaktisiddhanta Saraswati Marg, Opp. ISKCON Gate No. 4, Sri Dham Mayapur, Nadia, West Bengal 741313', phone: '+91 75011 01137', web: 'www.nikadiguesthouse.com' };
  function esc(s) { return C.esc(s == null ? '' : String(s)); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function rs(n) { return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN'); }
  function inr(n) { return 'Rs. ' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function mName(m) { var p = m.split('-'); return MONTHS[+p[1] - 1] + ' ' + p[0]; }
  function shift(m, d) { var p = m.split('-'), t = new Date(+p[0], +p[1] - 1 + d, 1); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0'); }
  function dLong(d) { if (!d) return ''; var p = d.split('-'); return +p[2] + ' ' + MONTHS[+p[1] - 1].slice(0, 3) + ' ' + p[0]; }
  /* the same sums as the server, so the sheet shows the net pay while typing */
  function ptWB(month, g) { if (month >= '2026-10') return g <= 20000 ? 0 : g <= 30000 ? 100 : g <= 50000 ? 140 : g <= 100000 ? 170 : 208; return g <= 10000 ? 0 : g <= 15000 ? 110 : g <= 25000 ? 130 : g <= 40000 ? 150 : 200; }
  function calc(r, month, days) {
    var lop = Math.max(0, Math.min(days, Number(r.lop) || 0)), basic = Math.round((Number(r.rate) || 0) * (days - lop) / days), extra = Math.max(0, Math.round(Number(r.extra) || 0)), gross = basic + extra;
    var pt = r.ptAuto === false ? Math.max(0, Math.round(Number(r.pt) || 0)) : ptWB(month, gross);
    var ded = pt + ['pf', 'esi', 'tds', 'adv', 'otherDed'].reduce(function (s, k) { return s + Math.max(0, Math.round(Number(r[k]) || 0)); }, 0);
    return { basic: basic, gross: gross, pt: pt, ded: ded, net: gross - ded, paidDays: days - lop };
  }
  /* amount in words, Indian style (lakh, crore) */
  var ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  var TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function two(n) { return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : ''); }
  function three(n) { return (n >= 100 ? ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' : '') : '') + (n % 100 ? two(n % 100) : ''); }
  function words(n) {
    n = Math.round(Number(n) || 0); if (!n) return 'Rupees Zero Only';
    var cr = Math.floor(n / 10000000), lk = Math.floor(n / 100000) % 100, th = Math.floor(n / 1000) % 100, rest = n % 1000, out = [];
    if (cr) out.push(three(cr) + ' Crore'); if (lk) out.push(two(lk) + ' Lakh'); if (th) out.push(two(th) + ' Thousand'); if (rest) out.push(three(rest));
    return 'Rupees ' + out.join(' ') + ' Only';
  }

  /* ---------- the salary sheet ---------- */
  function mount(v, ctx, back) {
    C = ctx; if (!MONTH) { var t = C.today(); MONTH = t.slice(8) <= '10' ? shift(t.slice(0, 7), -1) : t.slice(0, 7); } /* early in a month, last month is the one being paid */
    if (!DATA || DATA.month !== MONTH) { v.innerHTML = head() + '<div class="loading">Loading…</div>'; wireHead(v, back); load(); return; }
    var d = DATA, fin = d.final, any = d.rows.some(function (r) { return r.status === 'Final'; });
    var tot = d.rows.reduce(function (s, r) { var c = calc(r, d.month, d.days); s.g += c.gross; s.d += c.ded; s.n += c.net; return s; }, { g: 0, d: 0, n: 0 });
    v.innerHTML = head() +
      '<div class="pay-month"><button class="btn btn-quiet" type="button" data-m="-1" aria-label="Previous month">‹</button><h2>' + esc(mName(d.month)) + '</h2><button class="btn btn-quiet" type="button" data-m="1" aria-label="Next month">›</button>' +
      '<span class="ptag ' + (fin ? 'k-ok' : 'k-warn') + '">' + (fin ? 'Final · payslips made' : any ? 'Partly final' : 'Draft') + '</span>' + (any ? '<span class="small">' + d.rows.filter(function (r) { return r.copyDoc; }).length + ' of ' + d.rows.filter(function (r) { return r.status === 'Final'; }).length + ' signed payslips uploaded</span>' : '') + '</div>' +
      '<div class="kpis"><div class="kpi"><span>Gross salaries</span><b>' + rs(tot.g) + '</b><small>' + d.rows.length + ' people · ' + d.days + ' days in the month</small></div><div class="kpi"><span>Deductions</span><b>' + rs(tot.d) + '</b><small>profession tax, advances, other</small></div><div class="kpi"><span>Net to pay</span><b>' + rs(tot.n) + '</b><small>pay by the 7th of next month</small></div></div>' +
      (d.rows.length ? '<p class="small">Tap a person to change their unpaid days, extra pay, advance or payment details. Everyone else is paid their full monthly salary.</p><div class="pay-list">' + d.rows.map(row).join('') + '</div>' : '<div class="panel"><p class="small">No employees were working in this month.</p></div>') +
      '<p class="small">' + esc(d.ptNote) + ' PF and ESI are 0 while the company has fewer than 20 and 10 people; fill them in once you register. TDS only if a person\'s yearly salary is taxable.</p>' +
      '<p class="err" id="payErr" role="alert"></p>' +
      '<div class="emp-acts">' + (fin ? '<button class="btn btn-gold" type="button" id="payAll">Print all unsigned payslips (one PDF)</button><button class="btn btn-line" type="button" id="payReg">Salary register for the CA</button><button class="btn btn-quiet" type="button" id="payOpen">Reopen this month to change it</button>'
        : '<button class="btn btn-line" type="button" id="paySave">Save draft</button><button class="btn btn-gold" type="button" id="payFin">Finalise and make payslips</button>' + (any ? '<button class="btn btn-line" type="button" id="payAll">Payslips already final (PDF)</button>' : '')) + '</div>' +
      '<p class="small">Finalising locks the month and gives each payslip its number (NPPL/SAL/' + esc(d.month) + '/001 …). Then print the payslips, have each person sign theirs in ink, and upload a photo or scan of the signed page with “Upload signed copy”. The signed copy then takes the place of the printed one: it is the payslip kept for that month, on the person\'s profile and in Google Drive.</p>';
    wireHead(v, back);
    $$('[data-m]', v).forEach(function (b) { b.onclick = function () { MONTH = shift(d.month, +b.dataset.m); DATA = null; mount(v, ctx, back); }; });
    $$('.pay-row', v).forEach(function (el) {
      var r = d.rows[+el.dataset.i]; if (r.status === 'Final') return;
      $$('input,select', el).forEach(function (inp) {
        inp.addEventListener('input', function () {
          var k = inp.dataset.k; if (!k) return;
          if (k === 'ptAuto') { r.ptAuto = inp.checked; $('[data-k="pt"]', el).disabled = inp.checked; } else r[k] = inp.type === 'number' ? inp.value : inp.value;
          var c = calc(r, d.month, d.days); if (r.ptAuto !== false) $('[data-k="pt"]', el).value = c.pt;
          $('[data-out="gross"]', el).textContent = rs(c.gross); $('[data-out="ded"]', el).textContent = rs(c.ded); $('[data-out="net"]', el).textContent = rs(c.net); $('[data-out="days"]', el).textContent = c.paidDays + ' of ' + d.days + ' days';
        });
      });
    });
    $$('[data-slip]', v).forEach(function (b) { b.onclick = function (ev) { ev.preventDefault(); slips(b.dataset.slip); }; });
    $$('[data-up]', v).forEach(function (b) { b.onclick = function (ev) { ev.preventDefault(); upload(b.dataset.up, function () { mount(v, C, back); }); }; });
    $$('[data-copy]', v).forEach(function (b) { b.onclick = function (ev) { ev.preventDefault(); copy(b.dataset.copy, function () { mount(v, C, back); }); }; });
    var sv = $('#paySave', v); if (sv) sv.onclick = function () { save(v, back, false, sv); };
    var fn = $('#payFin', v); if (fn) fn.onclick = function () { if (fn.dataset.sure !== '1') { fn.dataset.sure = '1'; fn.textContent = 'Tap again to finalise ' + mName(d.month); return; } save(v, back, true, fn); };
    var op = $('#payOpen', v); if (op) op.onclick = function () { if (op.dataset.sure !== '1') { op.dataset.sure = '1'; op.textContent = 'Tap again to reopen (payslip numbers stay the same)'; return; } C.busy(op, true); C.api('deskPayrollReopen', { month: d.month }).then(function (r) { DATA = r; mount(v, ctx, back); }, function (x) { C.busy(op, false); C.toast(C.errText(x)); }); };
    var al = $('#payAll', v); if (al) al.onclick = function () { slips('', true); };
    var rg = $('#payReg', v); if (rg) rg.onclick = function () { register(); };
  }
  function head() { return '<div class="hrow"><div><p class="kicker">Owner only · salary sheet, payslips and register</p><h1>Salaries</h1></div><button class="btn btn-quiet" type="button" id="payBack">‹ Employees</button></div>'; }
  function wireHead(v, back) { var b = $('#payBack', v); if (b) b.onclick = back; }
  function load() { C.api('deskPayrollMonth', { month: MONTH }).then(function (r) { DATA = r; if (C.alive()) C.render(); }, function (x) { C.toast(C.errText(x)); }); }
  function num(k, r, lock, w, lab) { return '<label class="pay-f' + (w ? ' ' + w : '') + '"><span>' + lab + '</span><input class="input" type="number" min="0" step="1" inputmode="numeric" data-k="' + k + '" value="' + esc(r[k] || (k === 'rate' ? 0 : '')) + '"' + (lock ? ' disabled' : '') + '></label>'; }
  function txt(k, r, lock, lab, ph) { return '<label class="pay-f wide"><span>' + lab + '</span><input class="input" data-k="' + k + '" value="' + esc(r[k] || '') + '" placeholder="' + esc(ph || '') + '"' + (lock ? ' disabled' : '') + '></label>'; }
  function row(r, i) {
    var d = DATA, lock = r.status === 'Final', c = calc(r, d.month, d.days);
    return '<details class="panel pay-row" data-i="' + i + '"><summary><span class="pay-who"><b>' + esc(r.name) + '</b><small>' + esc(r.emp) + ' · ' + esc(r.job || '') + '</small></span>' +
      '<span class="pay-sum"><small data-out="days">' + c.paidDays + ' of ' + d.days + ' days</small><span>Gross <b data-out="gross">' + rs(c.gross) + '</b></span><span>Deductions <b data-out="ded">' + rs(c.ded) + '</b></span><span class="pay-net">Net <b data-out="net">' + rs(c.net) + '</b></span>' +
      (lock ? (r.copyDoc ? '<button class="btn btn-gold sm" type="button" data-copy="' + esc(r.emp) + '">Signed payslip ✓</button>' : '<button class="btn btn-line sm" type="button" data-slip="' + esc(r.emp) + '">Print payslip</button><button class="btn btn-gold sm" type="button" data-up="' + esc(r.emp) + '">Upload signed copy</button>') + '<code>' + esc(r.slipNo) + '</code>' : '') + '</span></summary>' +
      '<div class="pay-grid">' +
      '<div class="pay-col"><h4>Earnings</h4>' + num('rate', r, lock, '', 'Monthly salary (₹)') + num('lop', r, lock, '', 'Unpaid leave days') + num('extra', r, lock, '', 'Extra earnings (₹)') + txt('extraNote', r, lock, 'Extra earnings for', 'Overtime, bonus, festival allowance…') + '</div>' +
      '<div class="pay-col"><h4>Deductions</h4><label class="pay-f"><span>Profession tax (₹)</span><input class="input" type="number" min="0" data-k="pt" value="' + c.pt + '"' + (lock || r.ptAuto !== false ? ' disabled' : '') + '></label>' +
      '<label class="toggle sm"><span>By West Bengal slab</span><input type="checkbox" data-k="ptAuto"' + (r.ptAuto !== false ? ' checked' : '') + (lock ? ' disabled' : '') + '></label>' +
      num('adv', r, lock, '', 'Salary advance recovered (₹)') + num('tds', r, lock, '', 'TDS (₹)') + num('pf', r, lock, '', 'PF (₹)') + num('esi', r, lock, '', 'ESI (₹)') + num('otherDed', r, lock, '', 'Other deduction (₹)') + txt('otherNote', r, lock, 'Other deduction for', '') + '</div>' +
      '<div class="pay-col"><h4>Payment</h4><label class="pay-f wide"><span>Paid by</span><select class="input" data-k="mode"' + (lock ? ' disabled' : '') + '>' + ['Bank transfer', 'UPI', 'Cash', 'Cheque'].map(function (m) { return '<option' + (m === r.mode ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></label>' +
      '<label class="pay-f wide"><span>Paid on</span><input class="input" type="date" data-k="paidOn" value="' + esc(r.paidOn || '') + '"' + (lock ? ' disabled' : '') + '></label>' + txt('ref', r, lock, 'Transaction / UTR / cheque no.', '') + '</div></div></details>';
  }
  function save(v, back, finalise, btn) {
    if (BUSY) return; BUSY = true; C.busy(btn, true); $('#payErr', v).textContent = '';
    var rows = DATA.rows.map(function (r) { return { emp: r.emp, rate: r.rate, lop: r.lop, extra: r.extra, extraNote: r.extraNote, pt: r.pt, ptAuto: r.ptAuto !== false, pf: r.pf, esi: r.esi, tds: r.tds, adv: r.adv, otherDed: r.otherDed, otherNote: r.otherNote, mode: r.mode, paidOn: r.paidOn, ref: r.ref }; });
    C.api('deskPayrollSave', { month: DATA.month, rows: rows, finalise: finalise }).then(function (r) { BUSY = false; DATA = r; C.toast(finalise ? 'Finalised. Payslips are ready.' : 'Saved'); mount(v, C, back); },
      function (x) { BUSY = false; C.busy(btn, false); $('#payErr', v).textContent = C.errText(x); });
  }

  /* ---------- the employee signs for the payslip ---------- */
  /* ---------- the signed paper payslip ---------- */
  function upload(emp, after, month) {
    month = month || DATA.month;
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*,application/pdf'; inp.style.display = 'none'; document.body.appendChild(inp);
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
      Promise.resolve(NikadiID.capture(f, { mode: 'page', title: 'signed payslip', toast: C.toast })).then(function (cap) {
        var data = cap && (cap.data || cap); if (!data || typeof data !== 'string') return;
        C.toast('Saving the signed payslip…');
        return C.api('deskPayslipSign', { month: month, emp: emp, kind: 'paper', data: data }).then(function (res) {
          if (DATA && DATA.month === month) DATA.rows.forEach(function (r) { if (r.emp === emp) { r.copyDoc = res.copyDoc; r.signed = res.signed; } });
          C.toast('Signed payslip saved'); if (after) after();
        });
      }).catch(function (e) { C.toast(C.errText ? C.errText(e) : 'Could not save'); });
    };
    inp.click();
  }
  function copy(emp, after, month, docId, title) {
    month = month || DATA.month;
    var r = DATA && DATA.month === month ? DATA.rows.filter(function (x) { return x.emp === emp; })[0] : null, id = docId || (r && r.copyDoc);
    var body = C.openSheet(title || ('Signed payslip · ' + (r ? r.name : emp) + ' · ' + mName(month))); body.innerHTML = '<div class="loading">Opening…</div>';
    C.api('deskEmpDocGet', { id: id }).then(function (g) {
      body.innerHTML = '<img class="pay-copy" alt="Signed payslip" src="' + g.data + '"><div class="emp-acts"><button class="btn btn-gold" type="button" id="cDl">Download</button><button class="btn btn-line" type="button" id="cRe">Replace with a new photo</button></div>';
      $('#cDl', body).onclick = function () { var l = document.createElement('a'); l.href = g.data; l.download = emp + ' signed payslip ' + mName(month) + '.jpg'; document.body.appendChild(l); l.click(); l.remove(); };
      $('#cRe', body).onclick = function () { if (C.closeSheet) C.closeSheet(); upload(emp, after, month); };
    }, function (e) { body.innerHTML = '<p class="err">Could not open it. ' + esc(String(e && (e.error || e.message) || '')) + '</p>'; });
  }

  /* ---------- payslip PDF ---------- */
  function jspdf() { if (window.jspdf) return Promise.resolve(window.jspdf); return new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = '/staff/vendor/jspdf.umd.min.js'; s.onload = function () { ok(window.jspdf); }; s.onerror = bad; document.head.appendChild(s); }); }
  function pic(src) { return new Promise(function (ok) { var i = new Image(); i.onload = function () { var c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; c.getContext('2d').drawImage(i, 0, 0); ok({ u: c.toDataURL('image/png'), w: i.naturalWidth, h: i.naturalHeight }); }; i.onerror = function () { ok(null); }; i.src = src; }); }
  var ART = null;
  function art() { if (!ART) ART = Promise.all(['/img/brand/logo-light.png', '/img/brand/stamp-guesthouse.png', '/img/brand/stamp.png', '/img/brand/sign.png'].map(pic)).then(function (a) { return { logo: a[0], gh: a[1], co: a[2], sign: a[3] }; }); return ART; }
  function slipPage(d, A, s, month) {
    var W = 210, M = 14, y, NAVY = [15, 26, 58], GOLD = [184, 146, 74], INK = [30, 34, 52], MUT = [110, 114, 128], LINE = [222, 224, 230];
    function T(t, x, yy, o) { d.text(String(t == null ? '' : t), x, yy, o || {}); }
    function font(st, sz, col) { d.setFont('helvetica', st); d.setFontSize(sz); d.setTextColor.apply(d, col || INK); }
    function img(o, x, yy, w, h) { if (o) try { d.addImage(o.u, 'PNG', x, yy, w, h, undefined, 'FAST'); } catch (e) {} }
    /* head */
    d.setFillColor.apply(d, NAVY); d.rect(0, 0, W, 38, 'F'); d.setFillColor.apply(d, GOLD); d.rect(0, 38, W, 1.2, 'F');
    if (A.logo) { var lh = 26, lw = lh * A.logo.w / A.logo.h; img(A.logo, M, 6, lw, lh); }
    font('bold', 20, [255, 255, 255]); T('PAYSLIP', W - M, 17, { align: 'right' });
    font('normal', 10, [230, 205, 150]); T('for ' + mName(month), W - M, 24, { align: 'right' });
    font('normal', 8, [210, 214, 228]); T('Payslip no. ' + s.slipNo, W - M, 30.5, { align: 'right' });
    /* employer */
    y = 47; font('bold', 10.5); T(CO.unit + ', a unit of ' + CO.name, M, y);
    font('normal', 8, MUT); y += 4.6; T(CO.addr, M, y); y += 4; T('Regd. office: ' + CO.regd, M, y); y += 4; T('CIN ' + CO.cin + '   ·   GSTIN ' + CO.gstin, M, y);
    y += 6; d.setDrawColor.apply(d, LINE); d.setLineWidth(.3); d.line(M, y, W - M, y);
    /* employee */
    var fields = [['Employee name', s.name], ['Employee ID', s.emp], ['Designation', s.job], ["Father's / husband's name", s.father], ['Date of joining', dLong(s.joined)], ['PAN', s.pan],
      ['Bank', [s.bank, s.accNo].filter(Boolean).join('  A/c ')], ['IFSC', s.ifsc], ['PF UAN', s.uan || 'Not applicable'], ['ESI no.', s.esic || 'Not applicable'],
      ['Pay period', '1 – ' + s.days + ' ' + mName(month)], ['Days in month', s.days], ['Unpaid leave days', s.lop], ['Paid days', s.paidDays], ['Monthly salary (rate)', inr(s.rate)], ['Paid by', s.mode + (s.paidOn ? ' on ' + dLong(s.paidOn) : '')]];
    y += 7; var cx = [M, W / 2 + 2], i;
    for (i = 0; i < fields.length; i++) { var col = i % 2, yy = y + Math.floor(i / 2) * 6.4; font('normal', 7.6, MUT); T(fields[i][0], cx[col], yy); font('bold', 8.6); T(fields[i][1] === '' || fields[i][1] == null ? '—' : fields[i][1], cx[col] + 44, yy); }
    y += Math.ceil(fields.length / 2) * 6.4 + 2; if (s.ref) { font('normal', 7.6, MUT); T('Payment reference', M, y); font('bold', 8.6); T(s.ref, M + 44, y); y += 6.4; }
    /* earnings and deductions */
    y += 3; var tw = (W - 2 * M - 6) / 2, ex = M, dx = M + tw + 6;
    function tableHead(x, t) { d.setFillColor(244, 239, 228); d.rect(x, y, tw, 8, 'F'); font('bold', 8.6, NAVY); T(t, x + 3, y + 5.4); T('Amount', x + tw - 3, y + 5.4, { align: 'right' }); }
    tableHead(ex, 'EARNINGS'); tableHead(dx, 'DEDUCTIONS');
    var E = [['Basic pay (' + s.paidDays + ' of ' + s.days + ' days)', s.basic]]; if (s.extra) E.push([(s.extraNote || 'Other earnings'), s.extra]);
    var D = [['Profession tax (West Bengal)', s.pt], ['Provident fund (PF)', s.pf], ['ESI', s.esi], ['Income tax (TDS)', s.tds], ['Salary advance recovered', s.adv]]; if (s.otherDed) D.push([(s.otherNote || 'Other deduction'), s.otherDed]);
    var n = Math.max(E.length, D.length), ry = y + 8;
    for (i = 0; i < n; i++) { var yy2 = ry + 6.4 * i + 4.6; font('normal', 8.4);
      if (E[i]) { T(E[i][0], ex + 3, yy2); T(inr(E[i][1]), ex + tw - 3, yy2, { align: 'right' }); }
      if (D[i]) { T(D[i][0], dx + 3, yy2); T(inr(D[i][1]), dx + tw - 3, yy2, { align: 'right' }); }
      d.setDrawColor.apply(d, LINE); d.line(ex, ry + 6.4 * (i + 1), ex + tw, ry + 6.4 * (i + 1)); d.line(dx, ry + 6.4 * (i + 1), dx + tw, ry + 6.4 * (i + 1)); }
    y = ry + 6.4 * n; d.setFillColor(248, 246, 240); d.rect(ex, y, tw, 8, 'F'); d.rect(dx, y, tw, 8, 'F');
    font('bold', 8.8); T('Gross earnings', ex + 3, y + 5.4); T(inr(s.gross), ex + tw - 3, y + 5.4, { align: 'right' }); T('Total deductions', dx + 3, y + 5.4); T(inr(s.ded), dx + tw - 3, y + 5.4, { align: 'right' });
    d.setDrawColor.apply(d, GOLD); d.setLineWidth(.4); d.rect(ex, ry - 8, tw, y + 8 - (ry - 8)); d.rect(dx, ry - 8, tw, y + 8 - (ry - 8));
    /* net */
    y += 14; d.setFillColor.apply(d, NAVY); d.roundedRect(M, y, W - 2 * M, 18, 2, 2, 'F');
    font('normal', 8, [230, 205, 150]); T('NET PAY', M + 5, y + 7); font('bold', 15, [255, 255, 255]); T(inr(s.net), W - M - 5, y + 11.5, { align: 'right' });
    font('normal', 8.4, [225, 228, 238]); T(words(s.net), M + 5, y + 13.5);
    /* signatures */
    y += 30; var sy = y + 26;
    if (s.signImg) { var sh0 = 15, sw0 = Math.min(58, sh0 * s.signImg.w / s.signImg.h); img(s.signImg, M, sy - sh0 - 1, sw0, sh0); }
    font('normal', 8, MUT); T('Received by (employee)', M, sy + 6); d.setDrawColor.apply(d, MUT); d.setLineWidth(.25); d.line(M, sy, M + 60, sy); T(s.name + (s.signed ? '   ·   signed ' + String(s.signed).replace(/ \(paper\)$/, '').slice(0, 10).split('-').reverse().join('-') : ''), M, sy + 10.5);
    var co = A.co, gh = A.gh, sg = A.sign, right = W - M;
    function signed(st, rx, mw) { if (!st) return 0; var w = mw, h = w * st.h / st.w; if (h > 21) { h = 21; w = h * st.w / st.h; } var x0 = rx - w, y0 = sy - h; img(st, x0, y0, w, h);
      if (sg) { var bw = w * .751, bh = h * .58, k = Math.min(bw / sg.w, bh / sg.h), w2 = sg.w * k, h2 = sg.h * k; img(sg, x0 + w * .178 + (bw - w2) / 2, y0 + h * .225 + (bh - h2) / 2, w2, h2); } return w; }
    var w1 = signed(co, right, 56); signed(gh, right - w1 - 6, 50);
    font('bold', 8.4); T('For ' + CO.name, right, sy + 6, { align: 'right' }); font('normal', 7.6, MUT); T('Authorised signatory (Director)', right, sy + 10.5, { align: 'right' });
    /* foot */
    d.setDrawColor.apply(d, LINE); d.line(M, 282, W - M, 282);
    font('normal', 6.8, MUT); T('This payslip is issued under the Code on Wages, 2019. It is computer-generated and signed by the employer. Please keep it safe; it is also needed for a loan or a visa.', W / 2, 286.5, { align: 'center' });
    T(CO.unit + '   ·   ' + CO.phone + '   ·   ' + CO.web, W / 2, 290.5, { align: 'center' });
  }
  function slips(emp, unsignedOnly, month) {
    month = month || DATA.month;
    var body = C.openSheet(emp ? 'Payslip to print' : 'Payslips to print · ' + mName(month)); body.innerHTML = '<div class="loading">Making the payslip…</div>';
    Promise.all([C.api('deskPayslipData', { month: month, emp: emp || '' }), art(), jspdf()]).then(function (a) {
      var res = a[0], A = a[1], J = a[2];
      if (unsignedOnly) res.slips = res.slips.filter(function (s) { return !s.copyDoc; });
      if (!res.slips.length) { body.innerHTML = '<p class="small">Every payslip this month already has its signed copy uploaded.</p>'; return null; }
      return Promise.all(res.slips.map(function (s) { return false ? C.api('deskEmpDocGet', { id: s.signDoc }).then(function (g) { return pic(g.data); }).then(function (o) { s.signImg = o; }, function () {}) : null; })).then(function () { return [res, A, J]; });
    }).then(function (a) {
      if (!a) return;
      var res = a[0], A = a[1], J = a[2], d = new J.jsPDF({ unit: 'mm', format: 'a4' });
      d.setProperties({ title: 'Payslips ' + mName(res.month), author: CO.name, creator: CO.unit });
      res.slips.forEach(function (s, i) { if (i) d.addPage(); slipPage(d, A, s, res.month); });
      var blob = d.output('blob'), name = (emp ? res.slips[0].emp + ' ' + res.slips[0].name + ' payslip ' : 'Nikadi payslips ') + mName(res.month) + '.pdf';
      body.innerHTML = '<div class="pay-prev" id="pPrev"><div class="loading">Showing the payslip…</div></div><div class="emp-acts"><button class="btn btn-gold" type="button" id="pGet">' + (emp ? 'Download to print' : 'Download all ' + res.slips.length + ' to print') + '</button></div><p class="small">Print, have it signed in ink, then upload the signed page with “Upload signed copy”. The person can keep this PDF or a photocopy.</p>';
      preview(blob, $('#pPrev', body));
      $('#pGet', body).onclick = function () { var f = new File([blob], name, { type: 'application/pdf' });
        if (emp && navigator.canShare && navigator.canShare({ files: [f] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) { navigator.share({ files: [f], title: name }).catch(function () {}); return; }
        var u = URL.createObjectURL(f), l = document.createElement('a'); l.href = u; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 5000); };
    }, function (x) { body.innerHTML = '<p class="err">' + esc(C.errText(x)) + '</p>'; });
  }
  function preview(blob, box) {
    (new Function('u', 'return import(u)'))('/staff/vendor/pdf.min.mjs').then(function (m) {
      m.GlobalWorkerOptions.workerSrc = '/staff/vendor/pdf.worker.min.mjs';
      return blob.arrayBuffer().then(function (b) { return m.getDocument({ data: new Uint8Array(b) }).promise; }).then(function (doc) {
        box.innerHTML = ''; var ch = Promise.resolve();
        for (var i = 1; i <= Math.min(doc.numPages, 12); i++) (function (n) { ch = ch.then(function () { return doc.getPage(n).then(function (pg) { var vp = pg.getViewport({ scale: 1.6 }), c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; box.appendChild(c); return pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; }); }); })(i);
        return ch;
      });
    }).catch(function () { box.innerHTML = '<p class="small">The preview could not be shown, but the PDF is ready to download.</p>'; });
  }
  /* salary register: one row per person, for the CA (CSV opens in Excel) */
  function register() {
    var d = DATA, head = ['Payslip no.', 'Employee ID', 'Name', 'Designation', 'Monthly rate', 'Days in month', 'Unpaid days', 'Paid days', 'Basic', 'Other earnings', 'Gross', 'Profession tax', 'PF', 'ESI', 'TDS', 'Advance recovered', 'Other deduction', 'Total deductions', 'Net pay', 'Paid by', 'Paid on', 'Reference'];
    var rows = d.rows.map(function (r) { return [r.slipNo, r.emp, r.name, r.job, r.rate, r.days, r.lop, r.paidDays, r.basic, r.extra, r.gross, r.pt, r.pf, r.esi, r.tds, r.adv, r.otherDed, r.ded, r.net, r.mode, r.paidOn, r.ref]; });
    var sum = function (k) { return d.rows.reduce(function (s, r) { return s + (Number(r[k]) || 0); }, 0); };
    rows.push(['', '', 'TOTAL', '', '', '', '', '', sum('basic'), sum('extra'), sum('gross'), sum('pt'), sum('pf'), sum('esi'), sum('tds'), sum('adv'), sum('otherDed'), sum('ded'), sum('net'), '', '', '']);
    var csv = '﻿' + ['Salary register · ' + mName(d.month) + ' · ' + CO.unit + ', a unit of ' + CO.name + ' · CIN ' + CO.cin, ''].concat([head].concat(rows).map(function (r) { return r.map(function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); })).join('\r\n');
    var u = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), l = document.createElement('a'); l.href = u; l.download = 'Nikadi salary register ' + mName(d.month) + '.csv'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 5000);
    C.toast('Salary register downloaded');
  }
  window.NikadiPay = { mount: mount, reset: function () { DATA = null; }, use: function (ctx) { C = ctx; }, slips: slips, upload: upload, copy: copy, mName: mName, _words: words, _slip: slipPage, _art: art };
})();
