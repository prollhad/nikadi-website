/**
 * Nikadi Guest House — Staff app backend (rooms, bills, stock, cleaning)
 * GENERATED from staff/logic.js + staff/bill.js + staff/backend-adapter.gs.txt by tools/build-staff.py. Do not edit by hand.
 * Add this as a second file (Staff.gs) next to Code.gs in the same Apps Script project.
 */

/* Nikadi Staff — shared business logic.
   The same file runs in two places:
     1. In the browser, for demo mode (data kept on this phone only).
     2. In Google Apps Script, where tools/build-staff.py copies it into backend/Staff.gs.
   It never touches a sheet or the browser directly: it only uses the small `db` object it is given. */

var DESK_TZ_MIN = 330; // India Standard Time, UTC+5:30 (no daylight saving)
var DESK_FREE_WATER = 2; // free water bottles every room gets at check-in (taken from stock automatically)
var DESK_BILL_URL = 'https://www.nikadiguesthouse.com/bill/?id='; // the QR code on every bill opens this + the bill's secret id
var DESK_BILL_DELAY_HOURS = 12; // the bill is emailed automatically this long after check-out
var DESK_BILL_PREFIX = 'NGH'; // invoice numbers: NGH/26-27/0001 (restarts every financial year, 1 April)
/* Government codes for things sold to rooms. Used when the Items sheet has no code of its own.
   [HSN/SAC, GST %, unit, name printed on the bill] */
