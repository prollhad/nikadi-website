/* Nikadi staff app: Employees (owner only).
   Profiles with photo, ID documents, bank details, previous work, and a printable employee ID card.
   Loaded by the staff app; NikadiEmp.mount(view, ctx) draws the page. */
(function () {
  var C, LIST = null, PH = {}, FONTS = null;
  var JOBS = ['Director', 'Manager', 'Front office / Receptionist', 'Housekeeping', 'Room attendant', 'Laundry', 'Security guard', 'Bell boy', 'Cook', 'Kitchen helper', 'Driver', 'Electrician / Maintenance', 'Cleaner', 'Gardener', 'Accountant', 'Office assistant'];
  var BANKS = ['State Bank of India', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank of India', 'Bank of India', 'Indian Bank', 'Central Bank of India', 'Indian Overseas Bank', 'UCO Bank', 'Bank of Maharashtra', 'Punjab & Sind Bank',
    'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'IndusInd Bank', 'Yes Bank', 'IDFC First Bank', 'IDBI Bank', 'Bandhan Bank', 'Federal Bank', 'South Indian Bank', 'Karur Vysya Bank', 'City Union Bank', 'Tamilnad Mercantile Bank',
    'Karnataka Bank', 'RBL Bank', 'DCB Bank', 'CSB Bank', 'Dhanlaxmi Bank', 'Jammu & Kashmir Bank', 'Nainital Bank',
    'AU Small Finance Bank', 'Equitas Small Finance Bank', 'Ujjivan Small Finance Bank', 'Jana Small Finance Bank', 'Suryoday Small Finance Bank', 'ESAF Small Finance Bank', 'Utkarsh Small Finance Bank', 'Capital Small Finance Bank', 'Unity Small Finance Bank', 'Shivalik Small Finance Bank',
    'West Bengal Gramin Bank', 'Paschim Banga Gramin Bank', 'Bangiya Gramin Vikash Bank', 'Uttarbanga Kshetriya Gramin Bank', 'West Bengal State Co-operative Bank', 'Nadia District Central Co-operative Bank',
    'India Post Payments Bank', 'Airtel Payments Bank', 'Paytm Payments Bank', 'Fino Payments Bank', 'Jio Payments Bank', 'NSDL Payments Bank',
    'Standard Chartered Bank', 'HSBC', 'Citibank', 'DBS Bank India', 'Deutsche Bank'];
  var RELS = ['Father', 'Mother', 'Husband', 'Wife', 'Son', 'Daughter', 'Brother', 'Sister', 'Uncle', 'Aunt', 'Friend', 'Neighbour'];
  var BLOOD = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  var COMPANY = 'Nikadi Projects Private Limited';
  var ADDR = ['Bhaktisiddhanta Saraswati Marg, Opp. ISKCON Gate No. 4', '(Namahatta Bhavan), Sri Dham Mayapur', 'Nadia, West Bengal 741313'];
  var SLOTS = [['photo', 'Photo'], ['aadhaarF', 'Aadhaar (front)'], ['aadhaarB', 'Aadhaar (back)'], ['pan', 'PAN card'], ['voter', 'Voter card'], ['bank', 'Bank passbook / cheque']];
  var MULTI = [['cv', 'CV'], ['work', 'Work history papers'], ['other', 'Other documents']];
  function esc(s) { return C.esc(s == null ? '' : String(s)); }
  function rs(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function initials(n) { return String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join(''); }
  function dLong(d) { if (!d) return ''; var p = d.split('-'); return +p[2] + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+p[1] - 1] + ' ' + p[0]; }
  function photo(docId) {
    if (!docId) return Promise.resolve('');
    if (!PH[docId]) PH[docId] = C.api('deskEmpDocGet', { id: docId }).then(function (r) { return r.data || ''; }, function () { delete PH[docId]; return ''; });
    return PH[docId];
  }
  function missing(e) {
    var have = {}; (e.docs || []).forEach(function (d) { have[d.kind] = 1; });
    var m = []; if (!have.photo) m.push('photo'); if (!have.aadhaarF) m.push('Aadhaar'); if (!have.pan) m.push('PAN'); if (!have.bank && !e.accNo) m.push('bank details');
    return m;
  }
  function load() { return C.api('deskEmployees').then(function (r) { LIST = r; return r; }); }

  /* ---------- the page ---------- */
  function mount(v, ctx) {
    C = ctx;
    if (!LIST) { v.innerHTML = '<div><p class="kicker">Owner only</p><h1>Employees</h1></div><div class="loading">Loading…</div>'; load().then(function () { if (C.alive()) C.render(); }, function (e) { C.toast(C.errText(e)); }); return; }
    var act = LIST.list.filter(function (e) { return e.status !== 'Left'; }), left = LIST.list.filter(function (e) { return e.status === 'Left'; });
    var pay = act.reduce(function (s, e) { return s + e.salary; }, 0);
    v.innerHTML = '<div class="hrow"><div><p class="kicker">Owner only · profiles, documents and ID cards</p><h1>Employees</h1></div><button class="btn btn-gold" type="button" id="empAdd">+ Add employee</button></div>' +
      '<div class="kpis"><div class="kpi"><span>Working now</span><b>' + act.length + '</b><small>' + act.filter(function (e) { return e.director; }).length + ' director' + (act.filter(function (e) { return e.director; }).length === 1 ? '' : 's') + '</small></div>' +
      '<div class="kpi"><span>Monthly salaries</span><b>' + rs(pay) + '</b><small>as set in the profiles</small></div><div class="kpi"><span>Next employee ID</span><b class="emp-idk">' + esc(LIST.next) + '</b><small>given automatically</small></div></div>' +
      (act.length ? '<div class="emp-grid">' + act.map(card).join('') + '</div>' : '<div class="panel"><p class="small">No employees yet. Tap “Add employee” to make the first profile.</p></div>') +
      (left.length ? '<details class="panel att-fold"><summary class="sec-h"><h2>Left the job</h2><span class="small">' + left.length + '</span><span class="att-ch" aria-hidden="true"></span></summary><div class="emp-grid">' + left.map(card).join('') + '</div></details>' : '') +
      '<p class="small">Only the owner can see this page. Photos and document scans are kept in your Google Drive, in the folder “Nikadi Staff Records”, one folder per person. Aadhaar, PAN and bank numbers show in full only inside the edit form.</p>';
    $('#empAdd', v).onclick = function () { edit(null); };
    $$('[data-emp]', v).forEach(function (b) { b.onclick = function () { profile(b.dataset.emp); }; });
    $$('[data-ph]', v).forEach(function (el) { photo(el.dataset.ph).then(function (u) { if (u) el.style.backgroundImage = 'url(' + u + ')', el.textContent = ''; }); });
  }
  function card(e) {
    var m = missing(e);
    return '<button type="button" class="emp-card' + (e.status === 'Left' ? ' left' : '') + '" data-emp="' + esc(e.id) + '"><span class="emp-ph"' + (e.photo ? ' data-ph="' + esc(e.photo) + '"' : '') + '>' + esc(initials(e.name)) + '</span>' +
      '<span class="emp-t"><b>' + esc(e.name) + '</b><small>' + esc(e.job || '—') + (e.director ? ' · Director' : '') + '</small><code>' + esc(e.id) + '</code></span>' +
      '<span class="emp-r"><b>' + (e.salary ? rs(e.salary) : '—') + '</b><small>' + (e.salaryNote ? esc(e.salaryNote) : 'a month') + '</small>' + (m.length && e.status !== 'Left' ? '<em class="ptag k-warn">Missing: ' + esc(m.join(', ')) + '</em>' : '') + '</span></button>';
  }

  /* ---------- one person ---------- */
  function profile(id) {
    var body = C.openSheet('Employee'); body.innerHTML = '<div class="loading">Loading…</div>';
    C.api('deskEmployee', { id: id }).then(function (r) { draw(body, r.employee); }, function (e) { body.innerHTML = '<p class="err">' + esc(C.errText(e)) + '</p>'; });
  }
  function row(k, v) { return v ? '<div class="emp-kv"><span>' + esc(k) + '</span><b>' + esc(v) + '</b></div>' : ''; }
  function mask(v) { v = String(v || ''); return v ? '•••• ' + v.slice(-4) : ''; }
  function draw(body, e) {
    var have = {}; e.docs.forEach(function (d) { (have[d.kind] = have[d.kind] || []).push(d); });
    body.innerHTML = '<div class="emp-head"><span class="emp-ph big"' + (have.photo ? ' data-ph="' + esc(have.photo[0].id) + '"' : '') + '>' + esc(initials(e.name)) + '</span><div><h3>' + esc(e.name) + '</h3><p class="small">' + esc(e.job || '') + (e.director ? ' · Director' : '') + (e.status === 'Left' ? ' · left on ' + esc(dLong(e.left)) : '') + '</p><code class="emp-id">' + esc(e.id) + '</code></div></div>' +
      '<div class="emp-acts"><button class="btn btn-gold" type="button" id="epCard">Employee ID card</button><button class="btn btn-line" type="button" id="epEdit">Edit details</button></div>' +
      '<div class="panel"><div class="sec-h"><h2>Work</h2></div>' + row('Designation', e.job) + row('Date of joining', dLong(e.joined)) + row('Monthly salary', e.salary ? rs(e.salary) + (e.salaryNote ? ' · ' + e.salaryNote : '') : e.salaryNote) + row('Status', e.status) + '</div>' +
      '<div class="panel"><div class="sec-h"><h2>Personal</h2></div>' + row('Phone', e.phone) + row('Email', e.email) + row('Date of birth', dLong(e.dob)) + row('Blood group', e.blood) + row("Father's / husband's name", e.father) + row('Home address', e.address) + row('Emergency contact', [e.emName + (e.emRel ? ' (' + e.emRel + ')' : ''), e.emPhone].filter(Boolean).join(' · ')) + '</div>' +
      '<div class="panel"><div class="sec-h"><h2>Salary account</h2></div>' + (e.accNo || e.upi ? row('Account holder', e.accName) + row('Bank', [e.bank, e.branch].filter(Boolean).join(', ')) + row('Account no.', mask(e.accNo)) + row('IFSC', e.ifsc) + row('UPI', e.upi) : '<p class="small">Not added yet.</p>') + '</div>' +
      '<div class="panel"><div class="sec-h"><h2>ID numbers</h2></div>' + (e.aadhaar || e.pan || e.voter || e.uan || e.esic ? row('Aadhaar', mask(e.aadhaar)) + row('PAN', mask(e.pan)) + row('Voter ID', e.voter) + row('PF UAN', e.uan) + row('ESI no.', e.esic) : '<p class="small">Not added yet.</p>') + '</div>' +
      (e.prevWork || e.notes ? '<div class="panel"><div class="sec-h"><h2>Previous work</h2></div>' + (e.prevWork ? '<p class="emp-pre">' + esc(e.prevWork) + '</p>' : '') + (e.notes ? '<p class="small">' + esc(e.notes) + '</p>' : '') + '</div>' : '') +
      '<div class="panel"><div class="sec-h"><h2>Documents</h2><span class="small">photo or scan; a PDF is saved page by page</span></div><div class="emp-docs">' +
      SLOTS.map(function (s) { var d = (have[s[0]] || [])[0]; return '<div class="emp-doc">' + (d ? '<button type="button" class="emp-thumb" data-see="' + esc(d.id) + '" data-ph="' + esc(d.id) + '" aria-label="Open ' + esc(s[1]) + '"></button>' : '<div class="emp-thumb empty">' + esc(s[1]) + '</div>') +
        '<span>' + esc(s[1]) + '</span><label class="btn btn-quiet sm">' + (d ? 'Replace' : 'Add') + '<input type="file" accept="image/*,application/pdf" data-up="' + s[0] + '" hidden></label></div>'; }).join('') + '</div>' +
      MULTI.map(function (s) { var list = have[s[0]] || []; return '<div class="sec-h" style="margin-top:14px"><h3>' + esc(s[1]) + '</h3><label class="btn btn-quiet sm">+ Add<input type="file" accept="image/*,application/pdf" multiple data-up="' + s[0] + '" hidden></label></div>' +
        (list.length ? '<div class="list">' + list.map(function (d) { return '<div class="bl"><span class="t"><b>' + esc(d.label) + '</b><small>added ' + esc(d.at) + '</small></span><span class="a"><button class="btn btn-quiet sm" type="button" data-see="' + esc(d.id) + '">Open</button></span></div>'; }).join('') + '</div>' : '<p class="small">None yet.</p>'); }).join('') +
      '<p class="small" id="epMsg" role="status"></p></div>' +
      '<div class="emp-acts"><button class="btn btn-quiet danger" type="button" id="epDel">Delete this profile</button></div>' +
      '<p class="small">Added ' + esc(e.added) + ' by ' + esc(e.by) + (e.edited ? ' · last change ' + esc(e.edited) : '') + '</p>';
    $$('[data-ph]', body).forEach(function (el) { photo(el.dataset.ph).then(function (u) { if (u) { el.style.backgroundImage = 'url(' + u + ')'; if (el.classList.contains('emp-ph')) el.textContent = ''; } }); });
    $('#epEdit', body).onclick = function () { C.closeSheet(); setTimeout(function () { edit(e); }, 60); };
    $('#epCard', body).onclick = function () { idCard(e, have.photo ? have.photo[0].id : ''); };
    $('#epDel', body).onclick = function () {
      var b = this; if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Tap again to delete ' + e.name + ' and all their documents'; return; }
      C.busy(b, true); C.api('deskEmployeeRemove', { id: e.id }).then(function () { C.toast('Profile deleted'); LIST = null; C.closeSheet(); C.render(); }, function (x) { C.busy(b, false); C.toast(C.errText(x)); });
    };
    $$('[data-see]', body).forEach(function (b) { b.onclick = function () { see(b.dataset.see); }; });
    $$('[data-up]', body).forEach(function (inp) {
      inp.onchange = function () {
        var files = Array.prototype.slice.call(inp.files || []); if (!files.length) return;
        var msg = $('#epMsg', body); msg.textContent = 'Saving…';
        var kind = inp.dataset.up, chain = Promise.resolve();
        files.forEach(function (f) { chain = chain.then(function () { return images(f).then(function (pages) { var c2 = Promise.resolve(); pages.forEach(function (data, i) { c2 = c2.then(function () { return C.api('deskEmpDocSave', { emp: e.id, kind: kind, data: data, page: pages.length > 1 ? i + 1 : 0, label: kind === 'photo' ? '' : f.name.replace(/\.[^.]+$/, '').slice(0, 40) }); }); }); return c2; }); }); });
        chain.then(function () { LIST = null; return C.api('deskEmployee', { id: e.id }); }).then(function (r) { draw(body, r.employee); C.toast('Saved'); }, function (x) { msg.textContent = C.errText(x); });
      };
    });
  }
  /* a photo is made smaller before upload; a PDF becomes one picture per page (up to 8 pages) */
  function images(f) {
    if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) return C.shrinkPhoto(f).then(function (p) { return [p.data]; });
    return import('/staff/vendor/pdf.min.mjs').then(function (m) {
      m.GlobalWorkerOptions.workerSrc = '/staff/vendor/pdf.worker.min.mjs';
      return f.arrayBuffer().then(function (buf) { return m.getDocument({ data: buf }).promise; }).then(function (doc) {
        var out = [], chain = Promise.resolve();
        for (var i = 1; i <= Math.min(doc.numPages, 8); i++) (function (n) { chain = chain.then(function () { return doc.getPage(n).then(function (pg) {
          var vp = pg.getViewport({ scale: 1 }), k = Math.min(2, 1600 / Math.max(vp.width, vp.height)), v2 = pg.getViewport({ scale: k }), c = document.createElement('canvas');
          c.width = Math.round(v2.width); c.height = Math.round(v2.height); var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
          return pg.render({ canvasContext: x, viewport: v2 }).promise.then(function () { out.push(c.toDataURL('image/jpeg', .78).split(',')[1]); });
        }); }); })(i);
        return chain.then(function () { return out; });
      });
    });
  }
  function see(id) {
    var b = C.openSheet('Document'); b.innerHTML = '<div class="loading">Loading…</div>';
    photo(id).then(function (u) {
      b.innerHTML = u ? '<img class="emp-big" alt="Document" src="' + u + '"><div class="emp-acts"><button class="btn btn-quiet danger" type="button" id="dRm">Remove this document</button></div>' : '<p class="err">Could not open it.</p>';
      var rm = $('#dRm', b); if (rm) rm.onclick = function () { var x = this; if (x.dataset.sure !== '1') { x.dataset.sure = '1'; x.textContent = 'Tap again to remove'; return; } C.busy(x, true); C.api('deskEmpDocRemove', { id: id }).then(function () { LIST = null; C.toast('Removed'); C.closeSheet(); setTimeout(function () { C.closeSheet(); }, 80); C.render(); }, function (e) { C.busy(x, false); C.toast(C.errText(e)); }); };
    });
  }

  /* ---------- add or edit ---------- */
  function edit(e) {
    var n = !e; e = e || { status: 'Active', joined: C.today(), director: false };
    var body = C.openSheet(n ? 'New employee' : 'Edit · ' + e.name), F = C.field;
    /* a list to choose from; "Other" opens a box to type something not in the list */
    function pick(k, opts, ph) { var v = e[k] || '', inList = !v || opts.indexOf(v) >= 0;
      return '<select class="input" data-pick="' + k + '"><option value="">' + esc(ph || 'Choose…') + '</option>' + opts.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '<option value="__other"' + (inList ? '' : ' selected') + '>Other (type it)</option></select>' +
        '<input class="input emp-other" name="' + k + '" value="' + esc(v) + '"' + (inList ? ' hidden' : '') + ' placeholder="Type it here">'; }
    function inp(k, type, extra) { return '<input class="input" name="' + k + '" type="' + (type || 'text') + '" value="' + esc(e[k] || '') + '"' + (extra || '') + '>'; }
    body.innerHTML = '<form id="empF" class="emp-form" novalidate>' +
      '<h3 class="emp-fh">Work</h3>' + F('Employee ID', inp('id', 'text', ' autocomplete="off" style="text-transform:uppercase" placeholder="' + esc(n ? LIST.next : '') + '"') + '<small class="hint">' + (n ? 'Leave empty to give the next number, ' + esc(LIST.next) + '.' : 'Change only if needed, for example before the ID cards are printed.') + '</small>') +
      F('Full name (as on Aadhaar)', inp('name', 'text', ' autocomplete="off" required'), true) +
      F('Designation', pick('job', JOBS, 'Choose the job')) +
      '<label class="toggle"><span>This person is a director of the company</span><input type="checkbox" name="director"' + (e.director ? ' checked' : '') + '></label>' +
      F('Date of joining', inp('joined', 'date')) + F('Monthly salary (₹)', inp('salary', 'number', ' inputmode="numeric" min="0" step="1"')) + F('Salary note (optional)', inp('salaryNote', 'text', ' placeholder="For example: variable, ₹50,000 or above"')) +
      F('Status', '<select class="input" name="status"><option' + (e.status !== 'Left' ? ' selected' : '') + '>Active</option><option' + (e.status === 'Left' ? ' selected' : '') + '>Left</option></select>') + F('Date of leaving', inp('left', 'date')) +
      '<h3 class="emp-fh">Personal</h3>' + F('Phone', inp('phone', 'tel', ' inputmode="tel"')) + F('Email', inp('email', 'email')) + F('Date of birth', inp('dob', 'date')) +
      F('Blood group', '<select class="input" name="blood">' + BLOOD.map(function (b) { return '<option' + (b === (e.blood || '') ? ' selected' : '') + ' value="' + b + '">' + (b || '—') + '</option>'; }).join('') + '</select>') +
      F("Father's / husband's name", inp('father')) + F('Home address', '<textarea class="input" name="address" rows="2">' + esc(e.address || '') + '</textarea>') +
      F('Emergency contact name', inp('emName')) + F('Relation', pick('emRel', RELS, 'Choose the relation')) + F('Emergency contact phone', inp('emPhone', 'tel', ' inputmode="tel"')) +
      '<h3 class="emp-fh">Salary account</h3>' + F('Account holder name (as in the bank)', inp('accName')) + F('IFSC code', inp('ifsc', 'text', ' autocomplete="off" maxlength="11" style="text-transform:uppercase" placeholder="11 letters and digits, on the passbook or cheque"') + '<small class="hint" id="ifscMsg">Type the IFSC and the bank and branch fill in by themselves.</small>') +
      F('Bank', pick('bank', BANKS, 'Choose the bank')) + F('Branch', inp('branch')) + F('Account number', inp('accNo', 'text', ' inputmode="numeric" autocomplete="off"')) + F('Account number again (to check)', '<input class="input" id="accNo2" inputmode="numeric" autocomplete="off" value="' + esc(e.accNo || '') + '">') + F('UPI ID (optional)', inp('upi')) +
      '<h3 class="emp-fh">ID numbers</h3>' + F('Aadhaar number', inp('aadhaar', 'text', ' inputmode="numeric" autocomplete="off"')) + F('PAN', inp('pan', 'text', ' autocomplete="off" style="text-transform:uppercase"')) + F('Voter ID number', inp('voter', 'text', ' autocomplete="off" style="text-transform:uppercase"')) +
      F('PF UAN (if any)', inp('uan', 'text', ' inputmode="numeric"')) + F('ESI number (if any)', inp('esic', 'text', ' inputmode="numeric"')) +
      '<h3 class="emp-fh">Previous work</h3>' + F('Where they worked before, what they did, how long', '<textarea class="input" name="prevWork" rows="4" placeholder="For example: Hotel Sri Krishna, Mayapur · housekeeping · 2019–2023">' + esc(e.prevWork || '') + '</textarea>') +
      F('Notes (optional)', '<textarea class="input" name="notes" rows="2">' + esc(e.notes || '') + '</textarea>') +
      '<p class="small">Photo, Aadhaar, PAN and voter card scans, the CV and work papers are added on the profile after saving.</p>' +
      '<p class="err" id="eErr" role="alert"></p><button class="btn btn-gold" type="submit" id="eGo">' + (n ? 'Save and add documents' : 'Save changes') + '</button></form>';
    $$('[data-pick]', body).forEach(function (sel) { var box = sel.nextElementSibling; sel.onchange = function () { if (sel.value === '__other') { box.hidden = false; box.value = ''; box.focus(); } else { box.hidden = true; box.value = sel.value; } }; });
    function setPick(k, v) { var sel = $('[data-pick="' + k + '"]', body), box = sel.nextElementSibling, has = Array.prototype.some.call(sel.options, function (o) { return o.value === v; }); sel.value = has ? v : '__other'; box.hidden = has; box.value = v; }
    /* IFSC: the bank and branch are looked up (Razorpay's free IFSC directory) */
    var ifsc = $('[name="ifsc"]', body), im = $('#ifscMsg', body), lastQ = '';
    ifsc.addEventListener('input', function () {
      var q = ifsc.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (q === lastQ) return; lastQ = q;
      if (q.length < 11) { im.textContent = 'Type the IFSC and the bank and branch fill in by themselves.'; return; }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(q)) { im.textContent = 'This does not look like an IFSC. It is 4 letters, a 0, then 6 letters or digits.'; return; }
      im.textContent = 'Looking up ' + q + '…';
      fetch('https://ifsc.razorpay.com/' + q).then(function (r) { if (r.status === 404) throw 'nf'; if (!r.ok) throw 'x'; return r.json(); }).then(function (j) {
        if (q !== lastQ) return;
        setPick('bank', j.BANK || ''); var br = [j.BRANCH, j.CITY && j.CITY !== j.BRANCH ? j.CITY : ''].filter(Boolean).map(function (w) { return w.toLowerCase().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); }).join(', ');
        $('[name="branch"]', body).value = br; im.textContent = '✓ ' + j.BANK + ' · ' + br + (j.ADDRESS ? ' · ' + j.ADDRESS : '');
      }, function (x) { if (q === lastQ) im.textContent = x === 'nf' ? 'No bank branch has this IFSC. Please check it on the passbook or cheque.' : 'Could not look it up right now. Choose the bank and type the branch.'; });
    });
    $('#empF', body).onsubmit = function (ev) {
      ev.preventDefault(); var f = this, b = $('#eGo', body), req = { original: n ? '' : e.id };
      ['id', 'name', 'job', 'joined', 'salary', 'salaryNote', 'status', 'left', 'phone', 'email', 'dob', 'blood', 'father', 'address', 'emName', 'emRel', 'emPhone', 'accName', 'bank', 'branch', 'accNo', 'ifsc', 'upi', 'aadhaar', 'pan', 'voter', 'uan', 'esic', 'prevWork', 'notes'].forEach(function (k) { req[k] = f.elements[k] ? f.elements[k].value.trim() : ''; });
      req.director = f.elements.director.checked;
      if ((req.accNo || $('#accNo2', body).value.trim()) && req.accNo.replace(/\s/g, '') !== $('#accNo2', body).value.trim().replace(/\s/g, '')) { $('#eErr', body).textContent = 'The two account numbers are not the same. Please check them.'; return; }
      if (!req.name) { $('#eErr', body).textContent = 'Please write the name.'; return; }
      C.busy(b, true); $('#eErr', body).textContent = '';
      C.api('deskEmployeeSave', req).then(function (r) { LIST = null; body.closest('.sheet').dataset.dirty = ''; C.toast('Saved'); C.closeSheet(); C.render(); setTimeout(function () { profile(r.employee.id); }, 120); },
        function (x) { C.busy(b, false); $('#eErr', body).textContent = C.errText(x); });
    };
  }

  /* ---------- employee ID card: front and back, credit-card size (54 × 85.6 mm) ---------- */
  var CW = 1012, CH = 1604;
  function img(src) { return new Promise(function (ok) { if (!src) return ok(null); var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; }); }
  function fonts() { if (!FONTS) FONTS = Promise.all(['600 80px "Cormorant Garamond"', '500 40px Jost', '400 30px Jost'].map(function (f) { return document.fonts ? document.fonts.load(f).catch(function () {}) : 0; })); return FONTS; }
  function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
  function fit(x, t, max, size, font) { var s = size; x.font = font.replace('#', s); while (x.measureText(t).width > max && s > 20) { s -= 2; x.font = font.replace('#', s); } return s; }
  function spaced(x, t, cx, y, sp) { var w = 0, i; for (i = 0; i < t.length; i++) w += x.measureText(t[i]).width + sp; w -= sp; var X = cx - w / 2; for (i = 0; i < t.length; i++) { x.fillText(t[i], X, y); X += x.measureText(t[i]).width + sp; } }
  var NAVY = '#101a36', NAVY2 = '#1b2a55', GOLD = '#c9a35a', INK = '#1c2238', MUTED = '#6b7184';
  function front(e, ph, logo) {
    var c = document.createElement('canvas'); c.width = CW; c.height = CH; var x = c.getContext('2d');
    x.fillStyle = '#fbf8f2'; x.fillRect(0, 0, CW, CH);
    var g = x.createLinearGradient(0, 0, CW, 520); g.addColorStop(0, NAVY); g.addColorStop(1, NAVY2); x.fillStyle = g;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(CW, 0); x.lineTo(CW, 470); x.quadraticCurveTo(CW / 2, 560, 0, 470); x.closePath(); x.fill();
    x.strokeStyle = GOLD; x.lineWidth = 6; x.beginPath(); x.moveTo(0, 484); x.quadraticCurveTo(CW / 2, 574, CW, 484); x.stroke();
    if (logo) { var lw = 330, lh = lw * logo.height / logo.width; x.drawImage(logo, (CW - lw) / 2, 34, lw, lh); }
    x.fillStyle = 'rgba(255,255,255,.78)'; x.font = '500 25px Jost'; x.textAlign = 'left'; spaced(x, 'EMPLOYEE IDENTITY CARD', CW / 2, 330, 6);
    var P = 380, px = (CW - P) / 2, py = 372;
    x.save(); rr(x, px - 10, py - 10, P + 20, P * 1.2 + 20, 34); x.fillStyle = GOLD; x.fill(); rr(x, px, py, P, P * 1.2, 26); x.clip();
    if (ph) { var k = Math.max(P / ph.width, P * 1.2 / ph.height), w = ph.width * k, h = ph.height * k; x.drawImage(ph, px + (P - w) / 2, py + (P * 1.2 - h) / 2, w, h); }
    else { x.fillStyle = '#e9e3d6'; x.fillRect(px, py, P, P * 1.2); x.fillStyle = '#9a8f78'; x.font = '600 150px "Cormorant Garamond"'; x.textAlign = 'center'; x.fillText(initials(e.name), CW / 2, py + P * .72); }
    x.restore();
    var y = py + P * 1.2 + 112; x.textAlign = 'center'; x.fillStyle = INK; fit(x, e.name, CW - 120, 84, '600 #px "Cormorant Garamond"'); x.fillText(e.name, CW / 2, y);
    x.fillStyle = '#a07c36'; x.font = '500 31px Jost'; x.textAlign = 'left'; spaced(x, String((e.director ? 'Director' : e.job) || 'Staff').toUpperCase(), CW / 2, y + 58, 7);
    var bx = 110, bw = CW - 220, by = y + 104; x.strokeStyle = 'rgba(28,34,56,.14)'; x.lineWidth = 2; x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + bw, by); x.stroke();
    function line(k, v, yy) { x.textAlign = 'left'; x.fillStyle = MUTED; x.font = '400 30px Jost'; x.fillText(k, bx, yy); x.textAlign = 'right'; x.fillStyle = INK; x.font = '500 32px Jost'; x.fillText(v || '—', bx + bw, yy); }
    line('Joined', dLong(e.joined), by + 62); line('Blood group', e.blood, by + 112); line('Phone', e.phone ? '+91 ' + e.phone.replace(/(\d{5})(\d{5})/, '$1 $2') : '', by + 162);
    x.fillStyle = NAVY; x.fillRect(0, CH - 150, CW, 150); x.fillStyle = GOLD; x.fillRect(0, CH - 150, CW, 5);
    x.textAlign = 'center'; x.fillStyle = 'rgba(255,255,255,.62)'; x.font = '400 24px Jost'; spaced(x, 'EMPLOYEE ID', CW / 2, CH - 98, 5);
    x.fillStyle = '#fff'; x.font = '500 44px Jost'; x.textAlign = 'left'; spaced(x, e.id, CW / 2, CH - 44, 5);
    return c;
  }
  function back(e, sign) {
    var c = document.createElement('canvas'); c.width = CW; c.height = CH; var x = c.getContext('2d');
    x.fillStyle = '#fbf8f2'; x.fillRect(0, 0, CW, CH); x.fillStyle = NAVY; x.fillRect(0, 0, CW, 150); x.fillStyle = GOLD; x.fillRect(0, 145, CW, 5);
    x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = '600 52px "Cormorant Garamond"'; x.textAlign = 'center'; x.fillText('Nikadi Guest House', CW / 2, 92);
    var y = 250; x.fillStyle = '#a07c36'; x.font = '500 26px Jost'; x.textAlign = 'left'; spaced(x, 'A UNIT OF', CW / 2, y, 6);
    x.textAlign = 'center'; x.fillStyle = INK; x.font = '600 46px "Cormorant Garamond"'; x.fillText(COMPANY, CW / 2, y + 58);
    x.fillStyle = MUTED; x.font = '400 29px Jost'; ADDR.forEach(function (l, i) { x.fillText(l, CW / 2, y + 128 + i * 42); });
    x.fillStyle = INK; x.font = '500 30px Jost'; x.fillText('+91 75011 01137  ·  nikadiguesthouse.com', CW / 2, y + 268);
    var bx = 110, bw = CW - 220; y = 640; x.strokeStyle = 'rgba(28,34,56,.14)'; x.lineWidth = 2; x.beginPath(); x.moveTo(bx, y); x.lineTo(bx + bw, y); x.stroke();
    function line(k, v, yy) { x.textAlign = 'left'; x.fillStyle = MUTED; x.font = '400 30px Jost'; x.fillText(k, bx, yy); x.textAlign = 'right'; x.fillStyle = INK; x.font = '500 32px Jost'; fit(x, v || '—', bw - 300, 32, '500 #px Jost'); x.fillText(v || '—', bx + bw, yy); }
    line('Date of birth', dLong(e.dob), y + 66); line('Emergency contact', e.emName ? e.emName + (e.emRel ? ' (' + e.emRel + ')' : '') : '', y + 118); line('Emergency phone', e.emPhone ? '+91 ' + e.emPhone : '', y + 170);
    y = 940; x.textAlign = 'center'; x.fillStyle = MUTED; x.font = '400 27px Jost';
    ['This card is the property of ' + COMPANY + '.', 'It must be shown on request and returned on', 'leaving the job. If found, please return it to', 'the reception of Nikadi Guest House.'].forEach(function (l, i) { fit(x, l, CW - 120, 27, '400 #px Jost'); x.fillText(l, CW / 2, y + i * 40); });
    if (sign) { var sw = 300, sh = sw * sign.height / sign.width; x.drawImage(sign, CW - 110 - sw, 1250 - sh, sw, sh); }
    x.strokeStyle = 'rgba(28,34,56,.35)'; x.beginPath(); x.moveTo(CW - 450, 1262); x.lineTo(CW - 110, 1262); x.stroke();
    x.textAlign = 'right'; x.fillStyle = INK; x.font = '500 27px Jost'; x.fillText('Authorised signatory', CW - 110, 1302); x.fillStyle = MUTED; x.font = '400 24px Jost'; x.fillText('Director, ' + COMPANY.replace(' Private Limited', ' Pvt Ltd'), CW - 110, 1338);
    x.fillStyle = NAVY; x.fillRect(0, CH - 110, CW, 110); x.fillStyle = GOLD; x.fillRect(0, CH - 110, CW, 5);
    x.fillStyle = '#fff'; x.font = '500 34px Jost'; x.textAlign = 'left'; spaced(x, e.id, CW / 2, CH - 44, 5);
    return c;
  }
  function jspdf() { if (window.jspdf) return Promise.resolve(window.jspdf); return new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = '/staff/vendor/jspdf.umd.min.js'; s.onload = function () { ok(window.jspdf); }; s.onerror = bad; document.head.appendChild(s); }); }
  function idCard(e, phId) {
    var body = C.openSheet('ID card · ' + e.name); body.innerHTML = '<div class="loading">Drawing the card…</div>';
    Promise.all([photo(phId).then(img), img('/img/brand/nikadi-mark/NIKADI-logo-white.png'), img('/img/brand/sign.png'), fonts()]).then(function (a) {
      var f = front(e, a[0], a[1]), b = back(e, a[2]);
      body.innerHTML = '<div class="emp-cards"><img alt="Front of the ID card" src="' + f.toDataURL('image/png') + '"><img alt="Back of the ID card" src="' + b.toDataURL('image/png') + '"></div>' +
        (a[0] ? '' : '<p class="note" style="padding:10px 14px">There is no photo yet. Add one on the profile and the card will use it.</p>') +
        '<div class="emp-acts"><button class="btn btn-gold" type="button" id="cPdf">Download PDF to print</button></div><p class="small">The PDF has the front and the back at real card size, 54 × 85.6 mm, for a PVC card printer or a print shop.</p>';
      $('#cPdf', body).onclick = function () {
        var btn = this; C.busy(btn, true);
        jspdf().then(function (J) {
          var d = new J.jsPDF({ unit: 'mm', format: [54, 85.6], orientation: 'portrait' });
          d.addImage(f.toDataURL('image/jpeg', .95), 'JPEG', 0, 0, 54, 85.6); d.addPage([54, 85.6], 'portrait'); d.addImage(b.toDataURL('image/jpeg', .95), 'JPEG', 0, 0, 54, 85.6);
          d.save(e.id + ' ' + e.name.replace(/[^\w .-]+/g, '') + ' ID card.pdf'); C.busy(btn, false);
        }, function () { C.busy(btn, false); C.toast('Could not make the PDF. Please try again.'); });
      };
    });
  }
  window.NikadiEmp = { mount: mount, reset: function () { LIST = null; }, _draw: { front: front, back: back } };
})();
