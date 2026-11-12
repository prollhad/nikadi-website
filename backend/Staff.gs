/**
 * Nikadi Guest House — Staff app backend (rooms, bills, stock, cleaning)
 * GENERATED from staff/logic.js + staff/backend-adapter.gs.txt by tools/build-staff.py. Do not edit by hand.
 * Add this as a second file (Staff.gs) next to Code.gs in the same Apps Script project.
 */

/* Nikadi Staff — shared business logic.
   The same file runs in two places:
     1. In the browser, for demo mode (data kept on this phone only).
     2. In Google Apps Script, where tools/build-staff.py copies it into backend/Staff.gs.
   It never touches a sheet or the browser directly: it only uses the small `db` object it is given. */

var DESK_TZ_MIN = 330; // India Standard Time, UTC+5:30 (no daylight saving)

var DESK_SCHEMA = {
  rooms: { sheet: 'Rooms', cols: [['room', 'Room', 'n'], ['type', 'Room type'], ['beds', 'Beds'], ['rate', 'Usual rate per night (₹)', 'n'],
    ['status', 'Status'], ['stay', 'Current stay ID'], ['updated', 'Updated', 't'], ['by', 'Updated by']] },
  stays: { sheet: 'Stays', cols: [['id', 'Stay ID'], ['room', 'Room', 'n'], ['guest', 'Guest name'], ['phone', 'Phone', 's'], ['guests', 'Guests', 'n'],
    ['checkin', 'Check-in date', 'd'], ['checkout', 'Check-out date', 'd'], ['nights', 'Nights', 'n'], ['rate', 'Agreed rate per night (₹)', 'n'],
    ['rateNote', 'Rate note'], ['status', 'Status'], ['roomTotal', 'Room total (₹)', 'n'], ['extras', 'Extras (₹)', 'n'], ['paid', 'Paid (₹)', 'n'],
    ['balance', 'Balance (₹)', 'n'], ['notes', 'Notes'], ['inBy', 'Checked in by'], ['inAt', 'Checked in at', 't'], ['outBy', 'Checked out by'], ['outAt', 'Checked out at', 't']] },
  charges: { sheet: 'Room charges', cols: [['id', 'ID'], ['at', 'Date', 't'], ['stay', 'Stay ID'], ['room', 'Room', 'n'], ['item', 'Item'], ['qty', 'Qty', 'n'],
    ['price', 'Unit price (₹)', 'n'], ['total', 'Total (₹)', 'n'], ['free', 'Free'], ['note', 'Note'], ['by', 'Added by'], ['removed', 'Removed']] },
  payments: { sheet: 'Payments', cols: [['id', 'ID'], ['at', 'Date', 't'], ['stay', 'Stay ID'], ['room', 'Room', 'n'], ['amount', 'Amount (₹)', 'n'],
    ['method', 'Method'], ['note', 'Note'], ['by', 'Taken by']] },
  items: { sheet: 'Items', cols: [['item', 'Item'], ['price', 'Price (₹)', 'n'], ['track', 'Track stock'], ['stock', 'In stock', 'n'], ['low', 'Warn below', 'n'], ['active', 'Active']] },
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
    { item: 'Water bottle', price: 20, track: 'Yes', stock: 0, low: 24, active: 'Yes' },
    { item: 'Dental kit', price: 150, track: 'Yes', stock: 0, low: 10, active: 'Yes' },
    { item: 'Extra mattress', price: 500, track: 'No', stock: 0, low: 0, active: 'Yes' },
    { item: 'Late checkout', price: 1500, track: 'No', stock: 0, low: 0, active: 'Yes' }
  ],
  staff: [
    { name: 'Owner', pin: '1111', role: 'Owner', active: 'Yes' },
    { name: 'Reception', pin: '2222', role: 'Manager', active: 'Yes' }
  ]
};

