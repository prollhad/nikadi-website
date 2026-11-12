/* Nikadi Staff — phone app for reception and staff.
   Rooms board · check-in · items to rooms · bills and payments · check-out · cleaning · stock · team. */
(function () {
  var demo = NIKADI.demo;
  var TK = demo ? 'nk-staff-demo-token' : 'nk-staff-token', MK = demo ? 'nk-staff-demo-me' : 'nk-staff-me';
  var S = { token: nkStore(TK), me: null, st: null, tab: 'rooms', addRoom: null, addItem: null, loading: false };
  try { S.me = JSON.parse(nkStore(MK) || 'null'); } catch (e) {}
  var app = document.getElementById('app');

  var ERR = {
    wrong_pin: 'Wrong PIN. Please try again.', too_many_attempts: 'Too many wrong PINs. Wait 15 minutes and try again.',
    not_logged_in: 'Please log in again.', session_expired: 'Please log in again.', not_allowed: 'Only reception or the owner can do this.',
    room_occupied: 'This room already has a guest.', room_not_clean: 'This room has not been cleaned yet. Mark it as cleaned first.',
    room_not_occupied: 'There is no guest in this room.', name_required: 'Please enter a name.', max_guests: 'A room takes 1 to 3 guests. For 4 or more, use two rooms.',
    bad_dates: 'The check-out date must be after the check-in date.', rate_required: 'Please enter the rate per night.', invalid_amount: 'Please enter an amount in rupees.',
    method_required: 'Choose how they paid: Cash, UPI or Card.', invalid_phone: 'Please check the phone number (10 digits).', bad_qty: 'Please check the quantity.',
    bad_nights: 'Please check the number of nights.', not_in_house: 'This guest has already checked out.', bad_pin: 'The PIN must be 4 to 6 digits.',
    pin_taken: 'Someone else already uses this PIN. Choose another.', name_taken: 'That name is already used.', last_owner: 'There must always be at least one active Owner.',
    no_item: 'This item is not available.', not_tracked: 'Stock is not counted for this item.', bad_status: 'The room status has changed. Pull to refresh.',
    network: 'No internet connection. Please try again.', server_error: 'Something went wrong. Please try again.',
    not_setup: 'The staff app is not connected to the Google Sheet yet.'
  };
  function errText(c) { return ERR[c] || ERR.server_error; }

  function api(action, data) {
    var body = Object.assign({ action: action, token: S.token }, data || {});
    var p;
    if (demo) p = window.nikadiStaffDemo(action, body);
    else if (!NIKADI_API_URL) p = Promise.reject('not_setup');
    else p = fetch(NIKADI_API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' })
      .then(function (r) { return r.json(); }, function () { throw 'network'; })
      .then(function (j) { if (!j || !j.ok) throw (j && j.error) || 'server_error'; return j; });
    return p.catch(function (e) {
      e = typeof e === 'string' ? e : 'server_error';
      if ((e === 'not_logged_in' || e === 'session_expired') && action !== 'deskLogin') { logout(true); }
      throw e;
    });
  }

  /* ---------- helpers ---------- */
  var esc = nkEsc, inr = nkInr;
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function dShort(ymd) { if (!ymd) return ''; var p = String(ymd).slice(0, 10).split('-'); return (+p[2]) + ' ' + MON[+p[1] - 1]; }
  function tShort(st) {
    if (!st) return ''; var t = String(st).slice(11, 16).split(':'), h = +t[0];
    var day = String(st).slice(0, 10) === (S.st && S.st.today) ? 'Today' : dShort(st);
    return day + ', ' + ((h % 12) || 12) + ':' + t[1] + (h < 12 ? ' AM' : ' PM');
  }
  function addDays(ymd, n) { var p = ymd.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)).toISOString().slice(0, 10); }
  function nights(a, b) { var x = Date.parse(a + 'T00:00:00Z'), y = Date.parse(b + 'T00:00:00Z'); return Math.round((y - x) / 864e5); }
  function mgr() { return S.me && (S.me.role === 'Owner' || S.me.role === 'Manager'); }
  function owner() { return S.me && S.me.role === 'Owner'; }
  function kind(r) { return r.status === 'Needs cleaning' ? 'dirty' : r.status === 'Occupied' ? (r.stay && r.stay.leavesToday ? 'out' : 'occ') : 'ready'; }
  var KLABEL = { ready: 'Ready', occ: 'Occupied', out: 'Leaves today', dirty: 'Needs cleaning' };
  function roomOf(n) { return (S.st.rooms || []).filter(function (r) { return Number(r.room) === Number(n); })[0]; }
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast fade'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }
  function busy(btn, on) { if (btn) { btn.classList.toggle('busy', on); btn.disabled = on; } }
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return [].slice.call((el || document).querySelectorAll(sel)); }
  function vibrate() { try { navigator.vibrate && navigator.vibrate(30); } catch (e) {} }

  /* ---------- login ---------- */
  function renderLogin(msg) {
    closeAllSheets();
    var pin = '';
    app.innerHTML = (demo ? '<div class="demo-flag">Demo mode · sample data · PINs 1111 owner · 2222 reception · 3333 staff</div>' : '') +
      '<div class="login"><div class="brand"><b>NIKADI</b><span>Staff</span></div>' +
      '<p class="sub" id="lp">' + esc(msg || 'Enter your PIN') + '</p><div class="dots" id="dots"></div>' +
      '<div class="pad3" id="pad">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<button type="button" data-k="' + n + '">' + n + '</button>'; }).join('') +
      '<button type="button" class="ghost" data-k="c">Clear</button><button type="button" data-k="0">0</button><button type="button" class="ghost" data-k="go">Enter</button></div>' +
      (!demo && !NIKADI_API_URL ? '<div class="note" style="max-width:340px"><b>Not connected yet</b>The staff app needs its Google Sheet. Until then you can <a href="?demo=1">try the demo</a>.</div>' : '') +
      (demo ? '<p class="small"><a href="./">Leave demo</a> · <button type="button" class="refresh" id="reset">Reset demo data</button></p>' : '') + '</div>';
    function dots() { $('#dots').innerHTML = pin.split('').map(function () { return '<i class="on"></i>'; }).join('') + (pin.length < 4 ? new Array(5 - pin.length).join('<i></i>') : ''); }
    dots();
    function go() {
      if (pin.length < 4) return;
      $('#lp').textContent = 'Checking…';
      api('deskLogin', { pin: pin }).then(function (r) {
        S.token = r.token; S.me = r.me; nkStore(TK, r.token); nkStore(MK, JSON.stringify(r.me)); S.tab = 'rooms'; start();
      }, function (e) { pin = ''; dots(); $('#lp').textContent = errText(e); var d = $('#dots'); d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); vibrate(); });
    }
    $('#pad').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var k = b.dataset.k;
      if (k === 'c') pin = ''; else if (k === 'go') return go(); else if (pin.length < 6) pin += k;
      dots(); if (pin.length === 6) go();
    });
    document.onkeydown = function (e) {
      if (S.token) return;
      if (/^\d$/.test(e.key) && pin.length < 6) { pin += e.key; dots(); if (pin.length === 6) go(); }
      else if (e.key === 'Backspace') { pin = pin.slice(0, -1); dots(); }
      else if (e.key === 'Enter') go();
    };
    var rs = $('#reset'); if (rs) rs.onclick = function () { window.nikadiStaffDemoReset(); toast('Demo data reset'); };
  }

  function logout(expired) {
    if (!expired && S.token) api('deskLogout').catch(function () {});
    S.token = null; S.me = null; S.st = null; nkStore(TK, null); nkStore(MK, null);
    renderLogin(expired ? 'Please log in again' : 'Logged out');
  }

  /* ---------- shell ---------- */
  var ICON = {
    rooms: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/></svg>',
    add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',
    stock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>',
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>'
  };
  function tabsFor() { return mgr() ? [['rooms', 'Rooms'], ['add', 'Add item'], ['stock', 'Stock'], ['today', 'Today']] : [['rooms', 'Rooms'], ['add', 'Add item'], ['stock', 'Stock']]; }

  function start() {
    document.onkeydown = null;
    app.innerHTML = '<div class="shell">' + (demo ? '<div class="demo-flag">Demo mode · sample data on this phone only</div>' : '') +
      '<header class="bar pad"><a class="brand" href="./"><b>NIKADI</b><span>Staff</span></a><div class="who"><div class="chip-me"><b>' + esc(S.me.name) + '</b>' + esc(S.me.role) + '</div>' +
      '<button class="iconbtn" id="out" type="button">Log out</button></div></header>' +
      '<main class="pad view" id="view"><div class="loading">Loading…</div></main>' +
      '<nav class="tabs ' + (mgr() ? 't4' : 't3') + '" role="tablist">' + tabsFor().map(function (t) {
        return '<button class="tab" role="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + ICON[t[0]] + t[1] + '</button>';
      }).join('') + '</nav></div>';
    $('#out').onclick = function () { logout(false); };
    $$('.tab').forEach(function (b) { b.onclick = function () { S.tab = b.dataset.tab; $$('.tab').forEach(function (x) { x.setAttribute('aria-selected', x === b); }); render(); window.scrollTo(0, 0); }; });
    refresh();
  }

  function refresh(btn) {
    if (S.loading) return Promise.resolve();
    S.loading = true; busy(btn, true);
    return api('deskState').then(function (st) {
      S.st = st; S.me = st.me; nkStore(MK, JSON.stringify(st.me)); render();
    }, function (e) {
      if (S.token) { var v = $('#view'); if (v && !S.st) v.innerHTML = '<div class="note"><b>Could not load</b>' + esc(errText(e)) + '</div>'; else toast(errText(e)); }
    }).then(function () { S.loading = false; busy(btn, false); });
  }

  function render() {
    var v = $('#view'); if (!v || !S.st) return;
    ({ rooms: viewRooms, add: viewAdd, stock: viewStock, today: viewToday }[S.tab] || viewRooms)(v);
  }

  /* auto refresh every 30 s while the app is open and no form is open */
  setInterval(function () {
    if (S.token && !document.hidden && !document.querySelector('.sheet') && (S.tab === 'rooms' || S.tab === 'today' || S.tab === 'stock')) refresh();
  }, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.token && S.st && !document.querySelector('.sheet')) refresh(); });

  /* ---------- Rooms tab ---------- */
  function viewRooms(v) {
    var rooms = S.st.rooms, c = { ready: 0, occ: 0, out: 0, dirty: 0 };
    rooms.forEach(function (r) { c[kind(r)]++; });
    v.innerHTML = '<div class="hrow"><div><p class="kicker">' + esc(dShort(S.st.today)) + ' · ' + rooms.length + ' rooms</p><h1>Rooms</h1></div>' +
      '<div class="upd">Updated ' + esc(tShort(S.st.now).split(', ')[1] || '') + '<button class="refresh" id="rf" type="button">Refresh</button></div></div>' +
      '<div class="counts"><div class="count c-ready"><b>' + c.ready + '</b><span>Ready</span></div><div class="count c-occ"><b>' + (c.occ + c.out) + '</b><span>Occupied</span></div>' +
      '<div class="count c-out"><b>' + c.out + '</b><span>Leave today</span></div><div class="count c-dirty"><b>' + c.dirty + '</b><span>To clean</span></div></div>' +
      '<div class="board">' + rooms.map(function (r) {
        var k = kind(r), s = r.stay;
        var g = s ? esc(s.guest) + '<small>' + s.guests + (s.guests > 1 ? ' guests' : ' guest') + ' · till ' + esc(dShort(s.checkout)) + '</small>'
          : k === 'dirty' ? '<small>' + esc(r.by ? 'Since ' + tShort(r.updated) : 'Clean before next guest') + '</small>' : '<small>' + esc(r.beds) + '</small>';
        var bal = mgr() && s && s.balance > 0 ? '<span class="bal">' + inr(s.balance) + ' due</span>' : '';
        return '<button type="button" class="tile k-' + k + '" data-room="' + r.room + '" aria-label="Room ' + r.room + ', ' + KLABEL[k] + '">' +
          '<span class="n">' + r.room + '</span><span class="ty">' + esc(r.type) + '</span><span class="g">' + g + '</span><span class="st"><span>' + KLABEL[k] + '</span>' + bal + '</span></button>';
      }).join('') + '</div>' +
      '<div class="legend"><span class="k-ready"><i></i>Ready for guests</span><span class="k-occ"><i></i>Guest staying</span><span class="k-out"><i></i>Leaves today</span><span class="k-dirty"><i></i>Needs cleaning</span></div>';
    $('#rf').onclick = function () { refresh(this); };
    $$('.tile', v).forEach(function (t) { t.onclick = function () { openRoom(Number(t.dataset.room)); }; });
  }

  /* ---------- sheets (full-screen panels) ---------- */
  var sheets = [];
  function openSheet(title, k) {
    var el = document.createElement('div'); el.className = 'sheet fade'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', title);
    el.innerHTML = '<div class="sheet-in">' + (k ? '<div class="status-band k-' + k + '"></div>' : '') + '<div class="sheet-bar"><button class="back" type="button" aria-label="Back">&#8592;</button><h2>' + esc(title) + '</h2></div><div class="sheet-body"></div></div>';
    document.body.appendChild(el); document.body.style.overflow = 'hidden';
    sheets.push(el);
    try { history.pushState({ sheet: sheets.length }, ''); } catch (e) {}
    $('.back', el).onclick = function () { history.back(); };
    return $('.sheet-body', el);
  }
  function popSheet() { var el = sheets.pop(); if (el) el.remove(); if (!sheets.length) document.body.style.overflow = ''; }
  function closeSheet() { if (sheets.length) history.back(); }
  function closeAllSheets() { while (sheets.length) popSheet(); }
  window.addEventListener('popstate', function (e) {
    var target = (e.state && e.state.sheet) || 0;
    if (sheets.length > target) { while (sheets.length > target) popSheet(); if (!sheets.length) refresh(); }
  });
  function after(n) { history.go(-Math.min(n, sheets.length)); }

  /* ---------- Room panel ---------- */
  function openRoom(n) {
    var r = roomOf(n); if (!r) return;
    var k = kind(r), body = openSheet('Room ' + r.room + ' · ' + r.type, k);
    if (r.status === 'Occupied' && r.stay) { body.innerHTML = '<div class="loading">Loading bill…</div>'; loadStay(body, r.stay.id); return; }
    if (r.status === 'Needs cleaning') {
      body.innerHTML = '<div class="note"><b>Needs cleaning</b>' + esc(r.by ? 'Marked by ' + r.by + ' · ' + tShort(r.updated) : 'Clean this room before the next guest.') + '</div>' +
        '<button class="btn btn-ok big-cta" id="cl" type="button">Mark as cleaned</button><p class="small">The room turns green and can be given to a guest.</p>';
      $('#cl', body).onclick = function () { var b = this; busy(b, true); api('deskRoomStatus', { room: r.room, status: 'Ready' }).then(function () { vibrate(); toast('Room ' + r.room + ' is ready'); closeSheet(); }, function (e) { busy(b, false); toast(errText(e)); }); };
      return;
    }
    body.innerHTML = '<div class="note"><b>Ready for guests</b>' + esc(r.beds) + (mgr() ? ' · usual rate ' + inr(r.rate) + ' per night' : '') + '</div>' +
      (mgr() ? '<button class="btn btn-gold big-cta" id="ci" type="button">Check in a guest</button>' : '') +
      '<button class="btn btn-quiet" id="dirty" type="button">Mark as needs cleaning</button>';
    if (mgr()) $('#ci', body).onclick = function () { openCheckIn(r); };
    $('#dirty', body).onclick = function () { var b = this; busy(b, true); api('deskRoomStatus', { room: r.room, status: 'Needs cleaning' }).then(function () { toast('Room ' + r.room + ' marked for cleaning'); closeSheet(); }, function (e) { busy(b, false); toast(errText(e)); }); };
  }

  function loadStay(body, id) {
    return api('deskStay', { id: id }).then(function (r) { drawStay(body, r.stay); }, function (e) { body.innerHTML = '<div class="note"><b>Could not load</b>' + esc(errText(e)) + '</div>'; });
  }

  function drawStay(body, s) {
    var m = mgr(), inHouse = s.status === 'In house';
    var h = '<div class="hrow"><div><p class="kicker">' + (inHouse ? (s.leavesToday ? 'Leaves today' : 'Staying') : 'Checked out') + '</p><h2 style="font-size:1.9rem">' + esc(s.guest) + '</h2></div></div>' +
      '<dl class="facts"><div><dt>Guests</dt><dd>' + s.guests + '</dd></div><div><dt>Nights</dt><dd>' + s.nights + '</dd></div>' +
      '<div><dt>Check-in</dt><dd>' + esc(dShort(s.checkin)) + '</dd></div><div><dt>Check-out</dt><dd>' + esc(dShort(s.checkout)) + '</dd></div>' +
      (m ? '<div><dt>Phone</dt><dd>' + (s.phone ? '<a href="tel:+91' + esc(s.phone) + '">' + esc(s.phone) + '</a>' : '—') + '</dd></div><div><dt>Checked in by</dt><dd>' + esc(s.inBy) + '</dd></div>' : '') +
      '</dl>';
    if (m && s.notes) h += '<div class="note"><b>Notes</b>' + esc(s.notes) + '</div>';
    if (m) {
      h += '<div class="bill"><h3>Bill</h3>' +
        '<div class="bl sum"><span class="t">Room · ' + s.nights + (s.nights > 1 ? ' nights' : ' night') + ' × ' + inr(s.rate) + '</span><span class="d">' + esc(s.rateNote || 'Agreed rate per night') + '</span><span class="a">' + inr(s.roomTotal) + '</span></div>' +
        s.charges.map(function (c) {
          return '<div class="bl tap" data-charge="' + esc(c.id) + '"><span class="t">' + esc(c.item) + ' × ' + c.qty + (c.free ? '<span class="free">Free</span>' : '') + '</span>' +
            '<span class="d">' + esc(tShort(c.at)) + ' · ' + esc(c.by) + (c.note ? ' · ' + esc(c.note) : '') + '</span><span class="a">' + (c.free ? '₹0' : inr(c.total)) + '</span></div>';
        }).join('') +
        '<div class="bl sum"><span class="t">Total</span><span class="d">Room ' + inr(s.roomTotal) + ' + extras ' + inr(s.extras) + '</span><span class="a">' + inr(s.roomTotal + s.extras) + '</span></div>' +
        s.payments.map(function (p) {
          return '<div class="bl paid"><span class="t">Paid · ' + esc(p.method) + '</span><span class="d">' + esc(tShort(p.at)) + ' · ' + esc(p.by) + (p.note ? ' · ' + esc(p.note) : '') + '</span><span class="a">− ' + inr(p.amount) + '</span></div>';
        }).join('') +
        '<div class="bl due"><span class="t">' + (s.balance > 0 ? 'Balance due' : s.balance < 0 ? 'Refund due to guest' : 'Fully paid') + '</span><span class="a">' + inr(Math.abs(s.balance)) + '</span></div></div>' +
        (s.charges.length ? '<p class="small">Tap an extra to change its price or remove it.</p>' : '');
      h += '<div class="btns">' + (inHouse ? '<button class="btn btn-gold" id="b-add" type="button">Add item</button>' : '') +
        '<button class="btn btn-line" id="b-pay" type="button">Take payment</button>' +
        (inHouse ? '<button class="btn btn-quiet" id="b-edit" type="button">Edit / extend</button><button class="btn btn-quiet" id="b-out" type="button">Check out</button>' : '') + '</div>';
    } else {
      h += '<div class="bill"><h3>Items given</h3>' + (s.charges.length ? s.charges.map(function (c) {
        return '<div class="bl"><span class="t">' + esc(c.item) + ' × ' + c.qty + (c.free ? '<span class="free">Free</span>' : '') + '</span><span class="d">' + esc(tShort(c.at)) + ' · ' + esc(c.by) + '</span></div>';
      }).join('') : '<div class="bl"><span class="d">Nothing added yet</span></div>') + '</div>' +
        (inHouse ? '<button class="btn btn-gold big-cta" id="b-add" type="button">Add item to this room</button>' : '');
    }
    body.innerHTML = h;
    var b;
    if ((b = $('#b-add', body))) b.onclick = function () { openAdd(s.room); };
    if ((b = $('#b-pay', body))) b.onclick = function () { openPay(s, body); };
    if ((b = $('#b-edit', body))) b.onclick = function () { openEdit(s, body); };
    if ((b = $('#b-out', body))) b.onclick = function () { openCheckOut(s, body); };
    if (m) $$('[data-charge]', body).forEach(function (row) {
      row.onclick = function () { var c = s.charges.filter(function (x) { return x.id === row.dataset.charge; })[0]; if (c) openEditCharge(c, s, body); };
    });
  }

  /* ---------- forms ---------- */
  function field(label, html, req) { return '<label class="field"><span>' + esc(label) + (req ? ' <i>*</i>' : '') + '</span>' + html + '</label>'; }
  function seg(name, opts, val) { return '<div class="seg" data-seg="' + name + '">' + opts.map(function (o) { return '<button type="button" data-v="' + esc(o) + '" aria-pressed="' + (o === val) + '">' + esc(o) + '</button>'; }).join('') + '</div>'; }
  function segVal(root, name) { var b = $('[data-seg="' + name + '"] [aria-pressed="true"]', root); return b ? b.dataset.v : ''; }
  function wireSegs(root, onchange) {
    $$('[data-seg]', root).forEach(function (sg) {
      sg.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; $$('button', sg).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); onchange && onchange(); };
    });
  }
  function stepper(id, val, min, max) { return '<div class="stepper" data-min="' + min + '" data-max="' + max + '"><button type="button" data-d="-1" aria-label="Less">−</button><output id="' + id + '">' + val + '</output><button type="button" data-d="1" aria-label="More">+</button></div>'; }
  function wireSteppers(root, onchange) {
    $$('.stepper', root).forEach(function (st) {
      st.onclick = function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var o = $('output', st), v = Number(o.textContent) + Number(b.dataset.d);
        if (v < Number(st.dataset.min) || v > Number(st.dataset.max)) { vibrate(); return; }
        o.textContent = v; onchange && onchange();
      };
    });
  }
  function submit(btn, errEl, action, data, done) {
    errEl.textContent = ''; busy(btn, true);
    api(action, data).then(function (r) { busy(btn, false); done(r); }, function (e) { busy(btn, false); errEl.textContent = errText(e); vibrate(); });
  }

  function openCheckIn(r) {
    var t = S.st.today, body = openSheet('Check in · Room ' + r.room, 'ready');
    body.innerHTML = '<p class="small">' + esc(r.type + ' · ' + r.beds) + '</p>' +
      field('Guest name', '<input class="input" id="f-guest" autocomplete="off" maxlength="80">', true) +
      field('Phone (optional)', '<div class="phonewrap"><span class="cc">+91</span><input class="input" id="f-phone" inputmode="numeric" maxlength="14" autocomplete="off"></div>') +
      '<div class="field"><span>Guests in this room <i>*</i></span>' + stepper('f-guests', 2, 1, 3) + '</div>' +
      '<div class="grid2">' + field('Check-in', '<input class="input" type="date" id="f-in" value="' + t + '">', true) +
      field('Check-out', '<input class="input" type="date" id="f-out" value="' + addDays(t, 1) + '">', true) + '</div>' +
      field('Agreed rate per night (₹)', '<input class="input" id="f-rate" inputmode="numeric" value="' + r.rate + '">', true) +
      field('Rate note (negotiation)', '<input class="input" id="f-rnote" maxlength="160" placeholder="e.g. Agreed ₹4,000 instead of ₹5,000">') +
      '<div class="calc" id="calc"></div>' +
      field('Advance paid now (₹)', '<input class="input" id="f-adv" inputmode="numeric" placeholder="0">') +
      '<div class="field"><span>Paid by</span>' + seg('method', S.st.methods, 'Cash') + '</div>' +
      field('Notes', '<textarea class="input" id="f-notes" rows="2" maxlength="300" placeholder="Arrival time, special requests…"></textarea>') +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">Check in</button>';
    function calc() {
      var n = nights($('#f-in', body).value, $('#f-out', body).value), rate = Number($('#f-rate', body).value.replace(/\D/g, '')) || 0;
      $('#calc', body).innerHTML = n > 0 ? n + (n > 1 ? ' nights' : ' night') + ' × ' + inr(rate) + ' = <b>' + inr(n * rate) + '</b>' : 'Check-out must be after check-in';
    }
    ['#f-in', '#f-out', '#f-rate'].forEach(function (s) { $(s, body).addEventListener('input', calc); });
    wireSegs(body); wireSteppers(body); calc();
    $('#go', body).onclick = function () {
      submit(this, $('#err', body), 'deskCheckIn', {
        room: r.room, guest: $('#f-guest', body).value, phone: $('#f-phone', body).value, guests: Number($('#f-guests', body).textContent),
        checkin: $('#f-in', body).value, checkout: $('#f-out', body).value, rate: $('#f-rate', body).value.replace(/[^\d]/g, ''),
        rateNote: $('#f-rnote', body).value, advance: $('#f-adv', body).value.replace(/[^\d]/g, ''), method: segVal(body, 'method'), notes: $('#f-notes', body).value
      }, function (res) { vibrate(); toast(res.stay.guest + ' checked in to room ' + r.room); after(2); });
    };
    setTimeout(function () { $('#f-guest', body).focus(); }, 50);
  }

  function openPay(s, parentBody) {
    var body = openSheet('Take payment · Room ' + s.room);
    body.innerHTML = '<div class="calc">Balance due: <b>' + inr(Math.max(0, s.balance)) + '</b></div>' +
      field('Amount (₹)', '<input class="input" id="f-amt" inputmode="numeric" value="' + (s.balance > 0 ? s.balance : '') + '">', true) +
      '<div class="field"><span>Paid by</span>' + seg('method', S.st.methods, 'Cash') + '</div>' +
      field('Note', '<input class="input" id="f-note" maxlength="120" placeholder="Optional">') +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">Save payment</button>';
    wireSegs(body);
    $('#go', body).onclick = function () {
      submit(this, $('#err', body), 'deskPay', { id: s.id, amount: $('#f-amt', body).value.replace(/[^\d]/g, ''), method: segVal(body, 'method'), note: $('#f-note', body).value },
        function (res) { vibrate(); toast('Payment saved'); closeSheet(); drawStay(parentBody, res.stay); });
    };
  }

  function openEdit(s, parentBody) {
    var body = openSheet('Edit stay · Room ' + s.room);
    var free = S.st.rooms.filter(function (r) { return r.status === 'Ready'; });
    body.innerHTML = field('Guest name', '<input class="input" id="f-guest" maxlength="80" value="' + esc(s.guest) + '">', true) +
      field('Phone', '<div class="phonewrap"><span class="cc">+91</span><input class="input" id="f-phone" inputmode="numeric" maxlength="14" value="' + esc(s.phone || '') + '"></div>') +
      '<div class="field"><span>Guests</span>' + stepper('f-guests', s.guests, 1, 3) + '</div>' +
      '<div class="grid2">' + field('Check-in', '<input class="input" type="date" id="f-in" value="' + esc(s.checkin) + '">') +
      field('Check-out', '<input class="input" type="date" id="f-out" value="' + esc(s.checkout) + '">') + '</div>' +
      '<div class="btns"><button class="btn btn-quiet" type="button" id="x1">+1 night</button><button class="btn btn-quiet" type="button" id="x2">+2 nights</button></div>' +
      field('Agreed rate per night (₹)', '<input class="input" id="f-rate" inputmode="numeric" value="' + s.rate + '">') +
      field('Rate note', '<input class="input" id="f-rnote" maxlength="160" value="' + esc(s.rateNote || '') + '">') +
      '<div class="calc" id="calc"></div>' +
      field('Move to another room', '<select class="input" id="f-room"><option value="">Stay in room ' + s.room + '</option>' + free.map(function (r) { return '<option value="' + r.room + '">Room ' + r.room + ' · ' + esc(r.type) + '</option>'; }).join('') + '</select>') +
      field('Notes', '<textarea class="input" id="f-notes" rows="2" maxlength="300">' + esc(s.notes || '') + '</textarea>') +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">Save changes</button>';
    function calc() {
      var n = nights($('#f-in', body).value, $('#f-out', body).value), rate = Number($('#f-rate', body).value.replace(/\D/g, '')) || 0;
      $('#calc', body).innerHTML = n > 0 ? n + (n > 1 ? ' nights' : ' night') + ' × ' + inr(rate) + ' = <b>' + inr(n * rate) + '</b>' : 'Check-out must be after check-in';
    }
    ['#f-in', '#f-out', '#f-rate'].forEach(function (x) { $(x, body).addEventListener('input', calc); });
    $('#x1', body).onclick = function () { $('#f-out', body).value = addDays($('#f-out', body).value, 1); calc(); };
    $('#x2', body).onclick = function () { $('#f-out', body).value = addDays($('#f-out', body).value, 2); calc(); };
    wireSteppers(body); calc();
    $('#go', body).onclick = function () {
      var d = { id: s.id, guest: $('#f-guest', body).value, phone: $('#f-phone', body).value, guests: Number($('#f-guests', body).textContent),
        checkin: $('#f-in', body).value, checkout: $('#f-out', body).value, rate: $('#f-rate', body).value.replace(/[^\d]/g, ''), rateNote: $('#f-rnote', body).value, notes: $('#f-notes', body).value };
      if ($('#f-room', body).value) d.room = Number($('#f-room', body).value);
      submit(this, $('#err', body), 'deskUpdateStay', d, function (res) {
        toast(d.room ? 'Moved to room ' + d.room + '. Room ' + s.room + ' needs cleaning.' : 'Stay updated');
        if (d.room) { after(2); return; }
        closeSheet(); drawStay(parentBody, res.stay);
      });
    };
  }

  function openCheckOut(s, parentBody) {
    var body = openSheet('Check out · Room ' + s.room, 'out');
    var n = Math.max(1, nights(s.checkin, S.st.today));
    body.innerHTML = '<div class="note"><b>' + esc(s.guest) + '</b>In since ' + esc(dShort(s.checkin)) + ' · planned check-out ' + esc(dShort(s.checkout)) + '</div>' +
      '<div class="field"><span>Nights to charge</span>' + stepper('f-n', n, 1, 365) + '</div>' +
      '<div class="bill" id="sum"></div><p class="err" id="err" role="alert"></p><div id="conf"></div>' +
      '<button class="btn btn-gold big-cta" id="go" type="button">Check out</button>' +
      '<p class="small">After check-out the room turns red until someone marks it as cleaned.</p>';
    function bal() { var nn = Number($('#f-n', body).textContent); return nn * s.rate + s.extras - s.paid; }
    function sum() {
      var nn = Number($('#f-n', body).textContent), b = bal();
      $('#sum', body).innerHTML = '<div class="bl"><span class="t">Room · ' + nn + ' × ' + inr(s.rate) + '</span><span class="a">' + inr(nn * s.rate) + '</span></div>' +
        '<div class="bl"><span class="t">Extras</span><span class="a">' + inr(s.extras) + '</span></div><div class="bl paid"><span class="t">Paid</span><span class="a">− ' + inr(s.paid) + '</span></div>' +
        '<div class="bl due"><span class="t">' + (b > 0 ? 'Collect now' : b < 0 ? 'Refund to guest' : 'Fully paid') + '</span><span class="a">' + inr(Math.abs(b)) + '</span></div>';
      $('#conf', body).innerHTML = ''; var g = $('#go', body); if (g) g.hidden = false;
    }
    wireSteppers(body, sum); sum();
    function doOut(btn) {
      submit(btn, $('#err', body), 'deskCheckOut', { id: s.id, nights: Number($('#f-n', body).textContent) }, function () { vibrate(); toast('Checked out. Room ' + s.room + ' needs cleaning.'); after(2); });
    }
    $('#go', body).onclick = function () {
      var b = bal(), btn = this;
      if (b === 0) return doOut(btn);
      $('#conf', body).innerHTML = '<div class="conf">' + (b > 0 ? inr(b) + ' is still due. Take the payment first, or check out anyway?' : 'The guest has paid ' + inr(-b) + ' more than the bill. Check out anyway?') +
        '<div class="btns">' + (b > 0 ? '<button class="btn btn-line" type="button" id="cpay">Take ' + inr(b) + '</button>' : '') + '<button class="btn btn-quiet" type="button" id="cgo">Check out anyway</button></div></div>';
      btn.hidden = true;
      var cp = $('#cpay', body);
      if (cp) cp.onclick = function () {
        var nn = Number($('#f-n', body).textContent);
        var pb = openSheet('Payment before check-out');
        pb.innerHTML = field('Amount (₹)', '<input class="input" id="p-amt" inputmode="numeric" value="' + b + '">') + '<div class="field"><span>Paid by</span>' + seg('method', S.st.methods, 'Cash') + '</div>' +
          '<p class="err" id="perr" role="alert"></p><button class="btn btn-gold big-cta" id="pgo" type="button">Save payment and check out</button>';
        wireSegs(pb);
        $('#pgo', pb).onclick = function () {
          var x = this; busy(x, true);
          api('deskPay', { id: s.id, amount: $('#p-amt', pb).value.replace(/\D/g, ''), method: segVal(pb, 'method'), note: 'At check-out' })
            .then(function () { return api('deskCheckOut', { id: s.id, nights: nn }); })
            .then(function () { vibrate(); toast('Paid and checked out. Room ' + s.room + ' needs cleaning.'); after(3); }, function (e) { busy(x, false); $('#perr', pb).textContent = errText(e); });
        };
      };
      $('#cgo', body).onclick = function () { doOut(this); };
    };
    void parentBody;
  }

  function openEditCharge(c, s, parentBody) {
    var body = openSheet(c.item + ' · Room ' + s.room);
    body.innerHTML = '<p class="small">Added ' + esc(tShort(c.at)) + ' by ' + esc(c.by) + '</p>' +
      '<div class="field"><span>Quantity</span>' + stepper('f-q', c.qty, 1, 50) + '</div>' +
      field('Price each (₹)', '<input class="input" id="f-p" inputmode="numeric" value="' + (c.free ? 0 : c.price) + '">') +
      '<label class="toggle"><span>Free (no charge)</span><input type="checkbox" id="f-free"' + (c.free ? ' checked' : '') + '></label>' +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">Save</button><button class="btn btn-danger" id="rm" type="button">Remove from bill</button>';
    wireSteppers(body);
    $('#go', body).onclick = function () {
      submit(this, $('#err', body), 'deskEditCharge', { id: c.id, qty: Number($('#f-q', body).textContent), price: $('#f-p', body).value.replace(/\D/g, '') || '0', free: $('#f-free', body).checked },
        function (r) { toast('Saved'); closeSheet(); drawStay(parentBody, r.stay); });
    };
    $('#rm', body).onclick = function () {
      var b = this;
      if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Tap again to remove'; return; }
      submit(b, $('#err', body), 'deskEditCharge', { id: c.id, remove: true }, function (r) { toast('Removed'); closeSheet(); drawStay(parentBody, r.stay); });
    };
  }

  /* ---------- Add item ---------- */
  function openAdd(roomNo) { S.addRoom = roomNo; S.tab = 'add'; closeAllSheetsQuiet(); $$('.tab').forEach(function (x) { x.setAttribute('aria-selected', x.dataset.tab === 'add'); }); render(); window.scrollTo(0, 0); }
  function closeAllSheetsQuiet() { var n = sheets.length; if (n) { try { history.go(-n); } catch (e) {} } while (sheets.length) popSheet(); }

  function viewAdd(v) {
    var occ = S.st.rooms.filter(function (r) { return r.status === 'Occupied' && r.stay; });
    if (!occ.some(function (r) { return r.room === S.addRoom; })) S.addRoom = occ.length === 1 ? occ[0].room : null;
    var items = S.st.items;
    if (!items.some(function (i) { return i.item === S.addItem; })) S.addItem = items.length ? items[0].item : null;
    v.innerHTML = '<div><p class="kicker">Goes on the room bill</p><h1 style="font-size:2rem">Add item</h1></div>' +
      (occ.length ? '<div class="field"><span class="label">1 · Room</span><div class="pick" id="rooms">' + occ.map(function (r) {
        return '<button type="button" data-room="' + r.room + '" aria-pressed="' + (r.room === S.addRoom) + '">' + r.room + '<small>' + esc(r.stay.guest.split(' ')[0]) + '</small></button>';
      }).join('') + '</div></div>' : '<div class="empty">No guests are staying right now.</div>') +
      '<div class="field"><span class="label">2 · Item</span><div class="items" id="items">' + items.map(function (i) {
        var sub = mgr() ? inr(i.price) : '';
        if (i.track) sub += (sub ? ' · ' : '') + i.stock + ' in stock';
        return '<button type="button" data-item="' + esc(i.item) + '" aria-pressed="' + (i.item === S.addItem) + '"><b>' + esc(i.item) + '</b><span>' + esc(sub || 'Tap to choose') + '</span></button>';
      }).join('') + '</div></div>' +
      '<div class="field"><span class="label">3 · How many</span>' + stepper('q', 1, 1, 50) + '</div>' +
      (mgr() ? field('Price each (₹)', '<input class="input" id="price" inputmode="numeric">') : '') +
      '<label class="toggle"><span>Free (no charge to guest)</span><input type="checkbox" id="free"></label>' +
      field('Note (optional)', '<input class="input" id="note" maxlength="120">') +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button"' + (occ.length ? '' : ' disabled') + '>Add to room</button>';
    function setPrice() { var p = $('#price', v); if (p) { var it = items.filter(function (i) { return i.item === S.addItem; })[0]; p.value = it ? it.price : ''; } }
    setPrice();
    var rr = $('#rooms', v);
    if (rr) rr.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; S.addRoom = Number(b.dataset.room); $$('button', rr).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); };
    $('#items', v).onclick = function (e) { var b = e.target.closest('button'); if (!b) return; S.addItem = b.dataset.item; $$('#items button', v).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); setPrice(); };
    wireSteppers(v);
    $('#go', v).onclick = function () {
      var err = $('#err', v);
      if (!S.addRoom) { err.textContent = 'Choose the room first.'; return; }
      var d = { room: S.addRoom, item: S.addItem, qty: Number($('#q', v).textContent), free: $('#free', v).checked, note: $('#note', v).value };
      if (mgr()) d.price = $('#price', v).value.replace(/\D/g, '');
      submit(this, err, 'deskCharge', d, function (r) {
        vibrate();
        toast(r.added.qty + ' × ' + r.added.item + ' → Room ' + r.added.room + (r.added.free ? ' (free)' : ''));
        $('#q', v).textContent = '1'; $('#free', v).checked = false; $('#note', v).value = '';
        refresh();
      });
    };
  }

  /* ---------- Stock ---------- */
  function viewStock(v) {
    var tracked = S.st.items.filter(function (i) { return i.track; });
    v.innerHTML = '<div class="hrow"><div><p class="kicker">Storage</p><h1 style="font-size:2rem">Stock</h1></div><button class="refresh" id="rf" type="button">Refresh</button></div>' +
      '<div class="stock">' + (tracked.length ? tracked.map(function (i) {
        var low = i.low > 0 && i.stock < i.low;
        return '<div class="sk' + (low ? ' low' : '') + '"><div><h3>' + esc(i.item) + '</h3><p class="small">' + (i.low ? 'Warn below ' + i.low : '') + '</p></div>' +
          '<div class="num">' + i.stock + '<small>in stock</small></div>' + (low ? '<p class="warn">Running low. Order more.</p>' : '') +
          '<div class="sk-btns"><button class="btn btn-quiet" type="button" data-mode="take" data-item="' + esc(i.item) + '">Take out</button>' +
          (mgr() ? '<button class="btn btn-line" type="button" data-mode="add" data-item="' + esc(i.item) + '">Add stock</button><button class="btn btn-quiet" type="button" data-mode="count" data-item="' + esc(i.item) + '">Set count</button>' : '') +
          '</div></div>';
      }).join('') : '<div class="empty">No items are counted yet.</div>') + '</div>' +
      '<div class="sec-h"><h2>Recent movements</h2></div><div class="list">' + (S.st.stocklog.length ? S.st.stocklog.map(function (l) {
        return '<div class="bl"><span class="t">' + esc(l.item) + ' <span class="' + (l.change > 0 ? 'chg-plus' : 'chg-minus') + '">' + (l.change > 0 ? '+' : '') + l.change + '</span></span>' +
          '<span class="d">' + esc(tShort(l.at)) + ' · ' + esc(l.by) + ' · ' + esc(l.reason) + (l.room ? ' · Room ' + esc(l.room) : '') + '</span><span class="a">' + l.left + ' left</span></div>';
      }).join('') : '<div class="bl"><span class="d">Nothing yet</span></div>') + '</div>' +
      '<p class="small">Items added to a room are taken from stock automatically.</p>';
    $('#rf', v).onclick = function () { refresh(this); };
    $$('[data-mode]', v).forEach(function (b) { b.onclick = function () { openStock(b.dataset.item, b.dataset.mode); }; });
  }

  function openStock(itemName, mode) {
    var it = S.st.items.filter(function (i) { return i.item === itemName; })[0];
    var title = { take: 'Take out', add: 'Add stock', count: 'Set count' }[mode];
    var body = openSheet(title + ' · ' + itemName);
    var occ = S.st.rooms.filter(function (r) { return r.status !== 'Occupied'; });
    body.innerHTML = '<div class="calc">In stock now: <b>' + it.stock + '</b></div>' +
      (mode === 'count' ? field('Counted in storage', '<input class="input" id="f-q" inputmode="numeric" value="' + it.stock + '">', true)
        : field(mode === 'add' ? 'How many arrived' : 'How many', '<input class="input" id="f-q" inputmode="numeric" value="' + (mode === 'add' ? '' : 1) + '">', true)) +
      (mode === 'take' ? field('For', '<select class="input" id="f-room"><option value="">General use</option>' + occ.map(function (r) { return '<option value="' + r.room + '">Setting up room ' + r.room + '</option>'; }).join('') + '</select>') +
        '<p class="small">To give items to a guest, use Add item instead, so it goes on their bill.</p>' : '') +
      field('Note', '<input class="input" id="f-note" maxlength="80" placeholder="' + (mode === 'add' ? 'e.g. Delivery from supplier' : 'Optional') + '">') +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">Save</button>';
    $('#go', body).onclick = function () {
      var rm = $('#f-room', body);
      submit(this, $('#err', body), 'deskStock', { item: itemName, mode: mode, qty: $('#f-q', body).value.replace(/\D/g, ''), note: $('#f-note', body).value || (rm && rm.value ? 'Room setup' : ''), room: rm ? rm.value : '' },
        function (r) { toast(itemName + ': ' + r.stock + ' in stock'); closeSheet(); });
    };
  }

  /* ---------- Today (owner + reception) ---------- */
  function viewToday(v) {
    if (!mgr()) { S.tab = 'rooms'; return render(); }
    var st = S.st, sm = st.summary;
    var inHouse = st.rooms.filter(function (r) { return r.stay; });
    var leaving = inHouse.filter(function (r) { return r.stay.leavesToday; });
    var dirty = st.rooms.filter(function (r) { return r.status === 'Needs cleaning'; });
    function row(r) { return '<div class="bl tap" data-room="' + r.room + '"><span class="t">Room ' + r.room + ' · ' + esc(r.stay.guest) + '</span><span class="d">' + r.stay.guests + ' guests · ' + esc(dShort(r.stay.checkin)) + ' to ' + esc(dShort(r.stay.checkout)) + '</span><span class="a">' + (r.stay.balance > 0 ? inr(r.stay.balance) + ' due' : 'Paid') + '</span></div>'; }
    v.innerHTML = '<div class="hrow"><div><p class="kicker">' + esc(dShort(st.today)) + '</p><h1 style="font-size:2rem">Today</h1></div><button class="refresh" id="rf" type="button">Refresh</button></div>' +
      '<div class="money"><div class="mtile"><span>Collected today</span><b>' + inr(sm.collected) + '</b><small>' + st.methods.map(function (m) { return m + ' ' + inr(sm.byMethod[m] || 0); }).join(' · ') + '</small></div>' +
      '<div class="mtile"><span>Still due (in house)</span><b>' + inr(sm.outstanding) + '</b><small>' + inHouse.length + ' rooms · ' + sm.guests + ' guests</small></div></div>' +
      '<div class="counts"><div class="count c-occ"><b>' + inHouse.length + '/' + st.rooms.length + '</b><span>Occupied</span></div><div class="count c-out"><b>' + leaving.length + '</b><span>Leave today</span></div>' +
      '<div class="count c-dirty"><b>' + dirty.length + '</b><span>To clean</span></div><div class="count c-ready"><b>' + (st.rooms.length - inHouse.length - dirty.length) + '</b><span>Ready</span></div></div>' +
      (leaving.length ? '<div class="sec-h"><h2>Leaving today</h2></div><div class="list">' + leaving.map(row).join('') + '</div>' : '') +
      '<div class="sec-h"><h2>Staying now</h2></div><div class="list">' + (inHouse.length ? inHouse.filter(function (r) { return !r.stay.leavesToday; }).map(row).join('') || '<div class="bl"><span class="d">Everyone staying leaves today</span></div>' : '<div class="bl"><span class="d">No guests</span></div>') + '</div>' +
      '<div class="sec-h"><h2>Recent check-outs</h2></div><div class="list">' + (st.recent.length ? st.recent.map(function (s) {
        return '<div class="bl tap" data-stay="' + esc(s.id) + '"><span class="t">Room ' + s.room + ' · ' + esc(s.guest) + '</span><span class="d">' + esc(dShort(s.checkin)) + ' to ' + esc(dShort(s.checkout)) + ' · bill ' + inr(s.roomTotal + s.extras) + '</span><span class="a">' + (s.balance > 0 ? inr(s.balance) + ' due' : s.balance < 0 ? inr(-s.balance) + ' refund' : 'Settled') + '</span></div>';
      }).join('') : '<div class="bl"><span class="d">None yet</span></div>') + '</div>' +
      (owner() ? '<div class="btns"><button class="btn btn-line" type="button" id="team">Team & PINs</button><button class="btn btn-line" type="button" id="prices">Items & prices</button></div>' : '') +
      '<p class="small">Every entry is saved in the Google Sheet with the name of the person who made it.</p>';
    $('#rf', v).onclick = function () { refresh(this); };
    $$('[data-room]', v).forEach(function (b) { b.onclick = function () { openRoom(Number(b.dataset.room)); }; });
    $$('[data-stay]', v).forEach(function (b) { b.onclick = function () { var body = openSheet('Past stay'); body.innerHTML = '<div class="loading">Loading…</div>'; loadStay(body, b.dataset.stay); }; });
    if (owner()) { $('#team', v).onclick = openTeam; $('#prices', v).onclick = openPrices; }
  }

  function openTeam() {
    var body = openSheet('Team & PINs');
    body.innerHTML = '<div class="loading">Loading…</div>';
    function draw(team) {
      body.innerHTML = '<p class="small">Owner sees everything and manages the team. Manager (reception) sees bills and money. Staff see rooms, add items and mark cleaning, without any money.</p>' +
        '<div class="list">' + team.map(function (p, i) {
          return '<div class="bl tap" data-i="' + i + '"><span class="t">' + esc(p.name) + (p.active ? '' : ' · <span class="small">inactive</span>') + '</span><span class="d">' + esc(p.role) + ' · PIN ' + esc(p.pin) + '</span><span class="a">Edit</span></div>';
        }).join('') + '</div><button class="btn btn-gold" type="button" id="add">Add a person</button>';
      $$('[data-i]', body).forEach(function (b) { b.onclick = function () { editPerson(team[Number(b.dataset.i)]); }; });
      $('#add', body).onclick = function () { editPerson(null); };
    }
    function editPerson(p) {
      var b2 = openSheet(p ? 'Edit ' + p.name : 'Add a person');
      b2.innerHTML = field('Name', '<input class="input" id="t-name" maxlength="40" value="' + esc(p ? p.name : '') + '">', true) +
        field('PIN (4–6 digits)', '<input class="input" id="t-pin" inputmode="numeric" maxlength="6" value="' + esc(p ? p.pin : '') + '">', true) +
        '<div class="field"><span>Role</span>' + seg('role', ['Owner', 'Manager', 'Staff'], p ? p.role : 'Staff') + '</div>' +
        '<label class="toggle"><span>Active (can log in)</span><input type="checkbox" id="t-act"' + (!p || p.active ? ' checked' : '') + '></label>' +
        '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">Save</button>';
      wireSegs(b2);
      $('#go', b2).onclick = function () {
        submit(this, $('#err', b2), 'deskTeamSave', { original: p ? p.name : '', name: $('#t-name', b2).value, pin: $('#t-pin', b2).value, role: segVal(b2, 'role'), active: $('#t-act', b2).checked },
          function (r) { toast('Saved'); closeSheet(); draw(r.team); });
      };
    }
    api('deskTeam').then(function (r) { draw(r.team); }, function (e) { body.innerHTML = '<div class="note">' + esc(errText(e)) + '</div>'; });
  }

  function openPrices() {
    var body = openSheet('Items & prices');
    function draw() {
      body.innerHTML = '<div class="list">' + S.st.items.map(function (i, k) {
        return '<div class="bl tap" data-k="' + k + '"><span class="t">' + esc(i.item) + '</span><span class="d">' + (i.track ? 'Stock counted · warn below ' + i.low : 'Not counted in stock') + '</span><span class="a">' + inr(i.price) + '</span></div>';
      }).join('') + '</div><button class="btn btn-gold" type="button" id="add">Add an item</button><p class="small">Laundry and other services can be added here later.</p>';
      $$('[data-k]', body).forEach(function (b) { b.onclick = function () { editItem(S.st.items[Number(b.dataset.k)]); }; });
      $('#add', body).onclick = function () { editItem(null); };
    }
    function editItem(it) {
      var b2 = openSheet(it ? it.item : 'Add an item');
      b2.innerHTML = field('Item name', '<input class="input" id="i-name" maxlength="40" value="' + esc(it ? it.item : '') + '">', true) +
        field('Price (₹)', '<input class="input" id="i-price" inputmode="numeric" value="' + (it ? it.price : '') + '">', true) +
        '<label class="toggle"><span>Count this item in stock</span><input type="checkbox" id="i-track"' + (it && it.track ? ' checked' : '') + '></label>' +
        field('Warn when stock is below', '<input class="input" id="i-low" inputmode="numeric" value="' + (it ? it.low : 0) + '">') +
        (it ? '<label class="toggle"><span>Show this item</span><input type="checkbox" id="i-act" checked></label>' : '') +
        '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">Save</button>';
      $('#go', b2).onclick = function () {
        var act = $('#i-act', b2);
        submit(this, $('#err', b2), 'deskItemSave', { original: it ? it.item : '', item: $('#i-name', b2).value, price: $('#i-price', b2).value.replace(/\D/g, ''),
          track: $('#i-track', b2).checked, low: $('#i-low', b2).value.replace(/\D/g, ''), active: act ? act.checked : true },
          function () { toast('Saved'); closeSheet(); refresh().then(draw); });
      };
    }
    draw();
  }

  /* ---------- boot ---------- */
  if (S.token && S.me) start(); else renderLogin();
})();
