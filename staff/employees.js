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
      '<div class="panel"><div class="sec-h"><h2>Personal</h2></div>' + row('Phone', e.phone) + row('Email', e.email) + row('Date of birth', dLong(e.dob)) + row('Gender', e.gender) + row('Blood group', e.blood) + row("Father's / husband's name", e.father) + row('Home address', e.address) + row('Emergency contact', [e.emName + (e.emRel ? ' (' + e.emRel + ')' : ''), e.emPhone].filter(Boolean).join(' · ')) + '</div>' +
      '<div class="panel"><div class="sec-h"><h2>Salary account</h2></div>' + (e.accNo || e.upi ? row('Account holder', e.accName) + row('Bank', [e.bank, e.branch].filter(Boolean).join(', ')) + row('Account no.', mask(e.accNo)) + row('IFSC', e.ifsc) + row('UPI', e.upi) : '<p class="small">Not added yet.</p>') + '</div>' +
      '<div class="panel"><div class="sec-h"><h2>ID numbers</h2></div>' + (e.aadhaar || e.pan || e.voter || e.uan || e.esic ? row('Aadhaar', mask(e.aadhaar)) + row('PAN', mask(e.pan)) + row('Voter ID', e.voter) + row('PF UAN', e.uan) + row('ESI no.', e.esic) : '<p class="small">Not added yet.</p>') + '</div>' +
      (e.prevWork || e.notes ? '<div class="panel"><div class="sec-h"><h2>Previous work</h2></div>' + (e.prevWork ? '<p class="emp-pre">' + esc(e.prevWork) + '</p>' : '') + (e.notes ? '<p class="small">' + esc(e.notes) + '</p>' : '') + '</div>' : '') +
      '<div class="panel"><div class="sec-h"><h2>Documents</h2><span class="small">photo, scan or PDF · crop and turn before saving · details are read from Aadhaar, PAN, voter card and passbook</span></div><div class="emp-docs">' +
      SLOTS.map(function (s) { var d = (have[s[0]] || [])[0]; return '<div class="emp-doc">' + (d ? '<button type="button" class="emp-thumb" data-kind="' + s[0] + '" data-see="' + esc(d.id) + '" data-ph="' + esc(d.id) + '" aria-label="Open ' + esc(s[1]) + '"></button>' : '<div class="emp-thumb empty">' + esc(s[1]) + '</div>') +
        '<span>' + esc(s[1]) + '</span><label class="btn btn-quiet sm">' + (d ? 'Replace' : 'Add') + '<input type="file" accept="image/*,application/pdf" data-up="' + s[0] + '" hidden></label></div>'; }).join('') + '</div>' +
      MULTI.map(function (s) { var list = have[s[0]] || []; return '<div class="sec-h" style="margin-top:14px"><h3>' + esc(s[1]) + '</h3><label class="btn btn-quiet sm">+ Add<input type="file" accept="image/*,application/pdf" multiple data-up="' + s[0] + '" hidden></label></div>' +
        (list.length ? '<div class="list">' + list.map(function (d) { return '<div class="bl"><span class="t"><b>' + esc(d.label) + '</b><small>added ' + esc(d.at) + '</small></span><span class="a"><button class="btn btn-quiet sm" type="button" data-kind="' + s[0] + '" data-see="' + esc(d.id) + '">Open</button></span></div>'; }).join('') + '</div>' : '<p class="small">None yet.</p>'); }).join('') +
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
    $$('[data-see]', body).forEach(function (b) { b.onclick = function () { see(b.dataset.see, body, e, b.dataset.kind); }; });
    $$('[data-up]', body).forEach(function (inp) {
      inp.onchange = function () {
        var files = Array.prototype.slice.call(inp.files || []); inp.value = ''; if (!files.length) return;
        upload(body, e, inp.dataset.up, files);
      };
    });
  }
  /* kinds of document: how the picture is cut, and whether its details can be read */
  var MODE = { photo: 'photo', aadhaarF: 'card', aadhaarB: 'card', pan: 'card', voter: 'card', bank: 'page', cv: 'page', work: 'page', other: 'page' };
  var READ = { aadhaarF: 'Aadhaar card', aadhaarB: 'Aadhaar card', pan: 'PAN card', voter: 'voter card', bank: 'passbook / cheque' };
  var TITLES = { photo: 'photo', aadhaarF: 'Aadhaar card (front)', aadhaarB: 'Aadhaar card (back)', pan: 'PAN card', voter: 'voter card', bank: 'bank passbook or cheque', cv: 'CV', work: 'work paper', other: 'document' };
  function isPdf(f) { return /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name || ''); }
  function upload(body, e, kind, files, replaceId) {
    var msg = $('#epMsg', body), found = null, chain = Promise.resolve(), saved = 0;
    function save(data, page, label) { if (msg) msg.textContent = 'Saving…'; return C.api('deskEmpDocSave', { emp: e.id, kind: kind, data: data, page: page || 0, label: label || '' }).then(function () { saved++; }); }
    files.forEach(function (f) {
      chain = chain.then(function () {
        var label = kind === 'photo' || READ[kind] ? '' : String(f.name || '').replace(/\.[^.]+$/, '').slice(0, 40);
        if (MODE[kind] === 'page' && !READ[kind] && isPdf(f)) /* a CV or work papers in a PDF: every page is kept as it is */
          return NikadiID.pdfPages(f).then(function (pages) { var c2 = Promise.resolve(); pages.forEach(function (u, i) { c2 = c2.then(function () { return save(u.split(',')[1], pages.length > 1 ? i + 1 : 0, label); }); }); return c2; });
        return NikadiID.capture(f, { mode: MODE[kind], title: TITLES[kind], toast: C.toast }).then(function (r) {
          if (!r) return;
          return save(r.data, 0, label).then(function () {
            if (!READ[kind] || !window.NikadiIdRead) return;
            if (msg) msg.textContent = 'Reading the details on the ' + READ[kind] + '… (the first time takes up to a minute)';
            return NikadiIdRead.read(kind, r.out, r.src).then(function (fd) { found = fd; }, function () { found = {}; });
          });
        });
      });
    });
    chain.then(function () {
      /* "crop again" on a CV or work page: the new picture replaces the old one (single documents are replaced by the server) */
      if (replaceId && saved && MODE[kind] === 'page' && !READ[kind]) return C.api('deskEmpDocRemove', { id: replaceId });
    }).then(function () { LIST = null; return C.api('deskEmployee', { id: e.id }); }).then(function (r) {
      draw(body, r.employee); if (saved) C.toast('Saved');
      if (found) offer(body, r.employee, kind, found);
    }, function (x) { if (msg) msg.textContent = C.errText(x); else C.toast(C.errText(x)); });
  }
  /* what was read off the card: tick what to fill in */
  var FIELDS = [['name', 'Name'], ['dob', 'Date of birth'], ['gender', 'Gender'], ['father', "Father's name"], ['husband', "Husband's name"], ['address', 'Address'], ['aadhaar', 'Aadhaar number'], ['pan', 'PAN'], ['voter', 'Voter ID number'], ['accName', 'Account holder'], ['accNo', 'Account number'], ['ifsc', 'IFSC']];
  var TARGET = { husband: 'father' };
  function show(k, v) { return k === 'dob' ? dLong(v) : k === 'aadhaar' ? String(v).replace(/(\d{4})(?=\d)/g, '$1 ') : v; }
  function offer(body, e, kind, fd) {
    var rows = FIELDS.filter(function (f) { return fd[f[0]]; }), box = document.createElement('div'); box.className = 'note emp-found';
    var where = $('.emp-docs', body); if (where) where.parentNode.insertBefore(box, where); else body.prepend(box);
    if (!rows.length) {
      box.innerHTML = '<b>No details could be read from the ' + esc(READ[kind]) + '.</b><p class="small">The picture may be blurred, too small or at an angle. Try "Crop or turn it again", or type the details in Edit details' + (fd.aadhaarLast4 ? ' (the QR code says the Aadhaar number ends in ' + esc(fd.aadhaarLast4) + ')' : '') + '.</p>';
      return box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    box.innerHTML = '<b>Found on the ' + esc(READ[kind]) + '</b><span class="small"> · read from the ' + esc(fd.source || 'card') + '. Please check before filling in.</span>' +
      rows.map(function (f) { var k = f[0], cur = e[TARGET[k] || k] || '', same = String(cur).toLowerCase() === String(fd[k]).toLowerCase();
        return '<label class="emp-fd"><input type="checkbox" data-fk="' + k + '"' + (!cur ? ' checked' : '') + (same ? ' disabled' : '') + '><span><small>' + esc(f[1]) + '</small><b>' + esc(show(k, fd[k])) + '</b>' + (cur && !same ? '<em>now: ' + esc(show(TARGET[k] || k, cur)) + '</em>' : same ? '<em>already the same</em>' : '') + '</span></label>'; }).join('') +
      (fd.aadhaarLast4 && !fd.aadhaar ? '<p class="small">The QR code says the Aadhaar number ends in ' + esc(fd.aadhaarLast4) + '.' + (e.aadhaar && String(e.aadhaar).slice(-4) !== fd.aadhaarLast4 ? ' <b>The number in the profile ends differently. Please check it.</b>' : '') + '</p>' : '') +
      '<div class="emp-acts"><button class="btn btn-gold" type="button" data-fill>Fill in the ticked details</button><button class="btn btn-quiet" type="button" data-skip>Not now</button></div>';
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    $('[data-skip]', box).onclick = function () { box.remove(); };
    $('[data-fill]', box).onclick = function () {
      var b = this, req = {}, pick = $$('[data-fk]:checked', box).map(function (x) { return x.dataset.fk; }); if (!pick.length) { box.remove(); return; }
      C.busy(b, true);
      C.api('deskEmployee', { id: e.id }).then(function (r) {
        var full = r.employee; Object.keys(full).forEach(function (k) { req[k] = full[k]; });
        pick.forEach(function (k) { req[TARGET[k] || k] = fd[k]; });
        req.original = full.id; req.id = full.id; req.director = full.director;
        var bankP = pick.indexOf('ifsc') >= 0 ? fetch('https://ifsc.razorpay.com/' + fd.ifsc).then(function (x) { return x.ok ? x.json() : null; }).then(function (j) { if (j) { req.bank = j.BANK || req.bank; req.branch = [j.BRANCH, j.CITY].filter(Boolean).map(function (w) { return w.toLowerCase().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); }).join(', '); } }, function () {}) : Promise.resolve();
        return bankP.then(function () { return C.api('deskEmployeeSave', req); });
      }).then(function (r) { LIST = null; C.toast('Details filled in'); draw(body, r.employee); }, function (x) { C.busy(b, false); C.toast(C.errText(x)); });
    };
  }
  function see(id, body, e, kind) {
    var b = C.openSheet('Document'); b.innerHTML = '<div class="loading">Loading…</div>';
    photo(id).then(function (u) {
      b.innerHTML = u ? '<img class="emp-big" alt="Document" src="' + u + '"><div class="emp-acts">' + (body ? '<button class="btn btn-line" type="button" id="dCrop">Crop or turn it again</button>' : '') + (body && READ[kind] ? '<button class="btn btn-line" type="button" id="dRead">Read the details again</button>' : '') + '<button class="btn btn-quiet danger" type="button" id="dRm">Remove this document</button></div>' : '<p class="err">Could not open it.</p>';
      var cr = $('#dCrop', b); if (cr) cr.onclick = function () { fetch(u).then(function (x) { return x.blob(); }).then(function (bl) { var f = new File([bl], 'document.jpg', { type: bl.type || 'image/jpeg' }); C.closeSheet(); setTimeout(function () { upload(body, e, kind, [f], id); }, 80); }); };
      var rd = $('#dRead', b); if (rd) rd.onclick = function () { var x = this; C.busy(x, true); x.textContent = 'Reading…'; var im = new Image(); im.onload = function () { var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); NikadiIdRead.read(kind, c, c).then(function (fd) { C.closeSheet(); setTimeout(function () { offer(body, e, kind, fd); }, 80); }, function () { C.busy(x, false); x.textContent = 'Could not read it'; }); }; im.src = u; };
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
      '<h3 class="emp-fh">Personal</h3>' + F('Phone', inp('phone', 'tel', ' inputmode="tel"')) + F('Email', inp('email', 'email')) + F('Date of birth', inp('dob', 'date')) + F('Gender', '<select class="input" name="gender">' + ['', 'Male', 'Female', 'Other'].map(function (g) { return '<option value="' + g + '"' + (g === (e.gender || '') ? ' selected' : '') + '>' + (g || '—') + '</option>'; }).join('') + '</select>') +
      F('Blood group', '<select class="input" name="blood">' + BLOOD.map(function (b) { return '<option' + (b === (e.blood || '') ? ' selected' : '') + ' value="' + b + '">' + (b || '—') + '</option>'; }).join('') + '</select>') +
      F("Father's / husband's name", inp('father')) + F('Home address', '<textarea class="input" name="address" rows="2">' + esc(e.address || '') + '</textarea>') +
      F('Emergency contact name', inp('emName')) + F('Relation', pick('emRel', RELS, 'Choose the relation')) + F('Emergency contact phone', inp('emPhone', 'tel', ' inputmode="tel"')) +
      '<h3 class="emp-fh">Salary account</h3>' + F('Account holder name (as in the bank)', inp('accName')) + F('IFSC code', inp('ifsc', 'text', ' autocomplete="off" maxlength="11" style="text-transform:uppercase" placeholder="11 letters and digits, on the passbook or cheque"') + '<small class="hint" id="ifscMsg">Type the IFSC and the bank and branch fill in by themselves.</small>') +
      F('Bank', pick('bank', BANKS, 'Choose the bank')) + F('Branch', inp('branch')) + F('Account number', inp('accNo', 'text', ' inputmode="numeric" autocomplete="off"')) + F('Account number again (to check)', '<input class="input" id="accNo2" inputmode="numeric" autocomplete="off" value="' + esc(e.accNo || '') + '">') + F('UPI ID (optional)', inp('upi')) +
      '<h3 class="emp-fh">ID numbers</h3>' + F('Aadhaar number', inp('aadhaar', 'text', ' inputmode="numeric" autocomplete="off"')) + F('PAN', inp('pan', 'text', ' autocomplete="off" style="text-transform:uppercase"')) + F('Voter ID number', inp('voter', 'text', ' autocomplete="off" style="text-transform:uppercase"')) +
      F('PF UAN (if any)', inp('uan', 'text', ' inputmode="numeric"')) + F('ESI number (if any)', inp('esic', 'text', ' inputmode="numeric"')) +
      '<h3 class="emp-fh">Previous work</h3>' + F('Where they worked before, what they did, how long', '<textarea class="input" name="prevWork" rows="4" placeholder="For example: Hotel Sri Krishna, Mayapur · housekeeping · 2019–2023">' + esc(e.prevWork || '') + '</textarea>') +
      F('Notes (optional)', '<textarea class="input" name="notes" rows="2">' + esc(e.notes || '') + '</textarea>') +
      '<p class="small">Photo, Aadhaar, PAN and voter card scans, the CV and work papers are added on the profile after saving. The details on Aadhaar, PAN, voter card and passbook can then be read and filled in for you.</p>' +
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
      ['id', 'name', 'job', 'joined', 'salary', 'salaryNote', 'status', 'left', 'phone', 'email', 'dob', 'gender', 'blood', 'father', 'address', 'emName', 'emRel', 'emPhone', 'accName', 'bank', 'branch', 'accNo', 'ifsc', 'upi', 'aadhaar', 'pan', 'voter', 'uan', 'esic', 'prevWork', 'notes'].forEach(function (k) { req[k] = f.elements[k] ? f.elements[k].value.trim() : ''; });
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
  /* print resolution: the card is drawn in 1012 × 1604 design units and printed at 600 dpi (54 × 85.6 mm = 1276 × 2022 px) */
  var HD = 1276 / 1012;
  function sheet(k) { var c = document.createElement('canvas'); c.width = Math.round(CW * k); c.height = Math.round(CH * k); var x = c.getContext('2d'); x.scale(k, k); x.imageSmoothingQuality = 'high'; return { c: c, x: x }; }
  /* digital ID: the card cut to its real shape (rounded corners, 3.18 mm like a bank card), nothing outside it */
  function cutout(c) {
    var o = document.createElement('canvas'); o.width = c.width; o.height = c.height; var x = o.getContext('2d'), r = c.width * 3.18 / 54;
    rr(x, 0, 0, c.width, c.height, r); x.clip(); x.drawImage(c, 0, 0); return o;
  }
  /* bleed for a print shop: the card's edges are carried outwards so nothing white shows if the cut is a little off */
  function bleed(c, px) {
    var o = document.createElement('canvas'); o.width = c.width + px * 2; o.height = c.height + px * 2; var x = o.getContext('2d'), W = c.width, H = c.height;
    x.drawImage(c, 0, 0, W, 1, px, 0, W, px); x.drawImage(c, 0, H - 1, W, 1, px, H + px, W, px);
    x.drawImage(c, 0, 0, 1, H, 0, px, px, H); x.drawImage(c, W - 1, 0, 1, H, W + px, px, px, H);
    [[0, 0, 0, 0], [W - 1, 0, W + px, 0], [0, H - 1, 0, H + px], [W - 1, H - 1, W + px, H + px]].forEach(function (q) { x.drawImage(c, q[0], q[1], 1, 1, q[2], q[3], px, px); });
    x.drawImage(c, px, px); return o;
  }
  function img(src) { return new Promise(function (ok) { if (!src) return ok(null); var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; }); }
  function fonts() { if (!FONTS) FONTS = Promise.all(['600 80px "Cormorant Garamond"', '500 40px Jost', '400 30px Jost'].map(function (f) { return document.fonts ? document.fonts.load(f).catch(function () {}) : 0; })); return FONTS; }
  function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
  function fit(x, t, max, size, font) { var s = size; x.font = font.replace('#', s); while (x.measureText(t).width > max && s > 20) { s -= 2; x.font = font.replace('#', s); } return s; }
  function spaced(x, t, cx, y, sp) { var w = 0, i; for (i = 0; i < t.length; i++) w += x.measureText(t[i]).width + sp; w -= sp; var X = cx - w / 2; for (i = 0; i < t.length; i++) { x.fillText(t[i], X, y); X += x.measureText(t[i]).width + sp; } }
  /* Card design: deep navy with a fine gold guilloché, a double gold frame round the photo, ivory reverse.
     Cormorant Garamond for names, Jost for small capitals: the same type as the guest house website. */
  var NAVY = '#0c1430', NAVY2 = '#16224a', GOLD = '#c9a35a', GOLD_HI = '#e6c98a', GOLD_LO = '#9a7633', IVORY = '#f8f3e8', INK = '#1a2036', MUTED = '#6d7182';
  function goldGrad(x, x0, x1) { var g = x.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, GOLD_LO); g.addColorStop(.35, GOLD_HI); g.addColorStop(.6, GOLD); g.addColorStop(1, GOLD_LO); return g; }
  function guilloche(x, cy, amp, alpha) {
    x.save(); x.globalAlpha = alpha; x.strokeStyle = GOLD; x.lineWidth = 1.2;
    for (var k = 0; k < 14; k++) { x.beginPath(); for (var X = -10; X <= CW + 10; X += 6) { var t = X / CW * Math.PI * 2; var Y = cy + Math.sin(t * 3 + k * .45) * amp * (0.55 + .45 * Math.cos(t * 2 - k * .3)) + (k - 7) * 5; if (X < 0) x.moveTo(X, Y); else x.lineTo(X, Y); } x.stroke(); }
    x.restore();
  }
  function rule(x, y, w) { /* gold hairline with a small diamond in the middle */
    var cx = CW / 2; x.fillStyle = goldGrad(x, cx - w / 2, cx + w / 2); x.fillRect(cx - w / 2, y - 1, w / 2 - 16, 2); x.fillRect(cx + 16, y - 1, w / 2 - 16, 2);
    x.save(); x.translate(cx, y); x.rotate(Math.PI / 4); x.fillRect(-6, -6, 12, 12); x.restore();
  }
  function caps(x, t, cx, y, font, color, sp) { x.font = font; x.fillStyle = color; x.textAlign = 'left'; spaced(x, t, cx, y, sp); }
  function front(e, ph, logo, k) {
    var S = sheet(k || 1), c = S.c, x = S.x;
    var g = x.createRadialGradient(CW / 2, CH * .38, 80, CW / 2, CH * .45, CH * .75); g.addColorStop(0, NAVY2); g.addColorStop(1, NAVY); x.fillStyle = g; x.fillRect(0, 0, CW, CH);
    guilloche(x, 250, 70, .10); guilloche(x, CH - 330, 50, .07);
    x.strokeStyle = goldGrad(x, 0, CW); x.lineWidth = 3; rr(x, 26, 26, CW - 52, CH - 52, 30); x.stroke();
    x.globalAlpha = .35; x.lineWidth = 1; rr(x, 38, 38, CW - 76, CH - 76, 24); x.stroke(); x.globalAlpha = 1;
    if (logo) { var lw = 250, lh = lw * logo.height / logo.width; x.drawImage(logo, (CW - lw) / 2, 128, lw, lh); } /* sits just above GUEST HOUSE, as one lockup */
    caps(x, 'GUEST HOUSE', CW / 2, 342, '500 26px Jost', GOLD_HI, 12); caps(x, 'SRI DHAM MAYAPUR', CW / 2, 380, '400 19px Jost', 'rgba(255,255,255,.55)', 8);
    rule(x, 418, 300);
    var PW = 392, PH = 490, px = (CW - PW) / 2, py = 456;
    x.fillStyle = goldGrad(x, px - 14, px + PW + 14); rr(x, px - 14, py - 14, PW + 28, PH + 28, 26); x.fill();
    x.fillStyle = NAVY; rr(x, px - 8, py - 8, PW + 16, PH + 16, 21); x.fill();
    x.fillStyle = goldGrad(x, px - 4, px + PW + 4); rr(x, px - 4, py - 4, PW + 8, PH + 8, 19); x.fill();
    x.save(); rr(x, px, py, PW, PH, 16); x.clip();
    if (ph) { var k = Math.max(PW / ph.width, PH / ph.height), w = ph.width * k, h = ph.height * k; x.drawImage(ph, px + (PW - w) / 2, py + (PH - h) / 2, w, h); }
    else { x.fillStyle = '#1d2a52'; x.fillRect(px, py, PW, PH); x.fillStyle = GOLD; x.font = '600 170px "Cormorant Garamond", Georgia, serif'; x.textAlign = 'center'; x.fillText(initials(e.name), CW / 2, py + PH * .64); }
    x.restore();
    var y = py + PH + 118; x.textAlign = 'center'; x.fillStyle = '#ffffff'; fit(x, e.name, CW - 150, 82, '600 #px "Cormorant Garamond", Georgia, serif'); x.fillText(e.name, CW / 2, y);
    caps(x, String((e.director ? 'Director' : e.job) || 'Staff').toUpperCase(), CW / 2, y + 56, '500 27px Jost', GOLD_HI, 9);
    rule(x, y + 104, 420);
    /* three facts in columns */
    var cols = [['EMPLOYEE ID', e.id], ['JOINED', e.joined ? dLong(e.joined).replace(/^\d+ /, '') : '—'], ['BLOOD', e.blood || '—']], cw = (CW - 150) / 3, by = y + 176;
    cols.forEach(function (cc, i) { var cx = 75 + cw * i + cw / 2; caps(x, cc[0], cx, by, '400 18px Jost', 'rgba(255,255,255,.55)', 5); x.textAlign = 'center'; x.fillStyle = '#fff'; fit(x, cc[1], cw - 16, 31, '500 #px Jost'); x.fillText(cc[1], cx, by + 46); });
    x.fillStyle = 'rgba(201,163,90,.35)'; x.fillRect(75 + cw, by - 22, 1, 80); x.fillRect(75 + cw * 2, by - 22, 1, 80);
    caps(x, 'A UNIT OF NIKADI PROJECTS PRIVATE LIMITED', CW / 2, CH - 76, '400 17px Jost', 'rgba(230,201,138,.8)', 4);
    return c;
  }
  function back(e, sign, qr, k) {
    var S = sheet(k || 1), c = S.c, x = S.x;
    x.fillStyle = IVORY; x.fillRect(0, 0, CW, CH);
    guilloche(x, CH / 2, 120, .22);
    x.fillStyle = NAVY; x.fillRect(0, 0, CW, 210); x.fillStyle = goldGrad(x, 0, CW); x.fillRect(0, 210, CW, 4);
    x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = '600 58px "Cormorant Garamond", Georgia, serif'; x.fillText('Nikadi Guest House', CW / 2, 112);
    caps(x, 'EMPLOYEE IDENTITY CARD', CW / 2, 162, '400 21px Jost', GOLD_HI, 8);
    x.strokeStyle = goldGrad(x, 0, CW); x.lineWidth = 3; rr(x, 26, 26, CW - 52, CH - 52, 30); x.stroke();
    var bx = 110, bw = CW - 220, y = 300;
    function line(k, v, yy) { x.textAlign = 'left'; x.font = '400 19px Jost'; x.fillStyle = MUTED; spacedL(x, k, bx, yy, 4); x.textAlign = 'right'; x.fillStyle = INK; fit(x, v || '—', bw - 330, 31, '500 #px Jost'); x.fillText(v || '—', bx + bw, yy); x.fillStyle = 'rgba(26,32,54,.1)'; x.fillRect(bx, yy + 22, bw, 1.5); }
    line('NAME', e.name, y); line('EMPLOYEE ID', e.id, y + 70); line('DATE OF BIRTH', dLong(e.dob), y + 140); line('IN AN EMERGENCY', e.emName ? e.emName + (e.emRel ? ' (' + e.emRel + ')' : '') : '', y + 210); line('EMERGENCY PHONE', e.emPhone ? '+91 ' + e.emPhone.replace(/(\d{5})(\d{5})/, '$1 $2') : '', y + 280);
    if (qr) { var qs = 230, qx = bx, qy = 700; x.fillStyle = '#fff'; rr(x, qx - 12, qy - 12, qs + 24, qs + 24, 14); x.fill(); x.strokeStyle = 'rgba(201,163,90,.6)'; x.lineWidth = 2; x.stroke(); x.drawImage(qr, qx, qy, qs, qs);
      x.textAlign = 'left'; x.fillStyle = MUTED; x.font = '400 21px Jost'; ['Scan to see the', 'employee details'].forEach(function (l, i) { x.fillText(l, qx, qy + qs + 50 + i * 28); }); }
    if (sign) { var sw = 300, sh = sw * sign.height / sign.width; x.drawImage(sign, CW - 110 - sw, 900 - sh, sw, sh); }
    x.fillStyle = 'rgba(26,32,54,.45)'; x.fillRect(CW - 430, 912, 320, 1.5);
    x.textAlign = 'right'; x.fillStyle = INK; x.font = '500 25px Jost'; x.fillText('Authorised Signatory', CW - 110, 952);
    x.fillStyle = MUTED; x.font = '400 21px Jost'; x.fillText('Director', CW - 110, 984);
    x.textAlign = 'center'; x.fillStyle = MUTED; x.font = 'italic 400 25px "Cormorant Garamond", Georgia, serif';
    ['This card is the property of Nikadi Projects Private Limited.', 'It must be worn on duty, shown on request and returned', 'on leaving the job. If found, please return it to', 'the reception of Nikadi Guest House.'].forEach(function (l, i) { fit(x, l, CW - 160, 27, 'italic 400 #px "Cormorant Garamond", Georgia, serif'); x.fillText(l, CW / 2, 1100 + i * 36); });
    x.fillStyle = NAVY; x.fillRect(0, CH - 262, CW, 262); x.fillStyle = goldGrad(x, 0, CW); x.fillRect(0, CH - 262, CW, 4);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '500 23px Jost';
    ['Bhaktisiddhanta Saraswati Marg, Opp. ISKCON Gate No. 4', 'Sri Dham Mayapur, Nadia, West Bengal 741313'].forEach(function (l, i) { fit(x, l, CW - 140, 23, '500 #px Jost'); x.fillText(l, CW / 2, CH - 190 + i * 34); });
    caps(x, '+91 75011 01137   ·   NIKADIGUESTHOUSE.COM', CW / 2, CH - 98, '400 19px Jost', GOLD_HI, 3);
    x.strokeStyle = goldGrad(x, 0, CW); x.lineWidth = 3; rr(x, 26, 26, CW - 52, CH - 52, 30); x.stroke();
    return c;
  }
  function spacedL(x, t, X, y, sp) { for (var i = 0; i < t.length; i++) { x.fillText(t[i], X, y); X += x.measureText(t[i]).width + sp; } }
  function qrImage(text) {
    if (!window.NikadiQR) return Promise.resolve(null);
    try { var svg = NikadiQR.svg(text, { color: '#0c1430' }); return img('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)).then(function (i) { if (!i) return null; var c = document.createElement('canvas'); c.width = c.height = 1200; var x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(i, 0, 0, 1200, 1200); return c; }); } catch (er) { return Promise.resolve(null); }
  }
  function jspdf() { if (window.jspdf) return Promise.resolve(window.jspdf); return new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = '/staff/vendor/jspdf.umd.min.js'; s.onload = function () { ok(window.jspdf); }; s.onerror = bad; document.head.appendChild(s); }); }
  function idCard(e, phId) {
    var body = C.openSheet('ID card · ' + e.name); body.innerHTML = '<div class="loading">Drawing the card…</div>';
    Promise.all([photo(phId).then(img), img('/img/brand/nikadi-mark/NIKADI-logo-white.png'), img('/img/brand/sign.png'), fonts(), qrImage('Nikadi Guest House, a unit of Nikadi Projects Private Limited\nEmployee ' + e.id + '\n' + e.name + '\n' + ((e.director ? 'Director' : e.job) || '') + '\nTo check, call the reception: +91 75011 01137')]).then(function (a) {
      var f = front(e, a[0], a[1]), b = back(e, a[2], a[4]), name = e.id + ' ' + e.name.replace(/[^\w .-]+/g, '');
      var low = a[0] && Math.min(a[0].width, a[0].height) < 500;
      body.innerHTML = '<div class="emp-cards"><img alt="Front of the ID card" src="' + f.toDataURL('image/png') + '"><img alt="Back of the ID card" src="' + b.toDataURL('image/png') + '"></div>' +
        (a[0] ? (low ? '<p class="note" style="padding:10px 14px">The photo is small (' + a[0].width + ' × ' + a[0].height + ' px), so it may look soft on the printed card. For the best card, take a new photo in good light and add it on the profile.</p>' : '') : '<p class="note" style="padding:10px 14px">There is no photo yet. Add one on the profile and the card will use it.</p>') +
        '<div class="emp-acts"><button class="btn btn-gold" type="button" data-out="digital">DIGITAL ID</button><button class="btn btn-line" type="button" data-out="card">PDF for a PVC card printer</button><button class="btn btn-line" type="button" data-out="shop">PDF for a print shop (with bleed)</button><button class="btn btn-line" type="button" data-out="png">Front and back as pictures (PNG)</button></div>' +
        '<p class="small">All three are made at 600 dpi (1276 × 2022 pixels for the 54 × 85.6 mm card), with lossless compression (no JPEG blur), for sharp HD printing on PVC. ' +
        'Digital ID: the front and the back cut out to the card’s shape with rounded corners and nothing around them, to keep on a phone or send on WhatsApp. Card printer: exact card size, front and back as two pages, for printers like Evolis, Zebra or Fargo printing edge to edge. Print shop: 2 mm extra on every side for trimming, with corner marks. Pictures: for the card printer’s own software.</p>';
      var hd = null;
      function make() { if (!hd) hd = { f: front(e, a[0], a[1], HD), b: back(e, a[2], a[4], HD) }; return hd; }
      $$('[data-out]', body).forEach(function (btn) {
        btn.onclick = function () {
          var kind = btn.dataset.out; C.busy(btn, true);
          setTimeout(function () {
            var H = make();
            if (kind === 'digital') {
              var fc = cutout(H.f), bc = cutout(H.b);
              Promise.all([fc, bc].map(function (cv) { return new Promise(function (ok) { cv.toBlob(ok, 'image/png'); }); })).then(function (bls) {
                var files = bls.map(function (bl, i) { return new File([bl], name + ' Digital ID ' + (i ? 'back' : 'front') + '.png', { type: 'image/png' }); });
                C.busy(btn, false);
                if (navigator.canShare && navigator.canShare({ files: files }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) { navigator.share({ files: files, title: 'Digital ID · ' + e.name }).catch(function () {}); return; }
                files.forEach(function (f, i) { setTimeout(function () { var u = URL.createObjectURL(f), l = document.createElement('a'); l.href = u; l.download = f.name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); }, i * 600); });
              });
              return;
            }
            if (kind === 'png') {
              [['front', H.f], ['back', H.b]].forEach(function (p, i) { setTimeout(function () { p[1].toBlob(function (bl) { var u = URL.createObjectURL(bl), l = document.createElement('a'); l.href = u; l.download = name + ' ID card ' + p[0] + '.png'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); }, 'image/png'); }, i * 600); });
              C.busy(btn, false); return;
            }
            jspdf().then(function (J) {
              var shop = kind === 'shop', bl = shop ? 2 : 0, W = 54 + bl * 2, Hh = 85.6 + bl * 2, px = Math.round(bl / 25.4 * 600);
              var d = new J.jsPDF({ unit: 'mm', format: [W, Hh], orientation: 'portrait', compress: true });
              d.setProperties({ title: 'Employee ID card · ' + e.name, subject: e.id, creator: 'Nikadi Guest House' });
              [H.f, H.b].forEach(function (cv, i) {
                if (i) d.addPage([W, Hh], 'portrait');
                d.addImage(shop ? bleed(cv, px) : cv, 'PNG', 0, 0, W, Hh, undefined, 'FAST'); /* lossless (flate), no JPEG blur */
                if (shop) { d.setDrawColor(255, 255, 255); d.setLineWidth(.15); [[bl, 0, bl, bl * .8], [0, bl, bl * .8, bl], [W - bl, 0, W - bl, bl * .8], [W, bl, W - bl * .8, bl], [bl, Hh, bl, Hh - bl * .8], [0, Hh - bl, bl * .8, Hh - bl], [W - bl, Hh, W - bl, Hh - bl * .8], [W, Hh - bl, W - bl * .8, Hh - bl]].forEach(function (L) { d.line(L[0], L[1], L[2], L[3]); }); }
              });
              d.save(name + ' ID card' + (shop ? ' (print shop, 2 mm bleed)' : '') + '.pdf'); C.busy(btn, false);
            }, function () { C.busy(btn, false); C.toast('Could not make the PDF. Please try again.'); });
          }, 30);
        };
      });
    });
  }
  window.NikadiEmp = { mount: mount, reset: function () { LIST = null; }, _draw: { front: front, back: back, qr: qrImage, img: img, fonts: fonts } };
})();