function deskCore(db) {
  var METHODS = ['Cash', 'UPI', 'Card'];
  var ROLES = ['Owner', 'Manager', 'Staff'];

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
  function isMgr(me) { return me.role === 'Owner' || me.role === 'Manager'; }
  function needMgr(me) { if (!isMgr(me)) fail('not_allowed'); }
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
  function paymentsOf(sid) { return db.all('payments').filter(function (p) { return p.stay === sid; }); }
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
      v.payments = paymentsOf(s.id).map(function (p) { return { id: p.id, at: p.at, amount: p.amount, method: p.method, note: p.note, by: p.by }; }).reverse();
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
    var rooms = db.all('rooms').map(function (r) {
      var o = { room: r.room, type: r.type, beds: r.beds, status: r.status, updated: r.updated, by: r.by };
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
      var o = { item: i.item, track: yes(i.track), stock: i.stock, low: i.low };
      if (mgr) o.price = i.price;
      return o;
    });
    var out = { me: me, today: t, now: stamp(), rooms: rooms, items: items, methods: METHODS,
      stocklog: db.all('stocklog').slice(-15).reverse() };
    if (mgr) {
      var pays = db.all('payments').filter(function (p) { return String(p.at).slice(0, 10) === t; });
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
    var s = db.add('stays', { id: id('S'), room: r.room, guest: guest, phone: phoneOk(req.phone), guests: guests, checkin: cin, checkout: cout,
      nights: nightsBetween(cin, cout), rate: rate, rateNote: text(req.rateNote, 160), status: 'In house', roomTotal: 0, extras: 0, paid: 0, balance: 0,
      notes: text(req.notes, 300), inBy: me.name, inAt: stamp(), outBy: '', outAt: '' });
    if (adv > 0) {
      if (METHODS.indexOf(req.method) < 0) fail('method_required');
      db.add('payments', { id: id('P'), at: stamp(), stay: s.id, room: r.room, amount: adv, method: req.method, note: 'Advance at check-in', by: me.name });
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
    if (req.remove) {
      db.set('charges', c, { removed: 'Removed by ' + me.name + ' ' + stamp() });
      if (it) moveStock(it, Number(c.qty), 'Charge removed', c.room, me.name);
    } else {
      var qty = Math.round(Number(req.qty)); if (!(qty >= 1 && qty <= 50)) fail('bad_qty');
      var free = !!req.free;
      var price = free ? 0 : money(req.price); if (isNaN(price)) fail('invalid_amount');
      if (it && qty !== Number(c.qty)) moveStock(it, Number(c.qty) - qty, 'Charge corrected', c.room, me.name);
      db.set('charges', c, { qty: qty, price: price, total: price * qty, free: free ? 'Yes' : 'No',
        note: text((c.note ? c.note + ' · ' : '') + 'Edited by ' + me.name, 160) });
    }
    recompute(s);
    return { stay: stayView(s, me) };
  };

  api.pay = function (req) {
    var me = auth(req); needMgr(me);
    var s = stay(req.id);
    var amt = money(req.amount); if (!(amt > 0)) fail('invalid_amount');
    if (METHODS.indexOf(req.method) < 0) fail('method_required');
    db.add('payments', { id: id('P'), at: stamp(), stay: s.id, room: s.room, amount: amt, method: req.method, note: text(req.note, 120), by: me.name });
    recompute(s);
    return { stay: stayView(s, me) };
  };

  api.checkOut = function (req) {
    var me = auth(req); needMgr(me);
    var s = stay(req.id);
    if (s.status !== 'In house') fail('not_in_house');
    var nights = Math.round(Number(req.nights)); if (!(nights >= 1 && nights <= 365)) fail('bad_nights');
    db.set('stays', s, { nights: nights, checkout: addDays(s.checkin, nights), status: 'Checked out', outBy: me.name, outAt: stamp() });
    recompute(s);
    var r = find('rooms', 'room', s.room);
    if (r && r.stay === s.id) db.set('rooms', r, { status: 'Needs cleaning', stay: '', updated: stamp(), by: me.name });
    return { stay: stayView(s, me) };
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
    var p = { item: name, price: price, track: req.track ? 'Yes' : 'No', low: low, active: req.active === false ? 'No' : 'Yes' };
    if (old) db.set('items', old, p); else { p.stock = 0; db.add('items', p); }
    return {};
  };

  return api;
}

/* ------------------------------------------------------------------ */
/* Google Sheet storage for the staff app                              */
/* ------------------------------------------------------------------ */

function deskDb_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), cache = {};
  function sh(t) { var s = ss.getSheetByName(DESK_SCHEMA[t].sheet); if (!s) throw new Error('not_setup'); return s; }
  function read(v, type) {
    if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Kolkata', type === 'd' ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm');
    if (type === 'n') return v === '' || v == null ? 0 : Number(v);
    return v == null ? '' : String(v);
  }
  function colIndex(t, key) {
    var c = DESK_SCHEMA[t].cols;
    for (var j = 0; j < c.length; j++) if (c[j][0] === key) return j;
    return -1;
  }
  return {
    all: function (t) {
      if (cache[t]) return cache[t];
      var s = sh(t), c = DESK_SCHEMA[t].cols, n = s.getLastRow(), out = [];
      if (n > 1) s.getRange(2, 1, n - 1, c.length).getValues().forEach(function (r, i) {
        var o = { _r: i + 2 };
        c.forEach(function (col, j) { o[col[0]] = read(r[j], col[2]); });
        out.push(o);
      });
      cache[t] = out;
      return out;
    },
    add: function (t, o) {
      var s = sh(t), c = DESK_SCHEMA[t].cols;
      this.all(t);
      s.appendRow(c.map(function (col) { var v = o[col[0]]; return v === undefined ? '' : v; }));
      o._r = s.getLastRow();
      cache[t].push(o);
      return o;
    },
    set: function (t, o, patch) {
      var s = sh(t);
      Object.keys(patch).forEach(function (k) {
        var j = colIndex(t, k); if (j < 0) return;
        o[k] = patch[k];
        s.getRange(o._r, j + 1).setValue(patch[k]);
      });
    },
    kvGet: function (k) { return CacheService.getScriptCache().get('desk_' + k); },
    kvSet: function (k, v, sec) { CacheService.getScriptCache().put('desk_' + k, String(v), sec || 600); }
  };
}