var DESK_HSN = {
  'Water bottle': ['2201', 5, 'Btl', 'Packaged drinking water (1 L)'],
  'Dental kit': ['3306', 5, 'Nos', 'Dental kit'],
  'Extra mattress': ['996311', 5, 'Nos', 'Extra mattress'],
  'Late checkout': ['996311', 5, 'Nos', 'Late check-out'],
  'Laundry': ['999712', 5, 'Pcs', 'Laundry'],
  _default: ['996311', 5, 'Nos', '']
};
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
    ['booking', 'Booking ID'], ['email', 'Email'], ['gstin', 'Guest GSTIN', 's'], ['company', 'Company / billing name'], ['bill', 'Bill no.'], ['title', 'Title (Mr./Ms./Mrs./Dr.)'], ['address', 'Guest address']] },
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
  items: { sheet: 'Items', cols: [['item', 'Item'], ['price', 'Price (₹)', 'n'], ['track', 'Track stock'], ['stock', 'In stock', 'n'], ['low', 'Warn below', 'n'], ['active', 'Active'], ['sell', 'Sold to rooms'], ['hsn', 'HSN / SAC code', 's'], ['gst', 'GST %', 'n']] },
  bills: { sheet: 'Bills', cols: [['id', 'Bill link ID', 's'], ['no', 'Invoice no.'], ['at', 'Date', 't'], ['stay', 'Stay ID'], ['room', 'Room', 'n'], ['guest', 'Guest name'],
    ['phone', 'Phone', 's'], ['email', 'Email'], ['total', 'Total (₹)', 'n'], ['by', 'Made by'], ['sent', 'Emailed'], ['data', 'Bill (system)', 's'], ['sendAt', 'Email at', 't'], ['status', 'Email status'], ['pdf', 'PDF saved'], ['edited', 'Last changed']] },
  billpdfs: { sheet: 'Bill PDFs (system)', hidden: true, cols: [['bill', 'Bill link ID', 's'], ['part', 'Part', 'n'], ['data', 'PDF (system)', 's']] },
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
    { item: 'Water bottle', price: 20, track: 'Yes', stock: 0, low: 24, active: 'Yes', sell: 'Yes', hsn: '2201', gst: 5 },
    { item: 'Dental kit', price: 30, track: 'Yes', stock: 0, low: 10, active: 'Yes', sell: 'Yes', hsn: '3306', gst: 5 },
    { item: 'Extra mattress', price: 500, track: 'No', stock: 0, low: 0, active: 'Yes', sell: 'Yes', hsn: '996311', gst: 5 },
    { item: 'Late checkout', price: 1500, track: 'No', stock: 0, low: 0, active: 'Yes', sell: 'Yes', hsn: '996311', gst: 5 },
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

  /* every room gets free water at check-in: take it out of stock (no charge) */
  function freeWater(roomNo, by) {
    var it = find('items', 'item', 'Water bottle');
    if (it && yes(it.track) && DESK_FREE_WATER > 0) moveStock(it, -DESK_FREE_WATER, 'Free at check-in (' + DESK_FREE_WATER + ' per room)', roomNo, by);
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

  /* After a checked-out stay is corrected (rate, nights, items, payments): only a Manager or the Owner may do it,
     and the change flows into member points and the bill (which is re-made; the staff app saves a fresh PDF). */
  function lockedOut(me, s) { if (s.status === 'Checked out' && !canApprove(me)) fail('bill_locked'); }
  function afterChange(s, me, rt0) {
    if (s.status !== 'Checked out') return;
    var delta = null;
    if (hooks.onStayChange && Number(rt0) !== Number(s.roomTotal)) {
      try { delta = hooks.onStayChange({ id: s.id, phone: s.phone, room: s.room, nights: Number(s.nights), checkin: s.checkin, checkout: s.checkout, roomTotal: Number(s.roomTotal), before: Number(rt0) }); } catch (e) { delta = null; }
    }
    var row = billOfStay(s.id);
    if (!row) return;
    var old = JSON.parse(row.data), mem = old.member;
    if (mem && delta && delta.points) { mem.earned = Number(mem.earned || 0) + delta.points; if (delta.balance != null) mem.balance = delta.balance; }
    if (mem) { var r0 = find('rooms', 'room', s.room); mem.saved = r0 && Number(r0.rate) > Number(s.rate) ? (Number(r0.rate) - Number(s.rate)) * Number(s.nights) : 0; }
    saveBill(s, me, mem, true);
    pdfClear(row.id); db.set('bills', row, { pdf: '' }); // the old PDF is out of date
  }

  function memberOf(phone) { if (!hooks.memberInfo || !phone) return null; try { return hooks.memberInfo(String(phone)); } catch (e) { return null; } }
  function stayView(s, me) {
    var mgr = isMgr(me);
    var v = { id: s.id, room: s.room, guest: s.guest, guests: s.guests, checkin: s.checkin, checkout: s.checkout, nights: s.nights, status: s.status,
      leavesToday: s.status === 'In house' && s.checkout <= today(), inBy: s.inBy, inAt: s.inAt, outBy: s.outBy, outAt: s.outAt };
    v.charges = chargesOf(s.id).map(function (c) {
      var o = { id: c.id, at: c.at, item: c.item, qty: c.qty, free: c.free === 'Yes', note: c.note, by: c.by };
      if (mgr) { o.price = c.price; o.total = c.total; }
      return o;
    }).reverse();
    var mem = s.status === 'In house' ? memberOf(s.phone) : null;
    if (mem) v.member = { name: mem.name, tier: mem.tier, tierKey: mem.tierKey, discount: mem.discount, onsite: mem.onsite, email: mgr ? mem.email || '' : '' };
    if (mgr) {
      v.phone = s.phone; v.rate = s.rate; v.rateNote = s.rateNote; v.notes = s.notes; v.email = s.email || ''; v.gstin = s.gstin || ''; v.company = s.company || ''; v.bill = s.bill || ''; v.title = s.title || '';
      v.roomTotal = s.roomTotal; v.extras = s.extras; v.paid = s.paid; v.balance = s.balance;
      v.payments = paymentsOf(s.id).map(function (p) { return { id: p.id, at: p.at, amount: p.amount, method: p.method, note: p.note, by: p.by, ref: p.ref }; }).reverse();
      v.booking = s.booking;
      v.advancePays = s.booking ? bookingPays(s.booking).filter(function (p) { return Number(p.amount) > 0; }).map(function (p) { return { id: p.id, at: p.at, amount: p.amount, method: p.method, ref: p.ref, note: 'Advance · booking ' + s.booking }; }) : [];
    } else {
      v.guest = String(s.guest || '').split(/\s+/)[0];
    }
    return v;
  }

  /* ---- GST bills ---- */
  function fyOf(ymd) { var y = +ymd.slice(0, 4), m = +ymd.slice(5, 7), a = m >= 4 ? y : y - 1; return String(a).slice(2) + '-' + String(a + 1).slice(2); }
  function newBillNo() {
    var pre = DESK_BILL_PREFIX + '/' + fyOf(today()) + '/', n = 0;
    db.all('bills').forEach(function (b) { if (String(b.no).indexOf(pre) === 0) n = Math.max(n, Number(String(b.no).slice(pre.length)) || 0); });
    var x = String(n + 1); while (x.length < 4) x = '0' + x;
    return pre + x;
  }
  function newBillId() {
    if (hooks.newId) return hooks.newId();
    var a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', o = '';
    for (var i = 0; i < 22; i++) o += a.charAt(Math.floor(Math.random() * a.length));
    return o;
  }
  function itemMeta(name) {
    var it = find('items', 'item', name), f = DESK_HSN[name] || DESK_HSN._default;
    return { hsn: (it && String(it.hsn || '').trim()) || f[0], gst: it && it.gst !== '' && it.gst != null && Number(it.gst) > 0 ? Number(it.gst) : f[1], unit: f[2], label: f[3] || name };
  }
  function billOfStay(sid) { var a = db.all('bills').filter(function (b) { return b.stay === sid; }); return a[a.length - 1] || null; }
  function prettyPhone(p) { p = String(p || ''); return p.length === 10 ? '+91 ' + p.slice(0, 5) + ' ' + p.slice(5) : p; }
  /* Everything printed on the bill, frozen at the time it is made. */
  function billData(s, me, old) {
    var r = find('rooms', 'room', s.room) || {}, usual = Number(r.rate || 0), rate = Number(s.rate || 0), nights = Number(s.nights || 0);
    var tariff = usual > rate ? usual : rate, discounts = [];
    if (usual > rate) {
      var mem = memberOf(s.phone), pct = Math.round((usual - rate) / usual * 100), note = String(s.rateNote || '');
      var custom = note && !/^Booking /.test(note) && !/member rate$/i.test(note);
      var label = mem && Number(mem.discount) === pct && !custom ? mem.tier + ' member discount (' + pct + '%)' : custom ? note + ' (' + pct + '%)' : 'Discount (' + pct + '%)';
      discounts.push({ label: label, note: 'On room tariff of ₹' + (usual * nights).toLocaleString('en-IN'), amount: (usual - rate) * nights });
    }
    var items = [], byKey = {};
    chargesOf(s.id).forEach(function (c) {
      if (c.free === 'Yes' || !(Number(c.total) > 0)) return; // free things (like the 2 waters) are not printed
      var k = c.item + '|' + c.price;
      if (!byKey[k]) { var m = itemMeta(c.item); byKey[k] = { label: m.label, hsn: m.hsn, gst: m.gst, unit: m.unit, qty: 0, rate: Number(c.price) }; items.push(byKey[k]); }
      byKey[k].qty += Number(c.qty || 0);
    });
    var payments = [], refunds = [];
    paymentsOf(s.id).forEach(function (p) {
      var amt = Number(p.amount || 0);
      if (amt < 0) { refunds.push({ date: p.at, method: p.method, ref: p.ref, amount: -amt }); return; }
      if (p.method === FROM_ADV) {
        var orig = bookingPays(s.booking).filter(function (x) { return Number(x.amount) > 0; });
        var sumOrig = orig.reduce(function (a, x) { return a + Number(x.amount); }, 0);
        if (orig.length && sumOrig === amt) orig.forEach(function (x) { payments.push({ date: x.at, label: 'Advance · booking ' + s.booking, method: x.method, ref: x.ref, amount: Number(x.amount) }); });
        else payments.push({ date: (orig[0] || p).at, label: 'Advance (share for this room) · booking ' + s.booking, method: orig[0] ? orig[0].method : 'Advance', ref: orig[0] ? orig[0].ref : '', amount: amt });
        return;
      }
      payments.push({ date: p.at, label: p.note || 'Payment received', method: p.method, ref: p.ref, amount: amt });
    });
    return { no: old ? old.no : '', id: old ? old.id : '', date: old ? old.date : today(), booking: s.booking || '',
      guest: { name: s.guest, title: s.title || '', address: s.address || '', phone: prettyPhone(s.phone), email: s.email || '', gstin: s.gstin || '', company: s.company || '' },
      room: { no: s.room, type: (r.type || '') + (r.beds ? ' (' + r.beds + ')' : '') }, checkin: s.checkin, checkout: s.checkout, inAt: s.inAt, outAt: s.outAt,
      nights: nights, guests: Number(s.guests || 1), tariff: tariff, discounts: discounts, items: items, payments: payments, refunds: refunds,
      member: old ? old.member : null, staff: s.outBy || (me && me.name) || '' };
  }
  function billTotal(d) {
    var t = d.tariff * d.nights;
    d.discounts.forEach(function (x) { t -= x.amount; });
    d.items.forEach(function (x) { t += x.qty * x.rate; });
    return t;
  }
  function plusHours(st, h) { // 'yyyy-MM-dd HH:mm' + hours (plain clock arithmetic, India time)
    var m = /^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)/.exec(String(st)); if (!m) return stamp();
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) + h * 3600000);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
  }
  function saveBill(s, me, member, edited) {
    var row = billOfStay(s.id), old = row ? JSON.parse(row.data) : null;
    var d = billData(s, me, old);
    if (member) d.member = member;
    if (!row) {
      d.no = newBillNo(); d.id = newBillId();
      row = db.add('bills', { id: d.id, no: d.no, at: stamp(), stay: s.id, room: s.room, guest: s.guest, phone: s.phone, email: s.email || '', total: billTotal(d), by: me.name, sent: '', data: JSON.stringify(d),
        sendAt: plusHours(s.outAt || stamp(), DESK_BILL_DELAY_HOURS), status: s.email ? 'Scheduled' : 'No email', pdf: '', edited: '' });
      db.set('stays', s, { bill: d.no });
    } else {
      var p = { guest: s.guest, email: s.email || '', total: billTotal(d), data: JSON.stringify(d) };
      if (edited) p.edited = stamp() + ' · ' + me.name;
      if (row.status === 'No email' && s.email) { p.status = 'Scheduled'; if (row.sendAt < stamp()) p.sendAt = stamp(); }
      if (row.status === 'Scheduled' && !s.email) p.status = 'No email';
      db.set('bills', row, p);
    }
    d.url = DESK_BILL_URL + d.id;
    return { row: row, data: d };
  }
  /* The PDF is made by the staff app (it looks exactly like the bill) and kept here until it is emailed. */
  var PDF_PART = 45000;
  function pdfParts(id) { return db.all('billpdfs').filter(function (x) { return x.bill === id && x.data; }).sort(function (a, b) { return a.part - b.part; }); }
  function pdfOf(id) { var p = pdfParts(id); return p.length ? p.map(function (x) { return x.data; }).join('') : null; }
  function pdfClear(id) { pdfParts(id).forEach(function (x) { db.set('billpdfs', x, { data: '' }); }); }
  function pdfOk(pdf) { return typeof pdf === 'string' && pdf.length > 100 && pdf.length < 9000000 && /^[A-Za-z0-9+\/=]+$/.test(pdf); }
  function pdfStore(b, pdf) {
    if (!pdfOk(pdf)) fail('bad_pdf');
    pdfClear(b.row.id);
    for (var i = 0, n = 0; i < pdf.length; i += PDF_PART, n++) db.add('billpdfs', { bill: b.row.id, part: n, data: pdf.slice(i, i + PDF_PART) });
    db.set('bills', b.row, { pdf: stamp() });
  }
  function sendBill(b, to, pdf) {
    if (!hooks.sendBill) fail('email_unavailable');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) fail('invalid_email');
    if (pdf != null && !pdfOk(pdf)) fail('bad_pdf');
    hooks.sendBill(b.data, to, pdf || null);
    db.set('bills', b.row, { sent: stamp() + ' → ' + to, status: 'Sent' });
    pdfClear(b.row.id);
  }
  /* Emails every bill whose time has come. Runs on its own (timer) and also when the app is used. */
  function sendDue() {
    var now = stamp(), out = [];
    db.all('bills').forEach(function (row) {
      if (row.status !== 'Scheduled' || !row.sendAt || row.sendAt > now || !row.email) return;
      var d = JSON.parse(row.data); d.url = DESK_BILL_URL + row.id;
      try { sendBill({ row: row, data: d }, row.email, pdfOf(row.id)); out.push(row.no); }
      catch (e) { db.set('bills', row, { status: 'Failed: ' + String(e && e.message || e).slice(0, 60) }); }
    });
    return out;
  }
  function billInfo(s, b) {
    if (!b) return null;
    return { stay: s.id, no: b.data.no, id: b.data.id, url: b.data.url, sent: b.row.sent, email: s.email || '', phone: s.phone, gstin: s.gstin || '', company: s.company || '', title: s.title || '',
      address: s.address || '', name: s.guest, status: b.row.status || '', sendAt: b.row.sendAt || '', hasPdf: !!b.row.pdf, edited: b.row.edited || '', data: b.data };
  }
  function billFields(s, req) {
    var p = {};
    if (req.email != null) { p.email = text(req.email, 80); if (p.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) fail('invalid_email'); }
    if (req.gstin != null) { p.gstin = text(req.gstin, 15).toUpperCase(); if (p.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(p.gstin)) fail('invalid_gstin'); }
    if (req.company != null) p.company = text(req.company, 80);
    if (req.address != null) p.address = text(req.address, 160);
    if (req.name != null) { p.guest = text(req.name, 80); if (!p.guest) fail('name_required'); }
    if (req.title != null) { p.title = String(req.title); if (['', 'Mr.', 'Ms.', 'Mrs.', 'Dr.'].indexOf(p.title) < 0) fail('bad_title'); }
    if (Object.keys(p).length) db.set('stays', s, p);
    return Object.keys(p).length > 0;
  }
  function checkedOut(req) { var s = stay(req.id); if (s.status !== 'Checked out') fail('not_checked_out'); return s; }

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

  /* Is this phone number a Nikadi member? (shows the level, member rates and perks at check-in) */
  api.member = function (req) {
    auth(req);
    var ph = String(req.phone || '').replace(/\D/g, '');
    if (ph.length === 12 && ph.indexOf('91') === 0) ph = ph.slice(2);
    if (!/^[6-9]\d{9}$/.test(ph)) return { member: null };
    return { member: memberOf(ph) };
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
    freeWater(r.room, me.name);
    return { stay: stayView(s, me) };
  };

  api.updateStay = function (req) {
    var me = auth(req); needMgr(me);
    var s = stay(req.id), rt0 = s.roomTotal;
    lockedOut(me, s);
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
    if (s.status === 'Checked out' && cout !== s.checkout && dayNum(cout) > dayNum(today())) fail('checkout_future');
    if (s.status === 'In house' || (s.status === 'Checked out' && (cin !== s.checkin || cout !== s.checkout))) { var cl = roomClash(targetRoom, cin, cout, { stay: s.id, booking: s.booking }); if (cl) clashFail(targetRoom, cl); }
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
    afterChange(s, me, rt0);
    return { stay: stayView(s, me) };
  };

  api.charge = function (req) {
    var me = auth(req), mgr = isMgr(me), r, s;
    if (req.id) { // add to a guest who already checked out (bill correction)
      s = stay(req.id); if (s.status !== 'Checked out') fail('room_not_occupied'); needApprover(me); r = { room: s.room };
    } else {
      r = room(req.room);
      if (r.status !== 'Occupied' || !r.stay) fail('room_not_occupied');
      s = stay(r.stay);
    }
    var it = item(req.item);
    if (!sellable(it)) fail('no_item');
    var qty = Math.round(Number(req.qty || 1)); if (!(qty >= 1 && qty <= 50)) fail('bad_qty');
    var free = !!req.free;
    var price = Number(it.price || 0);
    if (mgr && req.price != null && req.price !== '') { price = money(req.price); if (isNaN(price)) fail('invalid_amount'); }
    var note = text(req.note, 120);
    if (mgr && price !== Number(it.price) && !free) note = text((note ? note + ' · ' : '') + 'Price changed from ₹' + it.price, 160);
    var c = db.add('charges', { id: id('C'), at: stamp(), stay: s.id, room: r.room, item: it.item, qty: qty, price: free ? 0 : price,
      total: free ? 0 : price * qty, free: free ? 'Yes' : 'No', note: note, by: me.name, removed: '' });
    moveStock(it, -qty, free ? 'Free to room' : (req.id ? 'Added to bill after check-out' : 'Charged to room'), r.room, me.name);
    recompute(s);
    afterChange(s, me, s.roomTotal);
    return { stay: req.id ? stayView(s, me) : undefined, added: { item: it.item, qty: qty, room: r.room, free: free, total: mgr ? c.total : undefined }, stock: yes(it.track) ? it.stock : null };
  };

  api.editCharge = function (req) {
    var me = auth(req); needMgr(me);
    var c = find('charges', 'id', req.id) || fail('no_charge');
    if (c.removed) fail('no_charge');
    var s = stay(c.stay), it = find('items', 'item', c.item);
    lockedOut(me, s);
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
    afterChange(s, me, s.roomTotal);
    return { stay: stayView(s, me) };
  };

  api.pay = function (req) {
    var me = auth(req); needMgr(me);
    var s = stay(req.id);
    lockedOut(me, s);
    var amt = money(req.amount); if (!(amt > 0)) fail('invalid_amount');
    if (METHODS.indexOf(req.method) < 0) fail('method_required');
    db.add('payments', { id: id('P'), at: stamp(), stay: s.id, room: s.room, amount: amt, method: req.method, note: text(req.note, 120) || (s.status === 'Checked out' ? 'Paid after check-out' : ''), by: me.name, booking: s.booking || '', ref: text(req.ref, 40) });
    recompute(s);
    afterChange(s, me, s.roomTotal);
    return { stay: stayView(s, me) };
  };

  /* Give money back to a guest from a room bill (overpaid, item cancelled, …). Receptionists: needs approval. */
  api.refund = function (req) {
    var me = auth(req); needMgr(me);
    var s = stay(req.id);
    lockedOut(me, s);
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
    afterChange(s, me, s.roomTotal);
    return { stay: stayView(s, me) };
  };

  /* Add or correct the transaction / reference number of a payment (no money changes). After check-out: Manager / Owner only. */
  api.paymentRef = function (req) {
    var me = auth(req); needMgr(me);
    var p = find('payments', 'id', req.id) || fail('no_payment');
    if (p.voided || p.method === FROM_ADV) fail('no_payment');
    var stays = p.stay ? [stay(p.stay)] : db.all('stays').filter(function (x) { return p.booking && x.booking === p.booking; });
    stays.forEach(function (x) { lockedOut(me, x); });
    db.set('payments', p, { ref: text(req.ref, 40) });
    stays.forEach(function (x) { afterChange(x, me, x.roomTotal); });
    if (p.stay) return { stay: stayView(stays[0], me) };
    var b = find('bookings', 'id', p.booking); return b ? { booking: bookingView(b, me) } : {};
  };

  /* Cancel a payment that was entered by mistake (wrong amount, entered twice). It stays visible in the sheet as voided. */
  api.voidPayment = function (req) {
    var me = auth(req); needMgr(me);
    var p = find('payments', 'id', req.id) || fail('no_payment');
    if (p.voided || p.method === FROM_ADV) fail('no_payment');
    if (!text(req.reason, 200)) fail('reason_required');
    if (p.stay) lockedOut(me, stay(p.stay));
    var g = gate(me, 'voidPayment', req, (p.stay ? 'Room ' + p.room : 'Booking ' + p.booking) + ': cancel ' + (Number(p.amount) < 0 ? 'refund' : 'payment') + ' of ₹' + Math.abs(p.amount) + ' (' + p.method + (p.ref ? ' ' + p.ref : '') + ', ' + p.at + ', by ' + p.by + ')');
    if (g) return g;
    db.set('payments', p, { voided: 'Voided by ' + who(me, req) + ' ' + stamp() + ': ' + text(req.reason, 120) });
    if (p.stay) { var s = stay(p.stay); recompute(s); afterChange(s, me, s.roomTotal); return { stay: stayView(s, me) }; }
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
    var member = null, memBefore = memberOf(s.phone);
    if (hooks.onCheckout && s.phone) {
      try { member = hooks.onCheckout({ id: s.id, phone: s.phone, guest: s.guest, room: s.room, nights: nights, roomTotal: Number(s.roomTotal || 0), checkin: s.checkin, checkout: s.checkout }); } catch (e) { member = null; }
    }
    billFields(s, req);
    if (!s.email && memBefore && memBefore.email) db.set('stays', s, { email: memBefore.email });
    var bm = memBefore ? { level: memBefore.tier, earned: member ? member.points : null, balance: member ? member.balance : memBefore.points } : null;
    if (bm) { var r0 = find('rooms', 'room', s.room); if (r0 && Number(r0.rate) > Number(s.rate)) bm.saved = (Number(r0.rate) - Number(s.rate)) * nights; }
    var b = saveBill(s, me, bm); // emailed automatically DESK_BILL_DELAY_HOURS after check-out
    return { stay: stayView(s, me), member: member, bill: billInfo(s, b), emailed: '' };
  };

  /* Bills. Front desk can see, download, WhatsApp and email them; only a Manager or the Owner can change them. */
  api.bill = function (req) {
    var me = auth(req); needMgr(me);
    var s = checkedOut(req), keys = ['name', 'title', 'address', 'email', 'company', 'gstin'], change = {};
    keys.forEach(function (k) { if (req[k] != null) change[k] = req[k]; });
    if (Object.keys(change).length) needApprover(me);
    var edited = billFields(s, change);
    var b = saveBill(s, me, null, edited);
    return { bill: billInfo(s, b) };
  };
  /* The staff app uploads the PDF once at check-out; after that only a Manager or the Owner can replace it (after a change). */
  api.billPdf = function (req) {
    var me = auth(req); needMgr(me);
    var s = checkedOut(req), b = saveBill(s, me, null);
    if (b.row.pdf && !canApprove(me)) fail('not_allowed');
    if (b.row.status === 'Sent' && !canApprove(me)) fail('not_allowed');
    pdfStore(b, req.pdf);
    return { bill: billInfo(s, b) };
  };
  /* Manager / Owner: email now, stop the automatic email, or switch it back on. */
  api.billSchedule = function (req) {
    var me = auth(req); needApprover(me);
    var s = checkedOut(req), b = saveBill(s, me, null), what = String(req.what || '');
    if (what === 'stop') db.set('bills', b.row, { status: 'Stopped by ' + me.name });
    else if (what === 'resume') { if (!s.email) fail('invalid_email'); db.set('bills', b.row, { status: 'Scheduled', sendAt: b.row.sendAt > stamp() ? b.row.sendAt : stamp() }); }
    else if (what === 'now') sendBill(b, String(s.email || ''), req.pdf || pdfOf(b.row.id));
    else fail('bad_request');
    return { bill: billInfo(s, b) };
  };
  api.billSend = function (req) {
    var me = auth(req); needMgr(me);
    var s = checkedOut(req);
    if (req.email != null && String(req.email).trim() !== String(s.email || '')) { needApprover(me); billFields(s, { email: req.email }); }
    var b = saveBill(s, me, null);
    sendBill(b, String(s.email || ''), req.pdf || pdfOf(b.row.id));
    return { bill: billInfo(s, b), emailed: s.email };
  };
  /* Runs the automatic emails (called by a timer in Google, and when the app is used). */
  api._sendDue = function () { return { sent: sendDue() }; };
  /* Recent bills for the front desk list. */
  api.bills = function (req) {
    var me = auth(req); needMgr(me);
    return { bills: db.all('bills').slice(-60).reverse().map(function (b) { return { no: b.no, at: b.at, stay: b.stay, room: b.room, guest: b.guest, total: b.total, sent: b.sent, status: b.status || '', sendAt: b.sendAt || '', url: DESK_BILL_URL + b.id }; }) };
  };
  /* Public: the QR code / link on a bill. Only the secret bill id opens it. */
  api.billView = function (req) {
    var key = String(req.id || '');
    if (!/^[A-Za-z0-9]{12,40}$/.test(key)) fail('no_bill');
    var b = find('bills', 'id', key); if (!b) fail('no_bill');
    var d = JSON.parse(b.data); d.id = b.id;
    return { bill: d };
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
      freeWater(n, me.name);
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

  /* ================= Sales report (Owner only) ================= */
  /* Sales = room + extras of stays, counted in the month the guest checked out.
     Collected = money received (net of refunds), counted on the day it was received. */
  api.report = function (req) {
    var me = auth(req); needOwner(me);
    var year = String(req.year || today().slice(0, 4)).replace(/\D/g, '').slice(0, 4);
    var nRooms = db.all('rooms').length || 11, years = {};
    function blank(m) { return { month: m, rooms: 0, extras: 0, sales: 0, nights: 0, stays: 0, guests: 0, collected: 0, refunds: 0, byMethod: {}, occupancy: 0, adr: 0 }; }
    var months = []; for (var i = 1; i <= 12; i++) months.push(blank(i));
    var items = {};
    db.all('stays').forEach(function (st) {
      if (st.status !== 'Checked out' || !st.checkout) return;
      var y = String(st.checkout).slice(0, 4); years[y] = 1;
      if (y !== year) return;
      var mo = months[Number(String(st.checkout).slice(5, 7)) - 1];
      mo.rooms += Number(st.roomTotal || 0); mo.extras += Number(st.extras || 0); mo.nights += Number(st.nights || 0); mo.stays++; mo.guests += Number(st.guests || 0);
    });
    db.all('charges').forEach(function (c) {
      if (c.removed || String(c.at).slice(0, 4) !== year) return;
      var k = c.item; items[k] = items[k] || { item: k, qty: 0, free: 0, amount: 0 };
      if (c.free === 'Yes') items[k].free += Number(c.qty || 0); else { items[k].qty += Number(c.qty || 0); items[k].amount += Number(c.total || 0); }
    });
    db.all('payments').forEach(function (p) {
      if (p.voided || p.method === FROM_ADV || !p.at) return;
      var y = String(p.at).slice(0, 4); years[y] = 1;
      if (y !== year) return;
      var mo = months[Number(String(p.at).slice(5, 7)) - 1], a = Number(p.amount || 0);
      if (a >= 0) mo.collected += a; else mo.refunds += -a;
      mo.byMethod[p.method] = (mo.byMethod[p.method] || 0) + a;
    });
    var tot = blank(0); tot.byMethod = {};
    months.forEach(function (mo) {
      mo.sales = mo.rooms + mo.extras;
      var dim = new Date(Date.UTC(Number(year), mo.month, 0)).getUTCDate();
      mo.occupancy = Math.round(mo.nights / (nRooms * dim) * 1000) / 10;
      mo.adr = mo.nights ? Math.round(mo.rooms / mo.nights) : 0;
      ['rooms', 'extras', 'sales', 'nights', 'stays', 'guests', 'collected', 'refunds'].forEach(function (k) { tot[k] += mo[k]; });
      Object.keys(mo.byMethod).forEach(function (k) { tot.byMethod[k] = (tot.byMethod[k] || 0) + mo.byMethod[k]; });
    });
    var leap = Number(year) % 4 === 0 && (Number(year) % 100 !== 0 || Number(year) % 400 === 0);
    tot.occupancy = Math.round(tot.nights / (nRooms * (leap ? 366 : 365)) * 1000) / 10;
    tot.adr = tot.nights ? Math.round(tot.rooms / tot.nights) : 0;
    years[today().slice(0, 4)] = 1;
    var bk = db.all('bookings').filter(function (b) { return String(b.created).slice(0, 4) === year; });
    return { year: year, years: Object.keys(years).sort().reverse(), months: months, total: tot, rooms: nRooms,
      items: Object.keys(items).map(function (k) { return items[k]; }).sort(function (a, b) { return b.amount - a.amount; }),
      bookings: { made: bk.length, cancelled: bk.filter(function (b) { return b.status === 'Cancelled'; }).length, noShow: bk.filter(function (b) { return b.status === 'No-show'; }).length },
      partial: today().slice(0, 4) === year };
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
      '<button type="button" class="tb-print" onclick="window.print()">Print</button>' +
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

      (pays ? '<section class="pays"><div class="lbl">Payments received</div><div class="tbl-wrap"><table class="ptab"><thead><tr><th>Date</th><th>Particulars</th><th>Mode</th><th>Transaction / Ref. No.</th><th class="r">Amount (₹)</th></tr></thead><tbody>' + pays + '</tbody></table></div></section>' : '') +

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
    '.toolbar button{font:inherit;font-size:13px;border:0;border-radius:6px;padding:8px 14px;background:#156b82;color:#fff;cursor:pointer;margin-left:6px}.toolbar .tb-share,.toolbar .tb-print{background:#3d474b}',
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

/* ------------------------------------------------------------------ */
/* Google Sheet storage for the staff app                              */
/* ------------------------------------------------------------------ */

function deskDb_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), cache = {};
  var checked = {};
  function sh(t) {
    var def = DESK_SCHEMA[t], s = ss.getSheetByName(def.sheet);
    if (!s) {
      if (t !== 'bills' && t !== 'billpdfs') throw new Error('not_setup');
      s = ss.insertSheet(def.sheet); s.appendRow(def.cols.map(function (c) { return c[1]; }));
      s.getRange(1, 1, 1, def.cols.length).setFontWeight('bold').setBackground('#1b1714').setFontColor('#e0be7a'); s.setFrozenRows(1);
      if (def.hidden) s.hideSheet();
    }
    if (!checked[t]) { // add headings for columns added in newer versions
      checked[t] = true;
      var have = s.getLastColumn();
      if (have < def.cols.length) {
        s.getRange(1, have + 1, 1, def.cols.length - have).setValues([def.cols.slice(have).map(function (c) { return c[1]; })])
          .setFontWeight('bold').setBackground('#1b1714').setFontColor('#e0be7a');
        def.cols.forEach(function (c, j) { if (j >= have && c[2] === 's') s.getRange(1, j + 1, s.getMaxRows(), 1).setNumberFormat('@'); });
      }
    }
    return s;
  }
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
  var clean = {};
  Object.keys(req).forEach(function (k) { if (k.charAt(0) !== '_') clean[k] = req[k]; }); // private flags only from inside the script
  var api = deskCore(deskDb_(), { onCheckout: typeof memberStayPoints_ === 'function' ? memberStayPoints_ : null,
    memberInfo: typeof memberDesk_ === 'function' ? memberDesk_ : null,
    onStayChange: typeof memberStayAdjust_ === 'function' ? memberStayAdjust_ : null,
    newId: function () { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8); },
    sendBill: deskSendBill_ });
  if (name.charAt(0) === '_' || !api.hasOwnProperty(name)) throw new Error('unknown_action');
  var out = api[name](clean);
  try { // send bills that are due (at most every 10 minutes), so emails go out even without the timer
    var c = CacheService.getScriptCache();
    if (!c.get('desk_due_check')) { c.put('desk_due_check', '1', 600); api._sendDue(); }
  } catch (e) {}
  return out;
}

/** Timer: emails bills 12 hours after check-out. Set in Apps Script → Triggers → sendDueBills → Time-driven → every 15 minutes. */
function sendDueBills() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try { deskCore(deskDb_(), { sendBill: deskSendBill_ })._sendDue(); } finally { lock.releaseLock(); }
}

/** Emails a guest their bill: a warm message, with the PDF bill attached (made by the staff app). */
function deskSendBill_(d, to, pdf) {
  var msg = { to: to, name: 'Nikadi Guest House', replyTo: 'nikadiguesthouse@gmail.com',
    subject: NikadiBill.billEmailSubject(d),
    htmlBody: NikadiBill.billEmail(d),
    body: NikadiBill.billWhatsApp(d, { link: !pdf }).replace(/\*/g, '') };
  if (pdf) msg.attachments = [Utilities.newBlob(Utilities.base64Decode(pdf), 'application/pdf', 'Nikadi-Bill-' + String(d.no).replace(/[^A-Za-z0-9-]+/g, '-') + '.pdf')];
  MailApp.sendEmail(msg);
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
