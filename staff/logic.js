/* Nikadi Staff — shared business logic.
   The same file runs in two places:
     1. In the browser, for demo mode (data kept on this phone only).
     2. In Google Apps Script, where tools/build-staff.py copies it into backend/Staff.gs.
   It never touches a sheet or the browser directly: it only uses the small `db` object it is given. */

var DESK_TZ_MIN = 330; // India Standard Time, UTC+5:30 (no daylight saving)
var DESK_POLICY = {
  advancePct: 50,      // advance needed to confirm a booking
  freeCancelDays: 3,   // cancel at least this many days before check-in = full refund of the advance
  text: 'To confirm a booking we need an advance of 50% of the total room price. Cancel 3 or more days before check-in and we refund the full advance. ' +
    'Cancellations less than 3 days before check-in, on the day of arrival, or no-shows are not refunded, and the advance cannot be moved to another date.'
};

var DESK_SCHEMA = {
  rooms: { sheet: 'Rooms', cols: [['room', 'Room', 'n'], ['type', 'Room type'], ['beds', 'Beds'], ['rate', 'Usual rate per night (₹)', 'n'],
    ['status', 'Status'], ['stay', 'Current stay ID'], ['updated', 'Updated', 't'], ['by', 'Updated by']] },
  stays: { sheet: 'Stays', cols: [['id', 'Stay ID'], ['room', 'Room', 'n'], ['guest', 'Guest name'], ['phone', 'Phone', 's'], ['guests', 'Guests', 'n'],
    ['checkin', 'Check-in date', 'd'], ['checkout', 'Check-out date', 'd'], ['nights', 'Nights', 'n'], ['rate', 'Agreed rate per night (₹)', 'n'],
    ['rateNote', 'Rate note'], ['status', 'Status'], ['roomTotal', 'Room total (₹)', 'n'], ['extras', 'Extras (₹)', 'n'], ['paid', 'Paid (₹)', 'n'],
    ['balance', 'Balance (₹)', 'n'], ['notes', 'Notes'], ['inBy', 'Checked in by'], ['inAt', 'Checked in at', 't'], ['outBy', 'Checked out by'], ['outAt', 'Checked out at', 't'],
    ['booking', 'Booking ID']] },
  bookings: { sheet: 'Bookings', cols: [['id', 'Booking ID'], ['status', 'Status'], ['source', 'Source'], ['guest', 'Guest name'], ['phone', 'Phone', 's'], ['email', 'Email'],
    ['guests', 'Guests', 'n'], ['roomsNeeded', 'Rooms needed', 'n'], ['roomType', 'Room preference'], ['rooms', 'Room numbers', 's'], ['checkin', 'Check-in date', 'd'],
    ['checkout', 'Check-out date', 'd'], ['nights', 'Nights', 'n'], ['rate', 'Rate per room per night (₹)', 'n'], ['total', 'Total (₹)', 'n'],
    ['advanceDue', 'Advance required, 50% (₹)', 'n'], ['advancePaid', 'Advance paid (₹)', 'n'], ['refunded', 'Refunded (₹)', 'n'], ['notes', 'Notes'],
    ['created', 'Created', 't'], ['createdBy', 'Created by'], ['confirmedBy', 'Confirmed by'], ['confirmedAt', 'Confirmed at', 't'],
    ['closedBy', 'Closed by'], ['closedAt', 'Closed at', 't'], ['closeNote', 'Cancellation / closing note']] },
  charges: { sheet: 'Room charges', cols: [['id', 'ID'], ['at', 'Date', 't'], ['stay', 'Stay ID'], ['room', 'Room', 'n'], ['item', 'Item'], ['qty', 'Qty', 'n'],
    ['price', 'Unit price (₹)', 'n'], ['total', 'Total (₹)', 'n'], ['free', 'Free'], ['note', 'Note'], ['by', 'Added by'], ['removed', 'Removed']] },
  payments: { sheet: 'Payments', cols: [['id', 'ID'], ['at', 'Date', 't'], ['stay', 'Stay ID'], ['room', 'Room', 'n'], ['amount', 'Amount (₹)', 'n'],
    ['method', 'Method'], ['note', 'Note'], ['by', 'Taken by'], ['booking', 'Booking ID'], ['ref', 'Reference no.', 's'], ['voided', 'Voided']] },
  requests: { sheet: 'Approval requests', cols: [['id', 'Request ID'], ['at', 'Date', 't'], ['by', 'Requested by'], ['type', 'Type'], ['summary', 'What'],
    ['reason', 'Reason'], ['status', 'Status'], ['decidedBy', 'Decided by'], ['decidedAt', 'Decided at', 't'], ['decisionNote', 'Decision note'], ['payload', 'Details (system)', 's']] },
  items: { sheet: 'Items', cols: [['item', 'Item'], ['price', 'Price (₹)', 'n'], ['track', 'Track stock'], ['stock', 'In stock', 'n'], ['low', 'Warn below', 'n'], ['active', 'Active'], ['sell', 'Sold to rooms']] },
  stocklog: { sheet: 'Stock log', cols: [['at', 'Date', 't'], ['item', 'Item'], ['change', 'Change', 'n'], ['left', 'Left', 'n'], ['reason', 'Reason'], ['room', 'Room'], ['by', 'By']] },
  staff: { sheet: 'Staff', cols: [['name', 'Name'], ['pin', 'PIN', 's'], ['role', 'Role'], ['active', 'Active']] },
  sessions: { sheet: 'Staff sessions', hidden: true, cols: [['token', 'Token', 's'], ['name', 'Name'], ['role', 'Role'], ['expires', 'Expires', 't']] }
};

var DESK_DEFAULTS = {
  rooms: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (n) {
    var twin = n === 1 || n === 5, big = n === 10 || n === 11;
    return { room: n, type: twin ? 'Deluxe Twin' : big ? 'Large Twin' : 'Deluxe Double', beds: twin || big ? '2 single beds' : 'King bed',
      rate: twin ? 4500 : 5000, status: 'Ready', stay: '', updated: '', by: '' };
  }),
  items: [
    { item: 'Water bottle', price: 20, track: 'Yes', stock: 0, low: 24, active: 'Yes', sell: 'Yes' },
    { item: 'Dental kit', price: 150, track: 'Yes', stock: 0, low: 10, active: 'Yes', sell: 'Yes' },
    { item: 'Extra mattress', price: 500, track: 'No', stock: 0, low: 0, active: 'Yes', sell: 'Yes' },
    { item: 'Late checkout', price: 1500, track: 'No', stock: 0, low: 0, active: 'Yes', sell: 'Yes' },
    { item: 'Morning kit (free)', price: 0, track: 'Yes', stock: 0, low: 20, active: 'Yes', sell: 'No' },
    { item: 'Toilet roll', price: 0, track: 'Yes', stock: 0, low: 20, active: 'Yes', sell: 'No' }
  ],
  staff: [
    { name: 'Owner', pin: '1111', role: 'Owner', active: 'Yes' },
    { name: 'Reception', pin: '2222', role: 'Receptionist', active: 'Yes' }
  ]
};