/** Called by doPost in Code.gs for every action that starts with "desk". */
function deskHandle_(req) {
  var name = String(req.action).slice(4);
  name = name.charAt(0).toLowerCase() + name.slice(1);
  var api = deskCore(deskDb_());
  if (!api.hasOwnProperty(name)) throw new Error('unknown_action');
  return api[name](req);
}

/** Creates the staff app tabs. Called from setup() in Code.gs; safe to run again. */
function deskSetup_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Asia/Kolkata');
  Object.keys(DESK_SCHEMA).forEach(function (t) {
    var def = DESK_SCHEMA[t], s = ss.getSheetByName(def.sheet) || ss.insertSheet(def.sheet);
    if (s.getLastRow() === 0) {
      s.appendRow(def.cols.map(function (c) { return c[1]; }));
      s.getRange(1, 1, 1, def.cols.length).setFontWeight('bold').setBackground('#1b1714').setFontColor('#e0be7a');
      s.setFrozenRows(1);
      def.cols.forEach(function (c, j) { if (c[2] === 's') s.getRange(1, j + 1, s.getMaxRows(), 1).setNumberFormat('@'); });
      var rows = DESK_DEFAULTS[t];
      if (rows) rows.forEach(function (o) { s.appendRow(def.cols.map(function (c) { var v = o[c[0]]; return v === undefined ? '' : v; })); });
      s.autoResizeColumns(1, def.cols.length);
    }
    if (def.hidden) s.hideSheet();
  });
  return 'Staff app tabs ready';
}
