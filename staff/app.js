/* Nikadi Staff — phone app for reception and staff.
   Rooms board · check-in · items to rooms · bills and payments · check-out · cleaning · stock · team. */
(function () {
  var demo = NIKADI.demo;
  var TK = demo ? 'nk-staff-demo-token' : 'nk-staff-token', MK = demo ? 'nk-staff-demo-me' : 'nk-staff-me';
  var S = { token: nkStore(TK), me: null, st: null, tab: 'rooms', addRoom: null, addItem: null, loading: false };
  try { S.me = JSON.parse(nkStore(MK) || 'null'); } catch (e) {}
  var app = document.getElementById('app');

  var ERR = {
    bill_locked: 'This guest has checked out. Only a manager or the owner can change the bill now.', checkout_future: 'The check-out date can\'t be in the future for a guest who already left.',
    pdf_tools_failed: 'Could not make the PDF. Check the internet connection and try again.', bad_pdf: 'The PDF could not be sent. Please try again.', bad_title: 'Choose Mr., Ms., Mrs., Dr. or Name only.',
    invalid_gstin: 'That GSTIN does not look right (15 characters, like 19ABCDE1234F1Z5).', invalid_email: 'That email address does not look right.', not_checked_out: 'The guest has not checked out yet.',
    no_bill: 'Bill not found.', email_unavailable: 'Email is not set up yet.',
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
    not_setup: 'The staff app is not connected to the Google Sheet yet.',
    room_booked: 'A room you chose is already booked or occupied on those dates. Check the calendar and pick a free room.',
    phone_required: 'Please enter the guest\'s phone number.', bad_guests: 'Please check the number of guests.',
    pick_rooms: 'Choose which room numbers this booking gets.', advance_required: 'Enter the amount received. A booking is confirmed only after money is received.',
    ref_required: 'Enter the UPI or bank transaction reference number.', booking_closed: 'This booking is already closed.', no_booking: 'Booking not found.',
    not_arrival_day: 'A booking can be marked as no-show only on or after its check-in date.',
    reason_required: 'Please write the reason. The manager sees it.', refund_too_much: 'That is more than the guest has paid.',
    no_payment: 'This payment cannot be changed.', no_request: 'Request not found.', request_done: 'Someone already decided this request.',
    refund_from_room: 'The guest has checked in: refund from their room bill instead.',
    ask_manager_nights: 'Charging fewer nights than the guest stayed needs a manager. Ask the manager or owner to check this guest out.',
    too_early: 'This booking starts on a later date. If the guest came early, edit the booking dates first.', too_many_requests: 'Too many requests. Try again later.'
  };
  if ('serviceWorker' in navigator) { var hadSw = !!navigator.serviceWorker.controller, swReloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (hadSw && !swReloaded) { swReloaded = true; location.reload(); } }); } // show a new version straight away
  function errText(c) { c = c && c.message || c; return ERR[c] || (/pdf|canvas|html2canvas/i.test(String(c)) ? ERR.pdf_tools_failed : ERR.server_error); }

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
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function wd(ymd) { return WD[new Date(String(ymd).slice(0, 10) + 'T00:00:00Z').getUTCDay()]; }
  function dLong(ymd) { return ymd ? wd(ymd) + ' ' + dShort(ymd) : ''; }
  function isDesk() { return window.matchMedia('(min-width: 1000px)').matches; }
  function refField(id) { return field('Transaction / reference no. (UPI, card or bank)', '<input class="input" id="' + id + '" maxlength="40" autocomplete="off" placeholder="Needed for UPI and bank transfer">'); }
  function dShort(ymd) { if (!ymd) return ''; var p = String(ymd).slice(0, 10).split('-'); return (+p[2]) + ' ' + MON[+p[1] - 1]; }
  function tShort(st) {
    if (!st) return ''; var t = String(st).slice(11, 16).split(':'), h = +t[0];
    var day = String(st).slice(0, 10) === (S.st && S.st.today) ? 'Today' : dShort(st);
    return day + ', ' + ((h % 12) || 12) + ':' + t[1] + (h < 12 ? ' AM' : ' PM');
  }
  function addDays(ymd, n) { var p = ymd.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)).toISOString().slice(0, 10); }
  function nights(a, b) { var x = Date.parse(a + 'T00:00:00Z'), y = Date.parse(b + 'T00:00:00Z'); return Math.round((y - x) / 864e5); }
  function mgr() { return S.me && (S.me.role === 'Owner' || S.me.role === 'Manager' || S.me.role === 'Receptionist'); } // front desk, sees money
  function approver() { return S.me && (S.me.role === 'Owner' || S.me.role === 'Manager'); }
  function rcp() { return S.me && S.me.role === 'Receptionist'; }
  function reasonField(id, ph) { return field(rcp() ? 'Reason for the manager' : 'Reason', '<input class="input" id="' + id + '" maxlength="200" placeholder="' + esc(ph || 'Why is this needed?') + '">', true); }
  function approvalNote() { return rcp() ? '<div class="note gold"><b>Needs approval</b>Money already recorded can only be changed by a manager. This will be sent to the manager, and it happens once they approve it.</div>' : ''; }
  function goLabel(txt) { return rcp() ? 'Send for approval' : txt; }
  function owner() { return S.me && S.me.role === 'Owner'; }
  function kind(r) { return r.status === 'Needs cleaning' ? 'dirty' : r.status === 'Occupied' ? (r.stay && r.stay.leavesToday ? 'out' : 'occ') : r.arriving ? 'arr' : 'ready'; }
  var KLABEL = { ready: 'Ready', occ: 'Occupied', out: 'Leaves today', dirty: 'Needs cleaning', arr: 'Arriving today' };
  function roomOf(n) { return (S.st.rooms || []).filter(function (r) { return Number(r.room) === Number(n); })[0]; }
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast fade'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }
  function busy(btn, on) { if (btn) { btn.classList.toggle('busy', on); btn.disabled = on; } }
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return [].slice.call((el || document).querySelectorAll(sel)); }
  function vibrate() { try { navigator.vibrate && navigator.vibrate(30); } catch (e) {} }

  /* ---------- install as a phone app (Android: one tap; iPhone: Safari → Share → Add to Home Screen) ---------- */
  var deferredInstall = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; $$('[data-install]').forEach(installUi); });
  window.addEventListener('appinstalled', function () { deferredInstall = null; toast('Nikadi Staff is installed'); $$('[data-install]').forEach(installUi); });
  function standalone() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function installUi(el) {
    if (!el) return;
    if (standalone()) { el.innerHTML = ''; return; }
    if (deferredInstall) {
      el.innerHTML = '<button type="button" class="btn btn-line install-btn">' + ICON_DL + 'Install the app</button>';
      $('button', el).onclick = function () { var p = deferredInstall; deferredInstall = null; p.prompt(); p.userChoice.then(function () { installUi(el); }); };
    } else if (isIOS()) {
      var safari = /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);
      el.innerHTML = '<div class="install-ios"><b>Install on iPhone</b>' + (safari ? 'Tap the <span class="ios-share" aria-label="Share">' + ICON_SHARE + '</span> Share button below, then <b>Add to Home Screen</b>.' : 'Open this page in <b>Safari</b>, tap Share, then <b>Add to Home Screen</b>.') + '</div>';
    } else el.innerHTML = '';
  }
  var ICON_DL = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';
  var ICON_SHARE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M6 11H5v10h14V11h-1"/></svg>';

  /* ---------- login ---------- */
  /* Location + device, sent with log-in and log-out (attendance for reception and managers). */
  function deviceName() {
    var u = navigator.userAgent || '', os = /Windows/.test(u) ? 'Windows PC' : /Mac OS X/.test(u) && !/Mobile|iPhone|iPad/.test(u) ? 'Mac' : /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? (/Mobile/.test(u) ? 'Android phone' : 'Android tablet') : /Linux/.test(u) ? 'Linux PC' : 'Device';
    var br = /Edg\//.test(u) ? 'Edge' : /OPR\//.test(u) ? 'Opera' : /SamsungBrowser/.test(u) ? 'Samsung Internet' : /Firefox\//.test(u) ? 'Firefox' : /CriOS|Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : 'browser';
    var app = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches ? ' (installed app)' : '';
    return os + ' · ' + br + app;
  }
  function getLoc(ms) {
    return new Promise(function (ok) {
      if (!navigator.geolocation) return ok({ locErr: 'unavailable' });
      var done = false, t = setTimeout(function () { if (!done) { done = true; ok({ locErr: 'timeout' }); } }, ms || 10000);
      navigator.geolocation.getCurrentPosition(function (p) {
        if (done) return; done = true; clearTimeout(t);
        ok({ loc: { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy } });
      }, function (e) { if (done) return; done = true; clearTimeout(t); ok({ locErr: e && e.code === 1 ? 'denied' : e && e.code === 3 ? 'timeout' : 'unavailable' }); },
      { enableHighAccuracy: true, timeout: (ms || 10000) - 500, maximumAge: 0 });
    });
  }
  /* Wi-Fi attendance: each time the app is opened (and every 10 min while it is on screen) it tells the server
     which internet connection it is on. On the guest house Wi-Fi that counts as being at work. */
  function publicIp() {
    if (demo) return Promise.resolve('203.0.113.7'); // demo: pretend to be on the guest house Wi-Fi
    function get(u, json) {
      return new Promise(function (ok, bad) {
        var t = setTimeout(function () { bad('timeout'); }, 6000);
        fetch(u, { cache: 'no-store' }).then(function (r) { return json ? r.json() : r.text(); }).then(function (v) { clearTimeout(t); ok(String(json ? v.ip : v).trim()); }, function (e) { clearTimeout(t); bad(e); });
      });
    }
    return get('https://api.ipify.org?format=json', true).catch(function () { return get('https://ipv4.icanhazip.com/', false); });
  }
  var lastPing = 0;
  function ping(force) {
    if (!S.token || !S.me || S.me.role === 'Owner' || document.visibilityState === 'hidden') return;
    if (!force && Date.now() - lastPing < 120000) return;
    lastPing = Date.now();
    publicIp().then(function (ip) { return api('deskPresence', { ip: ip, device: deviceName() }); }).then(function (r) { S.atHouse = !!(r && r.atHouse); }, function () {});
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') ping(); });
  window.addEventListener('focus', function () { ping(); });
  setInterval(function () { ping(true); }, 600000);
  function renderLogin(msg) {
    closeAllSheets();
    var pin = '';
    app.innerHTML = (demo ? '<div class="demo-flag">Demo mode · sample data · PINs 1111 owner · 2222 reception · 3333 staff</div>' : '') +
      '<div class="login"><div class="brand"><img class="brand-logo big" src="../img/brand/logo-light.png" alt="Nikadi Guest House"><span>Staff</span></div>' +
      '<p class="sub" id="lp">' + esc(msg || 'Enter your PIN') + '</p><div class="dots" id="dots"></div>' +
      '<div class="pad3" id="pad">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<button type="button" data-k="' + n + '">' + n + '</button>'; }).join('') +
      '<button type="button" class="ghost" data-k="c">Clear</button><button type="button" data-k="0">0</button><button type="button" class="ghost" data-k="go">Enter</button></div>' +
      (!demo && !NIKADI_API_URL ? '<div class="note" style="max-width:340px"><b>Not connected yet</b><span>The staff app needs its Google Sheet. Until then you can <a href="?demo=1">try the demo</a>.</span></div>' : '') +
      '<div data-install></div>' +
      (demo ? '<p class="small"><a href="./">Leave demo</a> · <button type="button" class="refresh" id="reset">Reset demo data</button></p>' : '') + '</div>';
    function dots() { $('#dots').innerHTML = pin.split('').map(function () { return '<i class="on"></i>'; }).join('') + (pin.length < 4 ? new Array(5 - pin.length).join('<i></i>') : ''); }
    dots();
    var going = false;
    function go() {
      if (pin.length < 4 || going) return;
      going = true;
      $('#lp').textContent = 'Checking…';
      api('deskLogin', { pin: pin, device: deviceName() }).then(function (r) {
        S.token = r.token; S.me = r.me; nkStore(TK, r.token); nkStore(MK, JSON.stringify(r.me)); S.tab = 'rooms'; start();
      }, function (e) { going = false; pin = ''; dots(); $('#lp').textContent = errText(e); var d = $('#dots'); d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); vibrate(); });
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
    installUi($('[data-install]'));
    var rs = $('#reset'); if (rs) rs.onclick = function () { window.nikadiStaffDemoReset(); toast('Demo data reset'); };
  }

  function logout(expired) {
    if (!expired && S.token) api('deskLogout').catch(function () {});
    S.token = null; S.me = null; S.st = null; nkStore(TK, null); nkStore(MK, null);
    renderLogin(expired ? 'Please log in again' : 'Logged out');
  }

  /* ---------- shell: side menu on computers, tabs at the bottom on phones ---------- */
  var ICON = {
    attendance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    bills: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2.5h12v19l-3-2-3 2-3-2-3 2z"/><path d="M9 7.5h6M9 11h6M9 14.5h4"/></svg>',
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>',
    rooms: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M7 13.5h3M14 13.5h3M7 17h3"/></svg>',
    bookings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 3h12v18l-6-3.5L6 21V3z"/><path d="M9.5 8.5h5M9.5 12h5"/></svg>',
    add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',
    stock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>',
    approvals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 11l2.5 2.5L16 9"/><path d="M12 21s-7-3.5-7-9.5V5l7-2.5L19 5v6.5C19 17.5 12 21 12 21z"/></svg>',
    reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/><path d="M15 6l3-2 3 2"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
  };
  var NAMES = { today: 'Today', rooms: 'Rooms', calendar: 'Calendar', bookings: 'Bookings', add: 'Add item', stock: 'Stock', settings: 'Settings', approvals: 'Approvals', more: 'More', reports: 'Sales', bills: 'Bills', attendance: 'Attendance' };
  function navFor(desk) {
    if (!mgr()) return ['rooms', 'calendar', 'add', 'stock'];
    if (desk) return ['today', 'rooms', 'calendar', 'bookings', 'bills', 'approvals', 'add', 'stock'].concat(owner() ? ['reports', 'attendance', 'settings'] : []);
    return ['today', 'rooms', 'calendar', 'bookings', 'more'];
  }
  function navName(t) { return t === 'approvals' && rcp() ? 'My requests' : NAMES[t]; }
  function badge(t) {
    if (!S.st) return '';
    var n = t === 'bookings' ? S.st.pending : t === 'stock' ? (S.st.toBuy || []).length : t === 'today' ? (S.st.arrivals || []).length
      : t === 'approvals' ? (S.st.approvals || S.st.myRequests || 0) : t === 'more' ? (S.st.approvals || S.st.myRequests || 0) : 0;
    return n ? '<em class="badge">' + n + '</em>' : '';
  }
  function nav() {
    var side = $('#side-nav'), tabs = $('#tabs');
    if (side) side.innerHTML = navFor(true).map(function (t) { return '<button type="button" class="side-item" data-tab="' + t + '" aria-current="' + (S.tab === t) + '">' + ICON[t] + '<span>' + navName(t) + '</span>' + badge(t) + '</button>'; }).join('');
    if (tabs) { var list = navFor(false); tabs.className = 'tabs t' + list.length; tabs.innerHTML = list.map(function (t) { return '<button class="tab" role="tab" type="button" data-tab="' + t + '" aria-selected="' + (S.tab === t) + '">' + ICON[t] + navName(t) + badge(t) + '</button>'; }).join(''); }
    $$('[data-tab]').forEach(function (b) { b.onclick = function () { go(b.dataset.tab); }; });
  }
  function go(tab) {
    closeAllSheetsQuiet();
    S.tab = tab; if (tab === 'approvals') REQ = null; if (tab === 'reports') REP.data = null; if (tab === 'bills') BILLS.list = null; if (tab === 'attendance') ATT.data = null; nav(); render(); window.scrollTo(0, 0);
    if (tab === 'calendar' || tab === 'bookings') loadExtra();
  }

  function start() {
    document.onkeydown = null;
    setTimeout(function () { ping(true); }, 800); // app opened: Wi-Fi check-in
    if (!S.st) S.tab = mgr() ? (isDesk() ? 'today' : 'rooms') : 'rooms';
    app.innerHTML = '<div class="app-frame">' +
      '<aside class="side" aria-label="Menu"><a class="brand brand-row" href="./"><img class="brand-logo" src="../img/brand/lockup-light.png" alt="Nikadi Guest House"><span>Staff</span></a>' + (demo ? '<p class="side-demo">Demo · sample data</p>' : '') +
      '<nav id="side-nav"></nav><div class="side-me"><div class="chip-me"><b>' + esc(S.me.name) + '</b>' + esc(S.me.role) + '</div><button class="iconbtn" id="out2" type="button">Log out</button></div></aside>' +
      '<div class="shell">' + (demo ? '<div class="demo-flag">Demo mode · sample data on this device only</div>' : '') +
      '<header class="bar pad"><a class="brand brand-row" href="./"><img class="brand-logo" src="../img/brand/lockup-light.png" alt="Nikadi Guest House"><span>Staff</span></a><div class="who"><div class="chip-me"><b>' + esc(S.me.name) + '</b>' + esc(S.me.role) + '</div>' +
      '<button class="iconbtn" id="out" type="button">Log out</button></div></header>' +
      '<main class="pad view" id="view"><div class="loading">Loading…</div></main>' +
      '<nav class="tabs" id="tabs" role="tablist"></nav></div></div>';
    $('#out').onclick = $('#out2').onclick = function () { logout(false); };
    nav();
    refresh();
  }
  window.matchMedia('(min-width: 1000px)').addEventListener('change', function () { if (S.token && S.st) { if (navFor(isDesk()).indexOf(S.tab) < 0 && ['add', 'stock', 'approvals', 'settings', 'reports', 'bills', 'attendance'].indexOf(S.tab) < 0) S.tab = 'rooms'; if (isDesk() && S.tab === 'more') S.tab = 'today'; nav(); render(); } });

  function refresh(btn) {
    if (S.loading) return Promise.resolve();
    S.loading = true; busy(btn, true);
    return api('deskState').then(function (st) {
      S.st = st; S.me = st.me; nkStore(MK, JSON.stringify(st.me)); nav(); render();
      if ((S.tab === 'calendar' && !X.cal) || (S.tab === 'bookings' && !X.bookings)) loadExtra();
    }, function (e) {
      if (S.token) { var v = $('#view'); if (v && !S.st) v.innerHTML = '<div class="note"><b>Could not load</b>' + esc(errText(e)) + '</div>'; else toast(errText(e)); }
    }).then(function () { S.loading = false; busy(btn, false); });
  }

  function render() {
    var v = $('#view'); if (!v || !S.st) return;
    ({ rooms: viewRooms, add: viewAdd, stock: viewStock, today: viewToday, calendar: viewCalendar, bookings: viewBookings, settings: viewSettings, approvals: viewApprovals, more: viewMore, reports: viewReports, bills: viewBills, attendance: viewAttendance }[S.tab] || viewRooms)(v);
  }

  /* auto refresh every 30 s while the app is open and no form is open */
  /* never redraw the page while someone is filling something in */
  var viewTouched = 0;
  document.addEventListener('input', function (e) { if (e.target.closest && e.target.closest('#view')) viewTouched = Date.now(); }, true);
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#view') && e.target.closest('input,select,textarea,.field,.toggle,.seg,[data-seg],.pick,.items')) viewTouched = Date.now(); }, true);
  function busyTyping() {
    var a = document.activeElement;
    return !!document.querySelector('.sheet') || (a && a.closest && a.closest('#view') && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) ||
      Date.now() - viewTouched < 180000 || ['add', 'settings'].indexOf(S.tab) >= 0 && Date.now() - viewTouched < 600000;
  }
  setInterval(function () {
    if (S.token && !document.hidden && !busyTyping()) { refresh(); if (S.tab === 'calendar' || S.tab === 'bookings') loadExtra(); }
  }, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.token && S.st && !busyTyping()) refresh(); });

  /* ---------- Rooms tab ---------- */
  function viewRooms(v) {
    var rooms = S.st.rooms, c = { ready: 0, occ: 0, out: 0, dirty: 0, arr: 0 };
    rooms.forEach(function (r) { c[kind(r)]++; });
    v.innerHTML = '<div class="hrow"><div><p class="kicker">' + esc(dShort(S.st.today)) + ' · ' + rooms.length + ' rooms</p><h1>Rooms</h1></div>' +
      '<div class="upd">Updated ' + esc(tShort(S.st.now).split(', ')[1] || '') + '<button class="refresh" id="rf" type="button">Refresh</button>' +
      (mgr() ? '<button class="refresh gold" id="addi" type="button">+ Add item</button>' : '') + '</div></div>' +
      '<div class="counts"><div class="count c-ready"><b>' + (c.ready + c.arr) + '</b><span>Ready</span></div><div class="count c-occ"><b>' + (c.occ + c.out) + '</b><span>Occupied</span></div>' +
      '<div class="count c-out"><b>' + c.out + '</b><span>Leave today</span></div><div class="count c-dirty"><b>' + c.dirty + '</b><span>To clean</span></div></div>' +
      '<div class="board">' + rooms.map(function (r) {
        var k = kind(r), s = r.stay;
        var g = s ? esc(s.guest) + '<small>' + s.guests + (s.guests > 1 ? ' guests' : ' guest') + ' · till ' + esc(dShort(s.checkout)) + '</small>'
          : r.arriving && k === 'arr' ? esc(r.arriving.guest) + '<small>Booked · ' + (r.arriving.late ? 'was due earlier' : 'arrives today') + '</small>'
          : k === 'dirty' ? '<small>' + esc(r.by ? 'Since ' + tShort(r.updated) : 'Clean before next guest') + '</small>' : '<small>' + esc(r.beds) + '</small>';
        var bal = mgr() && s && s.balance > 0 ? '<span class="bal">' + inr(s.balance) + ' due</span>' : '';
        return '<button type="button" class="tile k-' + k + '" data-room="' + r.room + '" aria-label="Room ' + r.room + ', ' + KLABEL[k] + '">' +
          '<span class="n">' + r.room + '</span><span class="ty">' + esc(r.type) + '</span><span class="g">' + g + '</span><span class="st"><span>' + KLABEL[k] + '</span>' + bal + '</span></button>';
      }).join('') + '</div>' +
      '<div class="legend"><span class="k-ready"><i></i>Ready for guests</span><span class="k-arr"><i></i>Booked, arriving today</span><span class="k-occ"><i></i>Guest staying</span><span class="k-out"><i></i>Leaves today</span><span class="k-dirty"><i></i>Needs cleaning</span></div>';
    $('#rf').onclick = function () { refresh(this); };
    if ($('#addi')) $('#addi').onclick = function () { openAdd(null); };
    $$('.tile', v).forEach(function (t) { t.onclick = function () { openRoom(Number(t.dataset.room)); }; });
  }

  /* ---------- sheets (panels) ----------
     A panel stays open until ✕ (or a Save/Done button) closes it. Clicking or tapping outside does nothing,
     and if something was typed, closing (✕, phone back gesture) first asks "Close without saving?". */
  var sheets = [], closingOk = 0, scrim = null;
  function openSheet(title, k) {
    var el = document.createElement('div'); el.className = 'sheet fade'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', title);
    el.innerHTML = '<div class="sheet-in">' + (k ? '<div class="status-band k-' + k + '"></div>' : '') + '<div class="sheet-bar"><h2>' + esc(title) + '</h2><button class="back x" type="button" aria-label="Close">✕</button></div>' +
      '<div class="sheet-ask" hidden><span>Close without saving? What you typed will be lost.</span><button type="button" class="btn btn-quiet sm" data-keep>Keep editing</button><button type="button" class="btn btn-line sm danger" data-drop>Close</button></div><div class="sheet-body"></div></div>';
    if (!scrim) {
      scrim = document.createElement('div'); scrim.className = 'sheet-scrim';
      scrim.onclick = function () { var top = sheets[sheets.length - 1]; if (top) { top.classList.remove('nudge'); void top.offsetWidth; top.classList.add('nudge'); } toast('Use ✕ to close'); };
      document.body.appendChild(scrim);
    }
    document.body.appendChild(el); document.body.style.overflow = 'hidden';
    sheets.push(el);
    try { history.pushState({ sheet: sheets.length }, ''); } catch (e) {}
    el.addEventListener('input', function (e) { if (e.target.matches('input,textarea,select')) el.dataset.dirty = '1'; });
    el.addEventListener('change', function (e) { if (e.target.matches('input,textarea,select')) el.dataset.dirty = '1'; });
    el.addEventListener('click', function (e) { if (e.target.closest('.seg button,.field button,[data-seg] button,.pick button,.items button')) el.dataset.dirty = '1'; });
    $('.back', el).onclick = function () { askClose(el); };
    $('[data-keep]', el).onclick = function () { $('.sheet-ask', el).hidden = true; };
    $('[data-drop]', el).onclick = function () { el.dataset.dirty = ''; closingOk++; history.back(); };
    return $('.sheet-body', el);
  }
  function askClose(el) {
    if (el.dataset.dirty === '1') { var a = $('.sheet-ask', el); a.hidden = false; a.scrollIntoView({ block: 'nearest' }); return; }
    closingOk++; history.back();
  }
  function popSheet() { var el = sheets.pop(); if (el) el.remove(); if (!sheets.length) { document.body.style.overflow = ''; if (scrim) { scrim.remove(); scrim = null; } } }
  function closeSheet() { if (sheets.length) { closingOk++; history.back(); } }
  function closeAllSheets() { while (sheets.length) popSheet(); }
  window.addEventListener('popstate', function (e) {
    var target = (e.state && e.state.sheet) || 0;
    if (sheets.length <= target) return;
    if (closingOk > 0) closingOk = Math.max(0, closingOk - 1);
    else { // phone back gesture / browser back: don't lose what was typed
      var top = sheets[sheets.length - 1];
      if (top && top.dataset.dirty === '1' && sheets.length - target === 1) {
        try { history.pushState({ sheet: sheets.length }, ''); } catch (er) {}
        askClose(top); return;
      }
    }
    while (sheets.length > target) popSheet();
    if (!sheets.length) refresh();
  });
  function after(n) { var k = Math.min(n, sheets.length); if (!k) return; closingOk += 1; history.go(-k); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sheets.length) { e.preventDefault(); askClose(sheets[sheets.length - 1]); } });

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
    body.innerHTML = (r.arriving ? '<div class="note gold"><b>Booked: ' + esc(r.arriving.guest) + '</b>' + (r.arriving.late ? 'This booking was due earlier and has not checked in.' : 'Arrives today.') +
        (mgr() ? ' <button class="linkbtn" type="button" id="ob">Open booking</button>' : '') + '</div>' : '') +
      '<div class="note"><b>Ready for guests</b>' + esc(r.beds) + (mgr() ? ' · usual rate ' + inr(r.rate) + ' per night' : '') + '</div>' +
      (mgr() ? '<button class="btn ' + (r.arriving ? 'btn-line' : 'btn-gold big-cta') + '" id="ci" type="button">' + (r.arriving ? 'Check in a walk-in guest instead' : 'Check in a guest') + '</button>' : '') +
      '<button class="btn btn-quiet" id="dirty" type="button">Mark as needs cleaning</button>';
    if (mgr()) $('#ci', body).onclick = function () { openCheckIn(r); };
    if ($('#ob', body)) $('#ob', body).onclick = function () { openBooking(r.arriving.id); };
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
    if (s.member) h += memberBox(s.member, false);
    if (m && s.notes) h += '<div class="note"><b>Notes</b>' + esc(s.notes) + '</div>';
    if (m && s.booking) h += '<button class="linkbtn" type="button" id="b-bk">From booking ' + esc(s.booking) + ' →</button>';
    if (m) {
      h += '<div class="bill"><h3>Bill</h3>' +
        '<div class="bl sum"><span class="t">Room · ' + s.nights + (s.nights > 1 ? ' nights' : ' night') + ' × ' + inr(s.rate) + '</span><span class="d">' + esc(s.rateNote || 'Agreed rate per night') + '</span><span class="a">' + inr(s.roomTotal) + '</span></div>' +
        s.charges.map(function (c) {
          return '<div class="bl tap" data-charge="' + esc(c.id) + '"><span class="t">' + esc(c.item) + ' × ' + c.qty + (c.free ? '<span class="free">Free</span>' : '') + '</span>' +
            '<span class="d">' + esc(tShort(c.at)) + ' · ' + esc(c.by) + (c.note ? ' · ' + esc(c.note) : '') + '</span><span class="a">' + (c.free ? '₹0' : inr(c.total)) + '</span></div>';
        }).join('') +
        '<div class="bl sum"><span class="t">Total</span><span class="d">Room ' + inr(s.roomTotal) + ' + extras ' + inr(s.extras) + '</span><span class="a">' + inr(s.roomTotal + s.extras) + '</span></div>' +
        s.payments.map(function (p) {
          return '<div class="bl ' + (p.amount < 0 ? 'refund' : 'paid') + (p.method === 'From advance' ? '' : ' tap') + '" data-pay="' + esc(p.id) + '"><span class="t">' + (p.method === 'From advance' ? 'Advance (booking)' : (p.amount < 0 ? 'Refunded · ' : 'Paid · ') + esc(p.method)) + '</span><span class="d">' + esc(tShort(p.at)) + ' · ' + esc(p.by) + (p.ref ? ' · Ref ' + esc(p.ref) : '') + (p.note ? ' · ' + esc(p.note) : '') + '</span><span class="a">' + (p.amount < 0 ? '+ ' + inr(-p.amount) : '− ' + inr(p.amount)) + '</span></div>';
        }).join('') +
        '<div class="bl due"><span class="t">' + (s.balance > 0 ? 'Balance due' : s.balance < 0 ? 'Refund due to guest' : 'Fully paid') + '</span><span class="a">' + inr(Math.abs(s.balance)) + '</span></div></div>' +
        '<p class="small">Tap an extra to change or remove it. Tap a payment to correct a mistake.' + (rcp() ? ' Changes to recorded money go to the manager for approval.' : '') + '</p>';
      h += '<div class="btns">' + (inHouse ? '<button class="btn btn-gold" id="b-add" type="button">Add item</button>' : '') +
        '<button class="btn btn-line" id="b-pay" type="button">Take payment</button>' +
        (s.paid > 0 ? '<button class="btn btn-quiet" id="b-ref" type="button">' + (s.balance < 0 ? 'Refund ' + inr(-s.balance) : 'Refund money') + '</button>' : '') +
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
    if ((b = $('#b-bk', body))) b.onclick = function () { openBooking(s.booking); };
    if ((b = $('#b-pay', body))) b.onclick = function () { openPay(s, body); };
    if ((b = $('#b-edit', body))) b.onclick = function () { openEdit(s, body); };
    if ((b = $('#b-ref', body))) b.onclick = function () { openRefund('stay', s, body); };
    if (m) $$('[data-pay].tap', body).forEach(function (row) { row.onclick = function () { var p = s.payments.filter(function (x) { return x.id === row.dataset.pay; })[0]; if (p) openVoid(p, 'stay', body); }; });
    if ((b = $('#b-out', body))) b.onclick = function () { openCheckOut(s, body); };
    if (m) $$('[data-charge]', body).forEach(function (row) {
      row.onclick = function () { var c = s.charges.filter(function (x) { return x.id === row.dataset.charge; })[0]; if (c) openEditCharge(c, s, body); };
    });
  }

  /* ---------- Nikadi members ---------- */
  function memberBox(mem, withRates) {
    if (!mem) return '';
    return '<div class="mem-box tier-' + esc(mem.tierKey) + '"><div class="mem-h"><span class="mem-dot"></span><b>' + esc(mem.tier) + ' member</b><span>' + esc(mem.name) + (mem.points != null ? ' · ' + mem.points + ' pts' : '') + '</span></div>' +
      (mem.onsite && mem.onsite.length ? '<p class="mem-l">Please give this guest:</p><ul>' + mem.onsite.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '<p class="mem-l">Member rate ' + mem.discount + '% off. No extra in-stay perks at this level.</p>') +
      (withRates ? '<div id="mem-rate"></div>' : '') + '</div>';
  }
  var RATE_KEY = { 'Deluxe Double': 'Deluxe Double (King)', 'Deluxe Twin': 'Deluxe Twin', 'Large Twin': 'Large Twin' };

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
    api(action, data).then(function (r) {
      busy(btn, false);
      if (r && r.requested) { vibrate(); toast('Sent to the manager for approval'); closeSheet(); refresh(); return; }
      done(r);
    }, function (e) { busy(btn, false); errEl.textContent = errText(e); vibrate(); });
  }

  function openCheckIn(r) {
    var t = S.st.today, body = openSheet('Check in · Room ' + r.room, 'ready');
    body.innerHTML = '<p class="small">' + esc(r.type + ' · ' + r.beds) + '</p>' +
      field('Guest name', '<input class="input" id="f-guest" autocomplete="off" maxlength="80">', true) +
      field('Phone (optional)', '<div class="phonewrap"><span class="cc">+91</span><input class="input" id="f-phone" inputmode="numeric" maxlength="14" autocomplete="off"></div>') +
      '<div id="f-mem"></div>' +
      '<div class="field"><span>Guests in this room <i>*</i></span>' + stepper('f-guests', 2, 1, 3) + '</div>' +
      '<div class="grid2">' + field('Check-in', '<input class="input" type="date" id="f-in" value="' + t + '">', true) +
      field('Check-out', '<input class="input" type="date" id="f-out" value="' + addDays(t, 1) + '">', true) + '</div>' +
      field('Agreed rate per night (₹)', '<input class="input" id="f-rate" inputmode="numeric" value="' + r.rate + '">', true) +
      field('Rate note (negotiation)', '<input class="input" id="f-rnote" maxlength="160" placeholder="e.g. Agreed ₹4,000 instead of ₹5,000">') +
      '<div class="calc" id="calc"></div>' +
      field('Paid now (₹)', '<input class="input" id="f-adv" inputmode="numeric" placeholder="0">') +
      '<div class="field"><span>Paid by</span>' + seg('method', S.st.methods, 'Cash') + '</div>' + refField('f-ref') +
      field('Notes', '<textarea class="input" id="f-notes" rows="2" maxlength="300" placeholder="Special requests…"></textarea>') +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">Check in</button>';
    function calc() {
      var n = nights($('#f-in', body).value, $('#f-out', body).value), rate = Number($('#f-rate', body).value.replace(/\D/g, '')) || 0;
      $('#calc', body).innerHTML = n > 0 ? n + (n > 1 ? ' nights' : ' night') + ' × ' + inr(rate) + ' = <b>' + inr(n * rate) + '</b>' : 'Check-out must be after check-in';
    }
    ['#f-in', '#f-out', '#f-rate'].forEach(function (s) { $(s, body).addEventListener('input', calc); });
    wireSegs(body); wireSteppers(body); calc();
    var lastPh = '';
    $('#f-phone', body).addEventListener('input', function () {
      var ph = this.value.replace(/\D/g, '').slice(-10);
      if (ph.length !== 10 || ph === lastPh) { if (ph.length !== 10) $('#f-mem', body).innerHTML = ''; return; }
      lastPh = ph;
      api('deskMember', { phone: ph }).then(function (res) {
        var mem = res.member, box = $('#f-mem', body); if (!box) return;
        if (!mem) { box.innerHTML = '<p class="small">Not a Nikadi member. You can invite them to join for 100 free points.</p>'; return; }
        box.innerHTML = memberBox(mem, mgr());
        if (!$('#f-guest', body).value) $('#f-guest', body).value = mem.name;
        var mr = mem.rates && mem.rates[RATE_KEY[r.type]];
        if (mr && mgr()) {
          $('#mem-rate', body).innerHTML = '<button type="button" class="btn btn-line" id="use-mr">Use ' + esc(mem.tier) + ' member rate: ' + inr(mr) + ' / night</button>';
          $('#use-mr', body).onclick = function () { $('#f-rate', body).value = mr; $('#f-rnote', body).value = mem.tier + ' member rate (' + mem.discount + '% off)'; calc(); toast('Member rate applied'); };
        }
      }, function () {});
    });
    $('#go', body).onclick = function () {
      submit(this, $('#err', body), 'deskCheckIn', {
        room: r.room, guest: $('#f-guest', body).value, phone: $('#f-phone', body).value, guests: Number($('#f-guests', body).textContent),
        checkin: $('#f-in', body).value, checkout: $('#f-out', body).value, rate: $('#f-rate', body).value.replace(/[^\d]/g, ''),
        rateNote: $('#f-rnote', body).value, advance: $('#f-adv', body).value.replace(/[^\d]/g, ''), method: segVal(body, 'method'), ref: $('#f-ref', body).value, notes: $('#f-notes', body).value
      }, function (res) { vibrate(); toast(res.stay.guest + ' checked in to room ' + r.room); after(2); });
    };
    setTimeout(function () { $('#f-guest', body).focus(); }, 50);
  }

  function openPay(s, parentBody) {
    var body = openSheet('Take payment · Room ' + s.room);
    body.innerHTML = '<div class="calc">Balance due: <b>' + inr(Math.max(0, s.balance)) + '</b></div>' +
      field('Amount (₹)', '<input class="input" id="f-amt" inputmode="numeric" value="' + (s.balance > 0 ? s.balance : '') + '">', true) +
      '<div class="field"><span>Paid by</span>' + seg('method', S.st.methods, 'Cash') + '</div>' + refField('f-ref') +
      field('Note', '<input class="input" id="f-note" maxlength="120" placeholder="Optional">') +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">Save payment</button>';
    wireSegs(body);
    $('#go', body).onclick = function () {
      submit(this, $('#err', body), 'deskPay', { id: s.id, amount: $('#f-amt', body).value.replace(/[^\d]/g, ''), method: segVal(body, 'method'), ref: $('#f-ref', body).value, note: $('#f-note', body).value },
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
      (rcp() ? '<p class="small">Changing the rate needs a manager\'s approval. Write why below.</p>' + field('Reason for a rate change', '<input class="input" id="f-why" maxlength="200">') : '') +
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
      if ($('#f-why', body)) d.reason = $('#f-why', body).value;
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
      '<div class="bill" id="sum"></div>' +
      '<div class="field"><span>Greet the guest as</span>' + titleSeg('b-title', s.title || '') + '</div>' +
      '<details class="billx"' + (s.gstin || s.company ? ' open' : '') + '><summary>Bill details · email, company, GSTIN</summary>' +
      field('Guest email (the PDF bill is emailed 12 hours after check-out)', '<input class="input" id="b-mail" type="email" inputmode="email" autocomplete="off" maxlength="80" value="' + esc(s.email || (s.member && s.member.email) || '') + '" placeholder="Optional">') +
      field('Company / billing name', '<input class="input" id="b-co" maxlength="80" value="' + esc(s.company || '') + '" placeholder="Only if the bill should be in a company name">') +
      field('Guest GSTIN', '<input class="input" id="b-gst" maxlength="15" autocomplete="off" style="text-transform:uppercase" value="' + esc(s.gstin || '') + '" placeholder="Only for business guests">') + '</details>' +
      '<p class="err" id="err" role="alert"></p><div id="conf"></div>' +
      '<button class="btn btn-gold big-cta" id="go" type="button">Check out and make bill</button>' +
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
    wireTitleSeg(body);
    function billArgs() { return { sendEmail: false, title: titleVal(body, 'b-title'), email: $('#b-mail', body).value.trim(), company: $('#b-co', body).value.trim(), gstin: $('#b-gst', body).value.trim().toUpperCase() }; }
    function outDone(res) { vibrate(); toast('Checked out. Room ' + s.room + ' needs cleaning.'); after(2); if (res && res.bill) setTimeout(function () { openBill(res.bill, { emailed: res.emailed, auto: true }); }, 350); }
    function doOut(btn) {
      submit(btn, $('#err', body), 'deskCheckOut', Object.assign({ id: s.id, nights: Number($('#f-n', body).textContent) }, billArgs()), outDone);
    }
    $('#go', body).onclick = function () {
      var b = bal(), btn = this;
      if (b === 0) return doOut(btn);
      $('#conf', body).innerHTML = '<div class="conf">' + (b > 0 ? inr(b) + ' is still due. Take the payment first, or check out anyway?' : 'The guest has paid ' + inr(-b) + ' more than the bill. Refund it first, or check out and refund later?') +
        '<div class="btns">' + (b > 0 ? '<button class="btn btn-line" type="button" id="cpay">Take ' + inr(b) + '</button>' : '<button class="btn btn-line" type="button" id="cref">Refund ' + inr(-b) + '</button>') + '<button class="btn btn-quiet" type="button" id="cgo">Check out anyway</button></div></div>';
      var cr = $('#cref', body);
      if (cr) cr.onclick = function () { openRefund('stay', Object.assign({}, s, { balance: b }), null, -b); };
      btn.hidden = true;
      var cp = $('#cpay', body);
      if (cp) cp.onclick = function () {
        var nn = Number($('#f-n', body).textContent);
        var pb = openSheet('Payment before check-out');
        pb.innerHTML = field('Amount (₹)', '<input class="input" id="p-amt" inputmode="numeric" value="' + b + '">') + '<div class="field"><span>Paid by</span>' + seg('method', S.st.methods, 'Cash') + '</div>' + refField('p-ref') +
          '<p class="err" id="perr" role="alert"></p><button class="btn btn-gold big-cta" id="pgo" type="button">Save payment and check out</button>';
        wireSegs(pb);
        $('#pgo', pb).onclick = function () {
          var x = this; busy(x, true);
          api('deskPay', { id: s.id, amount: $('#p-amt', pb).value.replace(/\D/g, ''), method: segVal(pb, 'method'), ref: $('#p-ref', pb).value, note: 'At check-out' })
            .then(function () { return api('deskCheckOut', Object.assign({ id: s.id, nights: nn }, billArgs())); })
            .then(function (res) { vibrate(); toast('Paid and checked out. Room ' + s.room + ' needs cleaning.'); after(3); if (res && res.bill) setTimeout(function () { openBill(res.bill, { emailed: res.emailed, auto: true }); }, 350); }, function (e) { busy(x, false); $('#perr', pb).textContent = errText(e); });
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
      (!c.free && s.paid > 0 ? '<div class="refund-box"><label class="toggle"><span>When removing, also give the guest money back</span><input type="checkbox" id="f-back"></label>' +
        '<div id="f-backf" hidden>' + field('Amount to give back (₹)', '<input class="input" id="f-bamt" inputmode="numeric" value="' + Math.min(c.total, s.paid) + '">') +
        '<div class="field"><span>Paid back by</span>' + seg('method', S.st.methods, 'Cash') + '</div>' + refField('f-bref') + '</div></div>' : '') +
      approvalNote() + (rcp() ? reasonField('f-why', 'e.g. Guest returned the mattress') : field('Reason (optional)', '<input class="input" id="f-why" maxlength="200">')) +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">' + goLabel('Save') + '</button><button class="btn btn-danger" id="rm" type="button">' + (rcp() ? 'Request removal' : 'Remove from bill') + '</button>' +
      '';
    wireSteppers(body); wireSegs(body);
    var bk = $('#f-back', body); if (bk) bk.onchange = function () { $('#f-backf', body).hidden = !bk.checked; $('#rm', body).textContent = rcp() ? 'Request removal' + (bk.checked ? ' + refund' : '') : 'Remove' + (bk.checked ? ' and refund' : ' from bill'); };
    $('#go', body).onclick = function () {
      submit(this, $('#err', body), 'deskEditCharge', { id: c.id, qty: Number($('#f-q', body).textContent), price: $('#f-p', body).value.replace(/\D/g, '') || '0', free: $('#f-free', body).checked, reason: $('#f-why', body).value },
        function (r) { toast('Saved'); closeSheet(); drawStay(parentBody, r.stay); });
    };
    $('#rm', body).onclick = function () {
      var b = this;
      if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = rcp() ? 'Tap again to send' : 'Tap again to remove'; return; }
      var d = { id: c.id, remove: true, reason: $('#f-why', body).value };
      if (bk && bk.checked) { d.refundAmount = $('#f-bamt', body).value.replace(/\D/g, ''); d.method = segVal(body, 'method'); d.ref = $('#f-bref', body).value; }
      submit(b, $('#err', body), 'deskEditCharge', d, function (r) { toast('Removed'); closeSheet(); drawStay(parentBody, r.stay); });
    };
  }

  /* ---------- Add item ---------- */
  function openAdd(roomNo) { if (roomNo) S.addRoom = roomNo; go('add'); }
  function closeAllSheetsQuiet() { var n = sheets.length; if (n) { try { history.go(-n); } catch (e) {} } while (sheets.length) popSheet(); }

  function viewAdd(v) {
    var occ = S.st.rooms.filter(function (r) { return r.status === 'Occupied' && r.stay; });
    if (!occ.some(function (r) { return r.room === S.addRoom; })) S.addRoom = occ.length === 1 ? occ[0].room : null;
    var items = S.st.items.filter(function (i) { return i.sell; });
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
      (S.st.toBuy.length ? '<div class="buy"><div class="sec-h"><h2>To buy</h2><span class="small">' + S.st.toBuy.length + (S.st.toBuy.length > 1 ? ' items are' : ' item is') + ' running low</span></div>' +
        '<div class="list">' + S.st.toBuy.map(function (b) {
          return '<div class="bl"><span class="t">' + esc(b.item) + '</span><span class="d">' + b.stock + ' left · warn below ' + b.low + '</span><span class="a">Buy about ' + b.buy + '</span></div>';
        }).join('') + '</div>' + (mgr() ? '<p class="small">When it arrives, tap <b>Add stock</b> on the item below.</p>' : '<p class="small">Tell reception what needs buying.</p>') + '</div>'
        : '<div class="note ok"><b>Nothing to buy</b>Every counted item is above its warning level.</div>') +
      '<div class="sec-h"><h2>In storage</h2></div>' +
      '<div class="stock">' + (tracked.length ? tracked.map(function (i) {
        var low = i.low > 0 && i.stock < i.low;
        return '<div class="sk' + (low ? ' low' : '') + '"><div><h3>' + esc(i.item) + '</h3><p class="small">' + (i.sell ? 'Sold to rooms' : 'Supply') + (i.low ? ' · warn below ' + i.low : '') + '</p></div>' +
          '<div class="num">' + i.stock + '<small>in stock</small></div>' + (low ? '<p class="warn">Running low. Order more.</p>' : '') +
          '<div class="sk-btns"><button class="btn btn-quiet" type="button" data-mode="take" data-item="' + esc(i.item) + '">Take out</button>' +
          (mgr() ? '<button class="btn ' + (low ? 'btn-gold' : 'btn-line') + '" type="button" data-mode="add" data-item="' + esc(i.item) + '">Add stock</button><button class="btn btn-quiet" type="button" data-mode="count" data-item="' + esc(i.item) + '">Set count</button>' : '') +
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

  /* ---------- Today (owner + reception): the dashboard ---------- */
  function viewToday(v) {
    if (!mgr()) { S.tab = 'rooms'; return render(); }
    var st = S.st, sm = st.summary;
    var inHouse = st.rooms.filter(function (r) { return r.stay; });
    var leaving = inHouse.filter(function (r) { return r.stay.leavesToday; });
    var dirty = st.rooms.filter(function (r) { return r.status === 'Needs cleaning'; });
    function row(r) { return '<div class="bl tap" data-room="' + r.room + '"><span class="t">Room ' + r.room + ' · ' + esc(r.stay.guest) + '</span><span class="d">' + r.stay.guests + ' guests · ' + esc(dShort(r.stay.checkin)) + ' to ' + esc(dShort(r.stay.checkout)) + '</span><span class="a">' + (r.stay.balance > 0 ? inr(r.stay.balance) + ' due' : 'Paid') + '</span></div>'; }
    var arrivals = '<div class="panel"><div class="sec-h"><h2>Arriving</h2><span class="small">confirmed bookings</span></div><div class="list">' + (st.arrivals.length ? st.arrivals.map(function (b) {
      return '<div class="bl tap" data-booking="' + esc(b.id) + '"><span class="t">' + esc(b.guest) + ' · Room ' + b.rooms.join(', ') + '</span><span class="d">' + b.guests + ' guests · ' + (b.checkin < st.today ? 'was due ' + esc(dShort(b.checkin)) : 'today') + ' · advance ' + inr(b.advancePaid) + '</span><span class="a"><span class="pill gold">Check in</span></span></div>';
    }).join('') : '<div class="bl"><span class="d">No booked arrivals today</span></div>') + '</div></div>';
    var leavingP = '<div class="panel"><div class="sec-h"><h2>Leaving today</h2></div><div class="list">' + (leaving.length ? leaving.map(row).join('') : '<div class="bl"><span class="d">No one leaves today</span></div>') + '</div></div>';
    var stayingP = '<div class="panel"><div class="sec-h"><h2>Staying now</h2></div><div class="list">' + (inHouse.length ? inHouse.filter(function (r) { return !r.stay.leavesToday; }).map(row).join('') || '<div class="bl"><span class="d">Everyone staying leaves today</span></div>' : '<div class="bl"><span class="d">No guests</span></div>') + '</div></div>';
    var pendingP = '<div class="panel"><div class="sec-h"><h2>Waiting for payment</h2><button class="linkbtn" type="button" data-go="bookings">All bookings →</button></div>' +
      '<div class="list"><div class="bl tap" data-go="bookings"><span class="t">' + st.pending + ' pending ' + (st.pending === 1 ? 'booking' : 'bookings') + '</span><span class="d">Not on the calendar until the advance is received and confirmed</span><span class="a">' + (st.pending ? '<span class="pill">Review</span>' : '') + '</span></div></div></div>';
    var apprP = approver() && st.approvals ? '<div class="panel attn"><div class="sec-h"><h2>Needs your approval</h2><button class="linkbtn" type="button" data-go="approvals">Review →</button></div>' +
      '<div class="list"><div class="bl tap" data-go="approvals"><span class="t">' + st.approvals + ' request' + (st.approvals > 1 ? 's' : '') + ' from reception</span><span class="d">Refunds, removed items, rate changes, corrections</span><span class="a"><span class="pill gold">Review</span></span></div></div></div>' : '';
    var buyP = '<div class="panel"><div class="sec-h"><h2>To buy</h2><button class="linkbtn" type="button" data-go="stock">Stock →</button></div><div class="list">' + (st.toBuy.length ? st.toBuy.map(function (b) {
      return '<div class="bl"><span class="t">' + esc(b.item) + '</span><span class="d">' + b.stock + ' left</span><span class="a">Buy ~' + b.buy + '</span></div>'; }).join('') : '<div class="bl"><span class="d">Nothing running low</span></div>') + '</div></div>';
    var recentP = '<div class="panel"><div class="sec-h"><h2>Recent check-outs</h2></div><div class="list">' + (st.recent.length ? st.recent.slice(0, 8).map(function (s) {
        return '<div class="bl tap" data-stay="' + esc(s.id) + '"><span class="t">Room ' + s.room + ' · ' + esc(s.guest) + '</span><span class="d">' + esc(dShort(s.checkin)) + ' to ' + esc(dShort(s.checkout)) + ' · bill ' + inr(s.roomTotal + s.extras) + '</span><span class="a">' + (s.balance > 0 ? inr(s.balance) + ' due' : s.balance < 0 ? inr(-s.balance) + ' refund' : 'Settled') + '</span></div>';
      }).join('') : '<div class="bl"><span class="d">None yet</span></div>') + '</div></div>';
    v.innerHTML = '<div class="hrow"><div><p class="kicker">' + esc(dLong(st.today)) + '</p><h1>Today</h1></div><div class="upd"><button class="refresh" id="rf" type="button">Refresh</button>' +
      '<button class="refresh gold" id="nb" type="button">+ New booking</button></div></div>' +
      '<div class="kpis">' +
      '<div class="kpi c-occ"><span>Occupied</span><b>' + inHouse.length + '<small>/' + st.rooms.length + '</small></b><small>' + sm.guests + ' guests in house</small></div>' +
      '<div class="kpi c-arr"><span>Arriving</span><b>' + st.arrivals.length + '</b><small>booked arrivals</small></div>' +
      '<div class="kpi c-out"><span>Leaving</span><b>' + leaving.length + '</b><small>check-out by 9 AM</small></div>' +
      '<div class="kpi c-dirty"><span>To clean</span><b>' + dirty.length + '</b><small>' + (st.rooms.length - inHouse.length - dirty.length) + ' rooms ready</small></div>' +
      '<div class="kpi cash"><span>Collected today</span><b>' + inr(sm.collected) + '</b><small>' + st.methods.filter(function (m) { return sm.byMethod[m]; }).map(function (m) { return m + ' ' + inr(sm.byMethod[m]); }).join(' · ') + '</small></div>' +
      '<div class="kpi cash"><span>Still due</span><b>' + inr(sm.outstanding) + '</b><small>from guests in house</small></div></div>' +
      '<div class="dash"><div class="dcol">' + arrivals + leavingP + stayingP + '</div><div class="dcol">' + apprP + pendingP + buyP + recentP + '</div></div>' +
      '<p class="small">Every entry is saved in the Google Sheet with the name of the person who made it.</p>';
    $('#rf', v).onclick = function () { refresh(this); };
    $('#nb', v).onclick = function () { openBookingForm(null); };
    $$('[data-room]', v).forEach(function (b) { b.onclick = function () { openRoom(Number(b.dataset.room)); }; });
    $$('[data-booking]', v).forEach(function (b) { b.onclick = function () { openBooking(b.dataset.booking); }; });
    $$('[data-go]', v).forEach(function (b) { b.onclick = function () { go(b.dataset.go); }; });
    $$('[data-stay]', v).forEach(function (b) { b.onclick = function () { var body = openSheet('Past stay'); body.innerHTML = '<div class="loading">Loading…</div>'; loadStay(body, b.dataset.stay); }; });
  }

  /* ---------- Settings (owner) ---------- */
  function viewSettings(v) {
    if (!owner()) { S.tab = 'rooms'; return render(); }
    v.innerHTML = '<div><p class="kicker">Owner only</p><h1>Settings</h1></div>' +
      '<div class="btns"><button class="btn btn-line" type="button" id="team">Team & PINs</button><button class="btn btn-line" type="button" id="prices">Items & prices</button></div>' +
      '<div class="panel"><div class="sec-h"><h2>Cancellation policy</h2></div><div class="note">' + esc(S.st.policy.text) + '</div>' +
      '<p class="small">This text appears on the website booking form, in the house rules, in the WhatsApp confirmation and on every booking in this app.</p></div>';
    $('#team', v).onclick = openTeam; $('#prices', v).onclick = openPrices;
  }

  /* ---------- Calendar + bookings data (loaded on demand) ---------- */
  var X = { cal: null, calFrom: null, day: null, bookings: null, bview: 'open' };
  function calDays() { return isDesk() ? 28 : 21; }
  function loadExtra() {
    if (S.tab === 'calendar') {
      if (!X.calFrom) X.calFrom = addDays(S.st ? S.st.today : new Date().toISOString().slice(0, 10), isDesk() ? -2 : 0);
      return api('deskCalendar', { from: X.calFrom, days: calDays() }).then(function (c) { X.cal = c; if (S.tab === 'calendar') render(); }, function (e) { toast(errText(e)); });
    }
    if (S.tab === 'bookings') return api('deskBookings').then(function (r) { X.bookings = r; if (S.tab === 'bookings') render(); }, function (e) { toast(errText(e)); });
    return Promise.resolve();
  }
  /* what holds room n on the night of `day` */
  function nightOf(cal, n, day) {
    return cal.bars.filter(function (b) { return b.room === n && b.from <= day && day < b.to; })[0] || null;
  }

  /* ---------- Calendar ---------- */
  function viewCalendar(v) {
    var c = X.cal;
    if (!c) { v.innerHTML = '<div class="hrow"><div><p class="kicker">Availability</p><h1>Calendar</h1></div></div><div class="loading">Loading calendar…</div>'; return; }
    var days = []; for (var i = 0; i < c.days; i++) days.push(addDays(c.from, i));
    if (!X.day || X.day < c.from || X.day >= addDays(c.from, c.days)) X.day = c.today >= c.from && c.today < addDays(c.from, c.days) ? c.today : c.from;
    var last = addDays(c.from, c.days - 1), mm = MON[+c.from.slice(5, 7) - 1] + (c.from.slice(5, 7) !== last.slice(5, 7) ? ' – ' + MON[+last.slice(5, 7) - 1] : '') + ' ' + last.slice(0, 4);
    var head = '<div class="hrow"><div><p class="kicker">Availability · ' + mm + '</p><h1>Calendar</h1></div><div class="upd">' +
      '<button class="refresh" type="button" id="cp" aria-label="Earlier dates">‹' + (isDesk() ? ' Earlier' : '') + '</button><button class="refresh" type="button" id="ct">Today</button><button class="refresh" type="button" id="cn" aria-label="Later dates">' + (isDesk() ? 'Later ' : '') + '›</button>' +
      (mgr() ? '<button class="refresh gold" type="button" id="cb">+ ' + (isDesk() ? 'New booking' : 'Book') + '</button>' : '') + '</div></div>' +
      '<div class="legend"><span class="k-occ"><i></i>Guest staying</span><span class="k-arr"><i></i>Booked (advance paid)</span><span class="k-past"><i></i>Stayed</span><span><i style="background:transparent;border:1px solid var(--line)"></i>Free</span></div>';
    var pend = c.pending.length ? '<div class="panel"><div class="sec-h"><h2>Waiting for payment</h2><span class="small">not on the calendar yet</span></div><div class="list">' + c.pending.map(function (b) {
      return '<div class="bl tap" data-booking="' + esc(b.id) + '"><span class="t">' + esc(b.guest) + '</span><span class="d">' + esc(dShort(b.checkin)) + ' to ' + esc(dShort(b.checkout)) + ' · ' + b.guests + ' guests · ' + b.roomsNeeded + (b.roomsNeeded > 1 ? ' rooms' : ' room') + '</span><span class="a"><span class="pill">Pending</span></span></div>';
    }).join('') + '</div></div>' : '';
    var body;
    if (isDesk()) {
      var cols = 'grid-template-columns:132px repeat(' + c.days + ',minmax(30px,1fr))';
      var g = '<div class="cal" style="' + cols + '"><div class="cal-corner">Room</div>' + days.map(function (d, j) {
        var dd = new Date(d + 'T00:00:00Z'), we = dd.getUTCDay() === 0 || dd.getUTCDay() === 6;
        return '<button type="button" class="cal-h' + (d === c.today ? ' today' : '') + (we ? ' we' : '') + (d === X.day ? ' sel' : '') + '" data-day="' + d + '" style="grid-column:' + (j + 2) + '"><span>' + WD[dd.getUTCDay()].charAt(0) + '</span><b>' + dd.getUTCDate() + '</b>' + (dd.getUTCDate() === 1 ? '<i>' + MON[dd.getUTCMonth()] + '</i>' : '') + '</button>';
      }).join('');
      c.rooms.forEach(function (r, ri) {
        var row = ri + 2;
        g += '<div class="cal-room" style="grid-row:' + row + '"><b>' + r.room + '</b><span>' + esc(r.type.replace('Deluxe ', '')) + '</span></div>';
        days.forEach(function (d, j) { g += '<button type="button" class="cal-cell' + (d === c.today ? ' today' : '') + '" style="grid-row:' + row + ';grid-column:' + (j + 2) + '" data-room="' + r.room + '" data-day="' + d + '" aria-label="Room ' + r.room + ', ' + dLong(d) + '"></button>'; });
        c.bars.filter(function (b) { return b.room === r.room; }).forEach(function (b) {
          var s0 = Math.max(0, nights(c.from, b.from)), e0 = Math.min(c.days, nights(c.from, b.to));
          if (e0 <= s0) return;
          g += '<button type="button" class="cal-bar b-' + b.kind + (nights(c.from, b.from) < 0 ? ' cut-l' : '') + (nights(c.from, b.to) > c.days ? ' cut-r' : '') + '" style="grid-row:' + row + ';grid-column:' + (s0 + 2) + ' / ' + (e0 + 2) + '" data-kind="' + b.kind + '" data-id="' + esc(b.id) + '" title="' + esc(b.guest + ' · ' + dShort(b.from) + ' to ' + dShort(b.to)) + '">' + esc(b.guest) + (b.guests ? ' · ' + b.guests : '') + '</button>';
        });
      });
      var fr = c.rooms.length + 2;
      g += '<div class="cal-room cal-free" style="grid-row:' + fr + '"><b>Free</b><span>rooms</span></div>' + days.map(function (d, j) {
        var n = c.rooms.filter(function (r) { var x = nightOf(c, r.room, d); return !x; }).length;
        return '<div class="cal-fc' + (n === 0 ? ' full' : '') + '" style="grid-row:' + fr + ';grid-column:' + (j + 2) + '">' + n + '</div>';
      }).join('') + '</div>';
      body = '<div class="cal-wrap">' + g + '</div><p class="small">Click a day for its full list. Click an empty square to book that room' + (mgr() ? '' : ' (reception only)') + '. The bottom row shows how many rooms are free each night.</p>' + dayPanel(c, X.day) + pend;
    } else {
      body = '<div class="daystrip" id="ds">' + days.map(function (d) {
        var dd = new Date(d + 'T00:00:00Z'), n = c.rooms.filter(function (r) { return !nightOf(c, r.room, d); }).length;
        return '<button type="button" data-day="' + d + '" aria-pressed="' + (d === X.day) + '"' + (d === c.today ? ' class="today"' : '') + '><span>' + WD[dd.getUTCDay()] + '</span><b>' + dd.getUTCDate() + '</b><small>' + n + ' free</small></button>';
      }).join('') + '</div>' + dayPanel(c, X.day) + pend;
    }
    v.innerHTML = head + body;
    $('#cp', v).onclick = function () { X.calFrom = addDays(c.from, -Math.round(c.days / 2)); X.cal = null; render(); loadExtra(); };
    $('#cn', v).onclick = function () { X.calFrom = addDays(c.from, Math.round(c.days / 2)); X.cal = null; render(); loadExtra(); };
    $('#ct', v).onclick = function () { X.calFrom = addDays(c.today, isDesk() ? -2 : 0); X.day = c.today; X.cal = null; render(); loadExtra(); };
    if ($('#cb', v)) $('#cb', v).onclick = function () { openBookingForm({ checkin: X.day, checkout: addDays(X.day, 1) }); };
    $$('[data-day]:not(.cal-cell)', v).forEach(function (b) { b.onclick = function () { X.day = b.dataset.day; render(); var dp = $('#daypanel'); if (dp && isDesk()) dp.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }; });
    $$('.cal-cell', v).forEach(function (b) { b.onclick = function () { if (mgr()) openBookingForm({ checkin: b.dataset.day, checkout: addDays(b.dataset.day, 1), roomPick: Number(b.dataset.room) }); else { X.day = b.dataset.day; render(); } }; });
    $$('.cal-bar, [data-bar]', v).forEach(function (b) { b.onclick = function () { openBar(b.dataset.kind, b.dataset.id); }; });
    $$('[data-booking]', v).forEach(function (b) { b.onclick = function () { openBooking(b.dataset.booking); }; });
    var sel = $('#ds [aria-pressed="true"]', v); if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  function openBar(kind, id) {
    if (kind === 'booked') { if (mgr()) openBooking(id); else toast('Booked. Ask reception for details.'); return; }
    var body = openSheet(kind === 'stay' ? 'Staying' : 'Past stay'); body.innerHTML = '<div class="loading">Loading…</div>'; loadStay(body, id);
  }
  function dayPanel(c, d) {
    var rows = c.rooms.map(function (r) { return { r: r, x: nightOf(c, r.room, d) }; });
    var occ = rows.filter(function (o) { return o.x && o.x.kind !== 'booked'; }).length, bk = rows.filter(function (o) { return o.x && o.x.kind === 'booked'; }).length, fr = rows.length - occ - bk;
    return '<div class="panel" id="daypanel"><div class="sec-h"><h2>Night of ' + esc(dLong(d)) + '</h2><span class="small">' + (d === c.today ? 'tonight' : '') + '</span></div>' +
      '<div class="counts"><div class="count c-ready"><b>' + fr + '</b><span>Free</span></div><div class="count c-arr"><b>' + bk + '</b><span>Booked</span></div><div class="count c-occ"><b>' + occ + '</b><span>' + (d < c.today ? 'Stayed' : 'Occupied') + '</span></div><div class="count"><b>' + rows.length + '</b><span>Rooms</span></div></div>' +
      '<div class="list daylist">' + rows.map(function (o) {
        var x = o.x, k = x ? (x.kind === 'booked' ? 'arr' : x.kind === 'past' ? 'past' : 'occ') : (d === c.today && o.r.status === 'Needs cleaning' ? 'dirty' : 'ready');
        var label = x ? (x.kind === 'booked' ? 'Booked' : x.kind === 'past' ? 'Stayed' : 'Occupied') : (k === 'dirty' ? 'Free · to clean' : 'Free');
        return '<div class="bl' + (x || mgr() ? ' tap' : '') + ' k-' + k + '"' + (x ? ' data-bar="1" data-kind="' + x.kind + '" data-id="' + esc(x.id) + '"' : mgr() ? ' data-new="' + o.r.room + '"' : '') + '>' +
          '<span class="t"><i class="dot"></i>Room ' + o.r.room + ' · ' + esc(o.r.type.replace('Deluxe ', '')) + '</span><span class="d">' + (x ? esc(x.guest) + ' · ' + esc(dShort(x.from)) + ' to ' + esc(dShort(x.to)) : esc(o.r.beds)) + '</span><span class="a">' + label + '</span></div>';
      }).join('') + '</div></div>';
  }
  document.addEventListener('click', function (e) {
    var n = e.target.closest && e.target.closest('[data-new]');
    if (n && S.tab === 'calendar' && mgr()) openBookingForm({ checkin: X.day, checkout: addDays(X.day, 1), roomPick: Number(n.dataset.new) });
  });

  /* ---------- Bookings list ---------- */
  var BSTAT = { Pending: 'pend', Confirmed: 'conf', 'Checked in': 'done', Cancelled: 'canc', 'No-show': 'canc' };
  function viewBookings(v) {
    if (!mgr()) { S.tab = 'rooms'; return render(); }
    var r = X.bookings;
    var head = '<div class="hrow"><div><p class="kicker">Advance bookings</p><h1>Bookings</h1></div><div class="upd"><button class="refresh" type="button" id="rf">Refresh</button><button class="refresh gold" type="button" id="nb">+ New booking</button></div></div>' +
      '<div class="seg narrow" id="bv"><button type="button" data-v="open" aria-pressed="' + (X.bview === 'open') + '">Open</button><button type="button" data-v="closed" aria-pressed="' + (X.bview === 'closed') + '">Closed</button></div>';
    if (!r) { v.innerHTML = head + '<div class="loading">Loading bookings…</div>'; wire(); return; }
    var list = X.bview === 'open' ? r.open : r.closed;
    var pend = r.open.filter(function (b) { return b.status === 'Pending'; }).length;
    var html = head + (X.bview === 'open' ? '<div class="note gold"><b>' + pend + ' waiting for payment</b>A booking is confirmed and its rooms blocked only after the advance (50%) is received and recorded here.</div>' : '');
    if (!list.length) html += '<div class="empty">' + (X.bview === 'open' ? 'No open bookings.' : 'No closed bookings yet.') + '</div>';
    else if (isDesk()) {
      html += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Status</th><th>Guest</th><th>Check-in</th><th>Nights</th><th>Guests</th><th>Rooms</th><th class="r">Total</th><th class="r">Advance</th><th>Source</th></tr></thead><tbody>' +
        list.map(function (b) {
          return '<tr data-booking="' + esc(b.id) + '"><td><span class="st-pill s-' + BSTAT[b.status] + '">' + esc(b.status) + '</span></td><td><b>' + esc(b.guest) + '</b><small>' + esc(b.phone || '') + '</small></td>' +
            '<td>' + esc(dLong(b.checkin)) + '<small>to ' + esc(dShort(b.checkout)) + '</small></td><td>' + b.nights + '</td><td>' + b.guests + '</td>' +
            '<td>' + (b.rooms.length ? b.rooms.join(', ') : '<span class="muted">' + b.roomsNeeded + ' needed</span>') + '</td><td class="r">' + inr(b.total) + '</td>' +
            '<td class="r">' + inr(b.advancePaid) + '<small>' + (b.status === 'Pending' ? 'needs ' + inr(b.advanceDue) : b.refunded ? 'refunded ' + inr(b.refunded) : 'of ' + inr(b.advanceDue)) + '</small></td><td>' + esc(b.source) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    } else {
      html += '<div class="bcards">' + list.map(function (b) {
        return '<button type="button" class="bcard" data-booking="' + esc(b.id) + '"><span class="st-pill s-' + BSTAT[b.status] + '">' + esc(b.status) + '</span><b>' + esc(b.guest) + '</b>' +
          '<span>' + esc(dShort(b.checkin)) + ' → ' + esc(dShort(b.checkout)) + ' · ' + b.nights + 'n · ' + b.guests + ' guests</span>' +
          '<span>' + (b.rooms.length ? 'Room ' + b.rooms.join(', ') : b.roomsNeeded + (b.roomsNeeded > 1 ? ' rooms' : ' room') + ' needed') + ' · ' + (b.status === 'Pending' ? 'advance ' + inr(b.advanceDue) + ' needed' : 'paid ' + inr(b.advancePaid)) + '</span></button>';
      }).join('') + '</div>';
    }
    v.innerHTML = html; wire();
    function wire() {
      $('#rf', v).onclick = function () { var bt = this; busy(bt, true); loadExtra().then(function () { busy(bt, false); }); };
      $('#nb', v).onclick = function () { openBookingForm(null); };
      $('#bv', v).onclick = function (e) { var b = e.target.closest('button'); if (b) { X.bview = b.dataset.v; render(); } };
      $$('[data-booking]', v).forEach(function (b) { b.onclick = function () { openBooking(b.dataset.booking); }; });
    }
  }

  /* ---------- One booking ---------- */
  function openBooking(id) {
    var body = openSheet('Booking');
    body.innerHTML = '<div class="loading">Loading…</div>';
    api('deskBooking', { id: id }).then(function (r) { drawBooking(body, r.booking); }, function (e) { body.innerHTML = '<div class="note">' + esc(errText(e)) + '</div>'; });
  }
  function waText(b) {
    var p = S.st.policy;
    return 'Hare Krishna ' + b.guest.split(' ')[0] + '! Your booking at Nikadi Guest House, Mayapur is CONFIRMED.\n\n' +
      'Booking: ' + b.id + '\nRoom' + (b.rooms.length > 1 ? 's' : '') + ': ' + b.rooms.join(', ') + '\nCheck-in: ' + dLong(b.checkin) + ', from 11:00 AM\nCheck-out: ' + dLong(b.checkout) + ', by 9:00 AM\n' +
      'Guests: ' + b.guests + '\nTotal: ' + nkInr(b.total) + '\nAdvance received: ' + nkInr(b.advancePaid) + '\nBalance at check-in: ' + nkInr(Math.max(0, b.total - b.advancePaid)) + '\n\n' +
      'Cancellation policy: ' + p.text + '\n\n' +
      'Reception is on the first floor: enter at the left corner of the building, by the picture of Sri Chaitanya Mahaprabhu, and take the stairs up. We are opposite ISKCON Gate No. 4.\n\nNikadi Guest House · +91 75011 01137';
  }
  function drawBooking(body, b) {
    var t = S.st.today, open = b.status === 'Pending' || b.status === 'Confirmed';
    var bal = Math.max(0, b.total - b.advancePaid + b.refunded);
    var h = '<div class="hrow"><div><p class="kicker"><span class="st-pill s-' + BSTAT[b.status] + '">' + esc(b.status) + '</span> · ' + esc(b.id) + '</p><h2 style="font-size:1.9rem">' + esc(b.guest) + '</h2></div></div>' +
      '<dl class="facts"><div><dt>Check-in</dt><dd>' + esc(dLong(b.checkin)) + '</dd></div><div><dt>Check-out</dt><dd>' + esc(dLong(b.checkout)) + '</dd></div>' +
      '<div><dt>Guests · nights</dt><dd>' + b.guests + ' · ' + b.nights + '</dd></div><div><dt>Rooms</dt><dd>' + (b.rooms.length ? 'Room ' + b.rooms.join(', ') : b.roomsNeeded + ' needed · ' + esc(b.roomType)) + '</dd></div>' +
      '<div><dt>Phone</dt><dd>' + (b.phone ? '<a href="tel:+91' + esc(b.phone) + '">' + esc(b.phone) + '</a>' : '—') + '</dd></div><div><dt>Source</dt><dd>' + esc(b.source) + (b.email ? '<small class="muted"> · ' + esc(b.email) + '</small>' : '') + '</dd></div></dl>' +
      (b.notes ? '<div class="note"><b>Notes</b>' + esc(b.notes) + '</div>' : '') +
      '<div class="bill"><h3>Money</h3>' +
      '<div class="bl sum"><span class="t">' + b.nights + (b.nights > 1 ? ' nights' : ' night') + ' × ' + Math.max(b.rooms.length, b.roomsNeeded) + (Math.max(b.rooms.length, b.roomsNeeded) > 1 ? ' rooms' : ' room') + ' × ' + inr(b.rate) + '</span><span class="d">Rate per room per night</span><span class="a">' + inr(b.total) + '</span></div>' +
      '<div class="bl"><span class="t">Advance needed (50%)</span><span class="a">' + inr(b.advanceDue) + '</span></div>' +
      b.payments.map(function (p) { return '<div class="bl tap ' + (p.amount < 0 ? 'refund' : 'paid') + '" data-pay="' + esc(p.id) + '"><span class="t">' + (p.amount < 0 ? 'Refunded · ' : 'Received · ') + esc(p.method) + '</span><span class="d">' + esc(tShort(p.at)) + ' · ' + esc(p.by) + (p.ref ? ' · Ref ' + esc(p.ref) : '') + '</span><span class="a">' + (p.amount < 0 ? '+ ' + inr(-p.amount) : '− ' + inr(p.amount)) + '</span></div>'; }).join('') +
      (b.status === 'Pending' ? '<div class="bl due"><span class="t">Not confirmed yet</span><span class="a">' + inr(b.advanceDue) + ' to receive</span></div>'
        : b.status === 'Confirmed' ? '<div class="bl due"><span class="t">Balance at check-in</span><span class="a">' + inr(bal) + '</span></div>' : '') + '</div>' +
      (b.closeNote ? '<div class="note"><b>' + esc(b.status) + (b.closedBy ? ' · ' + esc(b.closedBy) : '') + '</b>' + esc(b.closeNote) + '</div>' : '') +
      (b.confirmedBy ? '<p class="small">Confirmed by ' + esc(b.confirmedBy) + ' · ' + esc(tShort(b.confirmedAt)) + '. Created ' + esc(tShort(b.created)) + ' by ' + esc(b.createdBy) + '.</p>' : '<p class="small">Created ' + esc(tShort(b.created)) + ' by ' + esc(b.createdBy) + '.</p>');
    if (b.status === 'Pending') h += '<div class="btns"><button class="btn btn-gold wide big-cta" id="k-conf" type="button">Money received: confirm</button><button class="btn btn-quiet" id="k-edit" type="button">Edit</button><button class="btn btn-danger" id="k-cancel" type="button">Cancel booking</button></div>';
    if (b.status === 'Confirmed') {
      h += '<div class="btns">' + (b.checkin <= t ? '<button class="btn btn-gold wide big-cta" id="k-in" type="button">Guest arrived: check in</button>' : '') +
        '<a class="btn btn-line" id="k-wa" target="_blank" rel="noopener" href="' + (b.phone ? 'https://wa.me/91' + esc(b.phone) + '?text=' + encodeURIComponent(waText(b)) : '#') + '">Send WhatsApp confirmation</a>' +
        '<button class="btn btn-quiet" id="k-pay" type="button">Add payment</button><button class="btn btn-quiet" id="k-edit" type="button">Edit dates or rooms</button>' +
        (b.advancePaid - b.refunded > 0 ? '<button class="btn btn-quiet" id="k-ref" type="button">Refund part of advance</button>' : '') +
        '<button class="btn btn-danger" id="k-cancel" type="button">Cancel booking</button>' + (b.checkin <= t ? '<button class="btn btn-danger" id="k-ns" type="button">Guest did not come</button>' : '') + '</div>';
    }
    if ((b.status === 'Cancelled' || b.status === 'No-show') && b.advancePaid - b.refunded > 0) h += '<div class="btns"><button class="btn btn-quiet" id="k-ref" type="button">Refund money (' + inr(b.advancePaid - b.refunded) + ' kept)</button></div>';
    if (b.payments.length) h += '<p class="small">Tap a payment to correct a mistake.' + (rcp() ? ' Changes go to the manager for approval.' : '') + '</p>';
    if (open) h += '<div class="policy"><b>Cancellation policy</b>' + esc(S.st.policy.text) + '</div>';
    body.innerHTML = h;
    var q = function (sel) { return $(sel, body); };
    if (q('#k-conf')) q('#k-conf').onclick = function () { openConfirm(b, body); };
    if (q('#k-edit')) q('#k-edit').onclick = function () { openBookingForm(b, body); };
    if (q('#k-cancel')) q('#k-cancel').onclick = function () { openCancel(b, body); };
    if (q('#k-pay')) q('#k-pay').onclick = function () { openBookingPay(b, body); };
    if (q('#k-ref')) q('#k-ref').onclick = function () { openRefund('booking', b, body); };
    $$('[data-pay]', body).forEach(function (row) { row.onclick = function () { var p = b.payments.filter(function (x) { return x.id === row.dataset.pay; })[0]; if (p) openVoid(p, 'booking', body); }; });
    if (q('#k-in')) q('#k-in').onclick = function () {
      var x = this; busy(x, true);
      api('deskBookingCheckIn', { id: b.id }).then(function (r) { vibrate(); toast(b.guest + ' checked in to room ' + b.rooms.join(', ')); after(sheets.length); void r; },
        function (e) { busy(x, false); toast(errText(e)); });
    };
    if (q('#k-ns')) q('#k-ns').onclick = function () {
      var x = this;
      if (!x.dataset.sure) { x.dataset.sure = 1; x.textContent = 'Tap again: no-show, advance kept'; return; }
      busy(x, true);
      api('deskBookingNoShow', { id: b.id }).then(function (r) { toast('Marked as no-show. Rooms are free again.'); drawBooking(body, r.booking); X.cal = null; }, function (e) { busy(x, false); toast(errText(e)); });
    };
  }

  /* new booking or edit (pending: details; confirmed: also dates and rooms) */
  function openBookingForm(b, parentBody) {
    var isNew = !b || !b.id, pre = b || {};
    var body = openSheet(isNew ? 'New booking' : 'Edit booking');
    var t = S.st.today, cin = pre.checkin || t, cout = pre.checkout || addDays(cin, 1);
    var types = ['Any', 'Deluxe Double (King)', 'Deluxe Twin', 'Large Twin'];
    body.innerHTML = (isNew ? '<p class="small">Saved as <b>Pending</b>. It goes on the calendar only after you record the advance and confirm.</p>' : '') +
      '<div class="grid2">' + field('Guest name', '<input class="input" id="b-guest" maxlength="80" value="' + esc(pre.guest || '') + '">', true) +
      field('Phone', '<div class="phonewrap"><span class="cc">+91</span><input class="input" id="b-phone" inputmode="numeric" maxlength="14" value="' + esc(pre.phone || '') + '"></div>', true) + '</div>' +
      field('Email', '<input class="input" id="b-email" type="email" maxlength="80" value="' + esc(pre.email || '') + '">') +
      '<div class="grid2">' + field('Check-in', '<input class="input" type="date" id="b-in" value="' + esc(cin) + '">', true) + field('Check-out', '<input class="input" type="date" id="b-out" value="' + esc(cout) + '">', true) + '</div>' +
      '<div class="grid2">' + field('Guests', '<input class="input" id="b-guests" inputmode="numeric" value="' + (pre.guests || 2) + '">', true) +
      (pre.status === 'Confirmed' ? '<div></div>' : field('Rooms needed', '<input class="input" id="b-rooms" inputmode="numeric" value="' + (pre.roomsNeeded || 1) + '">')) + '</div>' +
      '<p class="small" id="b-hint"></p>' +
      (pre.status === 'Confirmed' ? '<div class="field"><span>Room numbers</span><div class="pick" id="b-pick"></div></div>' : field('Room preference', '<select class="input" id="b-type">' + types.map(function (x) { return '<option' + (x === (pre.roomType || 'Any') ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select>')) +
      field('Rate per room per night (₹)', '<input class="input" id="b-rate" inputmode="numeric" value="' + (pre.rate || (pre.roomPick && roomOf(pre.roomPick) ? roomOf(pre.roomPick).rate : 5000)) + '">', true) +
      (isNew ? '<div class="field"><span>Booked by</span>' + seg('src', ['Phone', 'WhatsApp', 'Walk-in', 'Website', 'Other'], 'Phone') + '</div>' : '') +
      field('Notes', '<textarea class="input" id="b-notes" rows="2" maxlength="400" placeholder="Arrival time, requests, negotiation…">' + esc(pre.notes || '') + '</textarea>') +
      (rcp() && pre.status === 'Confirmed' ? '<p class="small">Changing the rate of a confirmed booking needs a manager\'s approval.</p>' + field('Reason for a rate change', '<input class="input" id="b-why" maxlength="200">') : '') +
      '<div class="calc" id="b-calc"></div><p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">' + (isNew ? 'Save booking (pending)' : 'Save changes') + '</button>';
    wireSegs(body);
    var picked = (pre.rooms || []).slice();
    if (isNew && pre.roomPick) { var rp = roomOf(pre.roomPick); if (rp) { var sel = $('#b-type', body); sel.value = rp.type === 'Deluxe Double' ? 'Deluxe Double (King)' : rp.type; } }
    function calc() {
      var n = nights($('#b-in', body).value, $('#b-out', body).value), g = Number($('#b-guests', body).value.replace(/\D/g, '')) || 0;
      var rn = $('#b-rooms', body) ? Math.max(Number($('#b-rooms', body).value.replace(/\D/g, '')) || 1, Math.ceil(g / 3)) : picked.length || 1;
      var rate = Number($('#b-rate', body).value.replace(/\D/g, '')) || 0, tot = n * rn * rate;
      $('#b-hint', body).textContent = g > 3 ? g + ' guests need at least ' + Math.ceil(g / 3) + ' rooms (maximum 3 per room).' : '';
      $('#b-calc', body).innerHTML = n > 0 ? n + (n > 1 ? ' nights' : ' night') + ' × ' + rn + (rn > 1 ? ' rooms' : ' room') + ' × ' + inr(rate) + ' = <b>' + inr(tot) + '</b><br>Advance to confirm (50%): <b>' + inr(Math.ceil(tot / 2)) + '</b>' : 'Check-out must be after check-in';
    }
    function drawPick() {
      var pk = $('#b-pick', body); if (!pk) return;
      pk.innerHTML = '<span class="small">Checking free rooms…</span>';
      freeRooms($('#b-in', body).value, $('#b-out', body).value, pre.id).then(function (fr) {
        pk.innerHTML = S.st.rooms.map(function (r) { var ok = fr[r.room] === true || picked.indexOf(r.room) >= 0 && fr[r.room] === true;
          return '<button type="button" data-room="' + r.room + '" aria-pressed="' + (picked.indexOf(r.room) >= 0) + '"' + (fr[r.room] === true ? '' : ' disabled title="' + esc(fr[r.room] || '') + '"') + '>' + r.room + '<small>' + esc(r.type.replace('Deluxe ', '')) + '</small></button>'; void ok; }).join('');
        picked = picked.filter(function (n) { return fr[n] === true; });
        pk.onclick = function (e) { var x = e.target.closest('button'); if (!x || x.disabled) return; var n = Number(x.dataset.room), i = picked.indexOf(n); if (i >= 0) picked.splice(i, 1); else picked.push(n); x.setAttribute('aria-pressed', i < 0); calc(); };
        calc();
      });
    }
    ['#b-in', '#b-out', '#b-guests', '#b-rooms', '#b-rate'].forEach(function (x) { var el = $(x, body); if (el) el.addEventListener('input', calc); });
    ['#b-in', '#b-out'].forEach(function (x) { $(x, body).addEventListener('change', drawPick); });
    calc(); drawPick();
    $('#go', body).onclick = function () {
      var d = { guest: $('#b-guest', body).value, phone: $('#b-phone', body).value, email: $('#b-email', body).value, checkin: $('#b-in', body).value, checkout: $('#b-out', body).value,
        guests: $('#b-guests', body).value.replace(/\D/g, ''), rate: $('#b-rate', body).value.replace(/\D/g, ''), notes: $('#b-notes', body).value };
      if ($('#b-rooms', body)) d.roomsNeeded = $('#b-rooms', body).value.replace(/\D/g, '');
      if ($('#b-type', body)) d.roomType = $('#b-type', body).value;
      if (pre.status === 'Confirmed') d.rooms = picked;
      if ($('#b-why', body)) d.reason = $('#b-why', body).value;
      if (isNew) { d.source = segVal(body, 'src'); if (pre.roomPick) d.notes = (d.notes ? d.notes + ' · ' : '') + 'Asked for room ' + pre.roomPick; }
      else d.id = pre.id;
      submit(this, $('#err', body), isNew ? 'deskBookingCreate' : 'deskBookingUpdate', d, function (r) {
        X.cal = null; X.bookings = null;
        toast(isNew ? 'Booking saved as pending' : 'Booking updated');
        closeSheet();
        if (parentBody) drawBooking(parentBody, r.booking); else setTimeout(function () { openBooking(r.booking.id); }, 60);
        if (S.tab === 'calendar' || S.tab === 'bookings') loadExtra();
      });
    };
  }

  /* which rooms are free for [from, to)?  room -> true | reason text */
  function freeRooms(from, to, skipBooking) {
    if (!from || !to || nights(from, to) <= 0) return Promise.resolve({});
    return api('deskCalendar', { from: from, days: Math.min(62, nights(from, to)) }).then(function (c) {
      var out = {};
      c.rooms.forEach(function (r) {
        var hit = c.bars.filter(function (b) { return b.room === r.room && b.kind !== 'past' && b.id !== skipBooking && b.from < to && from < b.to; })[0];
        out[r.room] = hit ? (hit.kind === 'booked' ? 'Booked: ' : 'Staying: ') + hit.guest + ' ' + dShort(hit.from) + '–' + dShort(hit.to) : true;
      });
      return out;
    }, function () { var o = {}; S.st.rooms.forEach(function (r) { o[r.room] = true; }); return o; });
  }

  function openConfirm(b, parentBody) {
    var body = openSheet('Confirm booking', 'arr');
    var want = b.roomsNeeded, pref = String(b.roomType || 'Any').toLowerCase();
    body.innerHTML = '<div class="note"><b>' + esc(b.guest) + ' · ' + esc(dShort(b.checkin)) + ' to ' + esc(dShort(b.checkout)) + '</b>' + b.guests + ' guests · ' + want + (want > 1 ? ' rooms' : ' room') + ' · ' + esc(b.roomType) + '</div>' +
      '<div class="field"><span class="label">1 · Choose ' + want + (want > 1 ? ' rooms' : ' room') + ' (free on these dates)</span><div class="pick" id="c-pick"><span class="small">Checking free rooms…</span></div></div>' +
      field('Rate per room per night (₹)', '<input class="input" id="c-rate" inputmode="numeric" value="' + b.rate + '">') +
      '<div class="calc" id="c-calc"></div>' +
      '<p class="label">2 · Money received</p>' +
      field('Amount received (₹)', '<input class="input" id="c-amt" inputmode="numeric" value="' + b.advanceDue + '">', true) +
      '<div class="field"><span>Received by</span>' + seg('method', S.st.methods, 'UPI') + '</div>' + refField('c-ref') +
      '<div class="policy"><b>Cancellation policy</b>' + esc(S.st.policy.text) + '</div>' +
      '<p class="err" id="err" role="alert"></p><div id="c-warn"></div><button class="btn btn-gold big-cta" id="go" type="button">Money received: confirm booking</button>' +
      '<p class="small">Saved with your name (' + esc(S.me.name) + ') and the time. The rooms are then blocked on the calendar.</p>';
    wireSegs(body);
    var picked = [];
    function total() { return b.nights * Math.max(picked.length, 1) * (Number($('#c-rate', body).value.replace(/\D/g, '')) || 0); }
    function calc() { var tt = total(); $('#c-calc', body).innerHTML = 'Total ' + inr(tt) + ' · advance needed (50%) <b>' + inr(Math.ceil(tt / 2)) + '</b>'; $('#c-warn', body).innerHTML = ''; $('#go', body).dataset.sure = ''; }
    $('#c-rate', body).addEventListener('input', calc);
    freeRooms(b.checkin, b.checkout, b.id).then(function (fr) {
      var pk = $('#c-pick', body);
      var free = S.st.rooms.filter(function (r) { return fr[r.room] === true; });
      var match = free.filter(function (r) { return pref === 'any' || pref.indexOf(r.type.toLowerCase().replace('deluxe double', 'deluxe double')) >= 0 || (pref.indexOf('king') >= 0 && r.type === 'Deluxe Double'); });
      picked = (match.length >= want ? match : free).slice(0, want).map(function (r) { return r.room; });
      pk.innerHTML = S.st.rooms.map(function (r) { return '<button type="button" data-room="' + r.room + '" aria-pressed="' + (picked.indexOf(r.room) >= 0) + '"' + (fr[r.room] === true ? '' : ' disabled title="' + esc(fr[r.room] || '') + '"') + '>' + r.room + '<small>' + esc(r.type.replace('Deluxe ', '')) + '</small></button>'; }).join('') +
        (free.length < want ? '<p class="err" style="grid-column:1/-1">Only ' + free.length + ' free on these dates.</p>' : '');
      pk.onclick = function (e) { var x = e.target.closest('button'); if (!x || x.disabled) return; var n = Number(x.dataset.room), i = picked.indexOf(n); if (i >= 0) picked.splice(i, 1); else picked.push(n); x.setAttribute('aria-pressed', i < 0); calc(); };
      calc();
    });
    $('#go', body).onclick = function () {
      var btn = this, amt = Number($('#c-amt', body).value.replace(/\D/g, '')) || 0, need = Math.ceil(total() / 2);
      if (amt > 0 && amt < need && !btn.dataset.sure) {
        btn.dataset.sure = 1;
        $('#c-warn', body).innerHTML = '<div class="conf">' + inr(amt) + ' is less than the 50% advance (' + inr(need) + '). Tap the button again to confirm anyway.</div>';
        return;
      }
      submit(btn, $('#err', body), 'deskBookingConfirm', { id: b.id, rooms: picked, rate: $('#c-rate', body).value.replace(/\D/g, ''), amount: $('#c-amt', body).value.replace(/\D/g, ''), method: segVal(body, 'method'), ref: $('#c-ref', body).value },
        function (r) { vibrate(); toast('Confirmed · room ' + r.booking.rooms.join(', ') + ' blocked'); X.cal = null; X.bookings = null; closeSheet(); drawBooking(parentBody, r.booking); refresh(); });
    };
  }

  function openBookingPay(b, parentBody) {
    var body = openSheet('Add payment');
    body.innerHTML = '<div class="calc">Balance at check-in: <b>' + inr(Math.max(0, b.total - b.advancePaid)) + '</b></div>' +
      field('Amount (₹)', '<input class="input" id="f-amt" inputmode="numeric">', true) + '<div class="field"><span>Paid by</span>' + seg('method', S.st.methods, 'UPI') + '</div>' + refField('f-ref') +
      field('Note', '<input class="input" id="f-note" maxlength="120">') + '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">Save payment</button>';
    wireSegs(body);
    $('#go', body).onclick = function () {
      submit(this, $('#err', body), 'deskBookingPay', { id: b.id, amount: $('#f-amt', body).value.replace(/\D/g, ''), method: segVal(body, 'method'), ref: $('#f-ref', body).value, note: $('#f-note', body).value },
        function (r) { toast('Payment saved'); closeSheet(); drawBooking(parentBody, r.booking); });
    };
  }

  function openCancel(b, parentBody) {
    var body = openSheet('Cancel booking', 'dirty');
    var paid = b.advancePaid - b.refunded, refund = b.refundable || 0, days = b.daysBefore;
    var outcome = b.status === 'Pending' ? '<div class="note"><b>Not confirmed</b>No advance was recorded, so there is nothing to refund. The booking will be closed.</div>'
      : refund > 0 ? '<div class="note ok"><b>Full refund: ' + inr(refund) + '</b>Cancelled ' + days + ' days before check-in (3 or more days), so the full advance is refunded.</div>'
      : '<div class="note bad"><b>No refund</b>' + (days < 0 ? 'The check-in date has passed.' : days === 0 ? 'Cancelled on the day of arrival.' : 'Cancelled ' + days + (days === 1 ? ' day' : ' days') + ' before check-in (less than 3).') + ' The advance of ' + inr(paid) + ' is kept, as per the policy. It cannot be moved to another date.</div>';
    body.innerHTML = outcome +
      (b.status === 'Confirmed' && (refund > 0 || owner()) ? (owner() ? field('Refund amount (₹)' + (refund > 0 ? '' : ' (owner can change)'), '<input class="input" id="x-amt" inputmode="numeric" value="' + refund + '">') : '') +
        '<div id="x-how"' + (refund > 0 ? '' : ' hidden') + '><div class="field"><span>Refunded by</span>' + seg('method', S.st.methods, 'UPI') + '</div>' + refField('x-ref') + '</div>' : '') +
      field('Reason', '<input class="input" id="x-why" maxlength="160" placeholder="e.g. Guest changed plans">') +
      '<div class="policy"><b>Cancellation policy</b>' + esc(S.st.policy.text) + '</div>' +
      (rcp() && b.status === 'Confirmed' ? '<div class="note gold"><b>Needs approval</b>This booking has money recorded, so the cancellation is sent to the manager. It is cancelled when they approve it.</div>' : '') +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-danger big-cta" id="go" type="button">' + (rcp() && b.status === 'Confirmed' ? 'Send cancellation for approval' : 'Cancel this booking') + '</button>';
    wireSegs(body);
    var amtEl = $('#x-amt', body);
    if (amtEl) amtEl.addEventListener('input', function () { $('#x-how', body).hidden = !(Number(amtEl.value.replace(/\D/g, '')) > 0); });
    $('#go', body).onclick = function () {
      var x = this;
      if (!x.dataset.sure) { x.dataset.sure = 1; x.textContent = 'Tap again to confirm'; return; }
      var d = { id: b.id, reason: $('#x-why', body).value };
      if (amtEl) d.refund = amtEl.value.replace(/\D/g, '');
      if ($('#x-how', body)) { d.method = segVal(body, 'method'); d.ref = $('#x-ref', body).value; }
      submit(x, $('#err', body), 'deskBookingCancel', d, function (r) { toast('Booking cancelled'); X.cal = null; X.bookings = null; closeSheet(); drawBooking(parentBody, r.booking); refresh(); });
    };
  }

  /* ---------- Refunds and corrections ---------- */
  function openRefund(kind, o, parentBody, preset) {
    var max = kind === 'stay' ? o.paid : o.advancePaid - o.refunded;
    var body = openSheet(kind === 'stay' ? 'Refund · Room ' + o.room : 'Refund advance');
    body.innerHTML = '<div class="calc">' + (kind === 'stay' ? 'Paid on this bill: <b>' + inr(o.paid) + '</b>' + (o.balance < 0 ? ' · guest overpaid by <b>' + inr(-o.balance) + '</b>' : '') : 'Advance held: <b>' + inr(max) + '</b>') + '</div>' +
      approvalNote() +
      field('Amount to give back (₹)', '<input class="input" id="r-amt" inputmode="numeric" value="' + (preset || (o.balance < 0 ? -o.balance : '')) + '">', true) +
      '<div class="field"><span>Paid back by</span>' + seg('method', S.st.methods, 'Cash') + '</div>' + refField('r-ref') +
      reasonField('r-why', 'e.g. Extra mattress cancelled, guest overpaid') +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">' + goLabel('Record refund') + '</button>' +
      '<p class="small">The refund is saved with your name and appears on the bill and in the Payments tab of the sheet.</p>';
    wireSegs(body);
    $('#go', body).onclick = function () {
      var amt = Number($('#r-amt', body).value.replace(/\D/g, '')) || 0;
      if (amt > max) { $('#err', body).textContent = 'That is more than ' + inr(max) + '.'; return; }
      submit(this, $('#err', body), kind === 'stay' ? 'deskRefund' : 'deskBookingRefund', { id: o.id, amount: String(amt), method: segVal(body, 'method'), ref: $('#r-ref', body).value, reason: $('#r-why', body).value },
        function (r) { toast('Refund recorded'); closeSheet(); if (parentBody) { if (r.stay) drawStay(parentBody, r.stay); else drawBooking(parentBody, r.booking); } else refresh(); });
    };
  }

  function openVoid(p, kind, parentBody) {
    var body = openSheet('Correct a payment');
    body.innerHTML = '<div class="bill"><div class="bl ' + (p.amount < 0 ? 'refund' : 'paid') + '"><span class="t">' + (p.amount < 0 ? 'Refund · ' : 'Payment · ') + esc(p.method) + '</span><span class="d">' + esc(tShort(p.at)) + ' · ' + esc(p.by) + (p.ref ? ' · Ref ' + esc(p.ref) : '') + (p.note ? ' · ' + esc(p.note) : '') + '</span><span class="a">' + inr(Math.abs(p.amount)) + '</span></div></div>' +
      '<div class="sec-h"><h2>Transaction number</h2></div>' + field('Transaction / reference no.', '<input class="input" id="v-ref" maxlength="40" value="' + esc(p.ref || '') + '">') +
      '<p class="err" id="rerr" role="alert"></p><button class="btn btn-line" type="button" id="sref">Save transaction no.</button>' +
      '<div class="sec-h"><h2>Wrong amount?</h2></div>' +
      '<p class="small">Use this only if the entry is wrong, for example the wrong amount or entered twice. The entry is cancelled (it stays visible in the sheet as voided). Then record the correct amount again.</p>' +
      approvalNote() + reasonField('v-why', 'e.g. Entered twice by mistake') +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-danger big-cta" id="go" type="button">' + goLabel('Cancel this entry') + '</button>';
    $('#sref', body).onclick = function () {
      submit(this, $('#rerr', body), 'deskPaymentRef', { id: p.id, ref: $('#v-ref', body).value.trim() }, function (r) {
        toast('Transaction number saved'); closeSheet(); if (r.stay) drawStay(parentBody, r.stay); else if (r.booking) drawBooking(parentBody, r.booking); });
    };
    $('#go', body).onclick = function () {
      var x = this;
      if (!x.dataset.sure) { x.dataset.sure = 1; x.textContent = 'Tap again to confirm'; return; }
      submit(x, $('#err', body), 'deskVoidPayment', { id: p.id, reason: $('#v-why', body).value }, function (r) {
        toast('Entry cancelled'); closeSheet(); if (r.stay) drawStay(parentBody, r.stay); else if (r.booking) drawBooking(parentBody, r.booking); });
    };
    void kind;
  }

  /* ---------- Approvals (managers) / My requests (reception) ---------- */
  var TYPE_LABEL = { editCharge: 'Bill item', refund: 'Refund', voidPayment: 'Payment correction', updateStay: 'Rate change', bookingUpdate: 'Rate change', bookingCancel: 'Cancellation', bookingRefund: 'Refund' };
  var REQ = null;
  function viewApprovals(v) {
    var title = approver() ? 'Approvals' : 'My requests';
    if (!REQ) { v.innerHTML = '<div><p class="kicker">Money changes</p><h1>' + title + '</h1></div><div class="loading">Loading…</div>'; loadReq(); return; }
    function card(r, live) {
      return '<article class="req' + (live ? ' live' : '') + '"><header><span class="st-pill s-' + (r.status === 'Pending' ? 'pend' : r.status === 'Approved' ? 'conf' : 'canc') + '">' + esc(r.status) + '</span>' +
        '<span class="req-type">' + esc(TYPE_LABEL[r.type] || r.type) + '</span><time>' + esc(tShort(r.at)) + '</time></header>' +
        '<p class="req-what">' + esc(r.summary) + '</p><p class="req-why"><b>' + esc(r.by) + ':</b> “' + esc(r.reason) + '”</p>' +
        (r.status !== 'Pending' ? '<p class="small">' + esc(r.status) + ' by ' + esc(r.decidedBy) + ' · ' + esc(tShort(r.decidedAt)) + (r.decisionNote ? ' · ' + esc(r.decisionNote) : '') + '</p>' : '') +
        (live ? '<div class="req-act"><input class="input" placeholder="Note (optional)" maxlength="200" data-note="' + esc(r.id) + '"><button class="btn btn-ok" type="button" data-ok="' + esc(r.id) + '">Approve</button><button class="btn btn-danger" type="button" data-no="' + esc(r.id) + '">Reject</button></div><p class="err" data-err="' + esc(r.id) + '"></p>' : '') +
        '</article>';
    }
    v.innerHTML = '<div class="hrow"><div><p class="kicker">Money changes</p><h1>' + title + '</h1></div><button class="refresh" id="rf" type="button">Refresh</button></div>' +
      (approver() ? '<p class="sub">Receptionists cannot change money that is already recorded. Their requests wait here. When you approve, the change is made at once and saved with both names.</p>'
        : '<p class="sub">Changes to recorded money (refunds, removing paid items, rate changes, corrections) are sent to the manager. You see their decision here.</p>') +
      '<div class="sec-h"><h2>Waiting</h2><span class="small">' + REQ.pending.length + '</span></div>' +
      (REQ.pending.length ? '<div class="reqs">' + REQ.pending.map(function (r) { return card(r, approver()); }).join('') + '</div>' : '<div class="note ok"><b>All clear</b>Nothing is waiting for approval.</div>') +
      '<div class="sec-h"><h2>Decided</h2></div>' + (REQ.done.length ? '<div class="reqs">' + REQ.done.map(function (r) { return card(r, false); }).join('') + '</div>' : '<div class="empty">Nothing yet.</div>');
    $('#rf', v).onclick = function () { REQ = null; render(); };
    $$('[data-ok],[data-no]', v).forEach(function (b) {
      b.onclick = function () {
        var idv = b.dataset.ok || b.dataset.no, ok = !!b.dataset.ok, err = $('[data-err="' + idv + '"]', v);
        busy(b, true); err.textContent = '';
        api('deskRequestDecide', { id: idv, approve: ok, note: $('[data-note="' + idv + '"]', v).value }).then(function (r) {
          vibrate(); toast(ok ? 'Approved and done' : 'Rejected'); REQ = r; render(); refresh(); X.cal = null; X.bookings = null;
        }, function (e) { busy(b, false); err.textContent = errText(e); });
      };
    });
  }
  function loadReq() { api('deskRequests').then(function (r) { REQ = r; if (S.tab === 'approvals') render(); }, function (e) { toast(errText(e)); }); }

  /* ---------- Sales report (owner only) ---------- */
  var REP = { year: null, data: null };
  function viewReports(v) {
    if (!owner()) { S.tab = 'rooms'; return render(); }
    var yr = REP.year || S.st.today.slice(0, 4);
    if (!REP.data || REP.data.year !== yr) {
      v.innerHTML = '<div><p class="kicker">Owner only</p><h1>Sales</h1></div><div class="loading">Adding up ' + esc(yr) + '…</div>';
      api('deskReport', { year: yr }).then(function (r) { REP.data = r; REP.year = r.year; if (S.tab === 'reports') render(); }, function (e) { toast(errText(e)); });
      return;
    }
    var d = REP.data, t = d.total, max = Math.max.apply(null, d.months.map(function (m) { return m.sales; }).concat([1]));
    var curM = d.partial ? Number(S.st.today.slice(5, 7)) : 12, best = d.months.reduce(function (a, m) { return m.sales > a.sales ? m : a; }, d.months[0]);
    function short(n) { return n >= 100000 ? '₹' + (n / 100000).toFixed(n >= 1000000 ? 0 : 1) + 'L' : n >= 1000 ? '₹' + Math.round(n / 1000) + 'k' : '₹' + n; }
    v.innerHTML = '<div class="hrow"><div><p class="kicker">Owner only · ' + (d.partial ? 'so far this year' : 'full year') + '</p><h1>Sales ' + esc(d.year) + '</h1></div>' +
      '<div class="upd">' + d.years.map(function (y) { return '<button type="button" class="refresh' + (y === d.year ? ' gold' : '') + '" data-year="' + esc(y) + '">' + esc(y) + '</button>'; }).join('') + '<button class="refresh" type="button" id="rf">Refresh</button></div></div>' +
      '<div class="kpis">' +
      '<div class="kpi cash"><span>Total sales</span><b>' + inr(t.sales) + '</b><small>Rooms ' + inr(t.rooms) + ' · extras ' + inr(t.extras) + '</small></div>' +
      '<div class="kpi cash"><span>Money collected</span><b>' + inr(t.collected - t.refunds) + '</b><small>' + (t.refunds ? 'after ' + inr(t.refunds) + ' refunds' : 'no refunds') + '</small></div>' +
      '<div class="kpi c-occ"><span>Room nights sold</span><b>' + t.nights + '</b><small>' + t.stays + ' stays · ' + t.guests + ' guests</small></div>' +
      '<div class="kpi c-arr"><span>Occupancy</span><b>' + t.occupancy + '<small>%</small></b><small>of ' + d.rooms + ' rooms × the year</small></div>' +
      '<div class="kpi c-ready"><span>Average room rate</span><b>' + inr(t.adr) + '</b><small>per night sold</small></div>' +
      '<div class="kpi c-dirty"><span>Best month</span><b>' + (best.sales ? MON[best.month - 1] : '–') + '</b><small>' + (best.sales ? inr(best.sales) : 'no sales yet') + '</small></div></div>' +
      '<div class="panel"><div class="sec-h"><h2>Sales by month</h2><span class="small">tap a month for details</span></div><div class="bars">' + d.months.map(function (m) {
        var h = m.sales ? Math.max(3, Math.round(m.sales / max * 100)) : 0, fut = d.partial && m.month > curM;
        return '<button type="button" class="bar-col' + (m.month === curM && d.partial ? ' now' : '') + (fut ? ' fut' : '') + '" data-month="' + m.month + '" aria-label="' + MON[m.month - 1] + ' ' + inr(m.sales) + '"><span class="bar-v">' + (m.sales ? short(m.sales) : '') + '</span><span class="bar-track"><span class="bar-fill" style="height:' + h + '%"></span></span><span class="bar-m">' + MON[m.month - 1] + '</span></button>';
      }).join('') + '</div></div>' +
      '<div class="tbl-wrap"><table class="tbl rep"><thead><tr><th>Month</th><th class="r">Sales</th><th class="r hide-s">Rooms</th><th class="r hide-s">Extras</th><th class="r">Nights</th><th class="r hide-s">Occ.</th><th class="r hide-s">Avg rate</th><th class="r">Collected</th><th class="r hide-s">Refunds</th></tr></thead><tbody>' +
      d.months.filter(function (m) { return !(d.partial && m.month > curM); }).map(function (m) {
        return '<tr data-month="' + m.month + '"><td><b>' + MON[m.month - 1] + '</b></td><td class="r">' + inr(m.sales) + '</td><td class="r hide-s">' + inr(m.rooms) + '</td><td class="r hide-s">' + inr(m.extras) + '</td><td class="r">' + m.nights + '</td><td class="r hide-s">' + m.occupancy + '%</td><td class="r hide-s">' + (m.adr ? inr(m.adr) : '–') + '</td><td class="r">' + inr(m.collected - m.refunds) + '</td><td class="r hide-s">' + (m.refunds ? inr(m.refunds) : '–') + '</td></tr>';
      }).join('') +
      '<tr class="tot"><td><b>' + esc(d.year) + '</b></td><td class="r"><b>' + inr(t.sales) + '</b></td><td class="r hide-s">' + inr(t.rooms) + '</td><td class="r hide-s">' + inr(t.extras) + '</td><td class="r"><b>' + t.nights + '</b></td><td class="r hide-s">' + t.occupancy + '%</td><td class="r hide-s">' + inr(t.adr) + '</td><td class="r"><b>' + inr(t.collected - t.refunds) + '</b></td><td class="r hide-s">' + (t.refunds ? inr(t.refunds) : '–') + '</td></tr>' +
      '</tbody></table></div>' +
      '<div class="dash"><div class="dcol"><div class="panel"><div class="sec-h"><h2>Money by method</h2></div><div class="list">' + Object.keys(t.byMethod).map(function (k) {
        return '<div class="bl"><span class="t">' + esc(k) + '</span><span class="a">' + inr(t.byMethod[k]) + '</span></div>'; }).join('') + (Object.keys(t.byMethod).length ? '' : '<div class="bl"><span class="d">No payments yet</span></div>') + '</div></div></div>' +
      '<div class="dcol"><div class="panel"><div class="sec-h"><h2>Items sold</h2></div><div class="list">' + (d.items.length ? d.items.map(function (i) {
        return '<div class="bl"><span class="t">' + esc(i.item) + '</span><span class="d">' + i.qty + ' sold' + (i.free ? ' · ' + i.free + ' given free' : '') + '</span><span class="a">' + inr(i.amount) + '</span></div>'; }).join('') : '<div class="bl"><span class="d">Nothing yet</span></div>') + '</div></div>' +
      '<div class="panel"><div class="sec-h"><h2>Bookings</h2></div><div class="list"><div class="bl"><span class="t">Bookings made</span><span class="a">' + d.bookings.made + '</span></div><div class="bl"><span class="t">Cancelled</span><span class="a">' + d.bookings.cancelled + '</span></div><div class="bl"><span class="t">No-shows</span><span class="a">' + d.bookings.noShow + '</span></div></div></div></div></div>' +
      '<p class="small">Sales count each stay (room + extras) in the month the guest checked out. Money collected counts payments on the day they were received, after refunds. Guests staying now are added when they check out.</p>';
    $$('[data-year]', v).forEach(function (b) { b.onclick = function () { REP.year = b.dataset.year; REP.data = null; render(); }; });
    $('#rf', v).onclick = function () { REP.data = null; render(); };
    $$('[data-month]', v).forEach(function (b) { b.onclick = function () { monthSheet(d, Number(b.dataset.month)); }; });
  }
  function monthSheet(d, mn) {
    var m = d.months[mn - 1], body = openSheet(MON[mn - 1] + ' ' + d.year);
    body.innerHTML = '<div class="kpis"><div class="kpi cash"><span>Sales</span><b>' + inr(m.sales) + '</b><small>' + m.stays + ' stays</small></div><div class="kpi cash"><span>Collected</span><b>' + inr(m.collected - m.refunds) + '</b><small>' + (m.refunds ? inr(m.refunds) + ' refunded' : 'no refunds') + '</small></div></div>' +
      '<div class="list">' +
      [['Room charges', inr(m.rooms)], ['Extras (water, kits, mattress, late check-out)', inr(m.extras)], ['Room nights sold', m.nights], ['Guests', m.guests], ['Occupancy', m.occupancy + '%'], ['Average room rate', m.adr ? inr(m.adr) : '–']]
        .map(function (r) { return '<div class="bl"><span class="t">' + r[0] + '</span><span class="a">' + r[1] + '</span></div>'; }).join('') + '</div>' +
      '<div class="sec-h"><h2>Money received by method</h2></div><div class="list">' + (Object.keys(m.byMethod).length ? Object.keys(m.byMethod).map(function (k) { return '<div class="bl"><span class="t">' + esc(k) + '</span><span class="a">' + inr(m.byMethod[k]) + '</span></div>'; }).join('') : '<div class="bl"><span class="d">No payments this month</span></div>') + '</div>';
  }

  /* ---------- Bills (GST tax invoices) ---------- */
  function titleSeg(id, val) {
    return '<div class="seg title-seg" id="' + id + '">' + [['Mr.', 'Mr.'], ['Ms.', 'Ms.'], ['Mrs.', 'Mrs.'], ['Dr.', 'Dr.'], ['', 'Name only']].map(function (o) {
      return '<button type="button" data-t="' + o[0] + '" aria-pressed="' + (o[0] === val) + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  }
  function wireTitleSeg(root, onChange) {
    $$('.title-seg', root).forEach(function (g) {
      $$('button', g).forEach(function (b) { b.onclick = function () { $$('button', g).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); if (onChange) onChange(b.dataset.t); }; });
    });
  }
  function titleVal(root, id) { var b = $('#' + id + ' [aria-pressed="true"]', root); return b ? b.dataset.t : ''; }
  function showBill(b) {
    var d = Object.assign({}, b.data, { url: b.url });
    if (!demo) { window.open(b.url, '_blank', 'noopener'); return; }
    var w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to see the bill'); return; }
    w.document.open(); w.document.write(NikadiBill.billHTML(d, { toolbar: true, logo: '../img/brand/logo.png' })); w.document.close();
  }
  function whenText(st) {
    var m = /^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)/.exec(String(st || '')); if (!m) return st || '';
    var h = +m[4], mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1];
    return +m[3] + ' ' + mon + ', ' + ((h % 12) || 12) + ':' + m[5] + (h < 12 ? ' AM' : ' PM');
  }
  function billStatus(b) {
    var st = String(b.status || '');
    if (st === 'Scheduled') return { k: 'wait', t: 'Will be emailed automatically to ' + b.email + ' on ' + whenText(b.sendAt) + (b.hasPdf ? ' (PDF ready)' : '') };
    if (st === 'Sent') return { k: 'ok', t: 'Emailed: ' + String(b.sent || '').replace(' → ', ' to ') };
    if (st === 'No email') return { k: 'warn', t: 'No email address, so nothing is sent automatically. Send it on WhatsApp' + (approver() ? ', or add an email below.' : ', or ask a manager to add an email.') };
    if (/^Stopped/.test(st)) return { k: 'warn', t: 'Automatic email stopped (' + st.replace(/^Stopped by /, 'by ') + ').' };
    if (/^Failed/.test(st)) return { k: 'bad', t: 'The automatic email did not go through. ' + (approver() ? 'Use “Email now”.' : 'Ask a manager to send it.') };
    return { k: 'wait', t: st };
  }
  function printBill(b) {
    var d = Object.assign({}, b.data, { url: b.url });
    if (!demo) { var w0 = window.open(b.url + '&print=1', '_blank'); if (!w0) toast('Allow pop-ups to print the bill'); return; }
    var w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to print the bill'); return; }
    w.document.open(); w.document.write(NikadiBill.billHTML(d, { logo: '../img/brand/logo.png' })); w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 700);
  }
  function openBill(b, o) {
    o = o || {};
    var body = openSheet('Bill ' + b.no), pdf = null, pdfJob = null, A = approver();
    function billData(b) { var d = JSON.parse(JSON.stringify(b.data)); d.url = b.url; return d; }
    function makePdf(b) {
      if (pdf) return Promise.resolve(pdf);
      if (!pdfJob) pdfJob = NikadiBillPdf.make(billData(b), { base: '' }).then(function (r) { pdf = r; pdfJob = null; return r; }, function (e) { pdfJob = null; throw e; });
      return pdfJob;
    }
    function savePdf(b) { // keep the PDF on the server so the automatic email can attach it
      return makePdf(b).then(function (r) { return api('deskBillPdf', { id: b.stay, pdf: r.base64() }); }).then(function (r) { return Object.assign(r.bill, { stay: b.stay }); });
    }
    var OPEN = {};
    /* After any change: fetch the re-made bill, save a fresh PDF for the automatic email, redraw. */
    function refresh(b, msg) {
      pdf = null; pdfJob = null;
      return api('deskBill', { id: b.stay }).then(function (r) { var nb = Object.assign(r.bill, { stay: b.stay }); return nb.status === 'Sent' ? nb : savePdf(nb); })
        .then(function (nb) { draw(nb, msg); }, function (e) { toast(errText(e)); });
    }
    function editors(b) {
      api('deskStay', { id: b.stay }).then(function (r) {
        var st = r.stay, er = $('#ed-room', body), ei = $('#ed-items', body), ep = $('#ed-pays', body);
        if (!er) return;
        /* room */
        er.className = '';
        er.innerHTML = field('Rate per night (₹, incl. GST)', '<input class="input" id="e-rate" inputmode="numeric" value="' + esc(st.rate) + '">') +
          field('Discount name on the bill (optional)', '<input class="input" id="e-note" maxlength="60" value="' + esc(/^Booking /.test(st.rateNote || '') ? '' : st.rateNote || '') + '" placeholder="e.g. Festival offer, Repeat guest">') +
          '<div class="field"><span>Check-in</span><div class="input ro">' + esc(dShort(st.checkin)) + '</div></div>' +
          field('Check-out date', '<input class="input" id="e-out" type="date" value="' + esc(st.checkout) + '" min="' + esc(st.checkin) + '">') +
          '<div class="field"><span>Guests</span>' + seg('eg', ['1', '2', '3'], String(st.guests)) + '</div>' +
          '<p class="small">Now: ' + st.nights + ' night' + (st.nights > 1 ? 's' : '') + ' × ' + inr(st.rate) + ' = ' + inr(st.roomTotal) + '. The usual price stays on the bill and the difference shows as a discount.</p>' +
          '<p class="err" id="e-rerr" role="alert"></p><button class="btn btn-gold" type="button" id="e-rsave">Save room changes</button>';
        wireSegs(er);
        $('#e-rsave', er).onclick = function () {
          var x = this; busy(x, true); $('#e-rerr', er).textContent = '';
          api('deskUpdateStay', { id: st.id, rate: $('#e-rate', er).value.replace(/\D/g, ''), rateNote: $('#e-note', er).value.trim(), checkout: $('#e-out', er).value, guests: Number(segVal(er, 'eg')) })
            .then(function () { return refresh(b, 'Room changes saved. Bill, sales and member points are updated.'); }, function (e) { busy(x, false); $('#e-rerr', er).textContent = errText(e); });
        };
        /* items */
        ei.className = '';
        var sell = S.st.items.filter(function (i) { return i.sell; });
        ei.innerHTML = (st.charges.length ? '<div class="list">' + st.charges.map(function (ch, k) {
            return '<div class="bl ed-row" data-c="' + k + '"><span class="t"><b>' + esc(ch.item) + '</b><small>' + esc(dShort(ch.at)) + (ch.free ? ' · free' : '') + '</small></span>' +
              '<span class="ed-ctl"><input class="input sm" data-q inputmode="numeric" value="' + esc(ch.qty) + '" aria-label="Quantity"><span class="x">×</span><input class="input sm" data-p inputmode="numeric" value="' + esc(ch.price) + '" aria-label="Price"' + (ch.free ? ' disabled' : '') + '>' +
              '<button class="btn btn-quiet sm" type="button" data-save>Save</button><button class="btn btn-quiet sm danger" type="button" data-del>Remove</button></span></div>';
          }).join('') + '</div>' : '<p class="small">No items on this bill.</p>') +
          '<div class="sec-h"><h3>Add an item</h3></div>' +
          '<div class="ed-add"><select class="input" id="e-it">' + sell.map(function (i) { return '<option value="' + esc(i.item) + '" data-price="' + esc(i.price) + '">' + esc(i.item) + ' · ' + inr(i.price) + '</option>'; }).join('') + '</select>' +
          '<input class="input sm" id="e-iq" inputmode="numeric" value="1" aria-label="Quantity"><input class="input sm" id="e-ip" inputmode="numeric" placeholder="Price" aria-label="Price (blank = usual)">' +
          '<button class="btn btn-gold sm" type="button" id="e-iadd">Add</button></div>' +
          '<p class="err" id="e-ierr" role="alert"></p><p class="small">Adding, changing or removing items also corrects the stock.</p>';
        function ierr(e) { $('#e-ierr', ei).textContent = errText(e); }
        $$('[data-c]', ei).forEach(function (row) {
          var ch = st.charges[+row.dataset.c];
          $('[data-save]', row).onclick = function () {
            var x = this; busy(x, true);
            api('deskEditCharge', { id: ch.id, qty: Number($('[data-q]', row).value), price: ch.free ? 0 : $('[data-p]', row).value.replace(/\D/g, '') || '0', free: ch.free, reason: 'Bill corrected after check-out' })
              .then(function () { return refresh(b, ch.item + ' changed. Stock and bill updated.'); }, function (e) { busy(x, false); ierr(e); });
          };
          $('[data-del]', row).onclick = function () {
            var x = this;
            if (x.dataset.sure !== '1') { x.dataset.sure = '1'; x.textContent = 'Sure?'; return; }
            busy(x, true);
            api('deskEditCharge', { id: ch.id, remove: true, reason: 'Removed from bill after check-out' })
              .then(function () { return refresh(b, ch.item + ' removed. Stock and bill updated.'); }, function (e) { busy(x, false); ierr(e); });
          };
        });
        $('#e-iadd', ei).onclick = function () {
          var x = this, pr = $('#e-ip', ei).value.replace(/\D/g, ''); busy(x, true);
          api('deskCharge', { id: st.id, item: $('#e-it', ei).value, qty: Number($('#e-iq', ei).value), price: pr === '' ? undefined : pr })
            .then(function () { return refresh(b, 'Item added. Stock and bill updated.'); }, function (e) { busy(x, false); ierr(e); });
        };
        /* payments */
        ep.className = '';
        var PAYS = (st.advancePays || []).map(function (p) { return Object.assign({ adv: true }, p); }).concat(st.payments.filter(function (p) { return p.method !== 'From advance'; }));
        ep.innerHTML = (PAYS.length ? '<div class="list">' + PAYS.map(function (pm, k) {
            return '<div class="bl ed-row" data-p="' + k + '"><span class="t"><b>' + inr(pm.amount) + ' · ' + esc(pm.method) + '</b><small>' + esc(dShort(pm.at)) + (pm.note ? ' · ' + esc(pm.note) : '') + '</small></span>' +
              '<span class="ed-ctl"><input class="input" data-ref maxlength="40" value="' + esc(pm.ref || '') + '" placeholder="Transaction / ref. no." aria-label="Transaction number"><button class="btn btn-quiet sm" type="button" data-sref>Save no.</button></span>' +
              (pm.adv ? '' : '<span class="ed-ctl"><input class="input" data-why placeholder="Why cancel?" maxlength="120"><button class="btn btn-quiet sm danger" type="button" data-void>Cancel entry</button></span>') + '</div>';
          }).join('') + '</div>' : '<p class="small">No payments recorded.</p>') +
          '<div class="sec-h"><h3>Add a payment</h3></div>' +
          field('Amount (₹)', '<input class="input" id="e-pamt" inputmode="numeric">') + '<div class="field"><span>Paid by</span>' + seg('epm', S.st.methods, 'UPI') + '</div>' + refField('e-pref') +
          '<button class="btn btn-gold" type="button" id="e-padd">Add payment</button>' +
          '<div class="sec-h"><h3>Give money back</h3></div>' +
          field('Amount (₹)', '<input class="input" id="e-ramt" inputmode="numeric">') + '<div class="field"><span>Paid back by</span>' + seg('erm', S.st.methods, 'UPI') + '</div>' + refField('e-rref') +
          field('Reason', '<input class="input" id="e-rwhy" maxlength="120">') +
          '<button class="btn btn-line" type="button" id="e-radd">Record refund</button><p class="err" id="e-perr" role="alert"></p>';
        wireSegs(ep);
        function perr(e) { $('#e-perr', ep).textContent = errText(e); }
        $$('[data-p]', ep).forEach(function (row) {
          var pm = PAYS[+row.dataset.p], v = $('[data-void]', row);
          $('[data-sref]', row).onclick = function () {
            var x = this; busy(x, true);
            api('deskPaymentRef', { id: pm.id, ref: $('[data-ref]', row).value.trim() })
              .then(function () { return refresh(b, 'Transaction number saved on the bill.'); }, function (e) { busy(x, false); perr(e); });
          };
          if (!v) return;
          v.onclick = function () {
            var x = this; busy(x, true);
            api('deskVoidPayment', { id: pm.id, reason: $('[data-why]', row).value.trim() })
              .then(function () { return refresh(b, 'Payment entry cancelled. Bill and sales updated.'); }, function (e) { busy(x, false); perr(e); });
          };
        });
        $('#e-padd', ep).onclick = function () {
          var x = this; busy(x, true);
          api('deskPay', { id: st.id, amount: $('#e-pamt', ep).value.replace(/\D/g, ''), method: segVal(ep, 'epm'), ref: $('#e-pref', ep).value.trim() })
            .then(function () { return refresh(b, 'Payment added. Bill and sales updated.'); }, function (e) { busy(x, false); perr(e); });
        };
        $('#e-radd', ep).onclick = function () {
          var x = this; busy(x, true);
          api('deskRefund', { id: st.id, amount: $('#e-ramt', ep).value.replace(/\D/g, ''), method: segVal(ep, 'erm'), ref: $('#e-rref', ep).value.trim(), reason: $('#e-rwhy', ep).value.trim() })
            .then(function () { return refresh(b, 'Refund recorded. Bill and sales updated.'); }, function (e) { busy(x, false); perr(e); });
        };
      }, function (e) { var er = $('#ed-room', body); if (er) er.textContent = errText(e); });
    }
    function draw(b, msg) {
      var d = billData(b), c = NikadiBill.compute(d), ph = String(b.phone || '').replace(/\D/g, '').slice(-10), st = billStatus(b);
      body.innerHTML = '<div class="note"><b>' + esc(d.guest.company || d.guest.name) + '</b>Room ' + esc(d.room.no) + ' · ' + esc(dShort(d.checkin)) + ' – ' + esc(dShort(d.checkout)) + ' · Tax invoice ' + esc(b.no) + '</div>' +
        '<div class="bill"><div class="bl"><span class="t">Total (incl. GST)</span><span class="a">' + inr(c.total) + '</span></div>' +
        '<div class="bl paid"><span class="t">Paid</span><span class="a">' + inr(c.paid - c.refunded) + '</span></div>' +
        '<div class="bl due"><span class="t">' + (Math.abs(c.due) < 0.5 ? 'Fully paid' : c.due > 0 ? 'Still due' : 'To refund') + '</span><span class="a">' + inr(Math.abs(c.due)) + '</span></div></div>' +
        '<div class="bstat k-' + st.k + '">' + ICON.bills + '<span>' + esc(st.t) + '</span></div>' +
        '<p class="ok-note" id="bmsg"' + (msg ? '' : ' hidden') + '>' + esc(msg || '') + '</p>' +
        '<p class="small">Message starts: “Dear ' + esc(NikadiBill.greetName(d.guest)) + ',”' + (b.edited ? ' · Last changed ' + esc(b.edited) : '') + '</p>' +
        (A ? '<button class="btn btn-line edit-cta" type="button" id="bedit">✎ Edit this bill: rate, nights, items, payments</button>' : '') +
        '<div class="btn-col"><button class="btn btn-gold" type="button" id="bw">' + ICON_SHARE + ' Send PDF on WhatsApp</button>' +
        '<div class="btn-row"><button class="btn btn-line" type="button" id="bd">' + ICON_DL + ' Download PDF</button><button class="btn btn-line" type="button" id="bp">🖨 Print bill</button></div>' +
        '<button class="btn btn-quiet" type="button" id="bv">View bill online</button></div>' +
        (A ? '<div class="sec-h"><h2>Email</h2></div><div class="btn-row">' +
            (b.email ? '<button class="btn btn-line" type="button" id="bnow">Email now</button>' : '') +
            (b.status === 'Scheduled' ? '<button class="btn btn-quiet" type="button" id="bstop">Don\'t send automatically</button>' : '') +
            (/^Stopped|^Failed/.test(b.status || '') && b.email ? '<button class="btn btn-quiet" type="button" id="bres">Send automatically again</button>' : '') + '</div>' +
            '<p class="err" id="serr" role="alert"></p>' +
          '<div class="sec-h"><h2>Change the bill</h2><span class="small">manager / owner</span></div>' +
          '<details class="billx" data-sec="room"><summary>Room rate, nights and guests</summary><div id="ed-room" class="loading">Loading…</div></details>' +
          '<details class="billx" data-sec="items"><summary>Items (water, dental kit, mattress…)</summary><div id="ed-items" class="loading">Loading…</div></details>' +
          '<details class="billx" data-sec="pays"><summary>Payments and refunds</summary><div id="ed-pays" class="loading">Loading…</div></details>' +
          '<details class="billx" data-sec="guest"><summary>Guest name, email, company, GSTIN</summary>' +
            '<div class="field"><span>Greet the guest as</span>' + titleSeg('bt', b.title || '') + '</div>' +
            field('Guest name', '<input class="input" id="bn" maxlength="80" value="' + esc(b.name || d.guest.name) + '">') +
            field('Email', '<input class="input" id="be" type="email" inputmode="email" maxlength="80" value="' + esc(b.email || '') + '">') +
            field('Address (optional)', '<input class="input" id="ba" maxlength="160" value="' + esc(b.address || '') + '">') +
            field('Company / billing name', '<input class="input" id="bc" maxlength="80" value="' + esc(b.company || '') + '">') +
            field('Guest GSTIN', '<input class="input" id="bg" maxlength="15" style="text-transform:uppercase" value="' + esc(b.gstin || '') + '">') +
            '<p class="err" id="uerr" role="alert"></p><button class="btn btn-gold" type="button" id="bu">Save changes</button>' +
            '<p class="small">The invoice number and QR code stay the same. ' + (b.status === 'Sent' ? 'The guest already has the earlier bill: use “Email now” to send the new one.' : 'The changed bill is the one that gets emailed.') + ' Room, items and payment changes also update stock, sales, member points and the guest\'s stay history.</p></details>'
          : '<p class="small">Only a manager or the owner can change this bill or its email.</p>') +
        '<p class="small">The QR code on the bill opens it on www.nikadiguesthouse.com. Anyone with the link can see this bill, so share it only with the guest.</p>';
      function note(t) { var n = $('#bmsg', body); n.textContent = t; n.hidden = !t; }
      makePdf(b).catch(function () {}); // ready in the background, so WhatsApp opens straight away
      if (A) { wireTitleSeg(body); editors(b); }
      var be = $('#bedit', body); if (be) be.onclick = function () { var dt = $('details[data-sec="room"]', body); dt.open = true; OPEN.room = true; dt.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      $$('details[data-sec]', body).forEach(function (dt) { if (OPEN[dt.dataset.sec]) dt.open = true; dt.ontoggle = function () { OPEN[dt.dataset.sec] = dt.open; }; });
      $('#bv', body).onclick = function () { showBill(b); };
      $('#bp', body).onclick = function () { printBill(b); };
      $('#bd', body).onclick = function () {
        var x = this; busy(x, true);
        makePdf(b).then(function (r) { busy(x, false); NikadiBillPdf.download(r); }, function (e) { busy(x, false); toast(errText(e)); });
      };
      $('#bw', body).onclick = function () {
        if (!ph) { toast('No phone number for this guest'); return; }
        var x = this, text = NikadiBill.billWhatsApp(billData(b));
        if (!pdf) {
          busy(x, true);
          makePdf(b).then(function () { busy(x, false); x.textContent = 'PDF ready · tap to send on WhatsApp'; x.classList.add('pulse'); }, function (e) { busy(x, false); toast(errText(e)); });
          return;
        }
        try { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {}); } catch (e) {}
        NikadiBillPdf.share(pdf, text).then(function (ok) {
          if (ok === true) note('Shared. If WhatsApp did not add the message, paste it: it is copied.');
          else if (ok === false) {
            NikadiBillPdf.download(pdf);
            window.open('https://wa.me/91' + ph + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
            note('The PDF is downloaded and WhatsApp is open with the message. Attach the PDF (📎) in the chat and send.');
          }
        });
      };
      function sched(what, x) {
        busy(x, true); $('#serr', body).textContent = '';
        var p = what === 'now' ? makePdf(b).then(function (r) { return api('deskBillSchedule', { id: b.stay, what: 'now', pdf: r.base64() }); }) : api('deskBillSchedule', { id: b.stay, what: what });
        p.then(function (r) { draw(Object.assign(r.bill, { stay: b.stay }), what === 'now' ? 'Bill emailed with the PDF to ' + r.bill.email + (demo ? ' (demo: no real email is sent)' : '') : what === 'stop' ? 'The bill will not be emailed automatically.' : 'The bill will be emailed automatically.'); },
          function (e) { busy(x, false); $('#serr', body).textContent = errText(e); });
      }
      var bn;
      if ((bn = $('#bnow', body))) bn.onclick = function () { sched('now', this); };
      if ((bn = $('#bstop', body))) bn.onclick = function () { sched('stop', this); };
      if ((bn = $('#bres', body))) bn.onclick = function () { sched('resume', this); };
      if ((bn = $('#bu', body))) bn.onclick = function () {
        var x = this; busy(x, true); $('#uerr', body).textContent = '';
        api('deskBill', { id: b.stay, title: titleVal(body, 'bt'), name: $('#bn', body).value.trim(), email: $('#be', body).value.trim(), address: $('#ba', body).value.trim(),
          company: $('#bc', body).value.trim(), gstin: $('#bg', body).value.trim().toUpperCase() })
          .then(function () { return refresh(b, 'Guest details saved.'); }, function (e) { busy(x, false); $('#uerr', body).textContent = errText(e); });
      };
    }
    if (!b.data) {
      body.innerHTML = '<div class="loading">Loading bill…</div>';
      api('deskBill', { id: b.stay }).then(function (r) { r.bill.stay = b.stay; draw(r.bill); }, function (e) { body.innerHTML = '<p class="err">' + esc(errText(e)) + '</p>'; });
      return;
    }
    if (!b.stay) b.stay = b.data.stay;
    draw(b, o.auto ? 'Saving the PDF…' : '');
    if (o.auto) savePdf(b).then(function (nb) { draw(nb, nb.status === 'Scheduled' ? 'Bill saved. It goes to the guest by email automatically, 12 hours after check-out.' : 'Bill saved.'); },
      function (e) { draw(b, ''); toast(errText(e)); });
  }
  var BILLS = { list: null };
  function viewBills(v) {
    if (!BILLS.list) {
      v.innerHTML = '<div><p class="kicker">Front desk</p><h1>Bills</h1></div><div class="loading">Loading bills…</div>';
      api('deskBills').then(function (r) { BILLS.list = r.bills; if (S.tab === 'bills') render(); }, function (e) { toast(errText(e)); });
      return;
    }
    var L = BILLS.list;
    v.innerHTML = '<div class="hrow"><div><p class="kicker">Front desk · last ' + L.length + '</p><h1>Bills</h1></div><button class="btn btn-quiet" type="button" id="brf">Refresh</button></div>' +
      (L.length ? '<div class="list">' + L.map(function (b, i) {
        return '<button type="button" class="bl bl-btn" data-i="' + i + '"><span class="t"><b>' + esc(b.guest) + '</b><small>' + esc(b.no) + ' · Room ' + esc(b.room) + ' · ' + esc(dShort(b.at)) + (b.status === 'Scheduled' ? ' · emails ' + whenText(b.sendAt) : b.status === 'Sent' ? ' · emailed' : b.status ? ' · ' + b.status.toLowerCase() : '') + '</small></span><span class="a">' + inr(b.total) + '</span></button>';
      }).join('') + '</div>' : '<p class="small">No bills yet. A bill is made automatically when a guest checks out (from 13 Nov 2026 onwards). Open it here to view, send or edit it.</p>');
    $('#brf', v).onclick = function () { BILLS.list = null; render(); };
    $$('[data-i]', v).forEach(function (x) { x.onclick = function () { openBill({ stay: L[+x.dataset.i].stay, no: L[+x.dataset.i].no }); }; });
  }

  /* ---------- Attendance (owner only): first and last app opening on the guest house Wi-Fi each day ---------- */
  var ATT = { data: null, range: 'week', name: '' };
  function attRange(k) {
    var t = S.st ? S.st.today : new Date().toISOString().slice(0, 10), y = +t.slice(0, 4), m = +t.slice(5, 7);
    function add(d, n) { var x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
    if (k === 'today') return [t, t];
    if (k === 'week') return [add(t, -6), t];
    if (k === 'month') return [t.slice(0, 8) + '01', t];
    var pm = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y, last = new Date(Date.UTC(py, pm, 0)).getUTCDate();
    return [py + '-' + String(pm).padStart(2, '0') + '-01', py + '-' + String(pm).padStart(2, '0') + '-' + last];
  }
  function hm(a, b) {
    function t(x) { var m = /^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)/.exec(String(x || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) / 60000 : null; }
    var x = t(a), y = t(b); return x != null && y != null && y >= x ? y - x : null;
  }
  function dur(min) { if (min == null) return '—'; var h = Math.floor(min / 60), m = min % 60; return h + 'h ' + String(m).padStart(2, '0') + 'm'; }
  function clock(st) { var m = /(\d\d):(\d\d)/.exec(String(st || '').slice(11)); if (!m) return '—'; var h = +m[1]; return ((h % 12) || 12) + ':' + m[2] + (h < 12 ? ' AM' : ' PM'); }
  function viewAttendance(v) {
    if (!owner()) { v.innerHTML = '<p class="small">Only the owner can see this.</p>'; return; }
    if (!ATT.data) {
      v.innerHTML = '<div><p class="kicker">Owner only</p><h1>Attendance</h1></div><div class="loading">Loading…</div>';
      var r0 = attRange(ATT.range);
      api('deskAttendance', { from: r0[0], to: r0[1], name: ATT.name }).then(function (r) { ATT.data = r; if (S.tab === 'attendance') render(); }, function (e) { toast(errText(e)); });
      return;
    }
    var d = ATT.data, rows = d.rows, now = rows.filter(function (r) { return r.now; }), today = S.st ? S.st.today : '';
    var tot = {}; rows.forEach(function (r) { var t = tot[r.name] || (tot[r.name] = { days: 0, min: 0, role: r.role }); t.days++; t.min += hm(r.first, r.last) || 0; });
    var byDay = {}; rows.forEach(function (r) { (byDay[r.date] = byDay[r.date] || []).push(r); });
    v.innerHTML = '<div class="hrow"><div><p class="kicker">Owner only · first and last app opening on the guest house Wi-Fi</p><h1>Attendance</h1></div><button class="btn btn-quiet" type="button" id="arf">Refresh</button></div>' +
      (d.wifi.length ? '' : '<div class="bstat k-warn">' + ICON.attendance + '<span><b>Set up first:</b> connect this phone or PC to the guest house Wi-Fi and tap “This device is on the guest house Wi-Fi” at the bottom of this page.</span></div>') +
      '<div class="panel"><div class="sec-h"><h2>At the guest house now</h2><span class="small">app opened on the Wi-Fi in the last 15 min</span></div>' + (now.length ? '<div class="list">' + now.map(function (r) {
        return '<div class="bl"><span class="t"><b>' + esc(r.name) + '</b><small>' + esc(r.role) + ' · came in ' + esc(clock(r.first)) + ' · ' + esc(r.lastDevice || r.device || '') + '</small></span><span class="a"><span class="ptag k-ok">On Wi-Fi</span></span></div>';
      }).join('') + '</div>' : '<p class="small">Nobody right now.</p>') + '</div>' +
      '<div class="att-filters">' + seg('arange', ['Today', 'Last 7 days', 'This month', 'Last month'], { today: 'Today', week: 'Last 7 days', month: 'This month', last: 'Last month' }[ATT.range]) +
      '<select class="input" id="aname"><option value="">Everyone</option>' + d.people.map(function (p) { return '<option' + (p.name === ATT.name ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select></div>' +
      (Object.keys(tot).length ? '<div class="kpis">' + Object.keys(tot).map(function (n) { var t = tot[n]; return '<div class="kpi"><span>' + esc(n) + '</span><b>' + dur(t.min) + '</b><small>' + esc(t.role) + ' · ' + t.days + ' day' + (t.days > 1 ? 's' : '') + ' at work</small></div>'; }).join('') + '</div>' : '') +
      '<div class="panel"><div class="sec-h"><h2>Entry and exit</h2><span class="small">' + esc(dShort(d.from)) + ' – ' + esc(dShort(d.to)) + '</span></div>' +
      (rows.length ? '<div class="tbl-wrap"><table class="tbl att"><thead><tr><th>Person</th><th>Entry</th><th>Exit</th><th class="r">Time</th><th class="r hide-s">Opens</th></tr></thead><tbody>' +
        Object.keys(byDay).map(function (day) {
          return '<tr class="day"><td colspan="5">' + esc(day === today ? 'Today' : dShort(day)) + '</td></tr>' + byDay[day].map(function (r) {
            return '<tr><td><b>' + esc(r.name) + '</b><small>' + esc(r.role) + '</small></td><td>' + esc(clock(r.first)) + '<small class="dev">' + esc(r.device || '') + '</small></td>' +
              '<td>' + (r.now ? '<span class="ptag k-ok">Still here</span><small class="dev">last ' + esc(clock(r.last)) + '</small>' : esc(clock(r.last)) + (r.lastDevice && r.lastDevice !== r.device ? '<small class="dev">' + esc(r.lastDevice) + '</small>' : '')) + '</td>' +
              '<td class="r">' + dur(hm(r.first, r.last)) + '</td><td class="r hide-s">' + r.opens + '</td></tr>';
          }).join('');
        }).join('') + '</tbody></table></div>' : '<p class="small">No one opened the app on the guest house Wi-Fi in this period.</p>') +
      '<p class="small">Entry = first time the person opened the staff app on the guest house Wi-Fi that day. Exit = the last time (the app also checks in every 10 minutes while it is open on screen). Staff need to be logged in on their phone and open the app when they arrive and before they leave.</p></div>' +
      '<div class="panel"><div class="sec-h"><h2>Guest house Wi-Fi</h2></div>' +
      (d.wifi.length ? '<div class="list">' + d.wifi.map(function (ip) { return '<div class="bl"><span class="t"><b>Saved network</b><small>Internet address ' + esc(ip) + '</small></span><span class="a"><button class="btn btn-quiet sm danger" type="button" data-rm="' + esc(ip) + '">Remove</button></span></div>'; }).join('') + '</div>' : '<p class="small">No Wi-Fi saved yet.</p>') +
      '<button class="btn btn-line" type="button" id="awifi">This device is on the guest house Wi-Fi now: save it</button><p class="err" id="aerr" role="alert"></p>' +
      (d.others.length ? '<div class="sec-h"><h3>Other networks staff opened the app on</h3></div><p class="small">If your internet provider changes the guest house address (for example after the router restarts), staff on the Wi-Fi show up here. Add it if you know they were at the guest house.</p><div class="list">' +
        d.others.map(function (o) { return '<div class="bl"><span class="t"><b>' + esc(o.name) + '</b><small>' + esc(tShort(o.at)) + ' · ' + esc(o.ip) + '</small></span><span class="a"><button class="btn btn-quiet sm" type="button" data-add="' + esc(o.ip) + '">Add as guest house Wi-Fi</button></span></div>'; }).join('') + '</div>' : '') +
      '</div>';
    wireSegs(v, function () { ATT.range = { 'Today': 'today', 'Last 7 days': 'week', 'This month': 'month', 'Last month': 'last' }[segVal(v, 'arange')] || 'week'; ATT.data = null; render(); });
    $('#aname', v).onchange = function () { ATT.name = this.value; ATT.data = null; render(); };
    $('#arf', v).onclick = function () { ATT.data = null; render(); };
    function save(ip, remove, x) {
      busy(x, true); $('#aerr', v).textContent = '';
      api('deskAttendanceWifi', { ip: ip, remove: !!remove }).then(function () { toast(remove ? 'Network removed' : 'Guest house Wi-Fi saved'); ATT.data = null; render(); }, function (e) { busy(x, false); $('#aerr', v).textContent = errText(e); });
    }
    $('#awifi', v).onclick = function () {
      var x = this; busy(x, true);
      publicIp().then(function (ip) { save(ip, false, x); }, function () { busy(x, false); $('#aerr', v).textContent = 'Could not check the network. Check the internet and try again.'; });
    };
    $$('[data-rm]', v).forEach(function (b) { b.onclick = function () { save(b.dataset.rm, true, b); }; });
    $$('[data-add]', v).forEach(function (b) { b.onclick = function () { save(b.dataset.add, false, b); }; });
  }

  /* ---------- More (phones) ---------- */
  function viewMore(v) {
    var list = [['bills', 'Bills', 'GST invoices: view, print, WhatsApp, email'], ['approvals', approver() ? 'Approvals' : 'My requests', approver() ? 'Money changes from reception' : 'Refunds and corrections you asked for'], ['add', 'Add item', 'Water, dental kit, mattress, late checkout'],
      ['stock', 'Stock', 'What is in storage and what to buy']].concat(owner() ? [['reports', 'Sales', 'Monthly and yearly sales (owner only)'], ['attendance', 'Attendance', 'Staff entry and exit on the guest house Wi-Fi (owner only)'], ['settings', 'Settings', 'Team, PINs, prices, policy']] : []);
    v.innerHTML = '<div><p class="kicker">' + esc(S.me.name) + ' · ' + esc(S.me.role) + '</p><h1>More</h1></div><div class="menu">' + list.map(function (m) {
      return '<button type="button" class="menu-item" data-go="' + m[0] + '">' + ICON[m[0]] + '<span><b>' + m[1] + '</b><small>' + m[2] + '</small></span>' + badge(m[0]) + '<i aria-hidden="true">›</i></button>';
    }).join('') + '</div><div data-install></div><button class="btn btn-quiet" type="button" id="lo">Log out</button><p class="small" style="text-align:center">App version 20</p>';
    installUi($('[data-install]', v));
    $$('[data-go]', v).forEach(function (b) { b.onclick = function () { go(b.dataset.go); }; });
    $('#lo', v).onclick = function () { logout(false); };
  }

  function openTeam() {
    var body = openSheet('Team & PINs');
    body.innerHTML = '<div class="loading">Loading…</div>';
    function draw(team) {
      body.innerHTML = '<div class="roles"><p><b>Owner</b> Everything, plus team, PINs and prices.</p><p><b>Manager</b> Everything at the desk, and approves reception\'s money changes.</p>' +
        '<p><b>Receptionist</b> Check-ins, bookings, payments and bills. Cannot change money once recorded: refunds, removing paid items and corrections need a manager\'s approval.</p><p><b>Staff</b> Rooms, add items, cleaning and stock. No money.</p></div>' +
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
        '<div class="field"><span>Role</span>' + seg('role', ['Owner', 'Manager', 'Receptionist', 'Staff'], p ? p.role : 'Staff') + '</div>' +
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
        return '<div class="bl tap" data-k="' + k + '"><span class="t">' + esc(i.item) + '</span><span class="d">' + (i.sell ? 'Sold to rooms' : 'Supply, not sold') + ' · ' + (i.track ? 'stock counted, warn below ' + i.low : 'not counted') + '</span><span class="a">' + (i.sell ? inr(i.price) : '—') + '</span></div>';
      }).join('') + '</div><button class="btn btn-gold" type="button" id="add">Add an item</button><p class="small">Add laundry and other services here later. To count supplies such as soap or toilet rolls, add them with “Can be added to a room bill” switched off.</p>';
      $$('[data-k]', body).forEach(function (b) { b.onclick = function () { editItem(S.st.items[Number(b.dataset.k)]); }; });
      $('#add', body).onclick = function () { editItem(null); };
    }
    function editItem(it) {
      var b2 = openSheet(it ? it.item : 'Add an item');
      b2.innerHTML = field('Item name', '<input class="input" id="i-name" maxlength="40" value="' + esc(it ? it.item : '') + '">', true) +
        field('Price (₹)', '<input class="input" id="i-price" inputmode="numeric" value="' + (it ? it.price : '') + '">', true) +
        '<label class="toggle"><span>Can be added to a room bill</span><input type="checkbox" id="i-sell"' + (!it || it.sell ? ' checked' : '') + '></label>' +
        '<label class="toggle"><span>Count this item in stock</span><input type="checkbox" id="i-track"' + (it && it.track ? ' checked' : '') + '></label>' +
        field('Warn when stock is below', '<input class="input" id="i-low" inputmode="numeric" value="' + (it ? it.low : 0) + '">') +
        (it ? '<label class="toggle"><span>Show this item</span><input type="checkbox" id="i-act" checked></label>' : '') +
        '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">Save</button>';
      $('#go', b2).onclick = function () {
        var act = $('#i-act', b2);
        submit(this, $('#err', b2), 'deskItemSave', { original: it ? it.item : '', item: $('#i-name', b2).value, price: $('#i-price', b2).value.replace(/\D/g, ''),
          track: $('#i-track', b2).checked, sell: $('#i-sell', b2).checked, low: $('#i-low', b2).value.replace(/\D/g, ''), active: act ? act.checked : true },
          function () { toast('Saved'); closeSheet(); refresh().then(draw); });
      };
    }
    draw();
  }

  /* ---------- boot ---------- */
  if (S.token && S.me) start(); else renderLogin();
})();