function deskCore(db, hooks) {
  hooks = hooks || {};
  var METHODS = ['Cash', 'UPI', 'Bank transfer', 'Card'];
  var FROM_ADV = 'From advance'; // internal: moves a booking advance onto a room bill at check-in (not new money)
  var ROLES = ['Owner', 'Manager', 'Receptionist', 'Staff'];

  function fail(code) { throw new Error(code); }
  function ist(ms) { return new Date((ms == null ? Date.now() : ms) + DESK_TZ_MIN * 60000); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = ist(); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function stamp() { var d = ist(); return today() + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()); }
  function addDays(ymd, n) { var p = ymd.split('-'); var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function dayNum(ymd) { var p = String(ymd).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]) / 864e5; }
  function nightsBetween(a, b) { return Math.max(1, Math.round(dayNum(b) - dayNum(a))); }
  function isYmd(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !isNaN(dayNum(s)); }
  function id(prefix) { return prefix + Date.now().toString(36).toUpperCase().slice(-5) + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  function text(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 120); }
  function money(v) { var n = Math.round(Number(v)); return isFinite(n) && n >= 0 && n <= 10000000 ? n : NaN; }
  function yes(v) { return String(v).toLowerCase() === 'yes'; }
  function phoneOk(p) {
    var d = String(p || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.length === 12 && d.indexOf('91') === 0) d = d.slice(2);
    if (d.length === 11 && d.charAt(0) === '0') d = d.slice(1);
    if (!/^[6-9]\d{9}$/.test(d)) fail('invalid_phone');
    return d;
  }
  function find(t, key, val) { var a = db.all(t); for (var i = 0; i < a.length; i++) if (String(a[i][key]) === String(val)) return a[i]; return null; }
  function room(n) { return find('rooms', 'room', n) || fail('no_room'); }
  function stay(sid) { return find('stays', 'id', sid) || fail('no_stay'); }
  function item(name) { var it = find('items', 'item', name); if (!it || !yes(it.active)) fail('no_item'); return it; }
  function sellable(it) { return it.sell !== 'No'; }
  function roomList(str) { return String(str || '').split(/[^\d]+/).filter(Boolean).map(Number); }
  function overlaps(a1, a2, b1, b2) { return dayNum(a1) < dayNum(b2) && dayNum(b1) < dayNum(a2); }
  /* What already holds this room between `from` and `to`? (in-house stays and confirmed bookings) */
  function roomClash(roomNo, from, to, skip) {
    skip = skip || {};
    var st = db.all('stays').filter(function (x) { return x.status === 'In house' && Number(x.room) === Number(roomNo) && x.id !== skip.stay && overlaps(x.checkin, x.checkout, from, to); })[0];
    if (st) return { kind: 'stay', guest: st.guest, from: st.checkin, to: st.checkout };
    var bk = db.all('bookings').filter(function (b) { return b.status === 'Confirmed' && b.id !== skip.booking && roomList(b.rooms).indexOf(Number(roomNo)) >= 0 && overlaps(b.checkin, b.checkout, from, to); })[0];
    if (bk) return { kind: 'booking', guest: bk.guest, from: bk.checkin, to: bk.checkout, id: bk.id };
    return null;
  }
  function clashFail(roomNo, c) { var e = new Error('room_booked'); e.detail = { room: roomNo, guest: c.guest, from: c.from, to: c.to }; throw e; }
  function bookingPays(bid) { return db.all('payments').filter(function (p) { return p.booking === bid && !p.stay && p.method !== FROM_ADV && !p.voided; }); }
  function recomputeBooking(b) {
    var nights = nightsBetween(b.checkin, b.checkout), rooms = Math.max(1, Number(b.roomsNeeded || 1));
    var total = nights * rooms * Number(b.rate || 0);
    var pays = bookingPays(b.id);
    var paid = pays.filter(function (p) { return Number(p.amount) > 0; }).reduce(function (a, p) { return a + Number(p.amount); }, 0);
    var refunded = -pays.filter(function (p) { return Number(p.amount) < 0; }).reduce(function (a, p) { return a + Number(p.amount); }, 0);
    db.set('bookings', b, { nights: nights, total: total, advanceDue: Math.ceil(total * DESK_POLICY.advancePct / 100), advancePaid: paid, refunded: refunded });
  }
  function daysBefore(b) { return Math.round(dayNum(b.checkin) - dayNum(today())); }
  function bookingView(b, me) {
    var mgr = isMgr(me);
    var v = { id: b.id, status: b.status, source: b.source, guest: mgr ? b.guest : String(b.guest || '').split(/\s+/)[0], guests: b.guests, roomsNeeded: b.roomsNeeded,
      roomType: b.roomType, rooms: roomList(b.rooms), checkin: b.checkin, checkout: b.checkout, nights: b.nights, created: b.created, createdBy: b.createdBy,
      confirmedBy: b.confirmedBy, confirmedAt: b.confirmedAt, closedBy: b.closedBy, closedAt: b.closedAt, closeNote: b.closeNote, daysBefore: daysBefore(b) };
    if (mgr) {
      v.phone = b.phone; v.email = b.email; v.rate = b.rate; v.total = b.total; v.advanceDue = b.advanceDue; v.advancePaid = b.advancePaid; v.refunded = b.refunded; v.notes = b.notes;
      v.payments = bookingPays(b.id).map(function (p) { return { id: p.id, at: p.at, amount: p.amount, method: p.method, ref: p.ref, note: p.note, by: p.by }; }).reverse();
      v.refundable = b.status === 'Confirmed' && daysBefore(b) >= DESK_POLICY.freeCancelDays ? Number(b.advancePaid || 0) - Number(b.refunded || 0) : 0;
    }
    return v;
  }
  function isMgr(me) { return me.role === 'Owner' || me.role === 'Manager' || me.role === 'Receptionist'; } // front desk: sees money
  function needMgr(me) { if (!isMgr(me)) fail('not_allowed'); }
  function canApprove(me) { return me.role === 'Owner' || me.role === 'Manager'; }
  function needApprover(me) { if (!canApprove(me)) fail('not_allowed'); }
  function who(me, req) { return req && req._for ? me.name + ' (approved for ' + req._for + ')' : me.name; }
  /* Receptionists cannot change money that is already recorded: the change becomes a request a Manager or the Owner approves. */
  function gate(me, type, req, summary) {
    if (me.role !== 'Receptionist') return null;
    var reason = text(req.reason, 200);
    if (!reason) fail('reason_required');
    var payload = {};
    Object.keys(req).forEach(function (k) { if (k !== 'token' && k !== 'action' && k.charAt(0) !== '_') payload[k] = req[k]; });
    var r = db.add('requests', { id: id('R'), at: stamp(), by: me.name, type: type, summary: text(summary, 300), reason: reason, status: 'Pending',
      decidedBy: '', decidedAt: '', decisionNote: '', payload: JSON.stringify(payload) });
    return { requested: true, request: { id: r.id, summary: r.summary } };
  }
  function needOwner(me) { if (me.role !== 'Owner') fail('not_allowed'); }

  /* ---- sessions ---- */
  function auth(req) {
    var t = String(req.token || '');
    if (!t) fail('not_logged_in');
    var s = find('sessions', 'token', t);
    if (!s) fail('not_logged_in');
    if (s.expires < stamp()) fail('session_expired');
    var person = find('staff', 'name', s.name);
    if (!person || !yes(person.active) || person.role !== s.role) fail('not_logged_in');
    return { name: s.name, role: s.role };
  }

  /* ---- stock ---- */
  function moveStock(it, change, reason, roomNo, by) {
    if (!yes(it.track) || !change) return;
    var left = Number(it.stock || 0) + change;
    db.set('items', it, { stock: left });
    db.add('stocklog', { at: stamp(), item: it.item, change: change, left: left, reason: reason, room: roomNo || '', by: by });
  }

  /* ---- bills ---- */
  function chargesOf(sid) { return db.all('charges').filter(function (c) { return c.stay === sid && !c.removed; }); }
  function paymentsOf(sid) { return db.all('payments').filter(function (p) { return p.stay === sid && !p.voided; }); }
  function recompute(s) {
    var extras = chargesOf(s.id).reduce(function (a, c) { return a + (c.free === 'Yes' ? 0 : Number(c.total || 0)); }, 0);
    var paid = paymentsOf(s.id).reduce(function (a, p) { return a + Number(p.amount || 0); }, 0);
    var roomTotal = Number(s.nights || 0) * Number(s.rate || 0);
    db.set('stays', s, { roomTotal: roomTotal, extras: extras, paid: paid, balance: roomTotal + extras - paid });
  }

  function stayView(s, me) {
    var mgr = isMgr(me);
    var v = { id: s.id, room: s.room, guest: s.guest, guests: s.guests, checkin: s.checkin, checkout: s.checkout, nights: s.nights, status: s.status,
      leavesToday: s.status === 'In house' && s.checkout <= today(), inBy: s.inBy, inAt: s.inAt, outBy: s.outBy, outAt: s.outAt };
    v.charges = chargesOf(s.id).map(function (c) {
      var o = { id: c.id, at: c.at, item: c.item, qty: c.qty, free: c.free === 'Yes', note: c.note, by: c.by };
      if (mgr) { o.price = c.price; o.total = c.total; }
      return o;
    }).reverse();
    if (mgr) {
      v.phone = s.phone; v.rate = s.rate; v.rateNote = s.rateNote; v.notes = s.notes;
      v.roomTotal = s.roomTotal; v.extras = s.extras; v.paid = s.paid; v.balance = s.balance;
      v.payments = paymentsOf(s.id).map(function (p) { return { id: p.id, at: p.at, amount: p.amount, method: p.method, note: p.note, by: p.by, ref: p.ref }; }).reverse();
      v.booking = s.booking;
    } else {
      v.guest = String(s.guest || '').split(/\s+/)[0];
    }
    return v;
  }

  var api = {};

  api.login = function (req) {
    var fails = Number(db.kvGet('pin_fails') || 0);
    if (fails >= 10) fail('too_many_attempts');
    var pin = String(req.pin || '').replace(/\D/g, '');
    var person = db.all('staff').filter(function (p) { return yes(p.active) && String(p.pin) === pin && pin.length >= 4; })[0];
    if (!person) { db.kvSet('pin_fails', String(fails + 1), 900); fail('wrong_pin'); }
    if (ROLES.indexOf(person.role) < 0) fail('bad_role');
    var token = id('T') + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    var d = ist(Date.now() + 30 * 864e5);
    db.add('sessions', { token: token, name: person.name, role: person.role,
      expires: d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' 00:00' });
    return { token: token, me: { name: person.name, role: person.role } };
  };

  api.logout = function (req) {
    var s = find('sessions', 'token', req.token);
    if (s) db.set('sessions', s, { expires: '2000-01-01 00:00' });
    return {};
  };

  api.state = function (req) {
    var me = auth(req), mgr = isMgr(me), t = today();
    var stays = {};
    db.all('stays').forEach(function (s) { if (s.status === 'In house') stays[s.id] = s; });
    var arriving = {};
    db.all('bookings').forEach(function (b) {
      if (b.status === 'Confirmed' && b.checkin <= t && b.checkout > t) roomList(b.rooms).forEach(function (n) { arriving[n] = b; });
    });
    var rooms = db.all('rooms').map(function (r) {
      var o = { room: r.room, type: r.type, beds: r.beds, status: r.status, updated: r.updated, by: r.by };
      var ab = arriving[r.room];
      if (ab && !(r.stay && stays[r.stay])) o.arriving = { id: ab.id, guest: mgr ? ab.guest : String(ab.guest || '').split(/\s+/)[0], late: ab.checkin < t };
      if (mgr) o.rate = r.rate;
      var s = r.stay && stays[r.stay];
      if (s) {
        o.stay = { id: s.id, guest: mgr ? s.guest : String(s.guest || '').split(/\s+/)[0], guests: s.guests, checkin: s.checkin, checkout: s.checkout,
          leavesToday: s.checkout <= t };
        if (mgr) o.stay.balance = s.balance;
      }
      return o;
    }).sort(function (a, b) { return a.room - b.room; });
    var items = db.all('items').filter(function (i) { return yes(i.active); }).map(function (i) {
      var o = { item: i.item, track: yes(i.track), stock: i.stock, low: i.low, sell: sellable(i) };
      if (mgr) o.price = i.price;
      return o;
    });
    var bks = db.all('bookings');
    var reqs = db.all('requests');
    me.canApprove = canApprove(me);
    var out = { me: me, today: t, now: stamp(), rooms: rooms, items: items, methods: METHODS, policy: DESK_POLICY,
      approvals: canApprove(me) ? reqs.filter(function (r) { return r.status === 'Pending'; }).length : 0,
      myRequests: me.role === 'Receptionist' ? reqs.filter(function (r) { return r.status === 'Pending' && r.by === me.name; }).length : 0,
      stocklog: db.all('stocklog').slice(-15).reverse(),
      toBuy: items.filter(function (i) { return i.track && Number(i.stock) < Number(i.low); }).map(function (i) { return { item: i.item, stock: i.stock, low: i.low, buy: Math.max(1, Number(i.low) * 2 - Number(i.stock)) }; }),
      pending: bks.filter(function (b) { return b.status === 'Pending'; }).length,
      arrivals: bks.filter(function (b) { return b.status === 'Confirmed' && b.checkin <= t; }).map(function (b) { return bookingView(b, me); }) };
    if (mgr) {
      var pays = db.all('payments').filter(function (p) { return String(p.at).slice(0, 10) === t && p.method !== FROM_ADV && !p.voided; });
      var byMethod = {};
      METHODS.forEach(function (m) { byMethod[m] = 0; });
      pays.forEach(function (p) { byMethod[p.method] = (byMethod[p.method] || 0) + Number(p.amount || 0); });
      var inHouse = Object.keys(stays).map(function (k) { return stays[k]; });
      out.summary = {
        collected: pays.reduce(function (a, p) { return a + Number(p.amount || 0); }, 0), byMethod: byMethod,
        outstanding: inHouse.reduce(function (a, s) { return a + Math.max(0, Number(s.balance || 0)); }, 0),
        guests: inHouse.reduce(function (a, s) { return a + Number(s.guests || 0); }, 0)
      };
      out.recent = db.all('stays').filter(function (s) { return s.status === 'Checked out'; }).slice(-15).reverse().map(function (s) {
        return { id: s.id, room: s.room, guest: s.guest, checkin: s.checkin, checkout: s.checkout, roomTotal: s.roomTotal, extras: s.extras, paid: s.paid, balance: s.balance };
      });
    }
    return out;
  };

  api.stay = function (req) {
    var me = auth(req);
    return { stay: stayView(stay(req.id), me) };
  };

  api.checkIn = function (req) {
    var me = auth(req); needMgr(me);
    var r = room(req.room);
    if (r.status !== 'Ready') fail(r.status === 'Occupied' ? 'room_occupied' : 'room_not_clean');
    var guest = text(req.guest, 80); if (!guest) fail('name_required');
    var guests = Math.round(Number(req.guests)); if (!(guests >= 1 && guests <= 3)) fail('max_guests');
    var cin = String(req.checkin || today()), cout = String(req.checkout || '');
    if (!isYmd(cin) || !isYmd(cout)) fail('bad_dates');
    if (dayNum(cout) <= dayNum(cin)) fail('bad_dates');
    var rate = money(req.rate); if (!(rate > 0)) fail('rate_required');
    var adv = req.advance === '' || req.advance == null ? 0 : money(req.advance); if (isNaN(adv)) fail('invalid_amount');
    var clash = roomClash(r.room, cin, cout); if (clash) clashFail(r.room, clash);
    var s = db.add('stays', { id: id('S'), room: r.room, guest: guest, phone: phoneOk(req.phone), guests: guests, checkin: cin, checkout: cout,
      nights: nightsBetween(cin, cout), rate: rate, rateNote: text(req.rateNote, 160), status: 'In house', roomTotal: 0, extras: 0, paid: 0, balance: 0,
      notes: text(req.notes, 300), inBy: me.name, inAt: stamp(), outBy: '', outAt: '', booking: '' });
    if (adv > 0) {
      if (METHODS.indexOf(req.method) < 0) fail('method_required');
      db.add('payments', { id: id('P'), at: stamp(), stay: s.id, room: r.room, amount: adv, method: req.method, note: 'Paid at check-in', by: me.name, booking: '', ref: text(req.ref, 40) });
    }
    recompute(s);
    db.set('rooms', r, { status: 'Occupied', stay: s.id, updated: stamp(), by: me.name });
    return { stay: stayView(s, me) };
  };

  api.updateStay = function (req) {
    var me = auth(req); needMgr(me);
    var s = stay(req.id);
    var p = {};
    if (req.guest != null) { p.guest = text(req.guest, 80); if (!p.guest) fail('name_required'); }
    if (req.phone != null) p.phone = phoneOk(req.phone);
    if (req.guests != null) { p.guests = Math.round(Number(req.guests)); if (!(p.guests >= 1 && p.guests <= 3)) fail('max_guests'); }
    if (req.rate != null) { p.rate = money(req.rate); if (!(p.rate > 0)) fail('rate_required'); }
    if (req.rateNote != null) p.rateNote = text(req.rateNote, 160);
    if (req.notes != null) p.notes = text(req.notes, 300);
    var cin = req.checkin != null ? String(req.checkin) : s.checkin, cout = req.checkout != null ? String(req.checkout) : s.checkout;
    if (!isYmd(cin) || !isYmd(cout) || dayNum(cout) <= dayNum(cin)) fail('bad_dates');
    p.checkin = cin; p.checkout = cout; p.nights = nightsBetween(cin, cout);
    if (p.rate != null && Number(p.rate) !== Number(s.rate)) {
      var g0 = gate(me, 'updateStay', req, 'Room ' + s.room + ' · ' + s.guest + ': change rate from ₹' + s.rate + ' to ₹' + p.rate + ' per night');
      if (g0) return g0;
    }
    var targetRoom = req.room != null ? Number(req.room) : Number(s.room);
    if (s.status === 'In house') { var cl = roomClash(targetRoom, cin, cout, { stay: s.id, booking: s.booking }); if (cl) clashFail(targetRoom, cl); }
    if (req.room != null && Number(req.room) !== Number(s.room)) {
      if (s.status !== 'In house') fail('not_in_house');
      var to = room(req.room); if (to.status !== 'Ready') fail(to.status === 'Occupied' ? 'room_occupied' : 'room_not_clean');
      var from = room(s.room);
      db.set('rooms', from, { status: 'Needs cleaning', stay: '', updated: stamp(), by: me.name });
      db.set('rooms', to, { status: 'Occupied', stay: s.id, updated: stamp(), by: me.name });
      p.room = to.room;
      p.notes = text((p.notes != null ? p.notes : s.notes) + ' · Moved from room ' + from.room + ' on ' + today(), 300);
    }
    db.set('stays', s, p);
    recompute(s);
    return { stay: stayView(s, me) };
  };

  api.charge = function (req) {
    var me = auth(req), mgr = isMgr(me);
    var r = room(req.room);
    if (r.status !== 'Occupied' || !r.stay) fail('room_not_occupied');
    var s = stay(r.stay), it = item(req.item);
    if (!sellable(it)) fail('no_item');
    var qty = Math.round(Number(req.qty || 1)); if (!(qty >= 1 && qty <= 50)) fail('bad_qty');
    var free = !!req.free;
    var price = Number(it.price || 0);
    if (mgr && req.price != null && req.price !== '') { price = money(req.price); if (isNaN(price)) fail('invalid_amount'); }
    var note = text(req.note, 120);
    if (mgr && price !== Number(it.price) && !free) note = text((note ? note + ' · ' : '') + 'Price changed from ₹' + it.price, 160);
    var c = db.add('charges', { id: id('C'), at: stamp(), stay: s.id, room: r.room, item: it.item, qty: qty, price: free ? 0 : price,
      total: free ? 0 : price * qty, free: free ? 'Yes' : 'No', note: note, by: me.name, removed: '' });
    moveStock(it, -qty, free ? 'Free to room' : 'Charged to room', r.room, me.name);
    recompute(s);
    return { added: { item: it.item, qty: qty, room: r.room, free: free, total: mgr ? c.total : undefined }, stock: yes(it.track) ? it.stock : null };
  };

  api.editCharge = function (req) {
    var me = auth(req); needMgr(me);
    var c = find('charges', 'id', req.id) || fail('no_charge');
    if (c.removed) fail('no_charge');
    var s = stay(c.stay), it = find('items', 'item', c.item);
    var back = req.remove && req.refundAmount ? money(req.refundAmount) : 0;
    if (isNaN(back)) fail('invalid_amount');
    if (back > 0) {
      if (back > Number(s.paid || 0)) fail('refund_too_much');
      if (METHODS.indexOf(req.method) < 0) fail('method_required');
      if ((req.method === 'UPI' || req.method === 'Bank transfer') && !text(req.ref, 40)) fail('ref_required');
    }
    var g = gate(me, 'editCharge', req, 'Room ' + c.room + ' · ' + c.item + ' × ' + c.qty + ' (₹' + c.total + '): ' +
      (req.remove ? 'remove from the bill' + (back > 0 ? ' and refund ₹' + back + ' by ' + req.method : '') : 'change to ' + req.qty + ' × ₹' + (req.free ? 0 : req.price) + (req.free ? ' (free)' : '')));
    if (g) return g;
    if (req.remove) {
      db.set('charges', c, { removed: 'Removed by ' + who(me, req) + ' ' + stamp() + (req.reason ? ' · ' + text(req.reason, 120) : '') });
      if (it) moveStock(it, Number(c.qty), 'Charge removed', c.room, me.name);
      if (back > 0) db.add('payments', { id: id('P'), at: stamp(), stay: s.id, room: s.room, amount: -back, method: req.method, note: 'Refund: ' + c.item + ' removed' + (req.reason ? ' · ' + text(req.reason, 100) : ''),
        by: who(me, req), booking: s.booking || '', ref: text(req.ref, 40), voided: '' });
    } else {
      var qty = Math.round(Number(req.qty)); if (!(qty >= 1 && qty <= 50)) fail('bad_qty');
      var free = !!req.free;
      var price = free ? 0 : money(req.price); if (isNaN(price)) fail('invalid_amount');
      if (it && qty !== Number(c.qty)) moveStock(it, Number(c.qty) - qty, 'Charge corrected', c.room, me.name);
      db.set('charges', c, { qty: qty, price: price, total: price * qty, free: free ? 'Yes' : 'No',
        note: text((c.note ? c.note + ' · ' : '') + 'Edited by ' + who(me, req) + (req.reason ? ': ' + text(req.reason, 80) : ''), 200) });
    }
    recompute(s);
    return { stay: stayView(s, me) };
  };

  api.pay = function (req) {
    var me = auth(req); needMgr(me);
    var s = stay(req.id);
    var amt = money(req.amount); if (!(amt > 0)) fail('invalid_amount');
    if (METHODS.indexOf(req.method) < 0) fail('method_required');
    db.add('payments', { id: id('P'), at: stamp(), stay: s.id, room: s.room, amount: amt, method: req.method, note: text(req.note, 120), by: me.name, booking: s.booking || '', ref: text(req.ref, 40) });
    recompute(s);
    return { stay: stayView(s, me) };
  };

  /* Give money back to a guest from a room bill (overpaid, item cancelled, …). Receptionists: needs approval. */
  api.refund = function (req) {
    var me = auth(req); needMgr(me);
    var s = stay(req.id);
    var amt = money(req.amount); if (!(amt > 0)) fail('invalid_amount');
    if (amt > Number(s.paid || 0)) fail('refund_too_much');
    if (METHODS.indexOf(req.method) < 0) fail('method_required');
    var ref = text(req.ref, 40);
    if ((req.method === 'UPI' || req.method === 'Bank transfer') && !ref) fail('ref_required');
    if (!text(req.reason, 200)) fail('reason_required');
    var g = gate(me, 'refund', req, 'Room ' + s.room + ' · ' + s.guest + ': refund ₹' + amt + ' by ' + req.method + (ref ? ' (' + ref + ')' : ''));
    if (g) return g;
    db.add('payments', { id: id('P'), at: stamp(), stay: s.id, room: s.room, amount: -amt, method: req.method, note: 'Refund: ' + text(req.reason, 120), by: who(me, req), booking: s.booking || '', ref: ref, voided: '' });
    recompute(s);
    return { stay: stayView(s, me) };
  };

  /* Cancel a payment that was entered by mistake (wrong amount, entered twice). It stays visible in the sheet as voided. */
  api.voidPayment = function (req) {
    var me = auth(req); needMgr(me);
    var p = find('payments', 'id', req.id) || fail('no_payment');
    if (p.voided || p.method === FROM_ADV) fail('no_payment');
    if (!text(req.reason, 200)) fail('reason_required');
    var g = gate(me, 'voidPayment', req, (p.stay ? 'Room ' + p.room : 'Booking ' + p.booking) + ': cancel ' + (Number(p.amount) < 0 ? 'refund' : 'payment') + ' of ₹' + Math.abs(p.amount) + ' (' + p.method + (p.ref ? ' ' + p.ref : '') + ', ' + p.at + ', by ' + p.by + ')');
    if (g) return g;
    db.set('payments', p, { voided: 'Voided by ' + who(me, req) + ' ' + stamp() + ': ' + text(req.reason, 120) });
    if (p.stay) { var s = stay(p.stay); recompute(s); return { stay: stayView(s, me) }; }
    var b = find('bookings', 'id', p.booking); if (b) { recomputeBooking(b); return { booking: bookingView(b, me) }; }
    return {};
  };

  api.checkOut = function (req) {
    var me = auth(req); needMgr(me);
    var s = stay(req.id);
    if (s.status !== 'In house') fail('not_in_house');
    var nights = Math.round(Number(req.nights)); if (!(nights >= 1 && nights <= 365)) fail('bad_nights');
    if (me.role === 'Receptionist' && nights < Math.max(1, Math.round(dayNum(today()) - dayNum(s.checkin)))) fail('ask_manager_nights');
    db.set('stays', s, { nights: nights, checkout: addDays(s.checkin, nights), status: 'Checked out', outBy: me.name, outAt: stamp() });
    recompute(s);
    var r = find('rooms', 'room', s.room);
    if (r && r.stay === s.id) db.set('rooms', r, { status: 'Needs cleaning', stay: '', updated: stamp(), by: me.name });
    var member = null;
    if (hooks.onCheckout && s.phone) {
      try { member = hooks.onCheckout({ id: s.id, phone: s.phone, guest: s.guest, room: s.room, nights: nights, roomTotal: Number(s.roomTotal || 0), checkin: s.checkin, checkout: s.checkout }); } catch (e) { member = null; }
    }
    return { stay: stayView(s, me), member: member };
  };

  api.roomStatus = function (req) {
    var me = auth(req), r = room(req.room);
    if (req.status === 'Ready') { if (r.status !== 'Needs cleaning') fail('bad_status'); }
    else if (req.status === 'Needs cleaning') { if (r.status !== 'Ready') fail('bad_status'); }
    else fail('bad_status');
    db.set('rooms', r, { status: req.status, updated: stamp(), by: me.name });
    return {};
  };

  api.stock = function (req) {
    var me = auth(req), it = item(req.item);
    if (!yes(it.track)) fail('not_tracked');
    var qty = Math.round(Number(req.qty));
    if (req.mode === 'add') { needMgr(me); if (!(qty >= 1 && qty <= 100000)) fail('bad_qty'); moveStock(it, qty, text(req.note, 80) || 'Stock added', '', me.name); }
    else if (req.mode === 'take') { if (!(qty >= 1 && qty <= 500)) fail('bad_qty'); moveStock(it, -qty, text(req.note, 80) || 'Taken out', text(req.room, 10), me.name); }
    else if (req.mode === 'count') { needMgr(me); if (!(qty >= 0 && qty <= 100000)) fail('bad_qty'); var diff = qty - Number(it.stock || 0);
      if (diff) moveStock(it, diff, 'Counted: ' + qty, '', me.name); }
    else fail('bad_mode');
    return { stock: it.stock };
  };

  api.team = function (req) {
    var me = auth(req); needOwner(me);
    return { team: db.all('staff').map(function (p) { return { name: p.name, pin: p.pin, role: p.role, active: yes(p.active) }; }) };
  };

  api.teamSave = function (req) {
    var me = auth(req); needOwner(me);
    var name = text(req.name, 40); if (!name) fail('name_required');
    var pin = String(req.pin || '').replace(/\D/g, '');
    if (!/^\d{4,6}$/.test(pin)) fail('bad_pin');
    if (ROLES.indexOf(req.role) < 0) fail('bad_role');
    var old = req.original ? find('staff', 'name', req.original) : null;
    if (!old && find('staff', 'name', name)) fail('name_taken');
    if (old && name !== old.name && find('staff', 'name', name)) fail('name_taken');
    var clash = db.all('staff').filter(function (p) { return String(p.pin) === pin && p !== old && yes(p.active); })[0];
    if (clash) fail('pin_taken');
    var active = req.active === false ? 'No' : 'Yes';
    if (old && old.role === 'Owner' && (req.role !== 'Owner' || active === 'No')) {
      var owners = db.all('staff').filter(function (p) { return p.role === 'Owner' && yes(p.active); });
      if (owners.length < 2) fail('last_owner');
    }
    if (old) {
      db.set('staff', old, { name: name, pin: pin, role: req.role, active: active });
      if (name !== req.original || active === 'No' || req.role !== old.role) {
        db.all('sessions').forEach(function (s) { if (s.name === req.original) db.set('sessions', s, { expires: '2000-01-01 00:00' }); });
      }
    } else db.add('staff', { name: name, pin: pin, role: req.role, active: active });
    return api.team(req);
  };

  api.itemSave = function (req) {
    var me = auth(req); needOwner(me);
    var name = text(req.item, 40); if (!name) fail('name_required');
    var price = money(req.price); if (isNaN(price)) fail('invalid_amount');
    var low = Math.max(0, Math.round(Number(req.low || 0)));
    var old = req.original ? find('items', 'item', req.original) : null;
    if (!old && find('items', 'item', name)) fail('name_taken');
    var p = { item: name, price: price, track: req.track ? 'Yes' : 'No', low: low, active: req.active === false ? 'No' : 'Yes', sell: req.sell === false ? 'No' : 'Yes' };
    if (old) db.set('items', old, p); else { p.stock = 0; db.add('items', p); }
    return {};
  };

  /* ================= Bookings ================= */
  function bookingInput(req, b) {
    var p = {};
    var guest = text(req.guest != null ? req.guest : b && b.guest, 80); if (!guest) fail('name_required'); p.guest = guest;
    p.phone = phoneOk(req.phone != null ? req.phone : b && b.phone); if (!p.phone) fail('phone_required');
    p.email = text(req.email != null ? req.email : b && b.email, 80);
    p.guests = Math.round(Number(req.guests != null ? req.guests : b && b.guests)); if (!(p.guests >= 1 && p.guests <= 33)) fail('bad_guests');
    var minRooms = Math.ceil(p.guests / 3);
    p.roomsNeeded = Math.round(Number(req.roomsNeeded != null ? req.roomsNeeded : b ? b.roomsNeeded : minRooms)) || minRooms;
    if (p.roomsNeeded < minRooms) p.roomsNeeded = minRooms;
    if (p.roomsNeeded > 11) fail('max_guests');
    p.roomType = text(req.roomType != null ? req.roomType : b && b.roomType, 40) || 'Any';
    p.checkin = String(req.checkin != null ? req.checkin : b && b.checkin); p.checkout = String(req.checkout != null ? req.checkout : b && b.checkout);
    if (!isYmd(p.checkin) || !isYmd(p.checkout) || dayNum(p.checkout) <= dayNum(p.checkin)) fail('bad_dates');
    if (dayNum(p.checkout) - dayNum(p.checkin) > 60) fail('bad_dates');
    var rate = req.rate != null && req.rate !== '' ? money(req.rate) : b ? Number(b.rate) : NaN;
    if (isNaN(rate) || rate <= 0) rate = /twin/i.test(p.roomType) ? 4500 : 5000;
    p.rate = rate;
    p.notes = text(req.notes != null ? req.notes : b && b.notes, 400);
    return p;
  }

  /* Public: the website's Advance Booking Form sends this (no login). Lands as Pending; never blocks rooms. */
  api.bookingRequest = function (req) {
    var n = Number(db.kvGet('web_bookings') || 0);
    if (n >= 30) fail('too_many_requests');
    db.kvSet('web_bookings', String(n + 1), 3600);
    var p = bookingInput({ guest: req.guest, phone: req.phone, email: req.email, guests: req.guests, roomsNeeded: req.roomsNeeded, roomType: req.roomType,
      checkin: req.checkin, checkout: req.checkout, notes: req.notes, rate: req._internal ? req.rate : null });
    if (dayNum(p.checkin) < dayNum(today()) || dayNum(p.checkin) > dayNum(today()) + 400) fail('bad_dates');
    var dup = db.all('bookings').filter(function (b) { return b.status === 'Pending' && b.phone === p.phone && b.checkin === p.checkin && b.checkout === p.checkout; })[0];
    if (dup) return { id: dup.id, duplicate: true };
    var b = db.add('bookings', Object.assign(p, { id: id('B'), status: 'Pending', source: req._internal && req.source ? text(req.source, 30) : 'Website', rooms: '', nights: 0, total: 0, advanceDue: 0, advancePaid: 0, refunded: 0,
      created: stamp(), createdBy: req._internal && req.source ? text(req.source, 30) : 'Website form', confirmedBy: '', confirmedAt: '', closedBy: '', closedAt: '', closeNote: '' }));
    recomputeBooking(b);
    return { id: b.id };
  };

  api.bookings = function (req) {
    var me = auth(req), t = today();
    var all = db.all('bookings').slice().reverse();
    var open = all.filter(function (b) { return b.status === 'Pending' || b.status === 'Confirmed'; })
      .sort(function (a, b) { return a.status === b.status ? (a.checkin < b.checkin ? -1 : 1) : a.status === 'Pending' ? -1 : 1; });
    var closed = all.filter(function (b) { return b.status !== 'Pending' && b.status !== 'Confirmed'; }).slice(0, 25);
    void t;
    return { open: open.map(function (b) { return bookingView(b, me); }), closed: closed.map(function (b) { return bookingView(b, me); }) };
  };

  api.booking = function (req) {
    var me = auth(req);
    return { booking: bookingView(find('bookings', 'id', req.id) || fail('no_booking'), me) };
  };

  api.bookingCreate = function (req) {
    var me = auth(req); needMgr(me);
    var p = bookingInput(req);
    if (dayNum(p.checkin) < dayNum(today()) - 1) fail('bad_dates');
    var src = ['Phone', 'WhatsApp', 'Walk-in', 'Website', 'Other'].indexOf(req.source) >= 0 ? req.source : 'Phone';
    var b = db.add('bookings', Object.assign(p, { id: id('B'), status: 'Pending', source: src, rooms: '', nights: 0, total: 0, advanceDue: 0, advancePaid: 0, refunded: 0,
      created: stamp(), createdBy: me.name, confirmedBy: '', confirmedAt: '', closedBy: '', closedAt: '', closeNote: '' }));
    recomputeBooking(b);
    return { booking: bookingView(b, me) };
  };

  api.bookingUpdate = function (req) {
    var me = auth(req); needMgr(me);
    var b = find('bookings', 'id', req.id) || fail('no_booking');
    if (b.status !== 'Pending' && b.status !== 'Confirmed') fail('booking_closed');
    var p = bookingInput(req, b);
    if (b.status === 'Confirmed' && Number(p.rate) !== Number(b.rate)) {
      var g0 = gate(me, 'bookingUpdate', req, 'Booking ' + b.id + ' · ' + b.guest + ': change rate from ₹' + b.rate + ' to ₹' + p.rate + ' per room per night');
      if (g0) return g0;
    }
    if (b.status === 'Confirmed') {
      var rooms = req.rooms != null ? req.rooms.map(Number) : roomList(b.rooms);
      if (!rooms.length) fail('pick_rooms');
      rooms.forEach(function (n) { room(n); var c = roomClash(n, p.checkin, p.checkout, { booking: b.id }); if (c) clashFail(n, c); });
      p.rooms = rooms.join(', '); p.roomsNeeded = rooms.length;
      if (rooms.length * 3 < p.guests) fail('max_guests');
    }
    db.set('bookings', b, p);
    recomputeBooking(b);
    return { booking: bookingView(b, me) };
  };

  /* Reception confirms ONLY after money is received: amount, method and reference are recorded with their name. */
  api.bookingConfirm = function (req) {
    var me = auth(req); needMgr(me);
    var b = find('bookings', 'id', req.id) || fail('no_booking');
    if (b.status !== 'Pending') fail('booking_closed');
    var rooms = (req.rooms || []).map(Number).filter(function (n, i, a) { return n && a.indexOf(n) === i; });
    if (!rooms.length) fail('pick_rooms');
    if (rooms.length * 3 < Number(b.guests)) fail('max_guests');
    if (req.rate != null && req.rate !== '') { var rt = money(req.rate); if (!(rt > 0)) fail('rate_required'); db.set('bookings', b, { rate: rt }); }
    rooms.forEach(function (n) { room(n); var c = roomClash(n, b.checkin, b.checkout, { booking: b.id }); if (c) clashFail(n, c); });
    var amt = money(req.amount); if (!(amt > 0)) fail('advance_required');
    if (METHODS.indexOf(req.method) < 0) fail('method_required');
    var ref = text(req.ref, 40);
    if ((req.method === 'UPI' || req.method === 'Bank transfer') && !ref) fail('ref_required');
    db.set('bookings', b, { rooms: rooms.join(', '), roomsNeeded: rooms.length, status: 'Confirmed', confirmedBy: me.name, confirmedAt: stamp() });
    db.add('payments', { id: id('P'), at: stamp(), stay: '', room: rooms.join(', '), amount: amt, method: req.method, note: 'Booking advance', by: me.name, booking: b.id, ref: ref });
    recomputeBooking(b);
    return { booking: bookingView(b, me) };
  };

  api.bookingPay = function (req) {
    var me = auth(req); needMgr(me);
    var b = find('bookings', 'id', req.id) || fail('no_booking');
    if (b.status !== 'Confirmed') fail('booking_closed');
    var amt = money(req.amount); if (!(amt > 0)) fail('invalid_amount');
    if (METHODS.indexOf(req.method) < 0) fail('method_required');
    var ref = text(req.ref, 40);
    if ((req.method === 'UPI' || req.method === 'Bank transfer') && !ref) fail('ref_required');
    db.add('payments', { id: id('P'), at: stamp(), stay: '', room: b.rooms, amount: amt, method: req.method, note: text(req.note, 120) || 'Booking payment', by: me.name, booking: b.id, ref: ref });
    recomputeBooking(b);
    return { booking: bookingView(b, me) };
  };

  /* Cancellation policy: 3+ days before check-in = full advance refunded; later, same day or no-show = nothing back.
     Only the Owner may give back a different amount (recorded with a note). */
  api.bookingCancel = function (req) {
    var me = auth(req); needMgr(me);
    var b = find('bookings', 'id', req.id) || fail('no_booking');
    if (b.status !== 'Pending' && b.status !== 'Confirmed') fail('booking_closed');
    var reason = text(req.reason, 160);
    var policyRefund = b.status === 'Confirmed' && daysBefore(b) >= DESK_POLICY.freeCancelDays ? Number(b.advancePaid || 0) - Number(b.refunded || 0) : 0;
    if (req._approvedReq && req.policyRefund != null) policyRefund = Number(req.policyRefund); // policy as on the day reception asked
    var refund = policyRefund;
    if (b.status === 'Confirmed' && me.role === 'Receptionist') {
      if (req.refund != null && req.refund !== '' && Number(req.refund) !== policyRefund) fail('not_allowed');
      req.policyRefund = policyRefund;
      var g = gate(me, 'bookingCancel', req, 'Booking ' + b.id + ' · ' + b.guest + ': cancel (' + daysBefore(b) + ' days before check-in) · ' + (policyRefund > 0 ? 'refund ₹' + policyRefund + ' by ' + req.method : 'no refund, ₹' + (Number(b.advancePaid || 0) - Number(b.refunded || 0)) + ' kept'));
      if (g) return g;
    }
    if (req.refund != null && req.refund !== '' && Number(req.refund) !== policyRefund) {
      needOwner(me);
      refund = money(req.refund); if (isNaN(refund) || refund > Number(b.advancePaid || 0)) fail('invalid_amount');
      reason = text((reason ? reason + ' · ' : '') + 'Owner changed refund from ₹' + policyRefund + ' to ₹' + refund, 200);
    }
    if (refund > 0) {
      if (METHODS.indexOf(req.method) < 0) fail('method_required');
      var ref = text(req.ref, 40);
      if ((req.method === 'UPI' || req.method === 'Bank transfer') && !ref) fail('ref_required');
      db.add('payments', { id: id('P'), at: stamp(), stay: '', room: b.rooms, amount: -refund, method: req.method, note: 'Refund on cancellation', by: who(me, req), booking: b.id, ref: ref, voided: '' });
    }
    var kept = Number(b.advancePaid || 0) - Number(b.refunded || 0) - refund;
    db.set('bookings', b, { status: 'Cancelled', closedBy: who(me, req), closedAt: stamp(),
      closeNote: text((reason ? reason + ' · ' : '') + (b.status === 'Confirmed' ? daysBefore(b) + ' days before check-in · refunded ₹' + refund + (kept > 0 ? ' · ₹' + kept + ' kept (policy)' : '') : 'Not confirmed'), 300) });
    recomputeBooking(b);
    return { booking: bookingView(b, me) };
  };

  api.bookingNoShow = function (req) {
    var me = auth(req); needMgr(me);
    var b = find('bookings', 'id', req.id) || fail('no_booking');
    if (b.status !== 'Confirmed') fail('booking_closed');
    if (b.checkin > today()) fail('not_arrival_day');
    db.set('bookings', b, { status: 'No-show', closedBy: me.name, closedAt: stamp(), closeNote: text('No-show · advance ₹' + b.advancePaid + ' kept (policy) ' + text(req.reason, 120), 300) });
    return { booking: bookingView(b, me) };
  };

  /* Guest arrives: one stay per room; the advance moves onto the room bills (split evenly). */
  api.bookingCheckIn = function (req) {
    var me = auth(req); needMgr(me);
    var b = find('bookings', 'id', req.id) || fail('no_booking');
    if (b.status !== 'Confirmed') fail('booking_closed');
    if (b.checkin > today()) fail('too_early');
    var rooms = roomList(b.rooms);
    rooms.forEach(function (n) { var r = room(n); if (r.status !== 'Ready') fail(r.status === 'Occupied' ? 'room_occupied' : 'room_not_clean'); });
    var cin = b.checkin < today() ? today() : b.checkin;
    if (dayNum(b.checkout) <= dayNum(cin)) fail('bad_dates');
    var left = Number(b.advancePaid || 0) - Number(b.refunded || 0), each = Math.floor(left / rooms.length), guestsLeft = Number(b.guests);
    var made = [];
    rooms.forEach(function (n, i) {
      var g = Math.min(3, Math.max(1, Math.ceil(guestsLeft / (rooms.length - i)))); guestsLeft -= g;
      var s = db.add('stays', { id: id('S'), room: n, guest: b.guest, phone: b.phone, guests: g, checkin: cin, checkout: b.checkout, nights: nightsBetween(cin, b.checkout),
        rate: b.rate, rateNote: 'Booking ' + b.id + (rooms.length > 1 ? ' · ' + rooms.length + ' rooms' : ''), status: 'In house', roomTotal: 0, extras: 0, paid: 0, balance: 0,
        notes: b.notes, inBy: me.name, inAt: stamp(), outBy: '', outAt: '', booking: b.id });
      var share = i === 0 ? left - each * (rooms.length - 1) : each;
      if (share > 0) db.add('payments', { id: id('P'), at: stamp(), stay: s.id, room: n, amount: share, method: FROM_ADV, note: 'Advance from booking ' + b.id, by: me.name, booking: b.id, ref: '' });
      recompute(s);
      db.set('rooms', room(n), { status: 'Occupied', stay: s.id, updated: stamp(), by: me.name });
      made.push(s.id);
    });
    db.set('bookings', b, { status: 'Checked in', closedBy: me.name, closedAt: stamp(), closeNote: 'Checked in to room ' + rooms.join(', ') });
    return { stays: made, booking: bookingView(b, me) };
  };

  /* Give back part or all of a booking advance without cancelling (e.g. fewer rooms needed, paid twice). */
  api.bookingRefund = function (req) {
    var me = auth(req); needMgr(me);
    var b = find('bookings', 'id', req.id) || fail('no_booking');
    if (b.status === 'Pending') fail('booking_closed');
    if (b.status === 'Checked in') fail('refund_from_room');
    var amt = money(req.amount); if (!(amt > 0)) fail('invalid_amount');
    if (amt > Number(b.advancePaid || 0) - Number(b.refunded || 0)) fail('refund_too_much');
    if (METHODS.indexOf(req.method) < 0) fail('method_required');
    var ref = text(req.ref, 40);
    if ((req.method === 'UPI' || req.method === 'Bank transfer') && !ref) fail('ref_required');
    if (!text(req.reason, 200)) fail('reason_required');
    var g = gate(me, 'bookingRefund', req, 'Booking ' + b.id + ' · ' + b.guest + ': refund ₹' + amt + ' of the advance by ' + req.method + (ref ? ' (' + ref + ')' : ''));
    if (g) return g;
    db.add('payments', { id: id('P'), at: stamp(), stay: '', room: b.rooms, amount: -amt, method: req.method, note: 'Refund: ' + text(req.reason, 120), by: who(me, req), booking: b.id, ref: ref, voided: '' });
    recomputeBooking(b);
    return { booking: bookingView(b, me) };
  };

  /* ================= Approvals ================= */
  var APPROVABLE = ['editCharge', 'refund', 'voidPayment', 'updateStay', 'bookingUpdate', 'bookingCancel', 'bookingRefund'];
  function reqView(r) { return { id: r.id, at: r.at, by: r.by, type: r.type, summary: r.summary, reason: r.reason, status: r.status, decidedBy: r.decidedBy, decidedAt: r.decidedAt, decisionNote: r.decisionNote }; }
  api.requests = function (req) {
    var me = auth(req); needMgr(me);
    var all = db.all('requests').slice().reverse();
    if (!canApprove(me)) all = all.filter(function (r) { return r.by === me.name; });
    return { pending: all.filter(function (r) { return r.status === 'Pending'; }).map(reqView),
      done: all.filter(function (r) { return r.status !== 'Pending'; }).slice(0, 30).map(reqView), canApprove: canApprove(me) };
  };
  api.requestDecide = function (req) {
    var me = auth(req); needApprover(me);
    var r = find('requests', 'id', req.id) || fail('no_request');
    if (r.status !== 'Pending') fail('request_done');
    var note = text(req.note, 200);
    if (req.approve) {
      if (APPROVABLE.indexOf(r.type) < 0) fail('unknown_action');
      var payload = JSON.parse(r.payload || '{}');
      payload.token = req.token; payload._for = r.by; payload._approvedReq = r.id;
      api[r.type](payload); // runs as the approver; errors leave the request pending
      db.set('requests', r, { status: 'Approved', decidedBy: me.name, decidedAt: stamp(), decisionNote: note });
    } else {
      db.set('requests', r, { status: 'Rejected', decidedBy: me.name, decidedAt: stamp(), decisionNote: note || 'Not approved' });
    }
    return api.requests(req);
  };

  /* Calendar: every room, what holds it on each day from `from` for `days` days. */
  api.calendar = function (req) {
    var me = auth(req), mgr = isMgr(me);
    var from = isYmd(req.from) ? req.from : today(), days = Math.min(62, Math.max(1, Math.round(Number(req.days || 31)))), to = addDays(from, days);
    function nm(g) { return mgr ? g : String(g || '').split(/\s+/)[0]; }
    var bars = [];
    db.all('stays').forEach(function (s) {
      var end = s.status === 'In house' && s.checkout <= today() ? addDays(today(), 1) : s.checkout;
      if ((s.status === 'In house' || s.status === 'Checked out') && overlaps(s.checkin, end, from, to))
        bars.push({ room: Number(s.room), kind: s.status === 'In house' ? 'stay' : 'past', id: s.id, guest: nm(s.guest), guests: s.guests, from: s.checkin, to: end });
    });
    db.all('bookings').forEach(function (b) {
      if (b.status === 'Confirmed' && overlaps(b.checkin, b.checkout, from, to))
        roomList(b.rooms).forEach(function (n) { bars.push({ room: n, kind: 'booked', id: b.id, guest: nm(b.guest), guests: b.guests, from: b.checkin, to: b.checkout }); });
    });
    var pending = db.all('bookings').filter(function (b) { return b.status === 'Pending' && overlaps(b.checkin, b.checkout, from, to); }).map(function (b) { return bookingView(b, me); });
    var rooms = db.all('rooms').map(function (r) { return { room: r.room, type: r.type, beds: r.beds, status: r.status }; }).sort(function (a, b) { return a.room - b.room; });
    return { from: from, days: days, today: today(), rooms: rooms, bars: bars, pending: pending };
  };

  return api;
}
