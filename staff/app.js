/* Nikadi Staff — phone app for reception and staff.
   Rooms board · check-in · items to rooms · bills and payments · check-out · cleaning · stock · team. */
(function () {
  /* No zooming: iPhone Safari ignores user-scalable=no, so block pinch here (fast taps are handled by touch-action in staff.css) */
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  var demo = NIKADI.demo;
  var TK = demo ? 'nk-staff-demo-token' : 'nk-staff-token', MK = demo ? 'nk-staff-demo-me' : 'nk-staff-me';
  var S = { token: nkStore(TK), me: null, st: null, tab: 'rooms', addRoom: null, addItem: null, loading: false };
  try { S.me = JSON.parse(nkStore(MK) || 'null'); } catch (e) {}
  var app = document.getElementById('app');

  var ERR = {
    busy_retry: 'The Sheet was just changed. Please try again.',
    hk_checklist: 'Tick every line of the checklist first.',
    changelog_unavailable: 'The change log starts when the app moves to the new fast server.',
    comp_host: 'Pick whose guest this is.',
    comp_no_money: 'This is a free stay. No money is taken.', wa_no_consent: 'The guest has not agreed to WhatsApp messages. Ask them first.', wa_paused: 'Automatic WhatsApp is off. Use “WhatsApp to send” (owner / manager) to send it by hand.', wa_opted_out: 'This guest replied STOP, so we cannot send WhatsApp messages to them.', linen_not_empty: 'This item still has pieces counted (in store, rooms or laundry). Set its counts to 0 first, or untick “In use” to hide it.', laundry_paid: 'This list is already paid, so it cannot be deleted. Change the counts instead.', laundry_empty: 'Write how many of at least one item.', laundry_approved: 'This was already approved. A manager can change it.', laundry_return_open: 'There is already a return waiting to be checked.', laundry_not_out: 'This list has not been given to the laundry yet.', laundry_no_return: 'Nothing to check.', nothing_to_pay: 'Nothing to pay.', comp_has_advance: 'Money was already received for this booking. Refund it first, then make it a free stay.',
    bill_no_required: 'Write the invoice number.',
    old_record: 'This record is more than a few months old and is kept in the archive Sheet. It can be viewed but not changed.',
    drive_unavailable: 'Google Drive is not connected here.',
    too_big: 'This bill is too long to save.',
    category_required: 'Choose what kind of expense it is.', date_future: 'The date can\'t be in the future.', bad_photo: 'That photo could not be uploaded. Try another photo.', photos_unavailable: 'Photo upload is not set up yet. Save without the photo for now.', not_found: 'That entry was not found. Refresh and try again.',
    wa_not_connected: 'WhatsApp is not connected yet (Settings → WhatsApp).', bad_phone_id: 'The phone number ID should be only digits.', bad_token: 'That access token looks too short. Copy the whole token.',
    bill_locked: 'This guest has checked out. Only a manager or the owner can change the bill now.', checkout_future: 'The check-out date can\'t be in the future for a guest who already left.',
    pdf_tools_failed: 'Could not make the PDF. Check the internet connection and try again.', bad_pdf: 'The PDF could not be sent. Please try again.', bad_title: 'Choose Mr., Ms., Mrs., Dr. or Name only.',
    invalid_gstin: 'That GSTIN does not look right (15 characters, like 19ABCDE1234F1Z5).', invalid_email: 'That email address does not look right.', not_checked_out: 'The guest has not checked out yet.',
    no_bill: 'Bill not found.', email_unavailable: 'Email is not set up yet.',
    wrong_pin: 'Wrong PIN. Please try again.', too_many_attempts: 'Too many wrong PINs. Wait 15 minutes and try again.',
    not_logged_in: 'Please log in again.', session_expired: 'Please log in again.', not_allowed: 'Only reception or the owner can do this.',
    room_occupied: 'This room already has a guest.', room_not_clean: 'This room has not been cleaned yet. Mark it as cleaned first.',
    room_not_occupied: 'There is no guest in this room.', name_required: 'Please enter a name.', max_guests: 'A room takes 1 to 3 guests. For 4 or more, use two rooms.',
    bad_dates: 'The check-out date must be after the check-in date.', rate_required: 'Please enter the rate per night.', invalid_amount: 'Please enter an amount in rupees.',
    method_required: 'Choose how they paid: Cash, UPI or Card.', invalid_phone: 'Please check the phone number and its country code (+91 for India).', bad_qty: 'Please check the quantity.',
    bad_nights: 'Please check the number of nights.', not_in_house: 'This guest has already checked out.', bad_pin: 'The PIN must be 4 to 6 digits.',
    pin_taken: 'Someone else already uses this PIN. Choose another.', name_taken: 'That name is already used.', last_owner: 'There must always be at least one active Owner.',
    no_item: 'This item is not available.', not_tracked: 'Stock is not counted for this item.', bad_status: 'The room status has changed. Pull to refresh.',
    network: 'No internet connection. Please try again.', server_error: 'Something went wrong. Please try again.',
    not_setup: 'The staff app is not connected to the Google Sheet yet.',
    room_booked: 'A room you chose is already booked or occupied on those dates. Check the calendar and pick a free room.',
    phone_required: 'Please enter the guest\'s phone number.', wa_window_closed: 'More than 24 hours since the guest last wrote, so WhatsApp does not allow a free message. Call the guest instead.', wa_send_failed: 'The WhatsApp message could not be sent. Try again.', message_required: 'Write a message first.', no_pdf: 'The bill PDF is not ready yet. Try again in a moment.', same_amount: 'That is already the amount.', wa_not_connected: 'WhatsApp is not connected.', bad_guests: 'Please check the number of guests.',
    pick_rooms: 'Choose which room numbers this booking gets.', advance_required: 'Enter the amount received. A booking is confirmed only after money is received.',
    ref_required: 'Enter the UPI or bank transaction reference number.', booking_closed: 'This booking is already closed.', no_booking: 'Booking not found.',
    not_arrival_day: 'A booking can be marked as no-show only on or after its check-in date.',
    reason_required: 'Please write the reason. The manager sees it.', refund_too_much: 'That is more than the guest has paid.',
    no_payment: 'This payment cannot be changed.', no_request: 'Request not found.', request_done: 'Someone already decided this request.',
    refund_from_room: 'The guest has checked in: refund from their room bill instead.',
    not_checked_out: 'This guest is not checked out.', undo_too_late: 'It is more than 7 days since the check-out.', room_taken: 'Another guest is already in this room. Move one of them to another room first.',
    room_booked: 'This room is booked for another guest in those dates. Choose an earlier leaving date or move the booking first.', bad_checkout_date: 'The leaving date cannot be in the past.', no_room: 'This room no longer exists.',
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
  /* "still open" signal every minute (the owner sees live if the app is open on the guest house PC) */
  function beat() { if (!S.token || !S.me) return; api('deskBeat', { device: deviceName(), wifi: !!S.atHouse, shown: document.visibilityState === 'visible' }).catch(function () {}); }
  setInterval(beat, 60000);
  var lastPing = 0;
  function ping(force) {
    if (!S.token || !S.me || S.me.role === 'Owner' || document.visibilityState === 'hidden') return;
    if (!force && Date.now() - lastPing < 120000) return;
    lastPing = Date.now();
    publicIp().then(function (ip) { return api('deskPresence', { ip: ip, device: deviceName() }); }).then(function (r) { var was = S.atHouse; S.atHouse = !!(r && r.atHouse); if (S.atHouse !== was) beat(); }, function () {});
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') ping(); });
  window.addEventListener('focus', function () { ping(); });
  setInterval(function () { ping(true); }, 600000);
  function renderLogin(msg) {
    closeAllSheets();
    var pin = '';
    app.innerHTML = (demo ? '<div class="demo-flag">Demo mode · sample data · PINs 1111 owner · 2222 reception · 3333 staff · 7777 laundry</div>' : '') + (typeof NIKADI_TEST_DB !== 'undefined' && NIKADI_TEST_DB ? '<div class="demo-flag test-db">Test copy on the new fast server · not real</div>' : '') +
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
        if (r.me.role !== 'Owner') { var tk = r.token; publicIp().then(function (ip) { return api('deskPresence', { token: tk, ip: ip, device: deviceName(), ev: 'login' }); }).catch(function () {}); }
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
    if (!expired && S.token) {
      var tk = S.token, who = S.me;
      (who && who.role !== 'Owner' ? publicIp().then(function (ip) { return api('deskPresence', { token: tk, ip: ip, device: deviceName(), ev: 'logout' }); }).catch(function () {}) : Promise.resolve())
        .then(function () { return api('deskLogout', { token: tk }); }).catch(function () {});
    }
    S.token = null; S.me = null; S.st = null; nkStore(TK, null); nkStore(MK, null);
    renderLogin(expired ? 'Please log in again' : 'Logged out');
  }

  /* ---------- shell: side menu on computers, tabs at the bottom on phones ---------- */
  var ICON = {
    regs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3.5h6v2.5H9zM8.5 10h7M8.5 13.5h7M8.5 17h4"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6"/><circle cx="12" cy="17" r=".6" fill="currentColor"/></svg>',
    changelog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 5h16M4 10h10M4 15h12M4 20h8"/><circle cx="19" cy="17" r="3"/><path d="M19 15.6V17l1 .8"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3.5 20.5l1.3-4A8.5 8.5 0 1 1 8 19.6z"/><path d="M9 8.6c.2-.6.6-.7.9-.7h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .5-.1.6l-.5.6c.6 1.2 1.6 2.2 2.8 2.8l.6-.5c.2-.2.4-.2.6-.1l1.6.7c.3.1.4.3.4.5v.5c0 .3-.1.7-.7.9-.9.4-2.6.4-4.7-1.4-2-1.8-2.7-3.6-2.6-4.8z"/></svg>',
    idcopy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5 16.5c.6-1.6 2-2.4 3.5-2.4s2.9.8 3.5 2.4M14.5 10h4.5M14.5 13.5h3.5"/></svg>',
    expenses: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/><path d="M7 6V4h10v2"/></svg>',
    commission: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><path d="M17 7v6M14.5 9.5h3.2a1.3 1.3 0 0 1 0 2.6H16"/></svg>',
    housekeeping: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 3h6v4H9z"/><path d="M7 7h10l-1 14H8z"/><path d="M10 11h4M10 15h4"/></svg>',
    attendance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    bills: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2.5h12v19l-3-2-3 2-3-2-3 2z"/><path d="M9 7.5h6M9 11h6M9 14.5h4"/></svg>',
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>',
    rooms: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M7 13.5h3M14 13.5h3M7 17h3"/></svg>',
    bookings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 3h12v18l-6-3.5L6 21V3z"/><path d="M9.5 8.5h5M9.5 12h5"/></svg>',
    add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',
    laundry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M4 7h16"/><circle cx="12" cy="14" r="4.5"/><path d="M9.2 14.6c1-.9 1.9-.9 2.8 0s1.9.9 2.8 0"/><circle cx="7" cy="4.8" r=".5" fill="currentColor"/></svg>',
    stock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>',
    approvals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 11l2.5 2.5L16 9"/><path d="M12 21s-7-3.5-7-9.5V5l7-2.5L19 5v6.5C19 17.5 12 21 12 21z"/></svg>',
    reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/><path d="M15 6l3-2 3 2"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
  };
  var NAMES = { regs: 'Registrations', help: 'Help', changelog: 'Change log', today: 'Today', rooms: 'Rooms', calendar: 'Calendar', bookings: 'Bookings', add: 'Add item', stock: 'Stock', settings: 'Settings', approvals: 'Approvals', more: 'More', reports: 'Sales', bills: 'Bills', attendance: 'Attendance', housekeeping: 'Housekeeping', expenses: 'Expenses', commission: 'Commission', idcopy: 'ID copies', whatsapp: 'WhatsApp', laundry: 'Laundry' };
  function navFor(desk) {
    if (S.me && S.me.role === 'Laundry') return ['laundry'];
    if (!mgr()) return desk ? ['rooms', 'housekeeping', 'add', 'stock', 'laundry', 'calendar'] : ['rooms', 'housekeeping', 'add', 'stock', 'calendar'];
    if (desk) return ['today', 'rooms', 'housekeeping', 'calendar', 'bookings', 'whatsapp', 'regs', 'bills', 'idcopy', 'expenses', 'commission', 'approvals', 'add', 'stock', 'laundry'].concat(owner() ? ['reports', 'attendance', 'changelog', 'settings'] : []);
    return ['today', 'rooms', 'calendar', 'bookings', 'more'];
  }
  function navName(t) { return t === 'approvals' && rcp() ? 'My requests' : NAMES[t]; }
  function badge(t) {
    if (!S.st) return '';
    var n = t === 'bookings' ? S.st.pending : t === 'stock' ? (S.st.toBuy || []).length : t === 'today' ? (S.st.arrivals || []).length
      : t === 'approvals' ? (S.st.approvals || S.st.myRequests || 0) : t === 'whatsapp' ? (S.st.waNew || 0) : t === 'laundry' ? (S.st.laundryNew || 0) : t === 'regs' ? (S.st.regNew || 0) : t === 'more' ? (S.st.approvals || S.st.myRequests || 0) + (S.st.waNew || 0) + (S.st.laundryNew || 0) + (S.st.regNew || 0) : 0;
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
    S.tab = tab; if (tab === 'approvals') REQ = null; if (tab === 'reports') REP.data = null; if (tab === 'bills') BILLS.list = null; if (tab === 'attendance') ATT.data = null; if (tab === 'housekeeping') HK.data = null; if (tab === 'expenses') EXP.data = null; if (tab === 'commission') COM.data = null; if (tab === 'idcopy') { IDC.stay = null; IDC.list = null; } if (tab === 'whatsapp') WA.list = null; if (tab === 'regs') REGS.list = null; if (tab === 'changelog') CL.rows = null; if (tab === 'laundry') LAU.data = null; nav(); render(); window.scrollTo(0, 0);
    if (tab === 'calendar' || tab === 'bookings') loadExtra();
  }

  function start() {
    document.onkeydown = null;
    setTimeout(function () { ping(true); }, 800); // app opened: Wi-Fi check-in
    if (!S.st) S.tab = S.me && S.me.role === 'Laundry' ? 'laundry' : mgr() ? (isDesk() ? 'today' : 'rooms') : 'rooms';
    app.innerHTML = '<div class="app-frame">' +
      '<aside class="side" aria-label="Menu"><a class="brand brand-row" href="./"><img class="brand-logo" src="../img/brand/lockup-light.png" alt="Nikadi Guest House"><span>Staff</span></a>' + (demo ? '<p class="side-demo">Demo · sample data</p>' : '') +
      '<nav id="side-nav"></nav><div class="side-me"><div class="chip-me"><b>' + esc(S.me.name) + '</b>' + esc(S.me.role) + '</div><button class="iconbtn" id="help2" type="button">Help</button><button class="iconbtn" id="out2" type="button">Log out</button></div></aside>' +
      '<div class="shell">' + (demo ? '<div class="demo-flag">Demo mode · sample data on this device only</div>' : '') + (typeof NIKADI_TEST_DB !== 'undefined' && NIKADI_TEST_DB ? '<div class="demo-flag test-db">Test copy on the new fast server · changes here are NOT real · open with ?api=old to go back</div>' : '') +
      '<header class="bar pad"><a class="brand brand-row" href="./"><img class="brand-logo" src="../img/brand/lockup-light.png" alt="Nikadi Guest House"><span>Staff</span></a><div class="who"><div class="chip-me"><b>' + esc(S.me.name) + '</b>' + esc(S.me.role) + '</div>' +
      '<button class="iconbtn" id="help1" type="button">Help</button><button class="iconbtn" id="out" type="button">Log out</button></div></header>' +
      '<main class="pad view" id="view"><div class="loading">Loading…</div></main>' +
      '<nav class="tabs" id="tabs" role="tablist"></nav></div></div>';
    $('#out').onclick = $('#out2').onclick = function () { logout(false); };
    $('#help1').onclick = $('#help2').onclick = function () { go('help'); };
    nav();
    refresh();
  }
  window.matchMedia('(min-width: 1000px)').addEventListener('change', function () { if (S.token && S.st) { if (navFor(isDesk()).indexOf(S.tab) < 0 && ['add', 'stock', 'approvals', 'settings', 'reports', 'bills', 'attendance', 'housekeeping', 'expenses', 'commission', 'idcopy', 'whatsapp', 'regs', 'help', 'changelog', 'laundry'].indexOf(S.tab) < 0) S.tab = S.me.role === 'Laundry' ? 'laundry' : 'rooms'; if (isDesk() && S.tab === 'more') S.tab = 'today'; nav(); render(); } });

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
    ({ rooms: viewRooms, add: viewAdd, stock: viewStock, today: viewToday, calendar: viewCalendar, bookings: viewBookings, settings: viewSettings, approvals: viewApprovals, more: viewMore, reports: viewReports, bills: viewBills, attendance: viewAttendance, housekeeping: viewHousekeeping, expenses: viewExpenses, commission: viewCommission, idcopy: viewIdCopy, regs: viewRegs, whatsapp: viewWhatsApp, help: viewHelp, changelog: viewChangeLog, laundry: viewLaundry }[S.tab] || (S.me.role === 'Laundry' ? viewLaundry : viewRooms))(v);
    waBanner(v);
  }
  /* ---------- Guest registration cards (filled on the website) ---------- */
  var REGS = { list: null };
  function viewRegs(v) {
    if (!mgr()) { S.tab = 'rooms'; return render(); }
    if (!REGS.list) { v.innerHTML = '<div><p class="kicker">From the website</p><h1>Registration cards</h1></div><div class="loading">Loading…</div>'; api('deskRegistrations', {}).then(function (r) { REGS.list = r.list; if (S.tab === 'regs') render(); }, function (e) { v.innerHTML = '<p class="note">' + esc(errText(e)) + '</p>'; }); return; }
    v.innerHTML = '<div class="hrow"><div><p class="kicker">Guest registration forms from the website</p><h1>Registration cards</h1></div><button class="refresh" id="rgrf" type="button">Refresh</button></div>' +
      '<p class="small">Send guests the form from Ready messages (“Registration form”). What they fill arrives here; they send their ID photo on WhatsApp.</p>' +
      (REGS.list.length ? '<div class="list">' + REGS.list.map(function (r, i) {
        return '<button type="button" class="bl bl-btn' + (r.status === 'New' ? ' unread' : '') + '" data-rg="' + i + '"><span class="t">' + esc(r.name) + (r.status === 'New' ? ' <span class="pill gold">New</span>' : '') + '</span>' +
          '<span class="d">' + esc(nkPhoneShow(r.phone)) + (r.checkin ? ' · ' + esc(dShort(r.checkin)) + (r.checkout ? ' to ' + esc(dShort(r.checkout)) : '') : '') + (r.booking ? ' · booking ' + esc(r.booking) : '') + '</span><span class="a">' + esc(dShort(r.at.slice(0, 10))) + '</span></button>';
      }).join('') + '</div>' : '<p class="note">No registration cards yet.</p>');
    $('#rgrf', v).onclick = function () { REGS.list = null; render(); };
    $$('[data-rg]', v).forEach(function (b) { b.onclick = function () { openReg(REGS.list[+b.dataset.rg]); }; });
  }
  function openReg(r) {
    var body = openSheet('Registration · ' + r.name);
    body.innerHTML = '<p class="small">Received ' + esc(r.at) + (r.seenBy ? ' · checked by ' + esc(r.seenBy) : '') + '</p>' +
      '<dl class="facts reg-facts">' + r.fields.map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('') + '</dl>' +
      (r.people.length ? '<h3>Other guests</h3><ol class="small">' + r.people.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' : '') +
      '<div class="acts">' + (r.booking ? '<button class="btn btn-line" type="button" id="rg-bk">Open booking ' + esc(r.booking) + '</button>' : '') +
      '<a class="btn btn-line" target="_blank" rel="noopener" href="https://wa.me/' + esc(nkPhoneTel(r.phone).slice(1)) + '">Open WhatsApp chat</a>' +
      (r.status === 'New' ? '<button class="btn btn-gold" type="button" id="rg-ok">Mark as checked</button>' : '') + '</div>';
    var bk = $('#rg-bk', body); if (bk) bk.onclick = function () { openBooking(r.booking); };
    var ok = $('#rg-ok', body); if (ok) ok.onclick = function () { busy(ok, true); api('deskRegistrations', { seen: r.id }).then(function (x) { REGS.list = x.list; S.st.regNew = Math.max(0, (S.st.regNew || 1) - 1); closeSheet(); nav(); render(); }, function (e) { busy(ok, false); toast(errText(e)); }); };
  }
  /* ---------- Ready WhatsApp messages (front desk) ----------
     Two folders. Every guest has 4-5 messages already written with their name: tap one, WhatsApp opens with it ready, press send.
     "Edit" lets you change the words first. A sent message gets a tick (who and when). */
  var WK = { folder: 'enq', data: null, edit: {} };
  function waBanner(v) {
    var n = S.st && S.st.waToSend;
    if (!n || !mgr() || ['today', 'rooms', 'whatsapp', 'bookings'].indexOf(S.tab) < 0 || $('#wa-send-bar', v)) return;
    var bar = document.createElement('button');
    bar.type = 'button'; bar.id = 'wa-send-bar'; bar.className = 'wa-send-bar';
    bar.innerHTML = '<b>' + n + ' guest' + (n > 1 ? 's' : '') + ' to message on WhatsApp</b><i>→</i><span>Enquiry, advance, welcome, bill and review messages are ready · tap to send</span>';
    bar.onclick = function () { openWaSend(); };
    v.insertBefore(bar, v.firstChild);
  }
  function waHref(phone, text) { return 'https://wa.me/' + nkPhoneTel(phone).slice(1) + '?text=' + encodeURIComponent(text); }
  function openWaSend(folder) {
    if (folder) WK.folder = folder;
    var body = openSheet('Ready WhatsApp messages');
    body.innerHTML = '<div class="loading">Loading…</div>';
    function draw() {
      var F = WK.data, list = F[WK.folder];
      var cnt = function (k) { return F[k].filter(function (g) { return g.todo; }).length; };
      body.innerHTML = '<div class="wk-tabs" role="tablist">' + [['enq', 'Enquiry & advance'], ['in', 'Welcome & check-in'], ['out', 'Check-out, bill & review']].map(function (t) {
          return '<button type="button" role="tab" data-wk="' + t[0] + '" aria-selected="' + (WK.folder === t[0]) + '">📁 ' + t[1] + (cnt(t[0]) ? ' <b>' + cnt(t[0]) + '</b>' : '') + '</button>'; }).join('') + '</div>' +
        '<p class="small">Tap a message: WhatsApp opens on the guest house number with it written. Press send. Use <b>Edit</b> to change the words first.</p>' +
        (WK.folder === 'enq' ? enqForm() : '') +
        (list.length ? '<div class="wk-list">' + list.map(function (g, gi) {
          return '<div class="wk-guest' + (g.todo ? ' todo' : '') + '"><div class="wk-h"><b>' + esc(g.name) + '</b><small>' + esc(g.sub) + ' · ' + esc(nkPhoneShow(g.phone)) + '</small>' + (g.booking ? '<button class="linkbtn" type="button" data-bk="' + esc(g.booking) + '">Open booking →</button>' : '') + '</div>' +
            g.msgs.map(function (m, mi) {
              var k = g.key + '|' + m.kind, txt = WK.edit[k] != null ? WK.edit[k] : m.text;
              return '<div class="wk-msg' + (m.sent ? ' sent' : '') + '"><a class="wk-send" target="_blank" rel="noopener" data-g="' + gi + '" data-m="' + mi + '" href="' + esc(waHref(g.phone, txt)) + '">' +
                '<span class="wk-l">' + esc(m.label) + (WK.edit[k] != null ? ' <em>edited</em>' : '') + '</span><span class="wk-s">' + (m.sent ? '✓ Sent ' + esc(m.sent) : 'Tap to send') + '</span></a>' +
                '<button class="wk-ed" type="button" data-eg="' + gi + '" data-em="' + mi + '">Edit</button></div>';
            }).join('') + '</div>';
        }).join('') + '</div>' : WK.folder === 'enq' ? '<p class="small">Pending booking requests (website, phone, WhatsApp) also show here, with their prices and advance.</p>' : '<p class="note">' + (WK.folder === 'in' ? 'No arriving bookings or guests in house with a WhatsApp number.' : 'No one leaving today or checked out in the last 3 days.') + '</p>');
      $$('[data-wk]', body).forEach(function (b) { b.onclick = function () { WK.folder = b.dataset.wk; draw(); }; });
      $$('[data-bk]', body).forEach(function (b) { b.onclick = function () { openBooking(b.dataset.bk); }; });
      if (WK.folder === 'enq') wireEnq();
      $$('.wk-send', body).forEach(function (a) { a.onclick = function () {
        var g = list[+a.dataset.g], m = g.msgs[+a.dataset.m], k = g.key + '|' + m.kind;
        api('deskWaKitSent', { ref: g.key, kind: m.kind, phone: g.phone, name: g.name, edited: WK.edit[k] != null }).then(function (r) { WK.data = r; S.st.waToSend = cnt('in') + cnt('out') + cnt('enq'); draw(); }, function () {});
      }; });
      $$('.wk-ed', body).forEach(function (b) { b.onclick = function () {
        var g = list[+b.dataset.eg], m = g.msgs[+b.dataset.em], k = g.key + '|' + m.kind;
        var box = openSheet('Edit · ' + m.label);
        box.innerHTML = '<p class="small">To ' + esc(g.name) + ' · ' + esc(nkPhoneShow(g.phone)) + '</p><textarea id="wk-t" class="wk-ta" rows="12">' + esc(WK.edit[k] != null ? WK.edit[k] : m.text) + '</textarea>' +
          '<div class="acts"><a class="btn btn-gold" id="wk-go" target="_blank" rel="noopener" href="#">Send on WhatsApp</a><button class="btn btn-quiet" type="button" id="wk-rs">Back to the original</button></div>';
        var ta = $('#wk-t', box), go = $('#wk-go', box);
        function upd() { go.href = waHref(g.phone, ta.value); }
        ta.oninput = function () { WK.edit[k] = ta.value; upd(); }; upd();
        $('#wk-rs', box).onclick = function () { delete WK.edit[k]; ta.value = m.text; upd(); };
        go.onclick = function () {
          WK.edit[k] = ta.value;
          api('deskWaKitSent', { ref: g.key, kind: m.kind, phone: g.phone, name: g.name, edited: ta.value !== m.text }).then(function (r) { WK.data = r; S.st.waToSend = cnt('in') + cnt('out') + cnt('enq'); closeSheet(); draw(); }, function () {});
        };
      }; });
    }
    function enqForm() {
      var q = WK.q || {}, t = S.st.today;
      return '<div class="wk-guest wk-enq"><div class="wk-h"><b>New enquiry</b><small>Type what the guest asked; the messages are written for you</small></div>' +
        '<div class="grid2">' + field('Phone', nkPhoneHtml('q-ph', q.phone || '')) + field('Name', '<input class="input" id="q-nm" maxlength="60" value="' + esc(q.name || '') + '">') + '</div>' +
        '<div class="grid2">' + field('Check-in', '<input class="input" type="date" id="q-in" value="' + esc(q.checkin || t) + '">') + field('Check-out', '<input class="input" type="date" id="q-out-d" value="' + esc(q.checkout || addDays(q.checkin || t, 1)) + '">') + '</div>' +
        '<div class="grid2">' + field('Guests', '<input class="input" id="q-g" inputmode="numeric" value="' + esc(q.guests || 2) + '">') + field('Rooms', '<input class="input" id="q-r" inputmode="numeric" value="' + esc(q.rooms || 1) + '">') + '</div>' +
        field('Room type', '<select class="input" id="q-t">' + ['Any', 'Deluxe Double', 'Deluxe Twin', 'Large Twin'].map(function (x) { return '<option' + (x === (q.type || 'Any') ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>') +
        '<p class="err" id="q-err"></p><div class="acts"><button class="btn btn-gold" type="button" id="q-go">Write the messages</button><button class="btn btn-quiet" type="button" id="q-bk">Save as booking (pending)</button></div>' +
        '<div id="q-out">' + (WK.qres ? enqOut(WK.qres) : '') + '</div></div>';
    }
    function enqOut(r) {
      return r.msgs.map(function (m, mi) {
        return '<div class="wk-msg"><a class="wk-send q-send" target="_blank" rel="noopener" data-qm="' + mi + '" href="' + esc(r.phone ? waHref(r.phone, m.text) : 'https://wa.me/?text=' + encodeURIComponent(m.text)) + '"><span class="wk-l">' + esc(m.label) + '</span><span class="wk-s">' + (r.phone ? 'Tap to send to ' + esc(nkPhoneShow(r.phone)) : 'Tap to send · choose the chat in WhatsApp') + '</span></a>' +
          '<button class="wk-ed" type="button" data-qe="' + mi + '">Edit</button></div>';
      }).join('');
    }
    function readEnq() {
      return { phone: nkPhoneVal('q-ph', body), name: $('#q-nm', body).value.trim(), checkin: $('#q-in', body).value, checkout: $('#q-out-d', body).value, guests: Number($('#q-g', body).value) || 2, rooms: Number($('#q-r', body).value) || 1, type: $('#q-t', body).value };
    }
    function wireEnq() {
      function wireOut() {
        $$('[data-qe]', body).forEach(function (b) { b.onclick = function () {
          var r = WK.qres, m = r.msgs[+b.dataset.qe], box = openSheet('Edit · ' + m.label);
          box.innerHTML = '<textarea id="wk-t" class="wk-ta" rows="12">' + esc(m.text) + '</textarea><div class="acts"><a class="btn btn-gold" id="wk-go" target="_blank" rel="noopener" href="#">Send on WhatsApp</a></div>';
          var ta = $('#wk-t', box), go = $('#wk-go', box);
          function upd() { go.href = r.phone ? waHref(r.phone, ta.value) : 'https://wa.me/?text=' + encodeURIComponent(ta.value); }
          ta.oninput = upd; upd(); go.onclick = function () { setTimeout(closeSheet, 300); };
        }; });
      }
      wireOut();
      $('#q-in', body).onchange = function () { var o = $('#q-out-d', body); if (!o.value || o.value <= this.value) o.value = addDays(this.value, 1); };
      $('#q-go', body).onclick = function () {
        var x = this, q = WK.q = readEnq(); busy(x, true); $('#q-err', body).textContent = '';
        api('deskWaEnquiry', { phone: q.phone, name: q.name, checkin: q.checkin, checkout: q.checkout, rooms: q.rooms, type: q.type === 'Any' ? '' : q.type }).then(function (r) {
          busy(x, false); WK.qres = r; $('#q-out', body).innerHTML = enqOut(r); wireOut();
        }, function (e) { busy(x, false); $('#q-err', body).textContent = errText(e); });
      };
      $('#q-bk', body).onclick = function () {
        var q = WK.q = readEnq();
        openBookingForm({ guest: q.name, phone: q.phone, checkin: q.checkin, checkout: q.checkout, guests: q.guests, roomsNeeded: q.rooms, roomType: q.type === 'Deluxe Double' ? 'Deluxe Double (King)' : q.type === 'Any' ? '' : q.type });
      };
    }
    api('deskWaKit', {}).then(function (r) { WK.data = r; draw(); }, function (e) { body.innerHTML = '<p class="note">' + esc(errText(e)) + '</p>'; });
  }

  /* auto refresh every 30 s while the app is open and no form is open */
  /* never redraw the page while someone is filling something in */
  var viewTouched = 0;
  document.addEventListener('input', function (e) { if (e.target.closest && e.target.closest('#view')) viewTouched = Date.now(); }, true);
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#view') && e.target.closest('input,select,textarea,.field,.toggle,.seg,[data-seg],.pick,.items')) viewTouched = Date.now(); }, true);
  function busyTyping() {
    var a = document.activeElement;
    return !!document.querySelector('.sheet') || (a && a.closest && a.closest('#view') && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) ||
      Date.now() - viewTouched < 180000 || (S.tab === 'idcopy' && IDC.stay) || ['add', 'settings'].indexOf(S.tab) >= 0 && Date.now() - viewTouched < 600000;
  }
  setInterval(function () {
    if (S.token && !document.hidden && !busyTyping()) { refresh(); if (S.tab === 'calendar' || S.tab === 'bookings') loadExtra(); if (S.tab === 'whatsapp') waLoad(); }
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
          : r.arriving && k === 'arr' ? esc(r.arriving.guest) + '<small>' + (r.arriving.comp ? 'Free stay · ' : '') + 'Booked · ' + (r.arriving.late ? 'was due earlier' : 'arrives today') + '</small>'
          : k === 'dirty' ? '<small>' + esc(r.by ? 'Since ' + tShort(r.updated) : 'Clean before next guest') + '</small>' : '<small>' + esc(r.beds) + '</small>';
        var bal = s && s.comp ? '<span class="bal comp">Free · ' + esc(s.comp) + '</span>' : mgr() && s && s.balance > 0 ? '<span class="bal">' + inr(s.balance) + ' due</span>' : '';
        if (r.service) bal += '<span class="hk-tag ' + (r.service.done ? 'done' : '') + '">' + (r.service.done ? '✓ Serviced' : 'Housekeeping') + '</span>';
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

  /* ---------- Housekeeping checklist: every line ticked (or an option picked) before Done / Room ready ---------- */
  function openHkCheck(room, kind, send) {
    var ro = roomOf(room) || {}, twin = /twin|single/i.test(String(ro.type || '') + ' ' + String(ro.beds || ''));
    var list = ((S.st && S.st.hk && S.st.hk[kind]) || []).map(function (l) { // twin rooms: 2 single beds, so single sheets and covers
      if (!l[3] || !twin) return l;
      var d = {}; Object.keys(l[3]).forEach(function (k) { if (/\(king size\)/.test(k)) d[k.replace('(king size)', '(single)')] = l[3][k] * 2; else d[k] = l[3][k]; });
      return [l[0], l[1], l[2], d];
    }), body = openSheet((kind === 'out' ? 'Clean after check-out' : 'Housekeeping') + ' · Room ' + room, kind === 'out' ? 'dirty' : '');
    var got = {};
    body.innerHTML = '<p class="small">' + (kind === 'out' ? 'Everything fresh for the next guest. Tick each line when it is done.' : 'Guest is staying on. Tick each line, and pick what you changed.') + '</p>' +
      '<div class="hkc">' + list.map(function (l) {
        return l[2] ? '<div class="hkc-row opt" data-k="' + esc(l[0]) + '"><span class="hkc-l">' + esc(l[1]) + '</span>' + seg('hk-' + l[0], l[2], '') +
            (l[3] ? '<div class="hkc-lin" id="lin-' + esc(l[0]) + '" hidden><small class="small">How many fresh ones did you put in? (the used ones go to the laundry pile)</small>' + Object.keys(l[3]).map(function (k) {
              return '<label class="lc-row"><span>' + esc(k) + '</span><span class="lc-q"><button type="button" data-d="-1" aria-label="Less">−</button><input class="input" type="number" inputmode="numeric" min="0" max="20" data-lk="' + esc(k) + '" value="' + l[3][k] + '"><button type="button" data-d="1" aria-label="More">+</button></span></label>'; }).join('') + '</div>' : '') + '</div>'
          : '<button type="button" class="hkc-row tick" data-k="' + esc(l[0]) + '" aria-pressed="false"><i aria-hidden="true"></i><span class="hkc-l">' + esc(l[1]) + '</span></button>';
      }).join('') + '</div>' +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-ok big-cta" id="go" type="button" disabled></button>';
    function upd() {
      var left = list.filter(function (l) { return l[2] ? !got[l[0]] : got[l[0]] !== true; }).length, go = $('#go', body);
      go.disabled = left > 0;
      go.textContent = left ? left + (left > 1 ? ' things' : ' thing') + ' left to tick' : (kind === 'out' ? 'Room is ready' : 'Housekeeping done');
      list.forEach(function (l) { var row = $('[data-k="' + l[0] + '"]', body); if (row) row.classList.toggle('ok', l[2] ? !!got[l[0]] : got[l[0]] === true); });
    }
    $$('.hkc-row.tick', body).forEach(function (b) { b.onclick = function () { var on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); got[b.dataset.k] = on; upd(); }; });
    wireSegs(body, function () { list.forEach(function (l) { if (l[2]) { var v = segVal(body, 'hk-' + l[0]); if (v) got[l[0]] = v; if (l[3]) $('#lin-' + l[0], body).hidden = v !== l[2][0]; } }); upd(); });
    $$('.hkc-lin .lc-q', body).forEach(function (w) { w.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; e.preventDefault(); var i = $('input', w); i.value = Math.max(0, Math.min(20, (Number(i.value) || 0) + Number(b.dataset.d))); }; });
    upd();
    function linen() { list.forEach(function (l) { if (!l[3]) return; var o = {}; $$('#lin-' + l[0] + ' input[data-lk]', body).forEach(function (i) { var n = Math.round(Number(i.value) || 0); if (n > 0) o[i.dataset.lk] = n; }); got['linen_' + l[0]] = got[l[0]] === l[2][0] ? o : {}; }); return got; }
    $('#go', body).onclick = function () { var x = this; if (x.disabled) return; busy(x, true); send(linen()).then(function (r) { closeSheet(); return r; }, function (e) { busy(x, false); $('#err', body).textContent = errText(e); vibrate(); }); };
  }

  /* ---------- Room panel ---------- */
  function openRoom(n) {
    var r = roomOf(n); if (!r) return;
    var k = kind(r), body = openSheet('Room ' + r.room + ' · ' + r.type, k);
    if (r.status === 'Occupied' && r.stay) { body.innerHTML = '<div class="loading">Loading bill…</div>'; loadStay(body, r.stay.id); return; }
    if (r.status === 'Needs cleaning') {
      body.innerHTML = '<div class="note"><b>Needs cleaning</b>' + esc(r.by ? 'Marked by ' + r.by + ' · ' + tShort(r.updated) : 'Clean this room before the next guest.') + '</div>' +
        '<button class="btn btn-ok big-cta" id="cl" type="button">Open cleaning checklist</button><p class="small">Tick every line of the checklist. Then the room turns green and can be given to a guest.</p>' +
        (mgr() && S.st.backToReady ? '<button class="btn btn-line" id="br" type="button">Back to ready (room was not used)</button><p class="small">For a room nobody used, e.g. a guest moved out of it straight away. No cleaning checklist; it is noted in the housekeeping log.</p>' : '');
      if ($('#br', body)) $('#br', body).onclick = function () {
        var b = this; if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Tap again: Room ' + r.room + ' back to ready'; return; }
        busy(b, true);
        api('deskRoomStatus', { room: r.room, status: 'Ready', asIs: true }).then(function () { vibrate(); toast('Room ' + r.room + ' is ready again'); closeSheet(); refresh(); }, function (e) { busy(b, false); toast(errText(e)); });
      };
      $('#cl', body).onclick = function () {
        openHkCheck(r.room, 'out', function (check) { return api('deskRoomStatus', { room: r.room, status: 'Ready', check: check }).then(function () { vibrate(); toast('Room ' + r.room + ' is ready'); closeSheet(); refresh(); }); });
      };
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
      (m ? '<div><dt>Phone</dt><dd>' + (s.phone ? '<a href="tel:' + esc(nkPhoneTel(s.phone)) + '">' + esc(nkPhoneShow(s.phone)) + '</a>' : '—') + '</dd></div><div><dt>Checked in by</dt><dd>' + esc(s.inBy) + '</dd></div>' : '') +
      '</dl>';
    if (s.comp) h += '<div class="note comp-note"><b>Free stay · ' + esc(s.comp) + '</b>' + (s.compRef ? esc(s.compRef) : 'No charge') + ' · items given are counted and taken from stock</div>';
    if (m && s.companions && s.companions.length) h += '<div class="note"><b>Other guests in the room</b>' + s.companions.map(esc).join(' · ') + '</div>';
    if (s.member) h += memberBox(s.member, false);
    if (s.service) h += serviceBox(s.service);
    if (inHouse) h += kitBox(s);
    if (m && s.notes) h += '<div class="note"><b>Notes</b>' + esc(s.notes) + '</div>';
    if (m && s.booking) h += '<button class="linkbtn" type="button" id="b-bk">From booking ' + esc(s.booking) + ' →</button>';
    if (m) h += '<button class="idc-room ' + (s.ids ? 'has' : 'none') + '" type="button" id="b-ids">' + ICON.idcopy + '<span><b>ID copies' + (s.ids ? ' · ' + s.ids + (s.ids === 1 ? ' ID' : ' IDs') + ' taken' : '') + '</b><small>' + (s.ids ? 'Open, add more or print on A4' : 'No ID saved yet for this stay · add Aadhaar, licence or passport') + '</small></span><i aria-hidden="true">›</i></button>';
    if (s.drive) h += '<a class="linkbtn" href="' + esc(s.drive) + '" target="_blank" rel="noopener">Open this stay in Google Drive (details, bill, IDs) →</a>';
    if (m && s.comp) {
      h += '<div class="bill"><h3>Items given (free stay)</h3>' + (s.charges.length ? s.charges.map(function (c) {
        return '<div class="bl tap" data-charge="' + esc(c.id) + '"><span class="t">' + esc(c.qty + ' × ' + c.item) + '</span><span class="d">' + esc(tShort(c.at)) + ' · ' + esc(c.by) + (c.note ? ' · ' + esc(c.note) : '') + '</span></div>';
      }).join('') : '<div class="bl"><span class="d">Nothing given yet</span></div>') + '</div>' +
        '<div class="btns">' + (inHouse ? '<button class="btn btn-gold" id="b-add" type="button">Add item</button><button class="btn btn-quiet" id="b-edit" type="button">Edit / extend</button><button class="btn btn-quiet" id="b-out" type="button">Check out</button>' : '') + '</div>';
      if (!inHouse && s.undo) h += s.undo === 'ok' ? '<div class="undo-box"><b>Checked out by mistake?</b><span>If the guest is still staying, bring the room back.</span><button class="btn btn-line" id="b-undo" type="button">' + (rcp() ? 'Ask manager to reverse check-out' : 'Reverse check-out') + '</button></div>' : '';
    } else if (m) {
      h += '<div class="bill"><h3>Bill</h3>' +
        '<div class="bl sum"><span class="t">Room · ' + s.nights + (s.nights > 1 ? ' nights' : ' night') + ' × ' + inr(s.rate) + '</span><span class="d">' + esc(s.rateNote || 'Agreed rate per night') + '</span><span class="a">' + inr(s.roomTotal) + '</span></div>' +
        s.charges.map(function (c) {
          return '<div class="bl tap" data-charge="' + esc(c.id) + '"><span class="t">' + esc(c.item) + ' × ' + c.qty + (c.free ? '<span class="free">Free' + (c.note ? ' (' + esc(freeWhy(c.note)) + ')' : '') + '</span>' : '') + '</span>' +
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
      if (!inHouse && s.undo) h += s.undo === 'ok'
        ? '<div class="undo-box"><b>Checked out by mistake?</b><span>If the guest is still staying, bring the room back.</span><button class="btn btn-line" id="b-undo" type="button">' + (rcp() ? 'Ask manager to reverse check-out' : 'Reverse check-out') + '</button></div>'
        : '<p class="small">Check-out can\'t be reversed now: ' + esc(errText(s.undo)) + '</p>';
    } else {
      h += '<div class="bill"><h3>Items given</h3>' + (s.charges.length ? s.charges.map(function (c) {
        return '<div class="bl"><span class="t">' + esc(c.qty + ' × ' + c.item) + (c.free ? '<span class="free">Free' + (c.note ? ' (' + esc(freeWhy(c.note)) + ')' : '') + '</span>' : '') + '</span><span class="d">' + esc(tShort(c.at)) + ' · ' + esc(c.by) + '</span></div>';
      }).join('') : '<div class="bl"><span class="d">Nothing added yet</span></div>') + '</div>' +
        (inHouse ? '<button class="btn btn-gold big-cta" id="b-add" type="button">Add item to this room</button>' : '');
    }
    body.innerHTML = h;
    var b;
    if ((b = $('#hk-done', body))) b.onclick = function () { openHkCheck(s.room, 'stay', function (check) { return api('deskServiceDone', { room: s.room, check: check }).then(function () { vibrate(); toast('Housekeeping done · Room ' + s.room); loadStay(body, s.id); refresh(); }); }); };
    if ((b = $('#hk-undo', body))) b.onclick = function () { var x = this; busy(x, true); api('deskServiceUndo', { room: s.room }).then(function () { toast('Undone'); loadStay(body, s.id); refresh(); }, function (e) { busy(x, false); toast(errText(e)); }); };
    if ((b = $('#b-add', body))) b.onclick = function () { openAdd(s.room); };
    if ((b = $('#b-bk', body))) b.onclick = function () { openBooking(s.booking); };
    if ((b = $('#b-ids', body))) b.onclick = function () { openIds(s); };
    if ((b = $('#b-kit', body))) b.onclick = function () { openKit(s, body); };
    if ((b = $('#b-pay', body))) b.onclick = function () { openPay(s, body); };
    if ((b = $('#b-edit', body))) b.onclick = function () { openEdit(s, body); };
    if ((b = $('#b-ref', body))) b.onclick = function () { openRefund('stay', s, body); };
    if (m) $$('[data-pay].tap', body).forEach(function (row) { row.onclick = function () { var p = s.payments.filter(function (x) { return x.id === row.dataset.pay; })[0]; if (p) openVoid(p, 'stay', body); }; });
    if ((b = $('#b-out', body))) b.onclick = function () { openCheckOut(s, body); };
    if ((b = $('#b-undo', body))) b.onclick = function () { openUndoCheckout(s, body); };
    if (m) $$('[data-charge]', body).forEach(function (row) {
      row.onclick = function () { var c = s.charges.filter(function (x) { return x.id === row.dataset.charge; })[0]; if (c) openEditCharge(c, s, body); };
    });
  }

  /* Checked out by mistake: Manager / Owner reverse it at once, a receptionist sends it for approval */
  function openUndoCheckout(s, parentBody) {
    var t = S.st.today, tmr = addDaysYmd(t, 1), def = s.checkout > t ? s.checkout : tmr;
    var body = openSheet('Reverse check-out · Room ' + s.room);
    body.innerHTML = '<p class="small"><b>' + esc(s.guest) + '</b> was checked out by ' + esc(s.outBy || '—') + (s.outAt ? ' at ' + esc(tShort(s.outAt)) : '') + '.</p>' +
      '<div class="note"><b>What happens</b>The guest is shown as staying again and Room ' + esc(s.room) + ' is occupied. The bill is put on hold (nothing is emailed or sent on WhatsApp) and keeps the same invoice number for the real check-out. Member points for this stay come back at the real check-out.</div>' +
      (rcp() ? '<div class="note gold"><b>Needs approval</b>This is sent to the manager. The room comes back once they approve it.</div>' : '') +
      field('Guest now leaving on', '<input class="input" id="u-out" type="date" min="' + esc(t) + '" value="' + esc(def) + '">', true) +
      reasonField('u-why', 'e.g. Wrong room checked out, guest is still staying') +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">' + goLabel('Reverse check-out') + '</button>';
    $('#go', body).onclick = function () {
      var x = this;
      if (!x.dataset.sure) { x.dataset.sure = 1; x.textContent = 'Tap again to confirm'; return; }
      submit(x, $('#err', body), 'deskUndoCheckout', { id: s.id, checkout: $('#u-out', body).value, reason: $('#u-why', body).value }, function (r) {
        vibrate(); toast('Check-out reversed · Room ' + s.room + ' is occupied again'); closeSheet(); if (r.stay) drawStay(parentBody, r.stay); refresh();
      });
    };
  }
  function addDaysYmd(ymd, n) { var p = String(ymd).split('-'), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)); return d.toISOString().slice(0, 10); }

  function freeWhy(note) { note = String(note || ''); return /^Check-in/.test(note) ? 'check-in' : note === 'Welcome kit' ? 'welcome kit' : /^Daily housekeeping/.test(note) ? note.replace(/^Daily housekeeping \(day (\d+)\).*/, 'daily · day $1') : note; }
  function serviceBox(sv) {
    var list = (sv.items || []).map(function (i) { return i.qty + ' × ' + i.item; }).join(', ') || 'Room service';
    return '<div class="hk-box ' + (sv.done ? 'done' : 'due') + '"><div class="hk-h">' + ICON.housekeeping + '<b>Housekeeping today · day ' + sv.day + ' of ' + sv.of + '</b></div>' +
      (sv.done ? '<p>Done by ' + esc(sv.done.by) + ' at ' + esc(tShort(sv.done.at).split(', ').pop()) + ' · gave ' + esc(String(sv.done.items || list).split(' · Checked')[0]) + '</p><button class="btn btn-quiet sm" type="button" id="hk-undo">Undo</button>'
        : '<p>Free today: <b>' + esc(list) + '</b></p><button class="btn btn-ok" type="button" id="hk-done">Open housekeeping checklist</button>') + '</div>';
  }

  /* ---------- Housekeeping checklist (everyone) ---------- */
  var HK = { data: null };
  function viewHousekeeping(v) {
    if (!HK.data) {
      v.innerHTML = '<div><p class="kicker">Today</p><h1>Housekeeping</h1></div><div class="loading">Loading…</div>';
      api('deskHousekeeping').then(function (r) { HK.data = r; if (S.tab === 'housekeeping') render(); }, function (e) { toast(errText(e)); });
      return;
    }
    var d = HK.data, due = d.rooms.filter(function (r) { return r.due; }), left = due.filter(function (r) { return !r.done; }).length;
    var daily = d.daily.map(function (i) { return i.qty + ' × ' + i.item; }).join(', ') || 'nothing set';
    v.innerHTML = '<div class="hrow"><div><p class="kicker">' + esc(dShort(d.date)) + ' · free daily per room: ' + esc(daily) + '</p><h1>Housekeeping</h1></div><button class="btn btn-quiet" type="button" id="hrf">Refresh</button></div>' +
      '<div class="counts"><div class="count c-dirty"><b>' + left + '</b><span>To do</span></div><div class="count c-ready"><b>' + (due.length - left) + '</b><span>Done</span></div></div>' +
      (due.length ? '<div class="list hk-list">' + due.map(function (r) {
        return '<div class="hk-row ' + (r.done ? 'done' : '') + '"><div class="hk-room"><b>' + r.room + '</b><small>' + esc(r.type) + '</small></div>' +
          '<div class="hk-what"><b>' + esc(r.guest) + ' · ' + r.guests + (r.guests > 1 ? ' guests' : ' guest') + ' · day ' + r.day + ' of ' + r.of + '</b>' +
          '<span>' + (r.done ? '✓ Done by ' + esc(r.done.by) + ' at ' + esc(tShort(r.done.at).split(', ').pop()) + ' · ' + esc(String(r.done.items).split(' · Checked')[0]) : 'Give: ' + esc(r.items.map(function (i) { return i.qty + ' × ' + i.item; }).join(', ') || '—')) + '</span></div>' +
          (r.done ? '<button class="btn btn-quiet sm" type="button" data-undo="' + r.room + '">Undo</button>' : '<button class="btn btn-ok" type="button" data-done="' + r.room + '">Checklist</button>') + '</div>';
      }).join('') + '</div>' : '<p class="small">No rooms need daily housekeeping today. Rooms are on this list from the guest\'s 2nd day until the day before they leave (the first day gets the free check-in water).</p>') +
      (function () { var other = d.rooms.filter(function (r) { return !r.due; }); return other.length ? '<p class="small">Not on today\'s list: ' + other.map(function (r) { return 'Room ' + r.room + (r.firstDay ? ' (arrived today)' : r.leaves ? ' (leaves today)' : ''); }).join(', ') + '.</p>' : ''; })();
    $('#hrf', v).onclick = function () { HK.data = null; render(); };
    $$('[data-done]', v).forEach(function (b) { b.onclick = function () { var n = Number(b.dataset.done); openHkCheck(n, 'stay', function (check) { return api('deskServiceDone', { room: n, check: check }).then(function (r) { vibrate(); toast('Room ' + n + ' done'); HK.data = r; render(); refresh(); }); }); }; });
    $$('[data-undo]', v).forEach(function (b) { b.onclick = function () { busy(b, true); api('deskServiceUndo', { room: Number(b.dataset.undo) }).then(function (r) { toast('Undone'); HK.data = r; render(); refresh(); }, function (e) { busy(b, false); toast(errText(e)); }); }; });
  }

  /* ---------- Guest ID copies (front desk) ---------- */
  var IDC = { stay: null, list: null, q: '' };
  function openIds(s) {
    go('idcopy');
    IDC.stay = { id: s.id, room: s.room, guest: s.guest, checkin: s.checkin, checkout: s.checkout, status: s.status };
    render();
  }
  function viewIdCopy(v) {
    if (IDC.stay) {
      if (v._idcFor === IDC.stay.id && v.querySelector('.idc-top')) return; // keep the page as it is (nothing is lost on refresh)
      var st = IDC.stay;
      v.innerHTML = '<div class="hrow"><div><p class="kicker">' + (st.id === 'free' ? 'Quick copy · not saved' : 'ID copies · ' + esc(st.status === 'In house' ? 'staying now' : 'checked out')) + '</p><h1>' + (st.id === 'free' ? 'ID copies' : 'Room ' + esc(st.room)) + '</h1></div>' +
        '<button class="btn btn-quiet" type="button" id="idb">‹ All guests</button></div><div id="idc"></div>';
      v._idcFor = st.id;
      $('#idb', v).onclick = function () { IDC.stay = null; IDC.list = null; v._idcFor = null; render(); };
      var free = st.id === 'free';
      NikadiID.mount($('#idc', v), free ? { today: S.st.today, toast: toast, base: '' } : {
        today: S.st.today, toast: toast, base: '', kind: IDC.kind,
        stay: st, stayLine: dShort(st.checkin) + ' → ' + dShort(st.checkout),
        load: function () { return api('deskIdList', { stay: st.id }).then(function (r) { return r.list; }); },
        fetch: function (id) { return api('deskIdGet', { id: id }).then(function (r) { return r.data; }); },
        save: function (kind, slot, data) { return api('deskIdSave', { stay: st.id, kind: kind, slot: slot, data: data }).then(function (r) { return r.saved; }); },
        remove: function (id) { return api('deskIdRemove', { id: id }); }
      });
      return;
    }
    v._idcFor = null;
    if (!IDC.list) {
      v.innerHTML = '<div><p class="kicker">Front desk</p><h1>ID copies</h1></div><div class="loading">Loading…</div>';
      api('deskIdStays', { q: IDC.q }).then(function (r) { IDC.list = r.list; if (S.tab === 'idcopy' && !IDC.stay) render(); }, function (e) { toast(errText(e)); });
      return;
    }
    var L = IDC.list, now = L.filter(function (x) { return x.status === 'In house'; }), past = L.filter(function (x) { return x.status !== 'In house'; });
    function row(x) {
      return '<button type="button" class="bl bl-btn" data-sid="' + esc(x.id) + '"><span class="t"><b>Room ' + esc(x.room) + ' · ' + esc(x.guest) + '</b><small>' + esc(dShort(x.checkin)) + ' → ' + esc(dShort(x.checkout)) + ' · ' + x.guests + (x.guests > 1 ? ' guests' : ' guest') + '</small></span>' +
        '<span class="a"><span class="ptag ' + (x.ids ? 'k-ok' : 'k-warn') + '">' + (x.ids ? x.ids + (x.ids === 1 ? ' ID' : ' IDs') + ' taken' : 'No ID yet') + '</span></span></button>';
    }
    v.innerHTML = '<div class="hrow"><div><p class="kicker">Front desk · Aadhaar, driving licence, passport and visa</p><h1>ID copies</h1></div><button class="btn btn-quiet" type="button" id="idfree">Quick copy (not saved)</button></div>' +
      '<p class="small">Pick the guest. Photos of their ID are cropped, straightened and saved to the stay, and print 3 people (front and back) on one A4 page, or passport, back page and visa on another.</p>' +
      '<form class="idc-find" id="idq"><input class="input" type="search" placeholder="Find a guest: name, phone or room" value="' + esc(IDC.q) + '"><button class="btn btn-line" type="submit">Find</button></form>' +
      (IDC.q ? '<div class="list">' + (L.length ? L.map(row).join('') : '<p class="small">No stays found.</p>') + '</div>' :
        '<h3 class="idc-h">Staying now</h3>' + (now.length ? '<div class="list">' + now.map(row).join('') + '</div>' : '<p class="small">Nobody is checked in right now.</p>') +
        (past.length ? '<h3 class="idc-h">Checked out · last 45 days</h3><div class="list">' + past.map(row).join('') + '</div>' : ''));
    $('#idq', v).onsubmit = function (e) { e.preventDefault(); IDC.q = this.querySelector('input').value.trim(); IDC.list = null; render(); };
    $('#idfree', v).onclick = function () { IDC.stay = { id: 'free' }; render(); };
    $$('[data-sid]', v).forEach(function (b) { b.onclick = function () { var x = L.filter(function (y) { return y.id === b.dataset.sid; })[0]; IDC.stay = x; render(); }; });
  }

  /* ---------- WhatsApp: guest chats filed into 4 lists ---------- */
  var WA = { list: null, tab: 'new' };
  var WA_TABS = [['new', 'New enquiry'], ['paid', 'Advance paid'], ['in', 'Checked in'], ['member', 'Member']];
  function waLoad() { return api('deskWaChats', {}).then(function (r) { WA.list = r.chats; if (S.tab === 'whatsapp' && !document.querySelector('.sheet')) render(); }, function (e) { toast(errText(e)); }); }
  function waWhen(t) { if (!t) return ''; return String(t).slice(0, 10) === S.st.today ? String(t).slice(11, 16) : dShort(String(t).slice(0, 10)); }
  function viewWhatsApp(v) {
    if (!WA.list) { v.innerHTML = '<div><p class="kicker">Front desk</p><h1>WhatsApp</h1></div><div class="loading">Loading…</div>'; waLoad(); return; }
    var L = WA.list, cnt = {}, hot = {};
    WA_TABS.forEach(function (t) { cnt[t[0]] = 0; hot[t[0]] = 0; });
    L.forEach(function (c) { c.lists.forEach(function (k) { cnt[k]++; if (c.unread || c.important) hot[k]++; }); });
    var rows = L.filter(function (c) { return c.lists.indexOf(WA.tab) >= 0; });
    v.innerHTML = '<div class="hrow"><div><p class="kicker">Guest chats on +91 75011 01137 · filed automatically</p><h1>WhatsApp</h1></div><div class="upd"><button class="refresh gold" id="wakit" type="button">Ready messages</button><button class="refresh" id="warf" type="button">Refresh</button></div></div>' +
      '<div class="wa-tabs" role="tablist">' + WA_TABS.map(function (t) {
        return '<button type="button" role="tab" data-wt="' + t[0] + '" aria-selected="' + (WA.tab === t[0]) + '"><span>' + t[1] + '</span><b>' + cnt[t[0]] + '</b>' + (hot[t[0]] ? '<i class="wa-dot blink" aria-label="needs attention"></i>' : '') + '</button>';
      }).join('') + '</div>' +
      (rows.length ? '<div class="list wa-list">' + rows.map(function (c) {
        return '<button type="button" class="bl bl-btn wa-row' + (c.important ? ' imp' : c.unread ? ' unread' : '') + '" data-ph="' + esc(c.phone) + '">' +
          '<span class="t"><b>' + esc(c.name || nkPhoneShow(c.phone)) + (c.stay ? ' · Room ' + esc(c.stay.room) : '') + '</b>' +
          (c.important ? '<em class="wa-imp blink">⚠ ' + esc(c.important) + '</em>' : '') +
          '<small>' + esc(c.lastText || '') + '</small>' +
          '<small class="wa-meta">' + (c.name ? esc(nkPhoneShow(c.phone)) + ' · ' : '') + (c.booking ? 'Booking ' + esc(c.booking.id) + ' · ' + esc(c.booking.status) + ' · ' + esc(dShort(c.booking.checkin)) : 'No booking') + '</small></span>' +
          '<span class="a wa-a"><span class="wa-time">' + esc(waWhen(c.last)) + '</span>' + (c.unread ? '<span class="wa-count blink">' + c.unread + '</span>' : '') + '</span></button>';
      }).join('') + '</div>' : '<p class="small">No chats in this list right now.</p>') +
      '<p class="small">Chats are filed by themselves: <b>New enquiry</b> (no paid booking yet) · <b>Advance paid</b> (advance received, or a payment screenshot sent for a booking) · <b>Checked in</b> (staying now) · <b>Member</b> (Nikadi members). Blinking = unread or needs checking. Opening a chat marks it read.</p>';
    $('#warf', v).onclick = function () { refresh(this); waLoad(); };
    $('#wakit', v).onclick = function () { openWaSend(); };
    $$('[data-wt]', v).forEach(function (b) { b.onclick = function () { WA.tab = b.dataset.wt; render(); }; });
    $$('[data-ph]', v).forEach(function (b) { b.onclick = function () { openWaChat(b.dataset.ph); }; });
  }
  function openWaChat(ph) {
    var body = openSheet('WhatsApp chat'), first = true, lastKey = '', photo = null;
    body.innerHTML = '<div class="loading">Loading…</div>';
    function msgsHTML(c) {
      return c.msgs.length ? c.msgs.map(function (m) {
        var who = m.dir === 'Guest' ? 'guest' : /^Reception/.test(m.dir) ? 'me' : 'bot';
        return '<div class="wa-msg ' + who + '"><span>' + (m.file ? '<button type="button" class="wa-file" data-file="' + esc(m.file) + '" data-type="' + esc(m.type) + '">' + (m.type === 'image' ? '📷 Photo' : '📄 File') + ' · tap to see</button>' : '') + esc(m.text && m.text.charAt(0) !== '[' ? m.text : m.text && m.type === 'out' ? m.text : '') + '</span><small>' + esc(who === 'guest' ? (c.name || 'Guest') : m.dir) + ' · ' + esc(tShort(m.at)) + '</small></div>';
      }).join('') : '<p class="small">No messages saved yet.</p>';
    }
    function wireFiles(root) {
      $$('[data-file]', root).forEach(function (b) { b.onclick = function () {
        if (b.dataset.type !== 'image') { window.open('https://drive.google.com/file/d/' + b.dataset.file + '/view', '_blank'); return; }
        busy(b, true); api('deskWaPhoto', { file: b.dataset.file }).then(function (x) { busy(b, false); waBig(x.data); }, function (e) { busy(b, false); toast(errText(e)); });
      }; });
    }
    function scrollEnd() { var m = $('#wa-msgs', body); if (m) m.scrollTop = m.scrollHeight; }
    function load() {
      return api('deskWaChat', { phone: ph, photo: first }).then(function (r) {
        var c = r.chat, key = c.msgs.length + '|' + (c.msgs.length ? c.msgs[c.msgs.length - 1].at + c.msgs[c.msgs.length - 1].text : '') + '|' + c.canReply + '|' + c.important;
        if (!first) { if (key !== lastKey && $('#wa-msgs', body)) { lastKey = key; $('#wa-msgs', body).innerHTML = msgsHTML(c); wireFiles($('#wa-msgs', body)); scrollEnd(); var cl = $('#wa-closed', body); if (cl) cl.hidden = c.canReply; var cp = $('#wa-comp', body); if (cp) cp.hidden = !c.canReply; } return; }
        first = false; lastKey = key;
        var bk = c.booking;
        var h = '<div class="hrow"><div><p class="kicker">' + c.lists.map(function (k) { return WA_TABS.filter(function (t) { return t[0] === k; })[0][1]; }).join(' · ') + '</p><h2 style="font-size:1.7rem">' + esc(c.name || '+91 ' + c.phone) + '</h2><p class="small">+91 ' + esc(c.phone) + (c.member ? ' · ' + esc(c.member.tier) + ' member' : '') + '</p></div></div>';
        if (c.important) h += '<div class="note wa-note"><b>⚠ Needs attention</b>' + esc(c.important) + '</div>';
        if (c.proof) h += '<div class="wa-proof"><p class="kicker">Payment screenshot · ' + esc(tShort(c.proof.at)) + '</p>' + (c.proof.data ? '<img id="wa-img" alt="Payment screenshot" src="' + c.proof.data + '">' : '<a class="linkbtn" target="_blank" rel="noopener" href="https://drive.google.com/file/d/' + esc(c.proof.file) + '/view">Open the file in Google Drive →</a>') + '</div>';
        if (bk) h += '<div class="bl"><span class="t"><b>Booking ' + esc(bk.id) + ' · ' + esc(bk.status) + '</b><small>' + esc(dShort(bk.checkin)) + ' → ' + esc(dShort(bk.checkout)) + ' · advance ' + inr(bk.advancePaid || 0) + ' of ' + inr(bk.advanceDue || 0) + '</small></span><span class="a"><button class="btn btn-line sm" type="button" id="wa-bk">' + (bk.status === 'Pending' ? 'Confirm booking' : 'Open') + '</button></span></div>';
        if (c.stay) h += '<button class="linkbtn" type="button" id="wa-st">Staying in room ' + esc(c.stay.room) + ' →</button>';
        h += '<div class="btns">' + (c.important ? '<button class="btn btn-line" type="button" id="wa-done">' + (c.proof ? 'Payment checked ✓' : 'Done ✓') + '</button>' : '') +
          '<button class="btn btn-quiet" type="button" id="wa-unr">Mark unread</button><a class="btn btn-quiet" href="https://wa.me/' + esc(nkPhoneTel(c.phone).slice(1)) + '" target="_blank" rel="noopener">Open in WhatsApp</a></div>';
        h += '<div class="wa-chat"><div class="wa-msgs" id="wa-msgs">' + msgsHTML(c) + '</div>' +
          (c.connected ? '<p class="note wa-closed" id="wa-closed"' + (c.canReply ? ' hidden' : '') + '><b>Can\'t write here right now</b>WhatsApp allows free messages only within 24 hours of the guest\'s last message. Call the guest, or wait until they write again.</p>' +
            '<div class="wa-comp" id="wa-comp"' + (c.canReply ? '' : ' hidden') + '><div class="wa-ph" id="wa-ph" hidden></div><div class="wa-row2">' +
            '<label class="wa-att" title="Send a photo"><input type="file" accept="image/*" id="wa-pf" hidden>📎</label>' +
            '<textarea class="input" id="wa-tx" rows="1" maxlength="3000" placeholder="Write to ' + esc(String(c.name || 'the guest').split(/\s+/)[0]) + '…"></textarea>' +
            '<button class="btn btn-gold wa-send" type="button" id="wa-go" aria-label="Send">➤</button></div>' +
            '<p class="small">Sent from +91 75011 01137 (shows in the phone\'s WhatsApp too). The automatic assistant stays quiet for this guest for 6 hours.</p></div>' : '<p class="small">WhatsApp is not connected.</p>') + '</div>';
        body.innerHTML = h;
        var img = $('#wa-img', body); if (img) img.onclick = function () { waBig(img.src); };
        if ($('#wa-bk', body)) $('#wa-bk', body).onclick = function () { closeSheet(); openBooking(bk.id); };
        if ($('#wa-st', body)) $('#wa-st', body).onclick = function () { closeSheet(); openRoom(c.stay.room); };
        if ($('#wa-done', body)) $('#wa-done', body).onclick = function () { var b = this; busy(b, true); api('deskWaDone', { phone: c.phone }).then(function () { toast('Marked as checked'); b.remove(); var n = $('.wa-note', body); if (n) n.remove(); refresh(); waLoad(); }, function (e) { busy(b, false); toast(errText(e)); }); };
        $('#wa-unr', body).onclick = function () { api('deskWaMark', { phone: c.phone, unread: true }).then(function () { toast('Marked unread'); closeSheet(); refresh(); waLoad(); }); };
        wireFiles(body); scrollEnd();
        var tx = $('#wa-tx', body);
        if (tx) {
          tx.addEventListener('input', function () { tx.style.height = 'auto'; tx.style.height = Math.min(160, tx.scrollHeight) + 'px'; });
          tx.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(hover:hover)').matches) { e.preventDefault(); send(); } });
          $('#wa-pf', body).onchange = function () {
            var f = this.files[0]; this.value = ''; if (!f) return;
            shrinkPhoto(f).then(function (p) { photo = p; var box = $('#wa-ph', body); box.hidden = false; box.innerHTML = '<img src="' + p.url + '" alt=""><button type="button" class="btn btn-quiet sm" id="wa-px">Remove photo</button>'; $('#wa-px', body).onclick = function () { photo = null; box.hidden = true; box.innerHTML = ''; }; }, function () { toast('That photo could not be opened'); });
          };
          $('#wa-go', body).onclick = send;
        }
        function send() {
          var t = tx.value.trim(), b = $('#wa-go', body); if (!t && !photo) { tx.focus(); return; }
          busy(b, true);
          api('deskWaSend', { phone: c.phone, text: t, photo: photo ? photo.data : '' }).then(function () {
            busy(b, false); tx.value = ''; tx.style.height = ''; photo = null; var box = $('#wa-ph', body); box.hidden = true; box.innerHTML = ''; vibrate(); load(); waLoad();
          }, function (e) { busy(b, false); toast(errText(e)); if ((e && e.message) === 'wa_window_closed') { $('#wa-closed', body).hidden = false; $('#wa-comp', body).hidden = true; } });
        }
        refresh();
      }, function (e) { if (first) body.innerHTML = '<div class="note"><b>Could not load</b>' + esc(errText(e)) + '</div>'; });
    }
    load();
    var poll = setInterval(function () { if (!body.isConnected) { clearInterval(poll); return; } if (!document.hidden) load(); }, 12000);
  }
  function waBig(src) {
    var ov = document.createElement('div'); ov.className = 'idc-view';
    ov.innerHTML = '<div class="idc-view-top"><b>Photo from WhatsApp</b><span class="idc-view-st"></span><button type="button" class="idc-x" aria-label="Close">✕</button></div><div class="idc-view-pic"><img alt="Photo" src="' + src + '"></div>';
    document.body.appendChild(ov);
    var pic = ov.querySelector('.idc-view-pic');
    ov.querySelector('img').onclick = function () { pic.classList.toggle('zoom'); };
    ov.querySelector('.idc-x').onclick = function () { ov.remove(); };
  }

  /* ---------- Expenses (front desk) ---------- */
  function monthShift(m, n) { var y = +m.slice(0, 4), mo = +m.slice(5, 7) - 1 + n; y += Math.floor(mo / 12); mo = ((mo % 12) + 12) % 12; return y + '-' + String(mo + 1).padStart(2, '0'); }
  function monthName(m) { return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4); }
  function monthBar(m, idp) {
    var cur = (S.st ? S.st.today : '').slice(0, 7);
    return '<div class="mbar"><button class="btn btn-quiet sm" type="button" id="' + idp + 'prev">‹</button><b>' + esc(monthName(m)) + '</b><button class="btn btn-quiet sm" type="button" id="' + idp + 'next"' + (m >= cur ? ' disabled' : '') + '>›</button></div>';
  }
  /* photos: shrink on the phone before upload (max 1600 px, JPEG) */
  function shrinkPhoto(file) {
    return new Promise(function (ok, bad) {
      var fr = new FileReader();
      fr.onload = function () {
        var im = new Image();
        im.onload = function () {
          var k = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
          var url = c.toDataURL('image/jpeg', 0.72); ok({ url: url, data: url.split(',')[1] });
        };
        im.onerror = function () { bad(new Error('bad_photo')); };
        im.src = fr.result;
      };
      fr.onerror = function () { bad(new Error('bad_photo')); };
      fr.readAsDataURL(file);
    });
  }
  var EXP = { data: null, month: null, cat: '' };
  function viewExpenses(v) {
    if (!EXP.month) EXP.month = S.st.today.slice(0, 7);
    if (!EXP.data) {
      v.innerHTML = '<div><p class="kicker">Front desk</p><h1>Expenses</h1></div><div class="loading">Loading…</div>';
      api('deskExpenses', { month: EXP.month }).then(function (r) { EXP.data = r; if (S.tab === 'expenses') render(); }, function (e) { toast(errText(e)); });
      return;
    }
    var d = EXP.data, list = d.list.filter(function (e) { return !EXP.cat || e.group === EXP.cat; });
    var total = d.list.reduce(function (a, e) { return a + e.amount; }, 0), byG = {};
    d.list.forEach(function (e) { byG[e.group] = (byG[e.group] || 0) + e.amount; });
    v.innerHTML = '<div class="hrow"><div><p class="kicker">Front desk · money spent for the guest house</p><h1>Expenses</h1></div><button class="btn btn-gold" type="button" id="xadd">+ Add expense</button></div>' +
      monthBar(d.month, 'x') +
      '<div class="kpis"><div class="kpi"><span>Total this month</span><b>' + inr(total) + '</b><small>' + d.list.length + ' entr' + (d.list.length === 1 ? 'y' : 'ies') + '</small></div>' +
      Object.keys(byG).sort(function (a, b) { return byG[b] - byG[a]; }).map(function (g) { return '<button type="button" class="kpi kpi-btn' + (EXP.cat === g ? ' on' : '') + '" data-g="' + esc(g) + '"><span>' + esc(g) + '</span><b>' + inr(byG[g]) + '</b><small>' + (EXP.cat === g ? 'tap to show all' : 'tap to filter') + '</small></button>'; }).join('') + '</div>' +
      (list.length ? '<div class="list">' + list.map(function (e, i) {
        return '<button type="button" class="bl bl-btn" data-x="' + i + '"><span class="t"><b>' + esc(e.category) + (e.item && e.item !== e.category ? ' · ' + esc(e.item) : '') + '</b><small>' + esc(dShort(e.date)) + (e.shop ? ' · ' + esc(e.shop) : '') + ' · ' + esc(e.method) + (e.photos ? ' · 📎 ' + e.photos : ' · no bill photo') + (e.stockQty ? ' · +' + e.stockQty + ' to stock' : '') + '</small></span><span class="a">' + inr(e.amount) + '</span></button>';
      }).join('') + '</div>' : '<p class="small">No expenses ' + (EXP.cat ? 'in ' + esc(EXP.cat) + ' ' : '') + 'for ' + esc(monthName(d.month)) + ' yet.</p>');
    $('#xadd', v).onclick = function () { openExpense(null); };
    $('#xprev', v).onclick = function () { EXP.month = monthShift(EXP.month, -1); EXP.data = null; render(); };
    $('#xnext', v).onclick = function () { EXP.month = monthShift(EXP.month, 1); EXP.data = null; render(); };
    $$('[data-g]', v).forEach(function (b) { b.onclick = function () { EXP.cat = EXP.cat === b.dataset.g ? '' : b.dataset.g; render(); }; });
    $$('[data-x]', v).forEach(function (b) { b.onclick = function () { openExpense(list[+b.dataset.x]); }; });
  }
  function openExpense(e) {
    var d = EXP.data, body = openSheet(e ? 'Expense' : 'Add expense'), photos = [], keep = [];
    var fixable = !e || d.canApprove || (e.by === d.me && String(e.at).slice(0, 10) === S.st.today);
    var opts = d.cats.map(function (g) { return '<optgroup label="' + esc(g[0]) + '">' + g[1].map(function (c) { return '<option' + (e && e.category === c[0] ? ' selected' : '') + ' data-shop="' + esc((c[1] && c[1].shop) || '') + '" data-stock="' + esc((c[1] && c[1].stock) || '') + '">' + esc(c[0]) + '</option>'; }).join('') + '</optgroup>'; }).join('');
    body.innerHTML = (e && !fixable ? '<div class="note"><b>Read only</b>Only a manager or the owner can change this entry (or the person who entered it, the same day).</div>' : '') +
      field('Date', '<input class="input" id="x-date" type="date" max="' + esc(S.st.today) + '" value="' + esc(e ? e.date : S.st.today) + '">', true) +
      field('What kind of expense', '<select class="input" id="x-cat">' + (e ? '' : '<option value="" disabled selected>Choose…</option>') + opts + '</select>', true) +
      field('Details (what exactly)', '<input class="input" id="x-item" maxlength="120" placeholder="e.g. 2 bottles Lizol 1 L, November electricity" value="' + esc(e && e.item !== e.category ? e.item : '') + '">') +
      '<div class="two">' + field('Quantity', '<input class="input" id="x-qty" inputmode="numeric" value="' + esc(e && e.qty ? e.qty : '') + '" placeholder="optional">') +
      field('Amount paid (₹)', '<input class="input" id="x-amt" inputmode="numeric" value="' + esc(e ? e.amount : '') + '">', true) + '</div>' +
      field('Shop / paid to', '<input class="input" id="x-shop" list="x-shops" maxlength="120" value="' + esc(e ? e.shop : '') + '" placeholder="Shop name and place"><datalist id="x-shops">' + d.shops.map(function (s1) { return '<option value="' + esc(s1) + '">'; }).join('') + '</datalist>') +
      '<div class="field"><span>Paid by <i>*</i></span>' + seg('x-m', d.methods, e ? e.method : 'Cash') + '</div>' +
      field('Bill / transaction no.', '<input class="input" id="x-ref" maxlength="40" value="' + esc(e ? e.ref : '') + '" placeholder="optional">') +
      (e ? '' : '<div class="field" id="x-stockf" hidden><span>Add to stock?</span><div class="two"><select class="input" id="x-sitem"><option value="">No</option>' + d.stockItems.map(function (i) { return '<option>' + esc(i) + '</option>'; }).join('') + '</select><input class="input" id="x-sqty" inputmode="numeric" placeholder="How many"></div><small class="small">The stock count goes up by this many.</small></div>') +
      (e && e.stockQty ? '<p class="small">Added ' + e.stockQty + ' × ' + esc(e.stockItem) + ' to stock when this was saved.</p>' : '') +
      '<div class="field"><span>Bill photos</span><div class="ph-grid" id="x-ph"></div>' + (fixable ? '<label class="btn btn-line ph-add">📷 Add bill photo<input type="file" accept="image/*" multiple id="x-file" hidden></label><small class="small">Take a photo of the bill or choose from the gallery (up to 4).</small>' : '') + '</div>' +
      field('Note', '<input class="input" id="x-note" maxlength="300" value="' + esc(e ? e.note : '') + '">') +
      (e ? '<p class="small">Entered by ' + esc(e.by) + ' · ' + esc(tShort(e.at)) + (e.edited ? ' · changed ' + esc(e.edited) : '') + '</p>' : '') +
      '<p class="err" id="x-err" role="alert"></p>' +
      (fixable ? '<button class="btn btn-gold big-cta" type="button" id="x-save">' + (e ? 'Save changes' : 'Save expense') + '</button>' + (e ? '<button class="btn btn-quiet sm danger" type="button" id="x-del">Remove this expense</button>' : '') : '');
    if (!fixable) $$('input,select', body).forEach(function (x) { x.disabled = true; });
    wireSegs(body);
    var cat = $('#x-cat', body);
    function catChanged() {
      var o = cat.selectedOptions[0]; if (!o) return;
      if (o.dataset.shop && !$('#x-shop', body).value) $('#x-shop', body).value = o.dataset.shop;
      var sf = $('#x-stockf', body); if (!sf) return;
      if (o.dataset.stock && d.stockItems.indexOf(o.dataset.stock) >= 0) { sf.hidden = false; $('#x-sitem', body).value = o.dataset.stock; }
      else { sf.hidden = !d.stockItems.length; }
    }
    cat.onchange = catChanged;
    function drawPhotos() {
      var g = $('#x-ph', body);
      g.innerHTML = keep.map(function (k, i) { return '<div class="ph"><img src="' + k.url + '" alt="Bill photo"><button type="button" data-rk="' + i + '" aria-label="Remove photo"' + (fixable ? '' : ' hidden') + '>✕</button></div>'; }).join('') +
        photos.map(function (p1, i) { return '<div class="ph"><img src="' + p1.url + '" alt="New bill photo"><button type="button" data-rp="' + i + '" aria-label="Remove photo">✕</button></div>'; }).join('');
      $$('[data-rk]', g).forEach(function (b) { b.onclick = function () { keep.splice(+b.dataset.rk, 1); drawPhotos(); }; });
      $$('[data-rp]', g).forEach(function (b) { b.onclick = function () { photos.splice(+b.dataset.rp, 1); drawPhotos(); }; });
      $$('img', g).forEach(function (im) { im.onclick = function () { var w = window.open('', '_blank'); if (w) { w.document.write('<title>Bill photo</title><body style="margin:0;background:#111"><img src="' + im.src + '" style="max-width:100%;display:block;margin:auto">'); w.document.close(); } }; });
    }
    var fi = $('#x-file', body);
    if (fi) fi.onchange = function () {
      var files = Array.prototype.slice.call(fi.files || []).slice(0, Math.max(0, 4 - photos.length - keep.length));
      Promise.all(files.map(shrinkPhoto)).then(function (arr) { photos = photos.concat(arr); drawPhotos(); body.closest('.sheet').dataset.dirty = '1'; }, function () { toast('That photo could not be read'); });
      fi.value = '';
    };
    if (e && e.photos) {
      $('#x-ph', body).innerHTML = '<span class="small">Loading photos…</span>';
      api('deskExpensePhoto', { id: e.id }).then(function (r) { keep = r.photos.map(function (p1) { return { id: p1.id, url: p1.data }; }); drawPhotos(); }, function () { $('#x-ph', body).innerHTML = '<span class="small">Could not load the photos.</span>'; });
    }
    var sv = $('#x-save', body);
    if (sv) sv.onclick = function () {
      var x = this, err = $('#x-err', body); err.textContent = '';
      if (!cat.value) { err.textContent = 'Choose what kind of expense it is.'; return; }
      var data = { id: e ? e.id : '', date: $('#x-date', body).value, category: cat.value, item: $('#x-item', body).value.trim(), qty: $('#x-qty', body).value.replace(/\D/g, ''),
        amount: $('#x-amt', body).value.replace(/\D/g, ''), shop: $('#x-shop', body).value.trim(), method: segVal(body, 'x-m'), ref: $('#x-ref', body).value.trim(), note: $('#x-note', body).value.trim(),
        photos: photos.map(function (p1) { return { data: p1.data }; }), keepPhotos: keep.map(function (k) { return k.id; }) };
      if (!e && $('#x-sitem', body) && $('#x-sitem', body).value) { data.stockItem = $('#x-sitem', body).value; data.stockQty = $('#x-sqty', body).value.replace(/\D/g, ''); }
      if (photos.length) x.textContent = 'Uploading photos…';
      submit(x, err, 'deskExpenseSave', data, function () { toast(e ? 'Expense updated' : 'Expense saved'); EXP.data = null; closeSheet(); render(); if (data.stockItem) refresh(); });
    };
    var del = $('#x-del', body);
    if (del) del.onclick = function () {
      var x = this; if (x.dataset.sure !== '1') { x.dataset.sure = '1'; x.textContent = 'Sure? Tap again to remove'; return; }
      submit(x, $('#x-err', body), 'deskExpenseRemove', { id: e.id }, function () { toast('Expense removed'); EXP.data = null; closeSheet(); render(); });
    };
    if (!e) catChanged();
  }

  /* ---------- Commission (front desk) ---------- */
  var COM = { data: null, month: null };
  function viewCommission(v) {
    if (!COM.month) COM.month = S.st.today.slice(0, 7);
    if (!COM.data) {
      v.innerHTML = '<div><p class="kicker">Front desk</p><h1>Commission</h1></div><div class="loading">Loading…</div>';
      api('deskCommissions', { month: COM.month }).then(function (r) { COM.data = r; if (S.tab === 'commission') render(); }, function (e) { toast(errText(e)); });
      return;
    }
    var d = COM.data, total = d.list.reduce(function (a, c) { return a + c.amount; }, 0), byP = {};
    d.list.forEach(function (c) { var k = c.name + ' · ' + c.type; byP[k] = (byP[k] || 0) + c.amount; });
    v.innerHTML = '<div class="hrow"><div><p class="kicker">Front desk · drivers, brokers and agents</p><h1>Commission</h1></div><button class="btn btn-gold" type="button" id="kadd">+ Add commission</button></div>' +
      monthBar(d.month, 'k') +
      '<div class="kpis"><div class="kpi"><span>Paid this month</span><b>' + inr(total) + '</b><small>' + d.list.length + ' payment' + (d.list.length === 1 ? '' : 's') + '</small></div>' +
      Object.keys(byP).sort(function (a, b) { return byP[b] - byP[a]; }).slice(0, 5).map(function (k) { return '<div class="kpi"><span>' + esc(k) + '</span><b>' + inr(byP[k]) + '</b></div>'; }).join('') + '</div>' +
      (d.list.length ? '<div class="list">' + d.list.map(function (c, i) {
        return '<button type="button" class="bl bl-btn" data-k="' + i + '"><span class="t"><b>' + esc(c.name) + ' · ' + esc(c.type) + '</b><small>' + esc(dShort(c.date)) + ' · ' + esc(nkPhoneShow(c.phone)) + (c.vehicle ? ' · ' + esc(c.vehicle) : '') + (c.guest || c.room ? ' · for ' + esc([c.guest, c.room].filter(Boolean).join(', ')) : '') + ' · ' + esc(c.method) + '</small></span><span class="a">' + inr(c.amount) + '</span></button>';
      }).join('') + '</div>' : '<p class="small">No commission paid in ' + esc(monthName(d.month)) + ' yet.</p>') +
      (d.people.length ? '<div class="panel"><div class="sec-h"><h2>Drivers and brokers</h2><span class="small">all time</span></div><div class="list">' + d.people.map(function (p1) {
        return '<div class="bl"><span class="t"><b>' + esc(p1.name) + ' · ' + esc(p1.type) + '</b><small><a href="tel:' + esc(nkPhoneTel(p1.phone)) + '">' + esc(nkPhoneShow(p1.phone)) + '</a>' + (p1.vehicle ? ' · ' + esc(p1.vehicle) : '') + ' · ' + p1.times + ' time' + (p1.times > 1 ? 's' : '') + ' · last ' + esc(dShort(p1.last)) + '</small></span><span class="a">' + inr(p1.total) + '</span></div>';
      }).join('') + '</div></div>' : '');
    $('#kadd', v).onclick = function () { openCommission(null); };
    $('#kprev', v).onclick = function () { COM.month = monthShift(COM.month, -1); COM.data = null; render(); };
    $('#knext', v).onclick = function () { COM.month = monthShift(COM.month, 1); COM.data = null; render(); };
    $$('[data-k]', v).forEach(function (b) { b.onclick = function () { openCommission(d.list[+b.dataset.k]); }; });
  }
  function openCommission(c) {
    var d = COM.data, body = openSheet(c ? 'Commission' : 'Add commission');
    var fixable = !c || d.canApprove || (c.by === d.me && String(c.at).slice(0, 10) === S.st.today);
    body.innerHTML = (c && !fixable ? '<div class="note"><b>Read only</b>Only a manager or the owner can change this entry (or the person who entered it, the same day).</div>' : '') +
      field('Name', '<input class="input" id="k-name" maxlength="80" list="k-people" value="' + esc(c ? c.name : '') + '" placeholder="Driver / broker name"><datalist id="k-people">' + d.people.map(function (p1) { return '<option value="' + esc(p1.name) + '">' + esc(p1.type + ' · ' + p1.phone) + '</option>'; }).join('') + '</datalist>', true) +
      '<div class="field"><span>Who is it?</span>' + seg('k-t', d.types, c ? c.type : 'Driver') + '</div>' +
      '<div class="two">' + field('Phone', nkPhoneHtml('k-phone', c ? c.phone : ''), true) + field('Vehicle no. (drivers)', '<input class="input" id="k-veh" maxlength="20" style="text-transform:uppercase" value="' + esc(c ? c.vehicle : '') + '" placeholder="optional">') + '</div>' +
      '<div class="two">' + field('For which guest', '<input class="input" id="k-guest" maxlength="80" value="' + esc(c ? c.guest : '') + '" placeholder="optional">') + field('Room / booking', '<input class="input" id="k-room" maxlength="40" value="' + esc(c ? c.room : '') + '" placeholder="optional">') + '</div>' +
      '<div class="two">' + field('Date', '<input class="input" id="k-date" type="date" max="' + esc(S.st.today) + '" value="' + esc(c ? c.date : S.st.today) + '">') + field('Amount (₹)', '<input class="input" id="k-amt" inputmode="numeric" value="' + esc(c ? c.amount : '') + '">', true) + '</div>' +
      '<div class="field"><span>Paid by <i>*</i></span>' + seg('k-m', d.methods, c ? c.method : 'Cash') + '</div>' +
      field('Transaction no.', '<input class="input" id="k-ref" maxlength="40" value="' + esc(c ? c.ref : '') + '" placeholder="for UPI / bank">') +
      field('Note', '<input class="input" id="k-note" maxlength="300" value="' + esc(c ? c.note : '') + '">') +
      (c ? '<p class="small">Entered by ' + esc(c.by) + ' · ' + esc(tShort(c.at)) + (c.edited ? ' · changed ' + esc(c.edited) : '') + '</p>' : '') +
      '<p class="err" id="k-err" role="alert"></p>' +
      (fixable ? '<button class="btn btn-gold big-cta" type="button" id="k-save">' + (c ? 'Save changes' : 'Save commission') + '</button>' + (c ? '<button class="btn btn-quiet sm danger" type="button" id="k-del">Remove this entry</button>' : '') : '');
    if (!fixable) $$('input,select', body).forEach(function (x) { x.disabled = true; });
    wireSegs(body);
    $('#k-name', body).onchange = function () { // known person: fill phone, type, vehicle
      var p1 = d.people.filter(function (x) { return x.name.toLowerCase() === this.value.trim().toLowerCase(); }, this)[0];
      if (p1) { if (!$('#k-phone', body).value) { var sp = nkPhoneSplit(p1.phone); $('#k-phone-cc', body).value = sp[0]; $('#k-phone', body).value = sp[1]; } if (!$('#k-veh', body).value) $('#k-veh', body).value = p1.vehicle || ''; $$('[data-seg="k-t"] button', body).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === p1.type)); }); }
    };
    var sv = $('#k-save', body);
    if (sv) sv.onclick = function () {
      submit(this, $('#k-err', body), 'deskCommissionSave', { id: c ? c.id : '', name: $('#k-name', body).value.trim(), type: segVal(body, 'k-t'), phone: nkPhoneVal('k-phone', body),
        vehicle: $('#k-veh', body).value.trim(), guest: $('#k-guest', body).value.trim(), room: $('#k-room', body).value.trim(), date: $('#k-date', body).value,
        amount: $('#k-amt', body).value.replace(/\D/g, ''), method: segVal(body, 'k-m'), ref: $('#k-ref', body).value.trim(), note: $('#k-note', body).value.trim() },
        function () { toast(c ? 'Updated' : 'Commission saved'); COM.data = null; closeSheet(); render(); });
    };
    var del = $('#k-del', body);
    if (del) del.onclick = function () {
      var x = this; if (x.dataset.sure !== '1') { x.dataset.sure = '1'; x.textContent = 'Sure? Tap again to remove'; return; }
      submit(x, $('#k-err', body), 'deskCommissionRemove', { id: c.id }, function () { toast('Removed'); COM.data = null; closeSheet(); render(); });
    };
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
  /* names of the other guests in the room: one box per extra person (up to 9) */
  function compBox() { return '<div class="field comp" id="f-compw"><span>Other guests in the room <small>(names, optional)</small></span><div class="comp-list" id="f-comp"></div></div>'; }
  function compDraw(body, guests, keep) {
    var box = $('#f-comp', body); if (!box) return;
    var have = $$('input', box).map(function (x) { return x.value; }), vals = keep || have, n = Math.min(9, Math.max(0, guests - 1));
    $('#f-compw', body).hidden = n === 0;
    box.innerHTML = Array.apply(null, Array(n)).map(function (_, i) {
      return '<div class="comp-row"><b>' + (i + 2) + '</b><input class="input" maxlength="80" autocomplete="off" placeholder="Guest ' + (i + 2) + ' name" value="' + esc(vals[i] || '') + '"></div>';
    }).join('') + (guests > 10 ? '<p class="small">Names for up to 10 people. Write the others in Notes.</p>' : '');
  }
  function compVal(body) { return $$('#f-comp input', body).map(function (x) { return x.value.trim(); }).filter(Boolean); }
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

  /* free welcome kit: Morning kit (full kit) or Dental kit (for guests on a lower rate) */
  var KIT_OPTS = ['Morning kit', 'Dental kit', 'Choose later'];
  function kitField(cur) {
    return '<div class="field"><span>Free kit for this room</span>' + seg('kit', cur ? ['Morning kit', 'Dental kit', 'No kit'] : KIT_OPTS, cur || 'Choose later') +
      '<small class="small">Morning kit for regular guests · Dental kit only for guests paying a lower rate. One per guest, taken from stock.</small></div>';
  }
  function kitVal(root) { var v = segVal(root, 'kit'); return v === 'Morning kit' || v === 'Dental kit' ? v : ''; }
  function kitBox(s) {
    return '<button class="kit-room ' + (s.kit ? 'has' : 'none') + '" type="button" id="b-kit"><span><b>' + (s.kit ? esc(s.kit.kind) + ' × ' + s.kit.qty + ' given' : 'Free kit not chosen yet') + '</b><small>' +
      (s.kit ? 'By ' + esc(s.kit.by) + ' · tap to change' : 'Tap to choose Morning kit or Dental kit') + '</small></span><i aria-hidden="true">›</i></button>';
  }
  function openKit(s, parentBody) {
    var body = openSheet('Free kit · Room ' + s.room);
    body.innerHTML = kitField(s.kit ? s.kit.kind : 'Morning kit') +
      '<div class="field"><span>How many</span>' + stepper('k-qty', s.kit ? s.kit.qty : s.guests, 1, 20) + '</div>' +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">Save</button>';
    wireSegs(body); wireSteppers(body);
    $('#go', body).onclick = function () {
      var k = kitVal(body);
      submit(this, $('#err', body), 'deskKit', { id: s.id, kit: k, qty: Number($('#k-qty', body).textContent) }, function (res) {
        vibrate(); toast(k ? k + ' saved · Room ' + s.room : 'Kit removed'); closeSheet(); drawStay(parentBody, res.stay);
      });
    };
  }

  function openCheckIn(r) {
    var t = S.st.today, body = openSheet('Check in · Room ' + r.room, 'ready');
    body.innerHTML = '<p class="small">' + esc(r.type + ' · ' + r.beds) + '</p>' +
      field('Guest name', '<input class="input" id="f-guest" autocomplete="off" maxlength="80">', true) +
      field('Phone (optional)', nkPhoneHtml('f-phone', '', ' autocomplete="off"')) + waConsentHtml(undefined, false, true) +
      '<div id="f-mem"></div>' +
      '<div class="field"><span>Guests in this room <i>*</i></span>' + stepper('f-guests', 2, 1, 20) + '</div>' + compBox() +
      '<div class="grid2">' + field('Check-in', '<input class="input" type="date" id="f-in" value="' + t + '">', true) +
      field('Check-out', '<input class="input" type="date" id="f-out" value="' + addDays(t, 1) + '">', true) + '</div>' +
      '<div class="field"><span>Stay</span>' + seg('stype', ['Paying guest', 'Free stay'], 'Paying guest') + '</div>' +
      '<div id="f-freew" hidden><div class="field"><span>Whose guest <i>*</i></span>' + seg('comp', S.st.compHosts || [], '') + '</div>' +
      field('Reference', '<input class="input" id="f-cref" maxlength="120" placeholder="e.g. Sent by Prahlad for the festival, temple guest…">') +
      '<p class="small">No charge: no money is shown or collected, and no bill is made. Water, kits and other items are still written on the room and taken from stock.</p></div>' +
      '<div id="f-paid">' +
      field('Agreed rate per night (₹)', '<input class="input" id="f-rate" inputmode="numeric" value="' + r.rate + '">', true) +
      field('Rate note (negotiation)', '<input class="input" id="f-rnote" maxlength="160" placeholder="e.g. Agreed ₹4,000 instead of ₹5,000">') +
      '<div class="calc" id="calc"></div>' +
      field('Paid now (₹)', '<input class="input" id="f-adv" inputmode="numeric" placeholder="0">') +
      '<div class="field"><span>Paid by</span>' + seg('method', S.st.methods, 'Cash') + '</div>' + refField('f-ref') + '</div>' +
      kitField() +
      field('Notes', '<textarea class="input" id="f-notes" rows="2" maxlength="300" placeholder="Special requests…"></textarea>') +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">Check in</button>';
    function calc() {
      var n = nights($('#f-in', body).value, $('#f-out', body).value), rate = Number($('#f-rate', body).value.replace(/\D/g, '')) || 0;
      $('#calc', body).innerHTML = n > 0 ? n + (n > 1 ? ' nights' : ' night') + ' × ' + inr(rate) + ' = <b>' + inr(n * rate) + '</b>' : 'Check-out must be after check-in';
    }
    ['#f-in', '#f-out', '#f-rate'].forEach(function (s) { $(s, body).addEventListener('input', calc); });
    wireSegs(body, function () { var fr = segVal(body, 'stype') === 'Free stay'; $('#f-freew', body).hidden = !fr; $('#f-paid', body).hidden = fr; }); wireSteppers(body, function () { compDraw(body, Number($('#f-guests', body).textContent)); }); calc(); compDraw(body, 2);
    var lastPh = '';
    var memLook = function () {
      var ph = nkPhoneOk(nkPhoneVal('f-phone', body));
      if (!ph || ph === lastPh) { if (!ph) { $('#f-mem', body).innerHTML = ''; lastPh = ''; } return; }
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
    }, memT = 0;
    ['#f-phone', '#f-phone-cc'].forEach(function (q) { $(q, body).addEventListener('input', function () { clearTimeout(memT); memT = setTimeout(memLook, 350); }); });
    $('#go', body).onclick = function () {
      var free = segVal(body, 'stype') === 'Free stay';
      if (free && !segVal(body, 'comp')) { $('#err', body).textContent = 'Pick whose guest this is.'; vibrate(); return; }
      var wok = waConsentVal(body, nkPhoneVal('f-phone', body));
      if (wok === undefined) { $('#err', body).textContent = 'Ask the guest: may we send WhatsApp messages (welcome, bill)? Tap Guest agreed or No.'; vibrate(); return; }
      submit(this, $('#err', body), 'deskCheckIn', { waOk: !!wok, waOffers: !!wok && segVal(body, 'waoff') === 'Yes',
        comp: free ? segVal(body, 'comp') : '', compRef: free ? $('#f-cref', body).value : '',
        room: r.room, guest: $('#f-guest', body).value, phone: nkPhoneVal('f-phone', body), guests: Number($('#f-guests', body).textContent), companions: compVal(body),
        checkin: $('#f-in', body).value, checkout: $('#f-out', body).value, rate: $('#f-rate', body).value.replace(/[^\d]/g, ''),
        rateNote: $('#f-rnote', body).value, advance: $('#f-adv', body).value.replace(/[^\d]/g, ''), method: segVal(body, 'method'), ref: $('#f-ref', body).value, notes: $('#f-notes', body).value,
        kit: kitVal(body), kitQty: Number($('#f-guests', body).textContent)
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
      field('Phone', nkPhoneHtml('f-phone', s.phone || '')) + waConsentHtml(s.waOk ? true : s.phone ? false : undefined, s.waOffers, true) +
      '<div class="field"><span>Guests</span>' + stepper('f-guests', s.guests, 1, 20) + '</div>' + compBox() +
      '<div class="grid2">' + field('Check-in', '<input class="input" type="date" id="f-in" value="' + esc(s.checkin) + '">') +
      field('Check-out', '<input class="input" type="date" id="f-out" value="' + esc(s.checkout) + '">') + '</div>' +
      '<div class="btns"><button class="btn btn-quiet" type="button" id="x1">+1 night</button><button class="btn btn-quiet" type="button" id="x2">+2 nights</button></div>' +
      (s.comp ? field('Free stay reference', '<input class="input" id="f-cref" maxlength="120" value="' + esc(s.compRef || '') + '">') + '<input type="hidden" id="f-rate" value=""><input type="hidden" id="f-rnote" value="">' :
      field('Agreed rate per night (₹)', '<input class="input" id="f-rate" inputmode="numeric" value="' + s.rate + '">') +
      field('Rate note', '<input class="input" id="f-rnote" maxlength="160" value="' + esc(s.rateNote || '') + '">')) +
      (!s.comp && rcp() ? '<p class="small">Changing the rate needs a manager\'s approval. Write why below.</p>' + field('Reason for a rate change', '<input class="input" id="f-why" maxlength="200">') : '') +
      '<div class="calc" id="calc"></div>' +
      field('Move to another room', '<select class="input" id="f-room"><option value="">Stay in room ' + s.room + '</option>' + free.map(function (r) { return '<option value="' + r.room + '">Room ' + r.room + ' · ' + esc(r.type) + '</option>'; }).join('') + '</select>') +
      '<div class="field" id="f-fromw" hidden><span>Room ' + s.room + ' after the move</span>' + seg('fromst', ['Needs cleaning', 'Back to ready'], 'Needs cleaning') + '<small class="small">Back to ready: the guest did not use it, nothing changes there.</small></div>' +
      field('Notes', '<textarea class="input" id="f-notes" rows="2" maxlength="300">' + esc(s.notes || '') + '</textarea>') +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">Save changes</button>';
    function calc() {
      var n = nights($('#f-in', body).value, $('#f-out', body).value), rate = Number($('#f-rate', body).value.replace(/\D/g, '')) || 0;
      $('#calc', body).innerHTML = n > 0 ? (s.comp ? n + (n > 1 ? ' nights' : ' night') + ' · free stay' : n + (n > 1 ? ' nights' : ' night') + ' × ' + inr(rate) + ' = <b>' + inr(n * rate) + '</b>') : 'Check-out must be after check-in';
    }
    ['#f-in', '#f-out', '#f-rate'].forEach(function (x) { $(x, body).addEventListener('input', calc); });
    $('#x1', body).onclick = function () { $('#f-out', body).value = addDays($('#f-out', body).value, 1); calc(); };
    $('#x2', body).onclick = function () { $('#f-out', body).value = addDays($('#f-out', body).value, 2); calc(); };
    wireSteppers(body, function () { compDraw(body, Number($('#f-guests', body).textContent)); }); calc(); compDraw(body, s.guests, s.companions || []);
    wireSegs(body);
    $('#f-room', body).addEventListener('change', function () { $('#f-fromw', body).hidden = !this.value; });
    $('#go', body).onclick = function () {
      var d = { id: s.id, companions: compVal(body), guest: $('#f-guest', body).value, phone: nkPhoneVal('f-phone', body), guests: Number($('#f-guests', body).textContent),
        checkin: $('#f-in', body).value, checkout: $('#f-out', body).value, rate: $('#f-rate', body).value.replace(/[^\d]/g, ''), rateNote: $('#f-rnote', body).value, notes: $('#f-notes', body).value };
      if (s.comp) { delete d.rate; delete d.rateNote; d.compRef = $('#f-cref', body).value; }
      var wok2 = waConsentVal(body, d.phone); if (wok2 != null) { d.waOk = wok2; d.waOffers = wok2 && segVal(body, 'waoff') === 'Yes'; }
      if ($('#f-why', body)) d.reason = $('#f-why', body).value;
      if ($('#f-room', body).value) { d.room = Number($('#f-room', body).value); d.fromReady = segVal(body, 'fromst') === 'Back to ready'; }
      submit(this, $('#err', body), 'deskUpdateStay', d, function (res) {
        toast(d.room ? 'Moved to room ' + d.room + '. Room ' + s.room + (d.fromReady ? ' is ready again.' : ' needs cleaning.') : 'Stay updated');
        if (d.room) { after(2); return; }
        closeSheet(); drawStay(parentBody, res.stay);
      });
    };
  }

  function openCheckOutFree(s) {
    var body = openSheet('Check out · Room ' + s.room, 'out'), n = Math.max(1, nights(s.checkin, S.st.today));
    body.innerHTML = '<div class="note comp-note"><b>' + esc(s.guest) + ' · free stay</b>' + esc(s.comp) + (s.compRef ? ' · ' + esc(s.compRef) : '') + '</div>' +
      '<div class="field"><span>Nights stayed</span>' + stepper('f-n', n, 1, 365) + '</div>' +
      '<p class="small">No bill is made and nothing is sent to the guest. The items given stay on the record.</p>' +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">Check out</button>';
    wireSteppers(body);
    $('#go', body).onclick = function () {
      submit(this, $('#err', body), 'deskCheckOut', { id: s.id, nights: Number($('#f-n', body).textContent) }, function () { vibrate(); toast('Checked out. Room ' + s.room + ' needs cleaning.'); after(2); });
    };
  }

  function openCheckOut(s, parentBody) {
    if (s.comp) return openCheckOutFree(s);
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
  /* ---------- Linen & laundry ---------- */
  var LAU = { data: null, month: null };
  var LSTAT = { 'Waiting for approval': 'pend', 'At laundry': 'conf', 'Return to check': 'pend', 'Part returned': 'conf', 'Returned': 'done', 'Cancelled': 'canc' };
  function lText(n) { return Object.keys(n || {}).filter(function (k) { return n[k]; }).map(function (k) { return n[k] + ' × ' + k; }).join(', ') || 'nothing'; }
  function lSum(n) { return Object.keys(n || {}).reduce(function (a, k) { return a + Number(n[k] || 0); }, 0); }
  function lLaundryRole() { return S.me && S.me.role === 'Laundry'; }
  function loadLaundry() {
    return api('deskLaundry', { month: LAU.month || '' }).then(function (r) { LAU.data = r; LAU.month = r.month; if (S.tab === 'laundry') render(); }, function (e) { var v = $('#view'); if (v) v.innerHTML = '<div class="note"><b>Could not load</b>' + esc(errText(e)) + '</div>'; });
  }
  function viewLaundry(v) {
    var d = LAU.data;
    var head = '<div class="hrow"><div><p class="kicker">Bedding and towels</p><h1>Laundry</h1></div><div class="upd"><button class="refresh" type="button" id="rf">Refresh</button>' +
      (d && d.can.list ? '<button class="refresh gold" type="button" id="nl">+ Laundry list</button>' : '') + '</div></div>';
    if (!d) { v.innerHTML = head + '<div class="loading">Loading…</div>'; $('#rf', v).onclick = function () { loadLaundry(); }; loadLaundry(); return; }
    var me = S.me.name, fd = d.can.approve, lr = lLaundryRole();
    var todo = d.list.filter(function (x) {
      if (fd) return x.status === 'Waiting for approval' || x.status === 'Return to check';
      if (lr) return x.status === 'At laundry' || x.status === 'Part returned' || (x.by === me && x.status === 'Waiting for approval') || x.status === 'Return to check';
      return false;
    });
    function card(x) {
      var act = fd && x.status === 'Waiting for approval' ? 'Count and give' : fd && x.status === 'Return to check' ? 'Count and receive' : lr && (x.status === 'At laundry' || x.status === 'Part returned') ? 'Bring back' : '';
      return '<button type="button" class="bl bl-btn" data-l="' + esc(x.id) + '"><span class="t"><b><span class="st-pill s-' + (LSTAT[x.status] || 'pend') + '">' + esc(x.status) + '</span> ' + esc(x.id) + '</b>' +
        '<small>' + esc(tShort(x.outAt || x.at)) + ' · ' + esc(x.outBy ? 'given by ' + x.outBy : 'listed by ' + x.by) + ' · ' + lSum(x.items) + ' pieces' + (lSum(x.back) ? ' · ' + lSum(x.back) + ' back' : '') + (lSum(x.short) && x.outAt && lSum(x.back) ? ' · <b class="warn-t">' + lSum(x.short) + ' still out</b>' : '') + '</small>' +
        '<small>' + esc(lText(x.items)) + '</small></span><span class="a">' + (act ? '<span class="pill gold">' + act + '</span>' : x.total != null && lSum(x.back) ? inr(x.total) + (x.paid ? '<small>paid</small>' : '') : '') + '</span></button>';
    }
    var cols = lr ? [['laundry', 'With you now']] : [['store', 'Clean in store'], ['rooms', 'In rooms'], ['dirty', 'Used, to wash'], ['laundry', 'At laundry']];
    var table = '<div class="tbl-wrap"><table class="tbl lin"><thead><tr><th>Item</th>' + cols.map(function (c) { return '<th class="r">' + c[1] + '</th>'; }).join('') + (lr ? '' : '<th class="r">Total</th>') + (d.linen[0] && d.linen[0].price != null ? '<th class="r">Laundry ₹ / piece</th>' : '') + '</tr></thead><tbody>' +
      d.linen.map(function (i, n) {
        var low = i.low && i.store < i.low, gh = n === 0 || d.linen[n - 1].group !== i.group ? '<tr class="grp"><td colspan="' + (cols.length + 3) + '">' + esc(i.group || 'Other') + '</td></tr>' : '';
        return gh + '<tr' + (d.can.setup || fd ? ' class="tap" data-li="' + esc(i.item) + '"' : '') + '><td><b>' + esc(i.item) + '</b>' + (low ? '<small class="warn-t">clean ones running low</small>' : '') + '</td>' +
          cols.map(function (c) { return '<td class="r">' + (i[c[0]] || '<span class="muted">0</span>') + '</td>'; }).join('') + (lr ? '' : '<td class="r"><b>' + i.total + '</b></td>') + (i.price != null ? '<td class="r">' + (i.price ? inr(i.price) : '<span class="muted">' + (lr ? '—' : 'set') + '</span>') + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>' +
      (d.removed && d.removed.length ? '<p class="small">Removed items: ' + d.removed.map(function (i) { return '<button class="linkbtn" type="button" data-lr="' + esc(i.item) + '">' + esc(i.item) + '</button>'; }).join(' · ') + '</p>' : '');
    var bill = d.bill ? '<div class="kpis"><div class="kpi"><span>Laundry bill · ' + esc(monthName(d.month)) + '</span><b>' + inr(d.bill.total) + '</b><small>' + d.bill.lists + ' lists · ' + d.bill.pieces + ' pieces given</small></div>' +
      '<div class="kpi cash"><span>Not paid yet</span><b>' + inr(d.bill.unpaid) + '</b><small>' + (d.can.pay && d.bill.unpaid ? '<button class="linkbtn" type="button" id="lpay">Mark the laundry bill paid →</button>' : 'all lists so far') + '</small></div></div>' : '';
    v.innerHTML = head +
      (todo.length ? '<div class="panel attn"><div class="sec-h"><h2>' + (fd ? 'To check' : 'Your lists') + '</h2></div><div class="list">' + todo.map(card).join('') + '</div></div>' : '') +
      (lr ? '<p class="small">Make a list of what you take. Reception counts it and approves before you take it. When you bring things back, open the list and tap <b>Bring back</b>: reception counts again and approves.</p>' : '') +
      bill +
      '<div class="sec-h"><h2>' + (lr ? 'Items and price per piece' : 'Linen count') + '</h2>' + (d.can.setup ? '<button class="linkbtn" type="button" id="lnew">Edit the item list</button>' : '') + '</div>' + table +
      (lr ? '' : '<p class="small">Fresh linen goes from the store into a room when housekeeping ticks <b>Put fresh</b>; the used ones go to “Used, to wash”. They go to the laundry when a list is approved, and back to the store when the return is checked.' + (d.can.setup ? ' Tap an item to set its laundry price, add new ones bought, remove torn / lost ones, or correct a count.' : '') + '</p>') +
      '<div class="sec-h"><h2>Laundry lists</h2><input class="input sm" type="month" id="lm" value="' + esc(d.month) + '" style="max-width:11rem"></div>' +
      '<div class="list">' + (d.list.length ? d.list.map(card).join('') : '<div class="bl"><span class="d">No laundry lists this month yet.</span></div>') + '</div>' +
      (d.log.length ? '<div class="sec-h"><h2>Recent linen movements</h2></div><div class="list">' + d.log.map(function (l) {
        return '<div class="bl"><span class="t">' + l.qty + ' × ' + esc(l.item) + '</span><span class="d">' + esc(l.from) + ' → ' + esc(l.to) + ' · ' + esc(l.reason) + (l.room ? ' · Room ' + esc(l.room) : '') + ' · ' + esc(l.by) + ' · ' + esc(tShort(l.at)) + '</span></div>'; }).join('') + '</div>' : '');
    $('#rf', v).onclick = function () { var b = this; busy(b, true); loadLaundry().then(function () { busy(b, false); }); };
    if ($('#nl', v)) $('#nl', v).onclick = function () { openLaundryCount(null, 'list'); };
    if ($('#lnew', v)) $('#lnew', v).onclick = function () { openLinenList(); };
    if ($('#lpay', v)) $('#lpay', v).onclick = function () { openLaundryPay(); };
    $('#lm', v).onchange = function () { LAU.month = this.value; LAU.data = null; render(); };
    $$('[data-l]', v).forEach(function (b) { b.onclick = function () { var x = d.list.filter(function (y) { return y.id === b.dataset.l; })[0]; if (x) openLaundry(x); }; });
    $$('[data-li]', v).forEach(function (b) { b.onclick = function () { openLinenItem(d.linen.filter(function (i) { return i.item === b.dataset.li; })[0]); }; });
    $$('[data-lr]', v).forEach(function (b) { b.onclick = function () { openLinenItem(d.removed.filter(function (i) { return i.item === b.dataset.lr; })[0]); }; });
  }
  /* the whole room-item list on one screen (Owner / Manager): rename, folder, laundry, price, remove, delete, add */
  function openLinenList() {
    var body = openSheet('Room item list');
    body.innerHTML = '<div class="loading">Loading…</div>';
    api('deskLinenEditList', {}).then(function (r) {
      var groups = r.groups, rows = r.items.map(function (i) { return { original: i.item, item: i.item, group: i.group, wash: i.wash !== false, price: i.price || 0, low: i.low || 0, active: i.active !== false, total: i.total || 0, del: false }; });
      function sel(v) { return '<select class="input sm" data-f="group">' + groups.map(function (g) { return '<option' + (g === v ? ' selected' : '') + '>' + esc(g) + '</option>'; }).join('') + '</select>'; }
      function draw() {
        var vis = rows.filter(function (x) { return !x.del; });
        body.innerHTML = '<p class="small">Change any name, folder, laundry price or warning level. <b>Laundry</b> ticked = it shows in laundry lists. Untick <b>In use</b> to hide an item but keep its history; <b>Delete</b> is only for items with none in stock.</p>' +
          '<div class="tbl-wrap"><table class="tbl ledit"><thead><tr><th>Item</th><th>Folder</th><th>Laundry</th><th>₹ / piece</th><th>Warn below</th><th>In use</th><th></th></tr></thead><tbody>' +
          vis.map(function (x) { var i = rows.indexOf(x);
            return '<tr data-i="' + i + '"' + (x.active ? '' : ' class="off"') + '><td><input class="input sm" data-f="item" maxlength="40" value="' + esc(x.item) + '" placeholder="Item name"></td><td>' + sel(x.group) + '</td>' +
              '<td class="c"><input type="checkbox" data-f="wash"' + (x.wash ? ' checked' : '') + '></td><td><input class="input sm num" data-f="price" inputmode="numeric" value="' + (x.price || '') + '" placeholder="0"></td>' +
              '<td><input class="input sm num" data-f="low" inputmode="numeric" value="' + (x.low || '') + '" placeholder="0"></td><td class="c"><input type="checkbox" data-f="active"' + (x.active ? ' checked' : '') + '></td>' +
              '<td>' + (!x.total ? '<button class="linkbtn danger" type="button" data-del="' + i + '">Delete</button>' : '<small class="muted">' + x.total + ' pcs</small>') + '</td></tr>'; }).join('') +
          '</tbody></table></div><button class="btn btn-line" type="button" id="ladd">+ Add an item</button>' +
          '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" type="button" id="go">Save the list</button>';
        $$('tr[data-i]', body).forEach(function (tr) {
          var x = rows[Number(tr.dataset.i)];
          $$('[data-f]', tr).forEach(function (el) { el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', function () {
            var f = el.dataset.f; x[f] = el.type === 'checkbox' ? el.checked : f === 'price' || f === 'low' ? el.value.replace(/\D/g, '') : el.value;
            if (f === 'active') tr.classList.toggle('off', !el.checked);
          }); });
        });
        $$('[data-del]', body).forEach(function (b) { b.onclick = function () { var x = rows[Number(b.dataset.del)]; if (!x.original) rows.splice(rows.indexOf(x), 1); else x.del = true; draw(); }; });
        $('#ladd', body).onclick = function () { rows.push({ original: '', item: '', group: groups[groups.length - 1], wash: true, price: 0, low: 0, active: true, total: 0, del: false }); draw(); var ins = $$('input[data-f="item"]', body); ins[ins.length - 1].focus(); };
        $('#go', body).onclick = function () {
          var items = rows.map(function (x) { return x.del ? { original: x.original, active: 'Deleted' } : { original: x.original, item: String(x.item).trim(), group: x.group, wash: x.wash, price: x.price || 0, low: x.low || 0, active: x.active }; })
            .filter(function (x) { return x.original || x.item; });
          submit(this, $('#err', body), 'deskLinenEditList', { items: items }, function () { linenDone('Item list saved'); });
        };
      }
      draw();
    }, function (e) { body.innerHTML = '<p class="err">' + esc(errText(e)) + '</p>'; });
  }
  /* WhatsApp consent (Meta's rules: we only start chats with guests who agreed) */
  function waConsentHtml(waOk, offers, withOffers) {
    return '<div class="field wa-consent"><span>WhatsApp messages from us (welcome, booking, bill): <b>ask the guest</b></span>' + seg('waok', ['Guest agreed', 'No'], waOk === true ? 'Guest agreed' : waOk === false ? 'No' : '') + '</div>' +
      (withOffers ? '<div class="field"><span>Membership offers on WhatsApp</span>' + seg('waoff', ['Yes', 'No'], offers ? 'Yes' : 'No') + '</div>' : '');
  }
  function waConsentVal(body, phone) { var v = segVal(body, 'waok'); return !String(phone || '').replace(/\D/g, '') ? null : v === 'Guest agreed' ? true : v === 'No' ? false : undefined; }
  function linenDone(msg) { toast(msg); LAU.data = null; closeAllSheetsQuiet(); refresh(); if (S.tab === 'laundry') render(); }
  function laundryDone(msg) { toast(msg); LAU.data = null; closeAllSheetsQuiet(); go('laundry'); refresh(); }
  /* one laundry list */
  function openLaundry(x) {
    var d = LAU.data, fd = d.can.approve, lr = lLaundryRole(), me = S.me.name, body = openSheet('Laundry ' + x.id);
    var keys = {}; [x.items, x.back].forEach(function (o) { Object.keys(o || {}).forEach(function (k) { keys[k] = 1; }); });
    var money = x.prices != null, open = x.returns.filter(function (r) { return !r.okAt; })[0];
    var h = '<p class="kicker"><span class="st-pill s-' + (LSTAT[x.status] || 'pend') + '">' + esc(x.status) + '</span></p>' +
      '<dl class="facts"><div><dt>Listed</dt><dd>' + esc(tShort(x.at)) + '<small> · ' + esc(x.by) + '</small></dd></div><div><dt>Given out (approved)</dt><dd>' + (x.outAt ? esc(tShort(x.outAt)) + '<small> · ' + esc(x.outBy) + '</small>' : 'Not yet') + '</dd></div></dl>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Item</th><th class="r">Given</th><th class="r">Back</th><th class="r">Still out</th>' + (money ? '<th class="r">₹ / piece</th><th class="r">Amount</th>' : '') + '</tr></thead><tbody>' +
      Object.keys(keys).map(function (k) { var b = Number(x.back[k] || 0), pr = money ? Number(x.prices[k] != null ? x.prices[k] : 0) : 0;
        return '<tr><td>' + esc(k) + '</td><td class="r">' + (x.items[k] || 0) + '</td><td class="r">' + b + '</td><td class="r">' + (x.short[k] && x.outAt ? '<b class="warn-t">' + x.short[k] + '</b>' : '') + '</td>' + (money ? '<td class="r">' + inr(pr) + '</td><td class="r">' + inr(b * pr) + '</td>' : '') + '</tr>'; }).join('') +
      (money ? '<tr><td colspan="5"><b>Bill</b> <small class="muted">pieces received back × price</small></td><td class="r"><b>' + inr(x.total) + '</b></td></tr>' : '') + '</tbody></table></div>' +
      x.returns.map(function (r, i) {
        return '<div class="note' + (r.okAt ? (r.exact ? ' ok' : ' gold') : '') + '"><b>Return ' + (i + 1) + (r.okAt ? (r.exact ? ' · checked, exact' : ' · checked, different from their list') : ' · waiting to be checked') + '</b>' +
          'Listed ' + esc(tShort(r.at)) + ' by ' + esc(r.by) + ': ' + esc(lText(r.items)) + (r.okAt ? '<br>Counted ' + esc(tShort(r.okAt)) + ' by ' + esc(r.okBy) + ': ' + esc(lText(r.got)) : '') +
          (r.okAt && fd ? '<br><button class="linkbtn" type="button" data-er="' + i + '">' + (rcp() ? 'Ask to change this count' : 'Change this count') + '</button>' : '') + '</div>';
      }).join('') +
      (x.note ? '<div class="note"><b>Note</b>' + esc(x.note) + '</div>' : '') +
      (x.edited ? '<div class="note"><b>Changes after approval</b>' + x.edited.split(' | ').map(esc).join('<br>') + '</div>' : '') +
      (x.paid ? '<div class="note ok"><b>Paid</b>' + esc(x.paid) + '</div>' : '') +
      (x.drive ? '<p class="small"><a href="' + esc(x.drive) + '" target="_blank" rel="noopener">Open the record in Google Drive (Laundry folder) ↗</a></p>' : x.outAt ? '<p class="small">Saved in Google Drive → Laundry within about 10 minutes.</p>' : '');
    var btns = [];
    if (x.status === 'Waiting for approval') {
      if (fd) btns.push('<button class="btn btn-gold big-cta" type="button" id="lg">Count and give to laundry</button>');
      if (fd || x.by === me) btns.push('<button class="btn btn-quiet" type="button" id="le">Change the list</button><button class="btn btn-danger" type="button" id="lc">Cancel this list</button>');
    }
    if ((x.status === 'At laundry' || x.status === 'Part returned') && (lr || fd)) btns.push('<button class="btn ' + (lr ? 'btn-gold big-cta' : 'btn-line') + '" type="button" id="lb">' + (lr ? 'Bring back: list what you brought' : 'Laundry brought things back') + '</button>');
    if (open && fd) btns.push('<button class="btn btn-gold big-cta" type="button" id="lr">Count and receive</button>');
    if (open && (fd || open.by === me)) btns.push('<button class="btn btn-danger" type="button" id="lw">' + (fd ? 'Turn down this return' : 'Take back this return') + '</button>');
    if (x.outAt && fd) btns.push('<button class="btn btn-quiet" type="button" id="lx">' + (rcp() ? 'Ask to change what was given' : 'Change what was given') + '</button>');
    if (x.outAt && fd && !x.paid) btns.push('<button class="btn btn-danger" type="button" id="ld">' + (rcp() ? 'Ask to delete this list' : 'Delete this list') + '</button>');
    body.innerHTML = h + (btns.length ? '<div class="btns">' + btns.join('') + '</div>' : '') + (x.outAt && rcp() ? '<p class="small">After approval only a manager can change a laundry list. Your change goes to them for approval.</p>' : '') + '<p class="err" id="err" role="alert"></p>';
    var q = function (s) { return $(s, body); };
    if (q('#lg')) q('#lg').onclick = function () { openLaundryCount(x, 'give'); };
    if (q('#le')) q('#le').onclick = function () { openLaundryCount(x, 'list'); };
    if (q('#lb')) q('#lb').onclick = function () { openLaundryCount(x, 'return'); };
    if (q('#lr')) q('#lr').onclick = function () { openLaundryCount(x, 'receive'); };
    if (q('#lx')) q('#lx').onclick = function () { openLaundryCount(x, 'edit', 'out'); };
    $$('[data-er]', body).forEach(function (b) { b.onclick = function () { openLaundryCount(x, 'edit', Number(b.dataset.er)); }; });
    function yesAgain(btn, label, fn) { if (!btn.dataset.sure) { btn.dataset.sure = 1; btn.textContent = label; return; } busy(btn, true); fn(); }
    if (q('#ld')) q('#ld').onclick = function () {
      var b2 = openSheet('Delete laundry ' + x.id);
      b2.innerHTML = '<p class="small">The whole list is removed and the linen counts go back to how they were before it.' + (rcp() ? ' A manager approves it.' : '') + '</p>' + field('Why', '<input class="input" id="dwhy" maxlength="200">', true) +
        '<p class="err" id="err" role="alert"></p><button class="btn btn-danger big-cta" type="button" id="go">' + (rcp() ? 'Send for approval' : 'Delete the list') + '</button>';
      $('#go', b2).onclick = function () { submit(this, $('#err', b2), 'deskLaundryDelete', { id: x.id, reason: $('#dwhy', b2).value }, function (r) { laundryDone(r && r.requested ? 'Sent to the manager for approval' : 'List deleted'); }); };
    };
    if (q('#lc')) q('#lc').onclick = function () { var b = this; yesAgain(b, 'Tap again to cancel the list', function () { api('deskLaundryCancel', { id: x.id }).then(function () { laundryDone('List cancelled'); }, function (e) { busy(b, false); q('#err').textContent = errText(e); }); }); };
    if (q('#lw')) q('#lw').onclick = function () { var b = this; yesAgain(b, 'Tap again to remove this return', function () { api('deskLaundryCancel', { id: x.id }).then(function () { laundryDone('Return removed'); }, function (e) { busy(b, false); q('#err').textContent = errText(e); }); }); };
  }
  /* counting screen: list · give (count and approve) · return (laundry lists what came back) · receive (count and approve) · edit (after approval) */
  function openLaundryCount(x, mode, part) {
    var d = LAU.data, open = x && x.returns.filter(function (r) { return !r.okAt; })[0];
    var title = { list: x ? 'Change laundry list' : 'New laundry list', give: 'Count and give to laundry', 'return': 'What came back', receive: 'Count what came back', edit: 'Change ' + (part === 'out' ? 'what was given' : 'return ' + (part + 1)) }[mode];
    var body = openSheet(title);
    var start = mode === 'list' ? (x ? x.items : {}) : mode === 'give' ? x.items : mode === 'return' ? x.short : mode === 'receive' ? open.items : part === 'out' ? x.items : x.returns[part].got;
    var ref = mode === 'give' ? x.items : mode === 'receive' ? open.items : mode === 'return' ? x.short : null, refName = mode === 'return' ? 'still out' : mode === 'edit' ? 'now' : 'on their list';
    var items = d.linen.map(function (i) { return i.item; }), grpOf = {};
    d.linen.forEach(function (i) { grpOf[i.item] = i.group || 'Other'; });
    Object.keys(start || {}).forEach(function (k) { if (items.indexOf(k) < 0) { items.push(k); grpOf[k] = 'Other'; } });
    var intro = { list: d.can.approve ? 'Count the used bedding and towels going to the laundry.' : 'Write how many of each you are taking. Reception counts and approves before you take them.',
      give: 'Count the pile in front of you. Change a number if it is different from the list, then approve: the laundry can take it.',
      'return': 'Write how many of each you brought back clean. Reception counts and approves.',
      receive: 'Count what came back. Change a number if it is different, then approve: it goes back to the clean store.',
      edit: rcp() ? 'Write the right numbers and why. A manager approves the change.' : 'Write the right numbers. The linen count and the bill are corrected, and the change is noted.' }[mode];
    body.innerHTML = '<p class="small">' + intro + '</p><div class="lcount">' + items.map(function (k, n) {
        var v = start && start[k] ? start[k] : '', r = ref && ref[k] ? ref[k] : 0, gh = n === 0 || grpOf[items[n - 1]] !== grpOf[k] ? '<p class="lc-grp">' + esc(grpOf[k]) + '</p>' : '';
        return gh + '<label class="lc-row"><span>' + esc(k) + (ref ? '<small>' + (r ? r + ' ' + refName : '&nbsp;') + '</small>' : '') + '</span><span class="lc-q"><button type="button" data-d="-1" aria-label="Less">−</button><input class="input" type="number" inputmode="numeric" min="0" max="500" data-k="' + esc(k) + '" value="' + v + '" placeholder="0"><button type="button" data-d="1" aria-label="More">+</button></span></label>';
      }).join('') + '</div>' +
      '<div class="calc" id="lsum"></div>' +
      (mode === 'list' || mode === 'return' ? field('Note', '<input class="input" id="lnote" maxlength="200" placeholder="Optional">') : '') +
      (mode === 'edit' && rcp() ? field('Why the change', '<input class="input" id="lwhy" maxlength="200">', true) : mode === 'edit' ? field('Why the change', '<input class="input" id="lwhy" maxlength="200" placeholder="Optional">') : '') +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">' +
      ({ list: d.can.approve && !x ? 'Approve: give to laundry now' : x ? 'Save the list' : 'Send the list to reception', give: 'Approve: laundry can take it', 'return': d.can.approve ? 'Approve: received back' : 'Send to reception to check', receive: 'Approve: received back', edit: rcp() ? 'Send the change for approval' : 'Save the change' }[mode]) + '</button>' +
      (mode === 'list' && d.can.approve && !x ? '<button class="btn btn-quiet" id="go2" type="button">Save only (approve later)</button>' : '');
    function vals() { var o = {}; $$('input[data-k]', body).forEach(function (i) { var n = Math.max(0, Math.round(Number(i.value) || 0)); if (n) o[i.dataset.k] = n; }); return o; }
    function sum() {
      var o = vals(), diff = ref ? Object.keys(Object.assign({}, ref, o)).filter(function (k) { return Number(o[k] || 0) !== Number(ref[k] || 0); }) : [];
      $('#lsum', body).innerHTML = '<b>' + lSum(o) + ' pieces</b>' + (ref && (mode === 'give' || mode === 'receive') ? (diff.length ? ' · <span class="warn-t">different from their list: ' + esc(diff.map(function (k) { return k + ' ' + (ref[k] || 0) + ' → ' + (o[k] || 0); }).join(', ')) + '</span>' : ' · same as their list') : '');
    }
    $$('.lc-q', body).forEach(function (w) { w.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; e.preventDefault(); var i = $('input', w); i.value = Math.max(0, Math.min(500, (Number(i.value) || 0) + Number(b.dataset.d))) || ''; sum(); }; });
    $$('input[data-k]', body).forEach(function (i) { i.addEventListener('input', sum); });
    sum();
    function send(btn, give) {
      var o = vals(), note = $('#lnote', body) ? $('#lnote', body).value : '';
      if (!lSum(o)) { $('#err', body).textContent = 'Write how many of at least one item.'; return; }
      var act, data;
      if (mode === 'list') { act = 'deskLaundryList'; data = { id: x ? x.id : '', items: o, note: note, give: give }; }
      else if (mode === 'give') { act = 'deskLaundryGive'; data = { id: x.id, items: o }; }
      else if (mode === 'return') { act = 'deskLaundryReturn'; data = { id: x.id, items: o, note: note, receive: d.can.approve }; }
      else if (mode === 'receive') { act = 'deskLaundryReceive'; data = { id: x.id, items: o }; }
      else { act = 'deskLaundryEdit'; data = { id: x.id, part: part, items: o, reason: $('#lwhy', body).value }; }
      submit(btn, $('#err', body), act, data, function (r) {
        laundryDone(r && r.requested ? 'Sent to the manager for approval' : { list: give ? 'Approved: laundry can take it' : 'List saved', give: 'Approved: laundry can take it', 'return': d.can.approve ? 'Received back' : 'Sent to reception to check', receive: 'Received back into the store', edit: 'Changed' }[mode]);
      });
    }
    $('#go', body).onclick = function () { send(this, mode === 'list' && d.can.approve && !x); };
    if ($('#go2', body)) $('#go2', body).onclick = function () { send(this, false); };
  }
  /* linen item: price, warning level, bought / thrown away / counted */
  function openLinenItem(it) {
    var setup = S.me.role === 'Owner' || S.me.role === 'Manager', body = openSheet(it ? it.item : 'New room item'), groups = (S.st && S.st.linenGroups) || (LAU.data && LAU.data.groups) || ['Other'];
    var places = [['store', 'Clean in store'], ['rooms', 'In rooms'], ['dirty', 'Used, to wash'], ['laundry', 'At laundry']];
    body.innerHTML = (it ? '<div class="calc">' + places.map(function (p) { return p[1] + ' <b>' + it[p[0]] + '</b>'; }).join(' · ') + ' · total <b>' + it.total + '</b></div>' : '') +
      (setup ? '<div class="panel"><div class="sec-h"><h2>Item</h2></div>' + field('Name (with the size, e.g. “Bedsheet (king size)”)', '<input class="input" id="li-n" maxlength="40" value="' + esc(it ? it.item : '') + '">', true) +
        '<label class="toggle"><span>Goes to the laundry <small class="small">(shown in laundry lists)</small></span><input type="checkbox" id="li-w"' + (!it || it.wash !== false ? ' checked' : '') + '></label>' +
        field('Folder', '<select class="input" id="li-g">' + groups.map(function (g) { return '<option' + (g === (it ? it.group || 'Other' : groups[0]) ? ' selected' : '') + '>' + esc(g) + '</option>'; }).join('') + '</select>') +
        '<div class="grid2">' + field('Laundry price per piece (₹)', '<input class="input" id="li-p" inputmode="numeric" value="' + (it ? it.price || 0 : '') + '">', true) + field('Warn when clean ones are below', '<input class="input" id="li-l" inputmode="numeric" value="' + (it ? it.low || '' : '') + '">') + '</div>' +
        '<p class="err" id="err1" role="alert"></p><div class="btns"><button class="btn btn-line" type="button" id="li-s">' + (it ? 'Save item' : 'Add item') + '</button>' +
        (it ? '<button class="btn ' + (it.active === false ? 'btn-gold' : 'btn-danger') + '" type="button" id="li-x">' + (it.active === false ? 'Put back in the list' : 'Remove from the list') + '</button>' : '') + '</div>' +
        (it && it.active !== false ? '<p class="small">Removing hides it everywhere (stock, laundry, counting). Its history stays, and you can put it back later.</p>' : '') + '</div>' : '') +
      (it ? '<div class="panel"><div class="sec-h"><h2>Count</h2></div><div class="field"><span>What</span>' + seg('lm', setup ? ['Bought new', 'Torn / lost', 'Correct a count'] : ['Bought new'], 'Bought new') + '</div>' +
        '<div class="field" id="li-pw" hidden><span>Where</span>' + seg('lp', places.map(function (p) { return p[1]; }), 'Clean in store') + '</div>' +
        field('How many', '<input class="input" id="li-q" inputmode="numeric">', true) + field('Note', '<input class="input" id="li-note" maxlength="100" placeholder="Optional">') +
        '<p class="err" id="err2" role="alert"></p><button class="btn btn-gold" type="button" id="li-m">Save count</button></div>' : '');
    wireSegs(body, function () { var m = segVal(body, 'lm'); if ($('#li-pw', body)) $('#li-pw', body).hidden = m === 'Bought new'; var lab = $('#li-q', body) && $('#li-q', body).closest('.field').querySelector('span'); if (lab) lab.textContent = m === 'Correct a count' ? 'Real number there now' : 'How many'; });
    if ($('#li-s', body)) $('#li-s', body).onclick = function () {
      submit(this, $('#err1', body), 'deskLinenSave', { original: it ? it.item : '', item: $('#li-n', body).value, price: $('#li-p', body).value.replace(/\D/g, '') || 0, low: $('#li-l', body).value.replace(/\D/g, ''), group: $('#li-g', body).value, wash: $('#li-w', body).checked, active: it ? it.active !== false : true },
        function () { linenDone(it ? 'Saved' : 'Added'); });
    };
    if ($('#li-x', body)) $('#li-x', body).onclick = function () {
      var b = this, on = it.active === false;
      if (!on && !b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Tap again to remove ' + it.item; return; }
      submit(b, $('#err1', body), 'deskLinenSave', { original: it.item, item: it.item, price: it.price || 0, low: it.low || 0, group: it.group, wash: it.wash !== false, active: on }, function () { linenDone(on ? it.item + ' is back in the list' : it.item + ' removed'); });
    };
    if ($('#li-m', body)) $('#li-m', body).onclick = function () {
      var m = segVal(body, 'lm'), pl = places.filter(function (p) { return p[1] === segVal(body, 'lp'); })[0];
      submit(this, $('#err2', body), 'deskLinenMove', { item: it.item, mode: m === 'Bought new' ? 'new' : m === 'Torn / lost' ? 'out' : 'count', place: pl ? pl[0] : 'store', qty: $('#li-q', body).value.replace(/\D/g, ''), note: $('#li-note', body).value },
        function () { linenDone('Count saved'); });
    };
  }
  function openLaundryPay() {
    var d = LAU.data, body = openSheet('Pay the laundry bill');
    var unpaid = d.list.filter(function (x) { return !x.paid && x.total > 0; });
    body.innerHTML = '<div class="calc">Not paid yet: <b>' + inr(d.bill.unpaid) + '</b></div><p class="small">Every list with a bill that is not paid yet is marked paid, and the payment goes into Expenses as “Laundry service”.' + (unpaid.length ? ' Lists: ' + esc(unpaid.map(function (x) { return x.id + ' ' + inr(x.total); }).join(', ')) : '') + '</p>' +
      '<div class="field"><span>Paid by</span>' + seg('method', S.st.methods, 'Cash') + '</div>' + refField('lp-ref') + field('Note', '<input class="input" id="lp-n" maxlength="200" placeholder="Optional">') +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" type="button" id="go">Mark paid</button>';
    wireSegs(body);
    $('#go', body).onclick = function () { submit(this, $('#err', body), 'deskLaundryPaid', { method: segVal(body, 'method'), ref: $('#lp-ref', body).value, note: $('#lp-n', body).value }, function (r) { laundryDone(inr(r.paid) + ' marked paid'); }); };
  }

  var STK = { view: 'supplies' };
  /* Stock → "Room items" folder: mattresses, pillows, bedsheets, blankets, towels… by size, where each piece is now */
  function viewRoomItems(v) {
    var L = S.st.linen || [], setup = S.me.role === 'Owner' || S.me.role === 'Manager', groups = [];
    L.forEach(function (i) { if (groups.indexOf(i.group) < 0) groups.push(i.group); });
    var html = '<p class="small">Everything that belongs in the rooms, counted where it is now: clean in the store, in the rooms, used (waiting for the laundry) and at the laundry.' + (mgr() ? ' Tap an item to add new ones bought' + (setup ? ', remove torn / lost ones or correct a count' : '') + '.' : '') + '</p>' +
      groups.map(function (g) {
        var its = L.filter(function (i) { return i.group === g; }), tot = its.reduce(function (a, i) { return a + i.total; }, 0), clean = its.reduce(function (a, i) { return a + i.store; }, 0);
        return '<details class="panel folder" open><summary><span class="fold-ic" aria-hidden="true">' + ICON.stock + '</span><h2>' + esc(g) + '</h2><span class="small">' + tot + ' in all · ' + clean + ' clean in store</span></summary>' +
          '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Item</th><th class="r">Clean</th><th class="r">Rooms</th><th class="r">To wash</th><th class="r">Laundry</th><th class="r">Total</th></tr></thead><tbody>' +
          its.map(function (i) { var low = i.low && i.store < i.low;
            return '<tr' + (mgr() ? ' class="tap" data-ri="' + esc(i.item) + '"' : '') + '><td><b>' + esc(i.item) + '</b>' + (low ? '<small class="warn-t">clean ones running low (warn below ' + i.low + ')</small>' : '') + '</td><td class="r">' + i.store + '</td><td class="r">' + i.rooms + '</td><td class="r">' + i.dirty + '</td><td class="r">' + i.laundry + '</td><td class="r"><b>' + i.total + '</b></td></tr>'; }).join('') +
          '</tbody></table></div></details>';
      }).join('') + (setup ? '<button class="btn btn-line" type="button" id="ri-new">Edit the item list (add, rename, delete)</button>' : '');
    v.insertAdjacentHTML('beforeend', html);
    $$('[data-ri]', v).forEach(function (b) { b.onclick = function () { openLinenItem(L.filter(function (i) { return i.item === b.dataset.ri; })[0]); }; });
    if ($('#ri-new', v)) $('#ri-new', v).onclick = function () { openLinenList(); };
  }
  function viewStock(v) {
    var tracked = S.st.items.filter(function (i) { return i.track; });
    var tabsH = '<div class="seg narrow" id="stv"><button type="button" data-v="supplies" aria-pressed="' + (STK.view === 'supplies') + '">Supplies</button><button type="button" data-v="room" aria-pressed="' + (STK.view === 'room') + '">Room items (bedding &amp; towels)</button></div>';
    if (STK.view === 'room') {
      v.innerHTML = '<div class="hrow"><div><p class="kicker">Storage</p><h1 style="font-size:2rem">Stock</h1></div><button class="refresh" id="rf" type="button">Refresh</button></div>' + tabsH;
      viewRoomItems(v);
      $('#rf', v).onclick = function () { refresh(this); };
      $('#stv', v).onclick = function (e) { var b = e.target.closest('button'); if (b) { STK.view = b.dataset.v; render(); } };
      return;
    }
    v.innerHTML = '<div class="hrow"><div><p class="kicker">Storage</p><h1 style="font-size:2rem">Stock</h1></div><button class="refresh" id="rf" type="button">Refresh</button></div>' + tabsH +
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
    $('#stv', v).onclick = function (e) { var b = e.target.closest('button'); if (b) { STK.view = b.dataset.v; render(); } };
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
      '<div class="btns"><button class="btn btn-line" type="button" id="team">Team & PINs</button><button class="btn btn-line" type="button" id="prices">Items & prices</button><button class="btn btn-line" type="button" id="wa">WhatsApp</button></div>' +
      '<div class="panel"><div class="sec-h"><h2>Cancellation policy</h2></div><div class="note">' + esc(S.st.policy.text) + '</div>' +
      '<p class="small">This text appears on the website booking form, in the house rules, in the WhatsApp confirmation and on every booking in this app.</p></div>' +
      '<div class="panel"><div class="sec-h"><h2>WhatsApp from the system</h2></div><div id="wauto" class="calc">Checking…</div>' +
      '<div class="btns"><button class="btn btn-line" type="button" id="wbot-t">…</button><button class="btn btn-line" type="button" id="wauto-t">…</button></div>' +
      '<p class="small"><b>Assistant replies</b>: answers guests who write to us first (menu, rooms, prices, booking). Always allowed by WhatsApp. It does not repeat its menu within 30 minutes and goes quiet for 6 hours when reception replies from the phone.<br>' +
      '<b>Messages we start</b> (welcome, membership invite, booking confirmation, bill): only to guests who agreed at check-in or booking, never after STOP, at most 40 a day and 2 per guest a day. When both are off, nothing at all is sent by the system; guests\' messages are still saved under WhatsApp.</p></div>';
    function waDraw(r) {
      $('#wauto', v).innerHTML = 'Assistant replies: <b>' + (r.bot ? 'On' : 'Off') + '</b> · Messages we start: <b>' + (r.on ? 'On' : 'Paused') + '</b>' + (r.on ? ' (' + r.sentToday + ' of ' + r.dayMax + ' sent today)' : '') + (r.waiting ? ' · ' + r.waiting + ' waiting' : '');
      var a = $('#wbot-t', v), b = $('#wauto-t', v);
      a.textContent = r.bot ? 'Turn assistant off' : 'Turn assistant on'; a.dataset.on = r.bot ? '1' : '';
      b.textContent = r.on ? 'Pause messages we start' : 'Start sending welcome / booking / bill'; b.dataset.on = r.on ? '1' : '';
    }
    api('deskWaAuto', {}).then(waDraw, function () { $('#wauto', v).textContent = 'Could not check.'; });
    $('#wbot-t', v).onclick = function () { var b = this; busy(b, true); api('deskWaAuto', { bot: !b.dataset.on }).then(function (r) { busy(b, false); waDraw(r); toast(r.bot ? 'Assistant on' : 'Assistant off'); }, function (e) { busy(b, false); toast(errText(e)); }); };
    $('#wauto-t', v).onclick = function () { var b = this, on = !b.dataset.on; if (on && !b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Sure? Only after Meta approved the new templates. Tap again'; return; } busy(b, true); api('deskWaAuto', { on: on }).then(function (r) { busy(b, false); delete b.dataset.sure; waDraw(r); toast(r.on ? 'Messages we start: on' : 'Messages we start: paused'); }, function (e) { busy(b, false); toast(errText(e)); }); };
    $('#team', v).onclick = openTeam; $('#prices', v).onclick = openPrices; $('#wa', v).onclick = openWhatsApp;
  }
  /* Owner: connect the guest house WhatsApp number (Meta WhatsApp Cloud API) for automatic messages. */
  function openWhatsApp() {
    var body = openSheet('WhatsApp');
    var KIND = { welcome: 'Welcome at check-in', membership: 'Membership invite (first stay)', booking: 'Booking confirmed', bill: 'Bill PDF' };
    function draw(w, msg) {
      body.innerHTML = '<div class="bstat k-' + (w.connected ? 'ok' : 'warn') + '">' + ICON.bills + '<span>' + (w.connected ? '<b>Connected.</b> Automatic WhatsApp messages are on (phone number ID ' + esc(w.phoneId) + ').' : '<b>Not connected yet.</b> Nothing is sent on WhatsApp automatically until this is set up.') + '</span></div>' +
        (msg ? '<p class="ok-note">' + esc(msg) + '</p>' : '') +
        '<div class="panel"><div class="sec-h"><h2>What is sent automatically</h2></div><ul class="plain">' +
        '<li><b>Welcome</b> right after check-in: room, dates, how to find reception.</li>' +
        '<li><b>Membership invite</b> a few minutes later, only on a guest\'s first stay (and if not a member yet): all levels and benefits + join link.</li>' +
        '<li><b>Booking confirmed</b> when reception confirms a booking with the advance.</li>' +
        '<li><b>Bill PDF</b> 12 hours after check-out, together with the email.</li></ul>' +
        '<p class="small">Each uses a message template approved by Meta: ' + esc(Object.keys(w.templates).filter(function (k) { return k !== 'lang'; }).map(function (k) { return w.templates[k]; }).join(', ')) + ' (language: English).</p></div>' +
        '<div class="panel"><div class="sec-h"><h2>Connection</h2></div>' +
        field('Phone number ID (from Meta → WhatsApp → API setup)', '<input class="input" id="w-id" inputmode="numeric" value="' + esc(w.phoneId || '') + '">') +
        field('Permanent access token' + (w.hasToken ? ' (saved; leave empty to keep it)' : ''), '<input class="input" id="w-tok" type="password" autocomplete="off" placeholder="' + (w.hasToken ? '••••••••••••' : 'Paste the token here') + '">') +
        '<p class="err" id="w-err" role="alert"></p><div class="btn-row"><button class="btn btn-gold" type="button" id="w-save">Save connection</button>' + (w.phoneId || w.hasToken ? '<button class="btn btn-quiet sm danger" type="button" id="w-clear">Disconnect</button>' : '') + '</div>' +
        '<p class="small">The token is stored privately in Google, not in the sheet, and is never shown again.</p></div>' +
        (w.connected ? '<div class="panel"><div class="sec-h"><h2>Test</h2></div>' + field('Send Meta\'s “hello world” test to', nkPhoneHtml('w-to', '')) +
          '<p class="err" id="t-err" role="alert"></p><button class="btn btn-line" type="button" id="w-test">Send test message</button></div>' : '') +
        '<div class="panel"><div class="sec-h"><h2>Recent messages</h2></div>' + (w.recent.length ? '<div class="list">' + w.recent.map(function (m) {
          return '<div class="bl"><span class="t"><b>' + esc(KIND[m.kind] || m.kind) + ' · ' + esc(m.name || '') + '</b><small>' + esc(tShort(m.at)) + ' · ' + esc(m.to) + (m.info ? ' · ' + esc(m.info) : '') + '</small></span><span class="a"><span class="ptag k-' + (m.status === 'Sent' ? 'ok' : m.status === 'Waiting' ? 'wait' : 'bad') + '">' + esc(m.status) + '</span></span></div>';
        }).join('') + '</div>' : '<p class="small">None yet.</p>') +
        (w.bills.length ? '<div class="sec-h"><h3>Bills on WhatsApp</h3></div><div class="list">' + w.bills.map(function (b) { return '<div class="bl"><span class="t"><b>' + esc(b.no) + ' · ' + esc(b.guest) + '</b><small>' + esc(b.wa || '—') + '</small></span></div>'; }).join('') + '</div>' : '') + '</div>';
      $('#w-save', body).onclick = function () {
        var x = this; busy(x, true); $('#w-err', body).textContent = '';
        api('deskWaSave', { phoneId: $('#w-id', body).value.trim(), waToken: $('#w-tok', body).value.trim() || null })
          .then(function (r) { draw(r, r.connected ? 'Saved. WhatsApp is connected.' : 'Saved.'); }, function (e) { busy(x, false); $('#w-err', body).textContent = errText(e); });
      };
      var c = $('#w-clear', body); if (c) c.onclick = function () { var x = this; if (x.dataset.sure !== '1') { x.dataset.sure = '1'; x.textContent = 'Sure? Tap again'; return; } busy(x, true); api('deskWaSave', { clear: true }).then(function (r) { draw(r, 'Disconnected.'); }); };
      var t = $('#w-test', body); if (t) t.onclick = function () {
        var x = this; busy(x, true); $('#t-err', body).textContent = '';
        api('deskWaTest', { phone: nkPhoneVal('w-to', body) }).then(function () { busy(x, false); toast('Test sent'); }, function (e) { busy(x, false); $('#t-err', body).textContent = errText(e); });
      };
    }
    body.innerHTML = '<div class="loading">Loading…</div>';
    api('deskWaStatus').then(function (w) { draw(w); }, function (e) { body.innerHTML = '<p class="err">' + esc(errText(e)) + '</p>'; });
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
        var label = x ? (x.kind === 'booked' ? (x.comp ? 'Reserved · free' : 'Booked') : x.kind === 'past' ? 'Stayed' : 'Occupied') : (k === 'dirty' ? 'Free · to clean' : 'Free');
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
          return '<tr data-booking="' + esc(b.id) + '"><td><span class="st-pill s-' + BSTAT[b.status] + '">' + esc(b.status) + '</span></td><td><b>' + esc(b.guest) + '</b><small>' + esc(nkPhoneShow(b.phone)) + '</small></td>' +
            '<td>' + esc(dLong(b.checkin)) + '<small>to ' + esc(dShort(b.checkout)) + '</small></td><td>' + b.nights + '</td><td>' + b.guests + '</td>' +
            '<td>' + (b.rooms.length ? b.rooms.join(', ') : '<span class="muted">' + b.roomsNeeded + ' needed</span>') + '</td>' + (b.comp ? '<td class="r" colspan="2"><span class="bal comp">Free · ' + esc(b.comp) + '</span></td>' : '<td class="r">' + inr(b.total) + '</td>' +
            '<td class="r">' + inr(b.advancePaid) + '<small>' + (b.status === 'Pending' ? 'needs ' + inr(b.advanceDue) : b.refunded ? 'refunded ' + inr(b.refunded) : 'of ' + inr(b.advanceDue)) + '</small></td>') + '<td>' + esc(b.source) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    } else {
      html += '<div class="bcards">' + list.map(function (b) {
        return '<button type="button" class="bcard" data-booking="' + esc(b.id) + '"><span class="st-pill s-' + BSTAT[b.status] + '">' + esc(b.status) + '</span><b>' + esc(b.guest) + '</b>' +
          '<span>' + esc(dShort(b.checkin)) + ' → ' + esc(dShort(b.checkout)) + ' · ' + b.nights + 'n · ' + b.guests + ' guests</span>' +
          '<span>' + (b.rooms.length ? 'Room ' + b.rooms.join(', ') : b.roomsNeeded + (b.roomsNeeded > 1 ? ' rooms' : ' room') + ' needed') + ' · ' + (b.comp ? 'Free · ' + esc(b.comp) : b.status === 'Pending' ? 'advance ' + inr(b.advanceDue) + ' needed' : 'paid ' + inr(b.advancePaid)) + '</span></button>';
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
      'Guests: ' + b.guests + (b.comp ? '\nYou are our guest: no charge for the room.\n\n' : '\nTotal: ' + nkInr(b.total) + '\nAdvance received: ' + nkInr(b.advancePaid) + '\nBalance at check-in: ' + nkInr(Math.max(0, b.total - b.advancePaid)) + '\n\n' +
      'Cancellation policy: ' + p.text + '\n\n') +
      'Reception is on the first floor: enter at the left corner of the building, by the picture of Sri Chaitanya Mahaprabhu, and take the stairs up. We are opposite ISKCON Gate No. 4.\n\nNikadi Guest House · +91 75011 01137';
  }
  function drawBooking(body, b) {
    var t = S.st.today, open = b.status === 'Pending' || b.status === 'Confirmed';
    var bal = Math.max(0, b.total - b.advancePaid + b.refunded);
    var h = '<div class="hrow"><div><p class="kicker"><span class="st-pill s-' + BSTAT[b.status] + '">' + esc(b.status) + '</span> · ' + esc(b.id) + '</p><h2 style="font-size:1.9rem">' + esc(b.guest) + '</h2></div></div>' +
      '<dl class="facts"><div><dt>Check-in</dt><dd>' + esc(dLong(b.checkin)) + '</dd></div><div><dt>Check-out</dt><dd>' + esc(dLong(b.checkout)) + '</dd></div>' +
      '<div><dt>Guests · nights</dt><dd>' + b.guests + ' · ' + b.nights + '</dd></div><div><dt>Rooms</dt><dd>' + (b.rooms.length ? 'Room ' + b.rooms.join(', ') : b.roomsNeeded + ' needed · ' + esc(b.roomType)) + '</dd></div>' +
      '<div><dt>Phone</dt><dd>' + (b.phone ? '<a href="tel:' + esc(nkPhoneTel(b.phone)) + '">' + esc(nkPhoneShow(b.phone)) + '</a>' : '—') + '</dd></div><div><dt>Source</dt><dd>' + esc(b.source) + (b.email ? '<small class="muted"> · ' + esc(b.email) + '</small>' : '') + '</dd></div></dl>' +
      (b.notes ? '<div class="note"><b>Notes</b>' + esc(b.notes) + '</div>' : '') +
      (b.comp ? '<div class="note comp-note"><b>Free stay · ' + esc(b.comp) + '</b>' + (b.compRef ? esc(b.compRef) : 'No charge') + ' · no advance, nothing to pay</div><div hidden>' : '') +
      '<div class="bill"><h3>Money</h3>' +
      '<div class="bl sum"><span class="t">' + b.nights + (b.nights > 1 ? ' nights' : ' night') + ' × ' + Math.max(b.rooms.length, b.roomsNeeded) + (Math.max(b.rooms.length, b.roomsNeeded) > 1 ? ' rooms' : ' room') + ' × ' + inr(b.rate) + '</span><span class="d">Rate per room per night</span><span class="a">' + inr(b.total) + '</span></div>' +
      '<div class="bl' + (open && mgr() ? ' tap' : '') + '" id="k-adv"><span class="t">' + (b.advanceSet ? 'Advance agreed' : 'Advance needed (50%)') + '</span><span class="d">' + (open && mgr() ? 'Tap to change the advance for this guest' : '') + '</span><span class="a">' + inr(b.advanceDue) + '</span></div>' +
      b.payments.map(function (p) { return '<div class="bl tap ' + (p.amount < 0 ? 'refund' : 'paid') + '" data-pay="' + esc(p.id) + '"><span class="t">' + (p.amount < 0 ? 'Refunded · ' : 'Received · ') + esc(p.method) + '</span><span class="d">' + esc(tShort(p.at)) + ' · ' + esc(p.by) + (p.ref ? ' · Ref ' + esc(p.ref) : '') + '</span><span class="a">' + (p.amount < 0 ? '+ ' + inr(-p.amount) : '− ' + inr(p.amount)) + '</span></div>'; }).join('') +
      (b.status === 'Pending' ? '<div class="bl due"><span class="t">Not confirmed yet</span><span class="a">' + inr(b.advanceDue) + ' to receive</span></div>'
        : b.status === 'Confirmed' ? '<div class="bl due"><span class="t">Balance at check-in</span><span class="a">' + inr(bal) + '</span></div>' : '') + '</div>' + (b.comp ? '</div>' : '') +
      (b.closeNote ? '<div class="note"><b>' + esc(b.status) + (b.closedBy ? ' · ' + esc(b.closedBy) : '') + '</b>' + esc(b.closeNote) + '</div>' : '') +
      (b.confirmedBy ? '<p class="small">Confirmed by ' + esc(b.confirmedBy) + ' · ' + esc(tShort(b.confirmedAt)) + '. Created ' + esc(tShort(b.created)) + ' by ' + esc(b.createdBy) + '.</p>' : '<p class="small">Created ' + esc(tShort(b.created)) + ' by ' + esc(b.createdBy) + '.</p>');
    if (b.status === 'Pending') h += '<div class="btns"><button class="btn btn-gold wide big-cta" id="k-conf" type="button">' + (b.comp ? 'Reserve rooms: confirm' : 'Money received: confirm') + '</button>' + (!b.comp && b.phone ? '<button class="btn btn-line" id="k-wadv" type="button">WhatsApp: ask for the advance</button>' : '') + '<button class="btn btn-quiet" id="k-edit" type="button">Edit</button><button class="btn btn-danger" id="k-cancel" type="button">Cancel booking</button></div>';
    if (b.status === 'Confirmed') {
      h += '<div class="btns">' + (b.checkin <= t ? '<button class="btn btn-gold wide big-cta" id="k-in" type="button">Guest arrived: check in</button>' : '') +
        '<a class="btn btn-line" id="k-wa" target="_blank" rel="noopener" href="' + (b.phone ? 'https://wa.me/' + esc(nkPhoneTel(b.phone).slice(1)) + '?text=' + encodeURIComponent(waText(b)) : '#') + '">Send WhatsApp confirmation</a>' +
        (b.comp ? '' : '<button class="btn btn-quiet" id="k-pay" type="button">Add payment</button>') + '<button class="btn btn-quiet" id="k-edit" type="button">Edit dates or rooms</button>' +
        (b.advancePaid - b.refunded > 0 ? '<button class="btn btn-quiet" id="k-ref" type="button">Refund part of advance</button>' : '') +
        '<button class="btn btn-danger" id="k-cancel" type="button">Cancel booking</button>' + (b.checkin <= t ? '<button class="btn btn-danger" id="k-ns" type="button">Guest did not come</button>' : '') + '</div>';
    }
    if ((b.status === 'Cancelled' || b.status === 'No-show') && b.advancePaid - b.refunded > 0) h += '<div class="btns"><button class="btn btn-quiet" id="k-ref" type="button">Refund money (' + inr(b.advancePaid - b.refunded) + ' kept)</button></div>';
    if (b.payments.length) h += '<p class="small">Tap a payment to correct a mistake.' + (rcp() ? ' Changes go to the manager for approval.' : '') + '</p>';
    if (open && !b.comp) h += '<div class="policy"><b>Cancellation policy</b>' + esc(S.st.policy.text) + '</div>';
    body.innerHTML = h;
    var q = function (sel) { return $(sel, body); };
    if (q('#k-conf')) q('#k-conf').onclick = function () { openConfirm(b, body); };
    if (q('#k-wadv')) q('#k-wadv').onclick = function () { openWaSend('enq'); };
    if (open && mgr() && !b.comp) q('#k-adv').onclick = function () { openAdvance(b, body); };
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
    body.innerHTML = (isNew ? '<p class="small">Saved as <b>Pending</b>. It goes on the calendar only after you confirm it (paying guests: after the advance is recorded; free stays: just pick the rooms).</p>' : '') +
      '<div class="grid2">' + field('Guest name', '<input class="input" id="b-guest" maxlength="80" value="' + esc(pre.guest || '') + '">', true) +
      field('Phone', nkPhoneHtml('b-phone', pre.phone || ''), true) + '</div>' + waConsentHtml(pre.id ? !!pre.waOk : undefined, false, false) +
      field('Email', '<input class="input" id="b-email" type="email" maxlength="80" value="' + esc(pre.email || '') + '">') +
      '<div class="grid2">' + field('Check-in', '<input class="input" type="date" id="b-in" value="' + esc(cin) + '">', true) + field('Check-out', '<input class="input" type="date" id="b-out" value="' + esc(cout) + '">', true) + '</div>' +
      '<div class="grid2">' + field('Guests', '<input class="input" id="b-guests" inputmode="numeric" value="' + (pre.guests || 2) + '">', true) +
      (pre.status === 'Confirmed' ? '<div></div>' : field('Rooms needed', '<input class="input" id="b-rooms" inputmode="numeric" value="' + (pre.roomsNeeded || 1) + '">')) + '</div>' +
      '<p class="small" id="b-hint"></p>' +
      (pre.status === 'Confirmed' ? '<div class="field"><span>Room numbers</span><div class="pick" id="b-pick"></div></div>' : field('Room preference', '<select class="input" id="b-type">' + types.map(function (x) { return '<option' + (x === (pre.roomType || 'Any') ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select>')) +
      '<div class="field"><span>Stay</span>' + seg('bstype', ['Paying guest', 'Free stay'], pre.comp ? 'Free stay' : 'Paying guest') + '</div>' +
      '<div id="b-freew"' + (pre.comp ? '' : ' hidden') + '><div class="field"><span>Whose guest <i>*</i></span>' + seg('bcomp', S.st.compHosts || [], pre.comp || '') + '</div>' +
      field('Reference', '<input class="input" id="b-cref" maxlength="120" value="' + esc(pre.compRef || '') + '" placeholder="e.g. Sent by Prahlad for the festival, temple guest…">') +
      '<p class="small">No charge and no advance: confirming just reserves the room in their name. At check-in it becomes a free stay; water, kits and other items are still counted from stock.</p></div>' +
      '<div id="b-paidw"' + (pre.comp ? ' hidden' : '') + '>' + field('Rate per room per night (₹)', '<input class="input" id="b-rate" inputmode="numeric" value="' + (pre.rate || (pre.roomPick && roomOf(pre.roomPick) ? roomOf(pre.roomPick).rate : 5000)) + '">', true) + '</div>' +
      (isNew ? '<div class="field"><span>Booked by</span>' + seg('src', ['Phone', 'WhatsApp', 'Walk-in', 'Website', 'Other'], 'Phone') + '</div>' : '') +
      field('Notes', '<textarea class="input" id="b-notes" rows="2" maxlength="400" placeholder="Arrival time, requests, negotiation…">' + esc(pre.notes || '') + '</textarea>') +
      (rcp() && pre.status === 'Confirmed' ? '<p class="small">Changing the rate of a confirmed booking needs a manager\'s approval.</p>' + field('Reason for a rate change', '<input class="input" id="b-why" maxlength="200">') : '') +
      '<div class="calc" id="b-calc"></div><p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">' + (isNew ? 'Save booking (pending)' : 'Save changes') + '</button>';
    var bFree = function () { return segVal(body, 'bstype') === 'Free stay'; };
    wireSegs(body, function () { $('#b-freew', body).hidden = !bFree(); $('#b-paidw', body).hidden = bFree(); calc(); });
    var picked = (pre.rooms || []).slice();
    if (isNew && pre.roomPick) { var rp = roomOf(pre.roomPick); if (rp) { var sel = $('#b-type', body); sel.value = rp.type === 'Deluxe Double' ? 'Deluxe Double (King)' : rp.type; } }
    function calc() {
      var n = nights($('#b-in', body).value, $('#b-out', body).value), g = Number($('#b-guests', body).value.replace(/\D/g, '')) || 0;
      var rn = $('#b-rooms', body) ? Math.max(Number($('#b-rooms', body).value.replace(/\D/g, '')) || 1, Math.ceil(g / 3)) : picked.length || 1;
      var rate = Number($('#b-rate', body).value.replace(/\D/g, '')) || 0, tot = n * rn * rate;
      $('#b-hint', body).textContent = g > 3 ? g + ' guests need at least ' + Math.ceil(g / 3) + ' rooms (maximum 3 per room).' : '';
      $('#b-calc', body).innerHTML = n > 0 && bFree() ? n + (n > 1 ? ' nights' : ' night') + ' × ' + rn + (rn > 1 ? ' rooms' : ' room') + ' · <b>free stay</b>, no advance' : n > 0 ? n + (n > 1 ? ' nights' : ' night') + ' × ' + rn + (rn > 1 ? ' rooms' : ' room') + ' × ' + inr(rate) + ' = <b>' + inr(tot) + '</b><br>Advance to confirm (50%): <b>' + inr(Math.ceil(tot / 2)) + '</b>' : 'Check-out must be after check-in';
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
      var d = { guest: $('#b-guest', body).value, phone: nkPhoneVal('b-phone', body), email: $('#b-email', body).value, checkin: $('#b-in', body).value, checkout: $('#b-out', body).value,
        guests: $('#b-guests', body).value.replace(/\D/g, ''), rate: $('#b-rate', body).value.replace(/\D/g, ''), notes: $('#b-notes', body).value,
        comp: bFree() ? segVal(body, 'bcomp') : '', compRef: bFree() ? $('#b-cref', body).value : '' };
      if (bFree() && !d.comp) { $('#err', body).textContent = 'Pick whose guest this is.'; vibrate(); return; }
      var wok3 = waConsentVal(body, d.phone);
      if (wok3 === undefined) { $('#err', body).textContent = 'Ask the guest: may we send the booking confirmation on WhatsApp? Tap Guest agreed or No.'; vibrate(); return; }
      if (wok3 != null) d.waOk = wok3;
      if (bFree()) delete d.rate;
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
      (b.comp ? '<div class="note comp-note"><b>Free stay · ' + esc(b.comp) + '</b>' + (b.compRef ? esc(b.compRef) : 'No charge') + ' · no advance needed</div><div hidden>' : '') +
      field('Rate per room per night (₹)', '<input class="input" id="c-rate" inputmode="numeric" value="' + b.rate + '">') +
      '<div class="calc" id="c-calc"></div>' +
      '<p class="label">2 · Money received</p>' +
      field('Amount received (₹)', '<input class="input" id="c-amt" inputmode="numeric" value="' + b.advanceDue + '">', true) +
      '<div class="field"><span>Received by</span>' + seg('method', S.st.methods, 'UPI') + '</div>' + refField('c-ref') +
      '<div class="policy"><b>Cancellation policy</b>' + esc(S.st.policy.text) + '</div>' + (b.comp ? '</div>' : '') +
      '<p class="err" id="err" role="alert"></p><div id="c-warn"></div><button class="btn btn-gold big-cta" id="go" type="button">' + (b.comp ? 'Reserve the rooms: confirm' : 'Money received: confirm booking') + '</button>' +
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
      if (!b.comp && amt > 0 && amt < need && !btn.dataset.sure) {
        btn.dataset.sure = 1;
        $('#c-warn', body).innerHTML = '<div class="conf">' + inr(amt) + ' is less than the 50% advance (' + inr(need) + '). Tap the button again to confirm: the advance for this booking will be set to ' + inr(amt) + '.</div>';
        return;
      }
      submit(btn, $('#err', body), 'deskBookingConfirm', { id: b.id, rooms: picked, rate: b.comp ? '' : $('#c-rate', body).value.replace(/\D/g, ''), amount: $('#c-amt', body).value.replace(/\D/g, ''), method: segVal(body, 'method'), ref: $('#c-ref', body).value },
        function (r) { vibrate(); toast((b.comp ? 'Reserved for ' + b.guest : 'Confirmed') + ' · room ' + r.booking.rooms.join(', ') + ' blocked'); X.cal = null; X.bookings = null; closeSheet(); drawBooking(parentBody, r.booking); refresh(); });
    };
  }

  function openAdvance(b, parentBody) {
    var body = openSheet('Advance for this booking'), half = Math.ceil(b.total / 2);
    body.innerHTML = '<div class="calc">Total ' + inr(b.total) + ' · usual 50% advance <b>' + inr(half) + '</b> · received so far <b>' + inr(b.advancePaid - b.refunded) + '</b></div>' +
      field('Advance this guest pays (₹)', '<input class="input" id="a-amt" inputmode="numeric" value="' + b.advanceDue + '">', true) +
      '<div class="btns"><button class="btn btn-quiet" type="button" id="a-half">Use 50% (' + inr(half) + ')</button><button class="btn btn-quiet" type="button" id="a-paid">Use amount received (' + inr(b.advancePaid - b.refunded) + ')</button></div>' +
      '<p class="small">Some guests pay less than 50%. Set the amount you agreed here: the booking then shows it as the advance, and the rest is collected at check-in.</p>' +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">Save advance</button>';
    $('#a-half', body).onclick = function () { $('#a-amt', body).value = half; };
    $('#a-paid', body).onclick = function () { $('#a-amt', body).value = b.advancePaid - b.refunded; };
    $('#go', body).onclick = function () {
      var v = Number($('#a-amt', body).value.replace(/\D/g, '')) || 0;
      submit(this, $('#err', body), 'deskBookingAdvance', { id: b.id, amount: v === half ? 0 : v }, function (r) { toast('Advance set to ' + inr(r.booking.advanceDue)); closeSheet(); drawBooking(parentBody, r.booking); X.bookings = null; });
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
      '<div class="sec-h"><h2>Change the amount</h2></div>' +
      '<p class="small">The guest paid a different amount than what was written? Put the exact amount. The old entry stays in the sheet as corrected.</p>' +
      field('Correct amount (₹)', '<input class="input" id="v-amt" inputmode="numeric" value="' + Math.abs(p.amount) + '">') + approvalNote() + reasonField('v-why2', 'e.g. Guest paid ₹2,000, not ₹3,500') +
      '<p class="err" id="aerr" role="alert"></p><button class="btn btn-line" type="button" id="samt">' + goLabel('Save new amount') + '</button>' +
      '<div class="sec-h"><h2>Entered by mistake?</h2></div>' +
      '<p class="small">Use this only if the whole entry is wrong, for example entered twice. The entry is cancelled (it stays visible in the sheet as voided).</p>' +
      reasonField('v-why', 'e.g. Entered twice by mistake') +
      '<p class="err" id="err" role="alert"></p><button class="btn btn-danger big-cta" id="go" type="button">' + goLabel('Cancel this entry') + '</button>';
    $('#samt', body).onclick = function () {
      submit(this, $('#aerr', body), 'deskPayAmount', { id: p.id, amount: $('#v-amt', body).value.replace(/\D/g, ''), reason: $('#v-why2', body).value }, function (r) {
        toast('Amount corrected'); closeSheet(); if (r.stay) drawStay(parentBody, r.stay); else if (r.booking) drawBooking(parentBody, r.booking); });
    };
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
  var TYPE_LABEL = { editCharge: 'Bill item', refund: 'Refund', voidPayment: 'Payment correction', payAmount: 'Payment amount change', updateStay: 'Rate change', bookingUpdate: 'Rate change', bookingCancel: 'Cancellation', bookingRefund: 'Refund', undoCheckout: 'Reverse check-out' };
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
      (approver() ? '<p class="sub">Receptionists cannot change money that is already recorded or reverse a check-out. Their requests wait here. When you approve, the change is made at once and saved with both names.</p>'
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
          '<div class="field"><span>Guests</span>' + stepper('e-g', st.guests, 1, 20) + '</div>' +
          '<p class="small">Now: ' + st.nights + ' night' + (st.nights > 1 ? 's' : '') + ' × ' + inr(st.rate) + ' = ' + inr(st.roomTotal) + '. The usual price stays on the bill and the difference shows as a discount.</p>' +
          '<p class="err" id="e-rerr" role="alert"></p><button class="btn btn-gold" type="button" id="e-rsave">Save room changes</button>';
        wireSegs(er); wireSteppers(er);
        $('#e-rsave', er).onclick = function () {
          var x = this; busy(x, true); $('#e-rerr', er).textContent = '';
          api('deskUpdateStay', { id: st.id, rate: $('#e-rate', er).value.replace(/\D/g, ''), rateNote: $('#e-note', er).value.trim(), checkout: $('#e-out', er).value, guests: Number($('#e-g', er).textContent) })
            .then(function () { return refresh(b, 'Room changes saved. Bill, sales and member points are updated.'); }, function (e) { busy(x, false); $('#e-rerr', er).textContent = errText(e); });
        };
        /* items: quantity, free or paid, and the total the guest actually paid */
        ei.className = '';
        var all = S.st.items.filter(function (i) { return i.active !== false; });
        function money2(v) { return Math.round(Number(String(v).replace(/[^\d.]/g, '')) || 0); }
        ei.innerHTML = (st.charges.length ? '<div class="list">' + st.charges.map(function (ch, k) {
            return '<div class="bl ed-row" data-c="' + k + '"><span class="t"><b>' + esc(ch.item) + '</b><small>' + esc(dShort(ch.at)) + (ch.free ? ' · free' : ' · ' + inr(ch.total)) + '</small></span>' +
              '<span class="ed-ctl"><label class="ed-n">Qty<input class="input sm" data-q inputmode="numeric" value="' + esc(ch.qty) + '"></label>' +
              '<label class="ed-free"><input type="checkbox" data-f' + (ch.free ? ' checked' : '') + '> Free</label>' +
              '<label class="ed-n">Total paid ₹<input class="input sm" data-t inputmode="numeric" value="' + esc(ch.free ? '' : ch.total) + '"' + (ch.free ? ' disabled' : '') + '></label>' +
              '<button class="btn btn-quiet sm" type="button" data-save>Save</button><button class="btn btn-quiet sm danger" type="button" data-del>Remove</button></span>' +
              '<small class="ed-each" data-e></small></div>';
          }).join('') + '</div>' : '<p class="small">No items on this bill.</p>') +
          '<div class="sec-h"><h3>Add an item</h3></div>' +
          '<div class="ed-add"><select class="input" id="e-it">' + all.map(function (i) { return '<option value="' + esc(i.item) + '" data-price="' + esc(i.price) + '" data-sell="' + (i.sell === false ? '0' : '1') + '">' + esc(i.item) + (i.sell === false ? ' · free item' : ' · ' + inr(i.price)) + '</option>'; }).join('') + '</select>' +
          '<label class="ed-n">Qty<input class="input sm" id="e-iq" inputmode="numeric" value="1"></label>' +
          '<label class="ed-free"><input type="checkbox" id="e-if"> Free</label>' +
          '<label class="ed-n">Total paid ₹<input class="input sm" id="e-it2" inputmode="numeric" placeholder="usual"></label>' +
          '<button class="btn btn-gold sm" type="button" id="e-iadd">Add</button></div>' +
          '<p class="err" id="e-ierr" role="alert"></p><p class="small">Tick <b>Free</b> if it was given free, or write the <b>total the guest paid</b> for all of them (e.g. 2 water bottles for ₹30). Adding, changing or removing items also corrects the stock.</p>';
        function ierr(e) { $('#e-ierr', ei).textContent = errText(e); }
        $$('[data-c]', ei).forEach(function (row) {
          var ch = st.charges[+row.dataset.c], q = $('[data-q]', row), f = $('[data-f]', row), t = $('[data-t]', row), e = $('[data-e]', row);
          function each() { var n = Math.max(1, money2(q.value)); t.disabled = f.checked; e.textContent = f.checked ? 'Free · not on the bill total' : t.value ? '= ' + inr(Math.round(money2(t.value) / n * 100) / 100) + ' each' : ''; }
          q.oninput = function () { if (!f.checked && ch.price && !t.dataset.typed) t.value = Math.round(ch.price * Math.max(1, money2(q.value))); each(); };
          t.oninput = function () { t.dataset.typed = '1'; each(); };
          f.onchange = function () { if (!f.checked && !t.value) t.value = Math.round((ch.price || (S.st.items.filter(function (i) { return i.item === ch.item; })[0] || {}).price || 0) * Math.max(1, money2(q.value))); each(); };
          each();
          $('[data-save]', row).onclick = function () {
            var x = this; busy(x, true);
            api('deskEditCharge', { id: ch.id, qty: Math.max(1, money2(q.value)), free: f.checked, price: 0, total: f.checked ? '' : String(money2(t.value)), reason: 'Bill corrected after check-out' })
              .then(function () { return refresh(b, ch.item + ' changed. Stock and bill updated.'); }, function (e2) { busy(x, false); ierr(e2); });
          };
          $('[data-del]', row).onclick = function () {
            var x = this;
            if (x.dataset.sure !== '1') { x.dataset.sure = '1'; x.textContent = 'Sure?'; return; }
            busy(x, true);
            api('deskEditCharge', { id: ch.id, remove: true, reason: 'Removed from bill after check-out' })
              .then(function () { return refresh(b, ch.item + ' removed. Stock and bill updated.'); }, function (e2) { busy(x, false); ierr(e2); });
          };
        });
        var sel = $('#e-it', ei), af = $('#e-if', ei), at = $('#e-it2', ei);
        function addState() { var o = sel.options[sel.selectedIndex]; if (o && o.dataset.sell === '0') { af.checked = true; af.disabled = true; } else af.disabled = false; at.disabled = af.checked; }
        sel.onchange = addState; af.onchange = addState; addState();
        $('#e-iadd', ei).onclick = function () {
          var x = this; busy(x, true);
          api('deskCharge', { id: st.id, item: sel.value, qty: Math.max(1, money2($('#e-iq', ei).value)), free: af.checked, total: af.checked || !at.value.trim() ? undefined : String(money2(at.value)) })
            .then(function () { return refresh(b, 'Item added. Stock and bill updated.'); }, function (e2) { busy(x, false); ierr(e2); });
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
      var d = billData(b), c = NikadiBill.compute(d), ph = nkPhoneOk(b.phone), st = billStatus(b);
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
        var x = this, text = NikadiBill.billWhatsApp(billData(b), { link: true });
        busy(x, true); note('');
        makePdf(b).then(function (r) {
          if (demo) throw { message: 'wa_not_connected' };
          return api('deskBillWhatsApp', { id: b.stay, pdf: r.base64(), agreed: x.dataset.agreed === '1' });
        }).then(function (res) {
          busy(x, false); x.textContent = 'Sent on WhatsApp ✓';
          note('The PDF bill was sent to ' + nkPhoneShow(res.sentTo) + ' from the guest house WhatsApp number. It also shows in the WhatsApp Business app.');
        }, function (e) {
          busy(x, false);
          var why = (e && e.message) || e;
          if (why === 'wa_no_consent') { x.dataset.agreed = '1'; x.textContent = 'Guest agreed to WhatsApp? Tap again to send'; note('This guest was not asked about WhatsApp messages at check-in. Ask them; if they agree, tap the button again.'); return; }
          if (['wa_not_connected', 'wa_template_pending', 'wa_send_failed', 'wa_paused'].indexOf(why) < 0) { toast(errText(e)); return; }
          // fallback: share from this phone (the message carries the online bill link too)
          try { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {}); } catch (e2) {}
          NikadiBillPdf.share(pdf, text).then(function (ok) {
            var pre = why === 'wa_template_pending' ? 'The guest has not written to us in the last 24 hours and the WhatsApp bill message is still waiting for Meta approval, so it could not go automatically. ' : '';
            if (ok === true) note(pre + 'Shared from this phone. If WhatsApp did not add the message, paste it: it is copied.');
            else if (ok === false) {
              NikadiBillPdf.download(pdf);
              window.open('https://wa.me/' + nkPhoneTel(ph).slice(1) + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
              note(pre + 'WhatsApp is open with the message and a link to the bill. The PDF is also downloaded if you want to attach it (📎).');
            }
          });
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
    v.innerHTML = '<div class="hrow"><div><p class="kicker">Front desk · last ' + L.length + '</p><h1>Bills</h1></div><button class="btn btn-quiet" type="button" id="brf">Refresh</button></div>' + ownBox() +
      (L.length ? '<div class="list">' + L.map(function (b, i) {
        return '<button type="button" class="bl bl-btn" data-i="' + i + '"><span class="t"><b>' + esc(b.guest) + '</b><small>' + esc(b.no) + ' · Room ' + esc(b.room) + ' · ' + esc(dShort(b.at)) + (b.status === 'Scheduled' ? ' · emails ' + whenText(b.sendAt) : b.status === 'Sent' ? ' · emailed' : b.status ? ' · ' + b.status.toLowerCase() : '') + '</small></span><span class="a">' + inr(b.total) + '</span></button>';
      }).join('') + '</div>' : '<p class="small">No bills yet. A bill is made automatically when a guest checks out (from 13 Nov 2026 onwards). Open it here to view, send or edit it.</p>');
    $('#brf', v).onclick = function () { BILLS.list = null; OWN.list = null; render(); };
    wireOwnBox(v);
    $$('[data-i]', v).forEach(function (x) { x.onclick = function () { openBill({ stay: L[+x.dataset.i].stay, no: L[+x.dataset.i].no }); }; });
  }

  /* ---------- Owner's own bills (Owner only): write any bill by hand, nothing is sent from the guest house number ---------- */
  var OWN = { list: null, meta: null };
  function ownBox() {
    if (!owner()) return '';
    if (!OWN.list) {
      api('deskOwnBills').then(function (r) { OWN.list = r.list; OWN.meta = r; if (S.tab === 'bills') render(); }, function (e) { toast(errText(e)); });
      return '<div class="own-box"><div class="hrow"><div><p class="kicker">Owner only · private</p><h2>My own bills</h2></div></div><div class="loading">Loading…</div></div>';
    }
    return '<div class="own-box"><div class="hrow"><div><p class="kicker">Owner only · nobody else sees these</p><h2>My own bills</h2></div><button class="btn btn-gold" type="button" id="own-new">＋ Make a bill</button></div>' +
      (OWN.list.length ? '<div class="list">' + OWN.list.map(function (b, i) {
        return '<button type="button" class="bl bl-btn" data-own="' + i + '"><span class="t"><b>' + esc(b.guest || '—') + '</b><small>' + esc(b.no) + ' · saved ' + esc(tShort(b.at)) + (b.drive ? ' · in Google Drive' : ' · in the app') + '</small></span><span class="a">' + inr(b.total) + '</span></button>';
      }).join('') + '</div>' : '<p class="small">Bills you make here are not in the bill list, not sent from the guest house WhatsApp and not saved unless you choose to.</p>') + '</div>';
  }
  function wireOwnBox(v) {
    var b = $('#own-new', v); if (b) b.onclick = function () { openOwnBill(null); };
    $$('[data-own]', v).forEach(function (x) {
      x.onclick = function () {
        var o = OWN.list[+x.dataset.own]; busy(x, true);
        api('deskOwnBillGet', { id: o.id }).then(function (r) { busy(x, false); openOwnBill({ id: r.id, data: r.data, drive: r.drive }); }, function (e) { busy(x, false); toast(errText(e)); });
      };
    });
  }
  function openOwnBill(saved) {
    var t = S.st.today, H = NikadiBill.HOTEL, meta = OWN.meta || {};
    var d = saved ? saved.data : { no: meta.prefix || '', date: t, url: H.web ? 'https://' + String(H.web).replace(/^https?:\/\//, '') : '', guest: { title: '', name: '', phone: '', email: '', address: '', company: '', gstin: '' },
      room: { no: '', type: (S.st.rooms[0] || {}).type || 'Deluxe Double' }, checkin: t, checkout: addDays(t, 1), nights: 1, guests: 2, booking: '', tariff: 0,
      discounts: [], items: [], payments: [], refunds: [], staff: S.me.name };
    var ownId = saved ? saved.id : '', body = openSheet(saved ? 'My bill · ' + d.no : 'Make a bill (owner only)');
    var types = []; S.st.rooms.forEach(function (r) { if (r.type && types.indexOf(r.type) < 0) types.push(r.type); });
    if (d.room.type && types.indexOf(d.room.type) < 0) types.push(d.room.type);
    var g = d.guest || {};
    function inp(id, val, ph, attr) { return '<input class="input" id="' + id + '" value="' + esc(val == null ? '' : val) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + (attr || '') + '>'; }
    function rowItem(x) { return '<div class="own-row" data-row="item">' + inp('', x.label, 'What (e.g. Water bottle)').replace('id=""', 'data-f="label"') + inp('', x.qty || 1, 'Qty', ' inputmode="numeric"').replace('id=""', 'data-f="qty"') + inp('', x.rate || '', '₹ each', ' inputmode="decimal"').replace('id=""', 'data-f="rate"') + inp('', x.gst == null ? 5 : x.gst, 'GST %', ' inputmode="numeric"').replace('id=""', 'data-f="gst"') + inp('', x.hsn || '', 'HSN').replace('id=""', 'data-f="hsn"') + '<button type="button" class="own-x" aria-label="Remove">✕</button></div>'; }
    function rowDisc(x) { return '<div class="own-row" data-row="disc">' + inp('', x.label, 'e.g. Member discount').replace('id=""', 'data-f="label"') + inp('', x.amount || '', '₹', ' inputmode="decimal"').replace('id=""', 'data-f="amount"') + '<button type="button" class="own-x" aria-label="Remove">✕</button></div>'; }
    function rowPay(x) { return '<div class="own-row" data-row="pay"><input class="input" type="date" data-f="date" value="' + esc(x.date || t) + '">' + '<select class="input" data-f="method">' + S.st.methods.map(function (m) { return '<option' + (m === x.method ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + '</select>' + inp('', x.ref || '', 'Ref. no.').replace('id=""', 'data-f="ref"') + inp('', x.amount || '', '₹', ' inputmode="decimal"').replace('id=""', 'data-f="amount"') + '<button type="button" class="own-x" aria-label="Remove">✕</button></div>'; }
    body.innerHTML = '<div class="note gold"><b>Owner only</b>Every part of this bill can be changed. Nothing is sent from the guest house number. It is saved only if you press Save.</div>' +
      '<h3 class="own-h">Bill</h3><div class="grid2">' + field('Invoice no.', inp('o-no', d.no), true) + field('Invoice date', '<input class="input" type="date" id="o-date" value="' + esc(d.date) + '">') + '</div>' +
      (meta.lastNo ? '<p class="small">Last real bill: ' + esc(meta.lastNo) + '</p>' : '') +
      field('QR code link (what the QR on the bill opens)', inp('o-url', d.url, 'https://… (leave empty for no QR code)', ' inputmode="url"')) +
      '<h3 class="own-h">Billed to</h3>' + '<div class="field"><span>Title</span>' + seg('o-title', ['', 'Mr.', 'Ms.', 'Mrs.', 'Dr.'].map(function (x) { return x || 'None'; }), g.title || 'None') + '</div>' +
      field('Guest name', inp('o-name', g.name), true) + '<div class="grid2">' + field('Mobile', inp('o-phone', g.phone, '', ' inputmode="tel"')) + field('Email', inp('o-email', g.email, '', ' inputmode="email"')) + '</div>' +
      field('Address', inp('o-addr', g.address)) + '<div class="grid2">' + field('Company / billing name', inp('o-co', g.company)) + field('Guest GSTIN', inp('o-gst', g.gstin, '', ' style="text-transform:uppercase"')) + '</div>' +
      '<h3 class="own-h">Stay</h3><div class="grid2">' + field('Room no.', inp('o-room', d.room.no)) + field('Room type', '<select class="input" id="o-type">' + types.map(function (x) { return '<option' + (x === d.room.type ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select>') + '</div>' +
      '<div class="grid2">' + field('Check-in', '<input class="input" type="date" id="o-in" value="' + esc(d.checkin) + '">') + field('Check-out', '<input class="input" type="date" id="o-out" value="' + esc(d.checkout) + '">') + '</div>' +
      '<div class="grid2">' + field('Nights', inp('o-n', d.nights, '', ' inputmode="numeric"')) + field('Guests', inp('o-g', d.guests, '', ' inputmode="numeric"')) + '</div>' +
      '<div class="grid2">' + field('Room price per night (₹, incl. GST)', inp('o-rate', d.tariff || '', '', ' inputmode="decimal"'), true) + field('Booking ref.', inp('o-bk', d.booking)) + '</div>' +
      '<h3 class="own-h">Discounts</h3><div id="o-discs">' + (d.discounts || []).map(rowDisc).join('') + '</div><button type="button" class="btn btn-quiet sm" id="o-adddisc">＋ Discount</button>' +
      '<h3 class="own-h">Other items</h3><div id="o-items">' + (d.items || []).map(rowItem).join('') + '</div><button type="button" class="btn btn-quiet sm" id="o-additem">＋ Item</button>' +
      '<h3 class="own-h">Payments received</h3><div id="o-pays">' + (d.payments || []).map(rowPay).join('') + '</div><button type="button" class="btn btn-quiet sm" id="o-addpay">＋ Payment</button>' +
      field('Signed / checked out by (optional)', inp('o-staff', d.staff)) +
      '<div class="calc" id="o-sum"></div>' +
      '<div class="btns"><button class="btn btn-line" type="button" id="o-view">See the bill</button><button class="btn btn-line" type="button" id="o-pdf">PDF</button><button class="btn btn-line" type="button" id="o-msg">Copy bill message</button></div>' +
      '<label class="own-chk"><input type="checkbox" id="o-link"' + (d.url ? '' : ' disabled') + '> Put the QR link in the message (otherwise it says the PDF is attached)</label>' +
      '<div id="o-msgbox"></div>' +
      '<p class="err" id="err" role="alert"></p>' +
      '<div class="btns"><button class="btn btn-gold" type="button" id="o-save">Save in the app</button>' + (meta.canDrive !== false ? '<button class="btn btn-gold" type="button" id="o-drive">Save in app + Google Drive</button>' : '') + '</div>' +
      (saved ? '<p class="small">' + (saved.drive ? 'Saved in Google Drive: <a href="' + esc(saved.drive) + '" target="_blank" rel="noopener">open the PDF</a>. Saving again replaces it.' : 'Saved in the app only.') + ' <button type="button" class="linkbtn danger" id="o-del">Delete this bill</button></p>' : '<p class="small">Don\'t want to keep it? Just close this. Nothing is saved.</p>');
    wireSegs(body);
    function nightsFromDates() { var n = nights($('#o-in', body).value, $('#o-out', body).value); if (n > 0) $('#o-n', body).value = n; }
    $('#o-in', body).addEventListener('change', function () { nightsFromDates(); sum(); }); $('#o-out', body).addEventListener('change', function () { nightsFromDates(); sum(); });
    function addRow(box, html) { var w = document.createElement('div'); w.innerHTML = html; box.appendChild(w.firstChild); sum(); }
    $('#o-adddisc', body).onclick = function () { addRow($('#o-discs', body), rowDisc({})); };
    $('#o-additem', body).onclick = function () { addRow($('#o-items', body), rowItem({})); };
    $('#o-addpay', body).onclick = function () { addRow($('#o-pays', body), rowPay({ method: 'Cash' })); };
    body.addEventListener('click', function (e) { var x = e.target.closest('.own-x'); if (x) { x.parentNode.remove(); sum(); } });
    body.addEventListener('input', function () { sum(); var u = $('#o-url', body).value.trim(), c = $('#o-link', body); c.disabled = !u; if (!u) c.checked = false; });
    function n(v) { v = Number(String(v || '').replace(/[^\d.]/g, '')); return isNaN(v) ? 0 : v; }
    function val(row, f) { var e = $('[data-f="' + f + '"]', row); return e ? e.value.trim() : ''; }
    function collect() {
      var title = segVal(body, 'o-title'); title = title === 'None' ? '' : title;
      return {
        no: $('#o-no', body).value.trim(), date: $('#o-date', body).value || t, url: $('#o-url', body).value.trim(),
        guest: { title: title, name: $('#o-name', body).value.trim(), phone: $('#o-phone', body).value.trim(), email: $('#o-email', body).value.trim(), address: $('#o-addr', body).value.trim(),
          company: $('#o-co', body).value.trim(), gstin: $('#o-gst', body).value.trim().toUpperCase() },
        room: { no: $('#o-room', body).value.trim(), type: $('#o-type', body).value }, checkin: $('#o-in', body).value, checkout: $('#o-out', body).value,
        nights: Math.max(1, Math.round(n($('#o-n', body).value)) || 1), guests: Math.max(1, Math.round(n($('#o-g', body).value)) || 1), booking: $('#o-bk', body).value.trim(), tariff: n($('#o-rate', body).value),
        discounts: $$('[data-row="disc"]', body).map(function (r) { return { label: val(r, 'label') || 'Discount', amount: n(val(r, 'amount')) }; }).filter(function (x) { return x.amount; }),
        items: $$('[data-row="item"]', body).map(function (r) { return { label: val(r, 'label') || 'Item', qty: Math.max(1, n(val(r, 'qty')) || 1), rate: n(val(r, 'rate')), gst: val(r, 'gst') === '' ? 5 : n(val(r, 'gst')), hsn: val(r, 'hsn') }; }).filter(function (x) { return x.label && (x.rate || x.qty); }),
        payments: $$('[data-row="pay"]', body).map(function (r) { return { date: val(r, 'date') || t, label: 'Payment received', method: val(r, 'method'), ref: val(r, 'ref'), amount: n(val(r, 'amount')) }; }).filter(function (x) { return x.amount; }),
        refunds: [], staff: $('#o-staff', body).value.trim()
      };
    }
    function sum() { var c = NikadiBill.compute(collect()); $('#o-sum', body).innerHTML = 'Total <b>' + inr(c.total) + '</b> · received ' + inr(c.paid) + ' · ' + (Math.abs(c.due) < .5 ? 'fully paid' : c.due > 0 ? 'balance ' + inr(c.due) : 'refund ' + inr(-c.due)); }
    function check() { var x = collect(); if (!x.no) return 'Write the invoice number.'; if (!x.guest.name && !x.guest.company) return 'Write the guest name.'; return ''; }
    sum();
    $('#o-view', body).onclick = function () {
      var x = collect(), pv = openSheet('Bill ' + (x.no || ''));
      pv.innerHTML = '<iframe class="own-prev" title="Bill preview"></iframe>';
      var f = $('iframe', pv), doc = f.contentDocument; doc.open(); doc.write(NikadiBill.billHTML(x, { logo: '../img/brand/logo.png' })); doc.close();
    };
    $('#o-pdf', body).onclick = function () {
      var b = this, w = check(); if (w) { $('#err', body).textContent = w; return; } busy(b, true);
      var x = collect();
      NikadiBillPdf.make(x, { base: '' }).then(function (r) {
        busy(b, false);
        return NikadiBillPdf.share(r, NikadiBill.billWhatsApp(x, { link: $('#o-link', body).checked })).then(function (ok) { if (ok !== true && ok !== 'cancel') { NikadiBillPdf.download(r); toast('PDF downloaded'); } });
      }, function (e) { busy(b, false); toast(errText(e)); });
    };
    $('#o-msg', body).onclick = function () {
      var x = collect(), msg = NikadiBill.billWhatsApp(x, { link: $('#o-link', body).checked }), box = $('#o-msgbox', body);
      box.innerHTML = '<textarea class="input own-msg" rows="12" readonly>' + esc(msg) + '</textarea><p class="small">Copied. Paste it in your own WhatsApp with the PDF.</p>';
      var ta = $('textarea', box);
      try { navigator.clipboard.writeText(msg).then(function () { toast('Message copied'); }, function () { ta.select(); document.execCommand('copy'); toast('Message copied'); }); }
      catch (e) { ta.select(); try { document.execCommand('copy'); } catch (e2) {} toast('Select and copy the message'); }
    };
    function save(btn, drive) {
      var w = check(); if (w) { $('#err', body).textContent = w; vibrate(); return; }
      var x = collect(); busy(btn, true); $('#err', body).textContent = '';
      (drive ? NikadiBillPdf.make(x, { base: '' }).then(function (r) { return r.base64(); }) : Promise.resolve(''))
        .then(function (pdf) { return api('deskOwnBillSave', { id: ownId, data: x, drive: !!drive, pdf: pdf || undefined }); })
        .then(function (r) { ownId = r.id; busy(btn, false); OWN.list = null; toast(drive ? 'Saved in the app and in Google Drive' : 'Saved in the app'); closeSheet(); if (S.tab === 'bills') render(); },
          function (e) { busy(btn, false); $('#err', body).textContent = errText(e); vibrate(); });
    }
    $('#o-save', body).onclick = function () { save(this, false); };
    if ($('#o-drive', body)) $('#o-drive', body).onclick = function () { save(this, true); };
    if ($('#o-del', body)) $('#o-del', body).onclick = function () {
      var b = this; if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Tap again to delete'; return; }
      api('deskOwnBillDelete', { id: ownId }).then(function () { OWN.list = null; toast('Bill deleted from the app' + (saved.drive ? ' (the PDF stays in Google Drive)' : '')); closeSheet(); if (S.tab === 'bills') render(); }, function (e) { toast(errText(e)); });
    };
  }

  /* ---------- Change log (owner only, new server): who changed what ---------- */
  var CL = { rows: null, who: '', more: true, people: [] };
  var CL_ACT = { deskCheckIn: 'Check-in', deskCheckOut: 'Check-out', deskUpdateStay: 'Edit stay', deskCharge: 'Item added', deskEditCharge: 'Item changed', deskPay: 'Payment', deskRefund: 'Refund', deskVoidPayment: 'Payment cancelled',
    deskPayAmount: 'Payment amount changed', deskBookingSave: 'Booking', deskBookingConfirm: 'Booking confirmed', deskBookingCancel: 'Booking cancelled', deskBookingUpdate: 'Booking changed', deskRoomStatus: 'Room status', deskServiceDone: 'Housekeeping',
    deskStock: 'Stock', deskExpenseSave: 'Expense', deskCommissionSave: 'Commission', deskIdSave: 'ID copy', deskItemSave: 'Item / price', deskStaffSave: 'Team', deskApprove: 'Approval', deskKit: 'Free kit', deskBillEdit: 'Bill edited',
    deskOwnBillSave: 'Own bill', timer: 'Automatic (timer)', 'whatsapp-webhook': 'WhatsApp bot', join: 'Member joined (website)', book: 'Booking (website)' };
  function clAct(a) { return CL_ACT[a] || String(a || '').replace(/^desk/, '').replace(/([a-z])([A-Z])/g, '$1 $2') || 'Change'; }
  function clVal(v) { if (v && typeof v === 'object') return v.$d ? String(v.$d).slice(0, 16).replace('T', ' ') : JSON.stringify(v).slice(0, 60); v = String(v == null ? '' : v); return v.length > 60 ? v.slice(0, 60) + '…' : v; }
  var CL_KEYS = ['guest', 'name', 'room', 'item', 'qty', 'amount', 'method', 'total', 'price', 'rate', 'status', 'nights', 'checkin', 'checkout', 'note', 'reason', 'category', 'phone'];
  function clDetail(r) {
    var o = r.after || {}, keys;
    if (r.before && !r.after) return 'Removed' + (r.before.guest ? ': ' + clVal(r.before.guest) : r.before.item ? ': ' + clVal(r.before.item) : '');
    if (o.v) return o.v.filter(function (x) { return x !== '' && x != null; }).slice(0, 5).map(clVal).join(' · ');
    keys = Object.keys(o).filter(function (k) { return !/^(id|at|by|updated|inAt|inBy|outAt|outBy|edited|data|sendAt|_)/.test(k) && o[k] !== '' && o[k] != null; });
    var main = CL_KEYS.filter(function (k) { return keys.indexOf(k) >= 0; }), rest = keys.filter(function (k) { return main.indexOf(k) < 0; });
    return main.concat(rest).slice(0, 7).map(function (k) { return k + ': ' + clVal(o[k]); }).join(' · ');
  }
  function clTime(at) { var d = new Date(at), i = new Date(d.getTime() + 330 * 60000); return i.toISOString().slice(0, 10) + ' ' + i.toISOString().slice(11, 16); }
  function viewChangeLog(v) {
    if (!owner()) { v.innerHTML = '<p class="small">Only the owner can see this.</p>'; return; }
    if (!CL.rows) {
      v.innerHTML = '<div><p class="kicker">Owner only</p><h1>Change log</h1></div><div class="loading">Loading…</div>';
      api('deskChangeLog', { who: CL.who }).then(function (r) { CL.rows = r.rows; CL.people = r.people || []; CL.more = r.rows.length >= 80; if (S.tab === 'changelog') render(); },
        function (e) { v.innerHTML = '<div><p class="kicker">Owner only</p><h1>Change log</h1></div><p class="small">' + (e === 'changelog_unavailable' ? 'The change log starts when the app moves to the new fast server.' : esc(errText(e))) + '</p>'; });
      return;
    }
    var byDay = {}; CL.rows.forEach(function (r) { var d = clTime(r.at).slice(0, 10); (byDay[d] = byDay[d] || []).push(r); });
    v.innerHTML = '<div class="hrow"><div><p class="kicker">Owner only · every change, with who did it</p><h1>Change log</h1></div><button class="btn btn-quiet" type="button" id="clrf">Refresh</button></div>' +
      '<div class="att-filters"><select class="input" id="clwho"><option value="">Everyone</option>' + CL.people.map(function (p) { return '<option' + (p === CL.who ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join('') + '</select></div>' +
      (CL.rows.length ? Object.keys(byDay).map(function (d) {
        return '<div class="panel"><div class="sec-h"><h2>' + esc(d === S.st.today ? 'Today' : dShort(d)) + '</h2></div><div class="list">' + byDay[d].map(function (r) {
          return '<div class="bl cl-row"><span class="t"><b>' + esc(clAct(r.action)) + ' · ' + esc(r.tab) + '</b><small>' + esc(clDetail(r)) + '</small></span><span class="a"><span class="cl-who">' + esc(r.who || '—') + '</span><time>' + esc(clTime(r.at).slice(11)) + '</time></span></div>';
        }).join('') + '</div></div>';
      }).join('') : '<p class="small">No changes yet.</p>') +
      (CL.more && CL.rows.length ? '<button class="btn btn-line" type="button" id="clmore">Show older</button>' : '');
    $('#clrf', v).onclick = function () { CL.rows = null; render(); };
    $('#clwho', v).onchange = function () { CL.who = this.value; CL.rows = null; render(); };
    var m = $('#clmore', v); if (m) m.onclick = function () {
      busy(m, true);
      api('deskChangeLog', { who: CL.who, before: CL.rows[CL.rows.length - 1].id }).then(function (r) { CL.rows = CL.rows.concat(r.rows); CL.more = r.rows.length >= 80; render(); }, function (e) { busy(m, false); toast(errText(e)); });
    };
  }

  /* ---------- Help: a short guide for each job ---------- */
  var GUIDE = [
    ['Everyone', [
      ['Log in', 'Type your PIN. The app stays logged in on your phone; press Log out when you hand the phone to someone else.'],
      ['Room colours', 'Green = ready · Blue = guest staying · Gold = leaves today / arriving · Red = needs cleaning. Tap a room to see or do everything for it.'],
      ['Slow internet?', 'The app keeps working: wait for "Saved" before closing. If something says "Try again", tap the button again; nothing is saved twice.'],
      ['Mistakes', 'Money mistakes (payments, refunds, rates) are corrected, never deleted: tap the payment or item and choose the correction. The owner sees every change.']]],
    ['Housekeeping', [
      ['Guest staying on', 'Housekeeping → the room → Checklist: tick water, towels, dental kit, bathroom, both dustbins, floor, bedding. "Housekeeping done" works only when all is ticked.'],
      ['After check-out (red room)', 'Tap the red room → Open cleaning checklist → tick everything fresh → "Room is ready". The room turns green.'],
      ['Giving items', 'Add item → choose the room and the item (water, dental kit, mattress…). Free items are shown as free; stock goes down by itself.'],
      ['Stock', 'Stock shows what is in storage and what to buy (red). Tell reception when something runs out.']]],
    ['Reception', [
      ['Check-in', 'Tap a green room → Check in a guest: name, phone, guests (+ other names), dates, rate, advance paid, free kit (Morning / Dental). Free stays: Stay = Free stay → whose guest + reference.'],
      ['ID copies', 'Room → ID copies → photo of each ID (front / back). They are cropped and saved to the stay; print 3 people per A4.'],
      ['Payments', 'Room → Take payment (cash / UPI / card / bank). For UPI or bank write the transaction number.'],
      ['Check-out', 'Room → Check out: nights, bill details (email, company, GSTIN) → the bill is made. It goes to the guest by email and WhatsApp 12 hours later, or press "Send PDF on WhatsApp" now.'],
      ['Bookings', 'Bookings → new / pending / confirmed. Confirm only after the advance is paid; on the day the booking shows on the room in gold.'],
      ['Registration cards', 'Send the guest the “Registration form” message. When they fill it on the website, the card appears in More → Registration cards (gold “New”), linked to their booking. They send their ID photo on WhatsApp. Open it, check it, and tap Mark as checked.'],
      ['Ready WhatsApp messages', 'WhatsApp → Ready messages (or the gold bar). Folder 1 “Welcome & check-in”: booking confirmed, how to reach us, welcome, anything you need, membership. Folder 2 “Check-out, bill & review”: check-out reminder, bill + review, bill only, thank you + Google review, come again. Tap a message: WhatsApp opens with it written, press send. Edit changes the words first. A tick shows who sent it and when.'],
      ['WhatsApp', 'WhatsApp → lists: New enquiry, Advance paid (check the screenshot, then Confirm booking), Checked in, Member. Reply from the app inside 24 hours of the guest\'s last message.'],
      ['Expenses & commission', 'More → Expenses (with bill photo) and Commission (drivers / brokers with phone number).'],
      ['Needs approval', 'Changing a rate, refunds and payment corrections go to the manager / owner: write the reason and wait for "Approved".']]],
    ['Owner', [
      ['Every day', 'Today: arrivals, money in, balance due. Sales: month and year. Attendance: who was at work, live PC status, change a wrong exit time.'],
      ['Checking', 'Change log: every change with who did it and the before / after. Approvals: money changes from reception.'],
      ['Settings', 'Team and PINs, item prices and stock warnings, the policy text. My own bills: under Bills (only you see them).'],
      ['Safety', 'Every night the data is copied into the Google Sheet and every Sunday a backup copy goes to Drive (Nikadi Guest House Records → Backups). Problems are emailed to the guest house Gmail.']]],
    ['Laundry', [
      ['Taking things', '+ Laundry list: write how many of each item you take. Reception counts and approves; then you can take them.'],
      ['Bringing back', 'Open the list → Bring back: write what you brought. Reception counts and approves. Anything not brought yet shows as "still out".'],
      ['Your bill', 'Pieces brought back × the price per piece. You see the month total and what is not paid yet.']]]
  ];
  function viewHelp(v) {
    var role = S.me.role, order = role === 'Laundry' ? [GUIDE.length - 1] : role === 'Owner' ? [3, 2, 1, 0] : role === 'Staff' ? [1, 0] : [2, 1, 0];
    v.innerHTML = '<div><p class="kicker">' + esc(S.me.name) + ' · ' + esc(role) + '</p><h1>Help</h1></div><p class="small">A short guide. Ask the owner if anything is not clear.</p>' +
      order.map(function (i, n) {
        var g = GUIDE[i];
        return '<details class="panel guide"' + (n === 0 ? ' open' : '') + '><summary><h2>' + esc(g[0]) + '</h2></summary><div class="list">' + g[1].map(function (x) {
          return '<div class="bl"><span class="t"><b>' + esc(x[0]) + '</b><small>' + esc(x[1]) + '</small></span></div>';
        }).join('') + '</div></details>';
      }).join('');
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
  var LIVE_T = null;
  function ago(sec) { return sec < 60 ? sec + ' s ago' : Math.round(sec / 60) + ' min ago'; }
  function liveLoad(v) {
    clearTimeout(LIVE_T);
    var box = $('#livebody', v); if (!box) return;
    api('deskLive').then(function (r) {
      if (!box.isConnected) return;
      box.classList.remove('loading');
      box.innerHTML = r.pc.length ? '<div class="list">' + r.pc.map(function (x) {
        return '<div class="bl"><span class="t"><b><span class="live-dot"></span>Open now · ' + esc(x.name) + '</b><small>' + esc(x.role) + ' is logged in · ' + esc(x.dev) + ' · ' + (x.shown ? 'on screen' : 'in the background') + ' · signal ' + ago(x.ago) + '</small></span><span class="a"><span class="ptag k-ok">Live</span></span></div>';
      }).join('') + '</div>'
        : '<div class="bl"><span class="t"><b><span class="live-dot off"></span>The app is not open on the guest house PC</b><small>' + (r.last ? 'Last open: ' + esc(r.last.name) + ' · ' + esc(tShort(r.last.at)) + ' · ' + esc(r.last.dev) : 'No signal from the PC yet. The PC sends one every minute while the app is open (from app version 43).') + '</small></span></div>';
      if (r.others && r.others.length) box.innerHTML += '<p class="small">Also open elsewhere: ' + r.others.map(function (x) { return esc(x.name) + ' (' + esc(x.dev) + (x.wifi ? ', guest house Wi-Fi' : '') + ')'; }).join(' · ') + '</p>';
    }, function () { if (box.isConnected) box.innerHTML = '<p class="small">Could not check right now.</p>'; })
      .then(function () { LIVE_T = setTimeout(function () { if (S.tab === 'attendance' && !document.hidden && $('#livebody')) liveLoad(document); }, 30000); });
  }
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
      '<div class="panel live-pc" id="livepc"><div class="sec-h"><h2>Guest house PC · live</h2><span class="small">updates every 30 seconds</span></div><div id="livebody" class="loading">Checking…</div></div>' +
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
              '<td><button type="button" class="att-ex" data-ex="' + esc(day + '|' + r.name) + '">' + (r.now ? '<span class="ptag k-ok">Still here</span><small class="dev">last ' + esc(clock(r.last)) + '</small>' : esc(clock(r.last)) + (r.exitSet ? '<small class="dev set">✓ chosen by owner</small>' : r.lastDevice && r.lastDevice !== r.device ? '<small class="dev">' + esc(r.lastDevice) + '</small>' : '')) + '<small class="dev edit">Change exit ›</small></button></td>' +
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
    liveLoad(v);
    function save(ip, remove, x) {
      busy(x, true); $('#aerr', v).textContent = '';
      api('deskAttendanceWifi', { ip: ip, remove: !!remove }).then(function () { toast(remove ? 'Network removed' : 'Guest house Wi-Fi saved'); ATT.data = null; render(); }, function (e) { busy(x, false); $('#aerr', v).textContent = errText(e); });
    }
    $('#awifi', v).onclick = function () {
      var x = this; busy(x, true);
      publicIp().then(function (ip) { save(ip, false, x); }, function () { busy(x, false); $('#aerr', v).textContent = 'Could not check the network. Check the internet and try again.'; });
    };
    $$('[data-ex]', v).forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.ex.split('|'), r = rows.filter(function (x) { return x.date === k[0] && x.name === k[1]; })[0]; if (!r) return;
        var sb = openSheet('Exit · ' + r.name + ' · ' + dShort(r.date)), cur = r.exitSet || '';
        function exList(title, list, none) {
          return '<h3 class="own-h">' + esc(title) + '</h3>' + (list && list.length ? '<div class="list">' + list.map(function (c) {
            return '<button type="button" class="bl bl-btn ex-pick' + (cur === c.at ? ' on' : '') + '" data-at="' + esc(c.at) + '"><span class="t"><b>' + esc(clock(c.at)) + '</b><small>' + esc(c.dev || '') + ' · worked ' + dur(hm(r.first, c.at)) + '</small></span><span class="a">' + (cur === c.at ? '✓ chosen' : 'Use this') + '</span></button>';
          }).join('') + '</div>' : '<p class="small">' + esc(none) + '</p>');
        }
        sb.innerHTML = '<p class="small">Came in at <b>' + esc(clock(r.first)) + '</b>. Pick the real exit time.</p>' +
          exList('Last 3 log-outs on the guest house PC', r.outs, 'No log-out recorded that day.') +
          exList('Last 3 log-ins on the guest house PC', r.ins, 'No log-in recorded that day.') +
          exList('Other records that day (app opens, work entered)', r.choices, 'Nothing else recorded.') +
          (cur ? '<button type="button" class="btn btn-quiet" id="ex-auto">Go back to automatic (last app open ' + esc(clock(r.autoLast)) + ')</button>' : '') +
          '<p class="err" id="exerr" role="alert"></p>';
        function setExit(at, x) {
          busy(x, true);
          var r0 = attRange(ATT.range);
          api('deskAttendanceExit', { date: r.date, name: r.name, at: at, from: r0[0], to: r0[1], name2: ATT.name }).then(function () { toast(at ? 'Exit set to ' + clock(at) : 'Exit is automatic again'); closeSheet(); ATT.data = null; render(); },
            function (e) { busy(x, false); $('#exerr', sb).textContent = errText(e); });
        }
        $$('.ex-pick', sb).forEach(function (x) { x.onclick = function () { setExit(x.dataset.at, x); }; });
        if ($('#ex-auto', sb)) $('#ex-auto', sb).onclick = function () { setExit('', this); };
      };
    });
    $$('[data-rm]', v).forEach(function (b) { b.onclick = function () { save(b.dataset.rm, true, b); }; });
    $$('[data-add]', v).forEach(function (b) { b.onclick = function () { save(b.dataset.add, false, b); }; });
  }

  /* ---------- More (phones) ---------- */
  function viewMore(v) {
    var list = [['whatsapp', 'WhatsApp', 'Guest chats: new enquiries, advance paid, checked in, members'], ['regs', 'Registration cards', 'Guest registration forms filled on the website'], ['housekeeping', 'Housekeeping', 'Daily free water and room service checklist'], ['idcopy', 'ID copies', 'Guest ID / passport copies for each room, print on A4'], ['expenses', 'Expenses', 'Electricity, supplies, cleaning… with bill photos'], ['commission', 'Commission', 'Drivers and brokers paid, with phone numbers'], ['bills', 'Bills', 'GST invoices: view, print, WhatsApp, email'], ['approvals', approver() ? 'Approvals' : 'My requests', approver() ? 'Money changes from reception' : 'Refunds and corrections you asked for'], ['add', 'Add item', 'Water, dental kit, mattress, late checkout'],
      ['stock', 'Stock', 'What is in storage and what to buy'], ['laundry', 'Laundry', 'Bedding and towels: lists to the laundry, returns, linen count and the laundry bill']].concat(owner() ? [['reports', 'Sales', 'Monthly and yearly sales (owner only)'], ['attendance', 'Attendance', 'Staff entry and exit on the guest house Wi-Fi (owner only)'], ['changelog', 'Change log', 'Who changed what, with before and after (owner only)'], ['settings', 'Settings', 'Team, PINs, prices, policy']] : []).concat([['help', 'Help', 'How to use the app: a short guide for your job']]);
    v.innerHTML = '<div><p class="kicker">' + esc(S.me.name) + ' · ' + esc(S.me.role) + '</p><h1>More</h1></div><div class="menu">' + list.map(function (m) {
      return '<button type="button" class="menu-item" data-go="' + m[0] + '">' + ICON[m[0]] + '<span><b>' + m[1] + '</b><small>' + m[2] + '</small></span>' + badge(m[0]) + '<i aria-hidden="true">›</i></button>';
    }).join('') + '</div><div data-install></div><button class="btn btn-quiet" type="button" id="lo">Log out</button><p class="small" style="text-align:center">App version 69</p>';
    installUi($('[data-install]', v));
    $$('[data-go]', v).forEach(function (b) { b.onclick = function () { go(b.dataset.go); }; });
    $('#lo', v).onclick = function () { logout(false); };
  }

  function openTeam() {
    var body = openSheet('Team & PINs');
    body.innerHTML = '<div class="loading">Loading…</div>';
    function draw(team) {
      body.innerHTML = '<div class="roles"><p><b>Owner</b> Everything, plus team, PINs and prices.</p><p><b>Manager</b> Everything at the desk, and approves reception\'s money changes.</p>' +
        '<p><b>Receptionist</b> Check-ins, bookings, payments and bills. Cannot change money once recorded: refunds, removing paid items and corrections need a manager\'s approval.</p><p><b>Staff</b> Rooms, add items, cleaning and stock. No money.</p><p><b>Laundry</b> Only the Laundry screen: lists what they take and bring back. Reception counts and approves each time.</p></div>' +
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
        '<div class="field"><span>Role</span>' + seg('role', ['Owner', 'Manager', 'Receptionist', 'Staff', 'Laundry'], p ? p.role : 'Staff') + '</div>' +
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
        field('Free daily per staying room (housekeeping gives this every day from the 2nd day; 0 = none)', '<input class="input" id="i-daily" inputmode="numeric" value="' + (it ? it.daily || 0 : 0) + '">') +
        (it ? '<label class="toggle"><span>Show this item</span><input type="checkbox" id="i-act" checked></label>' : '') +
        '<p class="err" id="err" role="alert"></p><button class="btn btn-gold big-cta" id="go" type="button">Save</button>';
      $('#go', b2).onclick = function () {
        var act = $('#i-act', b2);
        submit(this, $('#err', b2), 'deskItemSave', { original: it ? it.item : '', item: $('#i-name', b2).value, price: $('#i-price', b2).value.replace(/\D/g, ''),
          track: $('#i-track', b2).checked, sell: $('#i-sell', b2).checked, low: $('#i-low', b2).value.replace(/\D/g, ''), daily: $('#i-daily', b2).value.replace(/\D/g, '') || '0', active: act ? act.checked : true },
          function () { toast('Saved'); closeSheet(); refresh().then(draw); });
      };
    }
    draw();
  }

  /* ---------- boot ---------- */
  if (S.token && S.me) start(); else renderLogin();
})();
