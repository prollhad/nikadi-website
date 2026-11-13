/* Nikadi Staff — demo mode (open /staff/?demo=1).
   Runs the real staff logic (logic.js) on sample data kept only on this phone.
   Demo PINs: 1111 Owner · 2222 Reception (Manager) · 3333 Housekeeping (Staff) */
(function (root) {
  var KEY = 'nikadi-staff-demo-v3';

  function memoryDb(data) {
    return {
      data: data,
      all: function (t) { return data.tables[t] || (data.tables[t] = []); },
      add: function (t, o) { this.all(t).push(o); return o; },
      set: function (t, o, patch) { Object.keys(patch).forEach(function (k) { o[k] = patch[k]; }); },
      kvGet: function (k) { var v = data.kv[k]; return v && v.until > Date.now() ? v.value : null; },
      kvSet: function (k, v, sec) { data.kv[k] = { value: String(v), until: Date.now() + (sec || 600) * 1000 }; }
    };
  }

  function ymd(offset) {
    var d = new Date(Date.now() + DESK_TZ_MIN * 60000 + (offset || 0) * 864e5);
    return d.toISOString().slice(0, 10);
  }

  /* Builds a fresh demo world by replaying normal actions, so it is exactly what the real app would store. */
  function seed() {
    var data = { tables: {}, kv: {} }, db = memoryDb(data);
    Object.keys(DESK_DEFAULTS).forEach(function (t) { DESK_DEFAULTS[t].forEach(function (o) { db.add(t, JSON.parse(JSON.stringify(o))); }); });
    db.add('staff', { name: 'Housekeeping', pin: '3333', role: 'Staff', active: 'Yes' });
    db.add('staff', { name: 'Bablu', pin: '4444', role: 'Staff', active: 'Yes' });
    db.add('staff', { name: 'Manager', pin: '5555', role: 'Manager', active: 'Yes' });
    db.add('staff', { name: 'Reception 2', pin: '6666', role: 'Receptionist', active: 'Yes' });
    db.all('items').forEach(function (i) { if (i.item === 'Water bottle') i.stock = 96; if (i.item === 'Dental kit') i.stock = 14; });
    var api = deskCore(db), owner = api.login({ pin: '1111' }).token, hk = api.login({ pin: '3333' }).token;
    function inn(room, guest, phone, guests, from, to, rate, note, adv, method) {
      return api.checkIn({ token: owner, room: room, guest: guest, phone: phone, guests: guests, checkin: ymd(from), checkout: ymd(to), rate: rate, rateNote: note, advance: adv, method: method }).stay.id;
    }
    inn(2, 'Radha Devi Sharma', '9876543210', 2, -1, 2, 4000, 'Regular guest, ₹1,000 off', 4000, 'UPI');
    inn(3, 'Gopal Krishna Das', '9830012345', 3, -2, 0, 5000, '', 5000, 'Cash');
    inn(7, 'Anita & Suresh Patel', '9123456780', 2, 0, 3, 3500, 'Offer rate, booked on WhatsApp', 3500, 'UPI');
    inn(10, 'Madhavi Iyer', '', 3, -1, 1, 5000, '', 0, '');
    inn(5, 'Hari Prasad', '9000011111', 1, 0, 1, 3000, 'Single guest, offer rate', 3000, 'Cash');
    api.charge({ token: hk, room: 2, item: 'Water bottle', qty: 2 });
    api.charge({ token: hk, room: 3, item: 'Water bottle', qty: 4 });
    api.charge({ token: hk, room: 3, item: 'Dental kit', qty: 1 });
    api.charge({ token: owner, room: 10, item: 'Extra mattress', qty: 1, price: 300, note: 'Negotiated' });
    api.charge({ token: hk, room: 10, item: 'Water bottle', qty: 3 });
    var c = inn(6, 'Vivek Menon', '9988776655', 2, -2, 0, 4500, '', 9000, 'Card');
    api.charge({ token: hk, room: 6, item: 'Late checkout', qty: 1 });
    api.pay({ token: owner, id: c, amount: 1500, method: 'Cash', note: 'Late checkout' });
    api.checkOut({ token: owner, id: c, nights: 2 });
    api.roomStatus({ token: hk, room: 9, status: 'Needs cleaning' });
    api.stock({ token: owner, item: 'Water bottle', mode: 'add', qty: 48, note: 'Delivery from supplier' });
    db.all('items').forEach(function (i) { if (i.item === 'Morning kit (free)') i.stock = 12; if (i.item === 'Toilet roll') i.stock = 46; });
    var bk = function (o) { return api.bookingCreate(Object.assign({ token: owner }, o)).booking.id; };
    var w1 = api.bookingRequest({ guest: 'Priya Nair', phone: '9845012345', email: 'priya@example.com', guests: 3, roomType: 'Deluxe Double (King)', checkin: ymd(5), checkout: ymd(7), notes: 'Arriving by train around 2 PM' }).id;
    bk({ guest: 'Ramesh Gupta', phone: '9007012345', guests: 6, roomsNeeded: 2, roomType: 'Any', checkin: ymd(10), checkout: ymd(12), rate: 4500, source: 'Phone', notes: 'Family of 6, wants rooms next to each other' });
    var c1 = bk({ guest: 'Lakshmi Venkatesh', phone: '9444012345', guests: 5, roomsNeeded: 2, roomType: 'Any', checkin: ymd(0), checkout: ymd(2), rate: 4000, source: 'WhatsApp' });
    api.bookingConfirm({ token: owner, id: c1, rooms: [8, 11], amount: 8000, method: 'UPI', ref: 'UPI 431298776512' });
    var c2 = bk({ guest: 'John Smith', phone: '9812345678', email: 'john@example.com', guests: 2, roomType: 'Deluxe Double (King)', checkin: ymd(3), checkout: ymd(6), rate: 5000, source: 'Website' });
    api.bookingConfirm({ token: owner, id: c2, rooms: [4], amount: 7500, method: 'Bank transfer', ref: 'NEFT AXIS 88123' });
    var c3 = bk({ guest: 'Sunita Rao', phone: '9900112233', guests: 2, roomType: 'Deluxe Double (King)', checkin: ymd(3), checkout: ymd(5), rate: 4500, source: 'Phone' });
    api.bookingConfirm({ token: owner, id: c3, rooms: [2], amount: 4500, method: 'Cash', ref: '' });
    var c4 = bk({ guest: 'Arjun Mehta', phone: '9811122233', guests: 2, roomType: 'Deluxe Twin', checkin: ymd(1), checkout: ymd(3), rate: 4500, source: 'WhatsApp' });
    api.bookingConfirm({ token: owner, id: c4, rooms: [1], amount: 4500, method: 'UPI', ref: 'UPI 556120098812' });
    api.bookingCancel({ token: owner, id: c4, reason: 'Change of plans' });
    var c5 = bk({ guest: 'Meera Krishnan', phone: '9822233344', guests: 3, roomType: 'Large Twin', checkin: ymd(8), checkout: ymd(11), rate: 5000, source: 'Phone' });
    api.bookingConfirm({ token: owner, id: c5, rooms: [10], amount: 7500, method: 'UPI', ref: 'UPI 778812300045' });
    // sample approval requests from reception
    var rc = api.login({ pin: '2222' }).token;
    var mat = db.all('charges').filter(function (c) { return c.room === 10 && c.item === 'Extra mattress'; })[0];
    api.pay({ token: rc, id: mat.stay, amount: 300, method: 'Cash', note: 'Extra mattress' });
    api.editCharge({ token: rc, id: mat.id, remove: true, refundAmount: 300, method: 'Cash', reason: 'Guest did not use the mattress and asked for the ₹300 back' });
    var r3 = db.all('stays').filter(function (x) { return x.room === 3 && x.status === 'In house'; })[0];
    api.pay({ token: rc, id: r3.id, amount: 6000, method: 'UPI', ref: 'UPI 220011998877', note: 'Balance' });
    api.refund({ token: rc, id: r3.id, amount: 770, method: 'Cash', reason: 'Guest overpaid by UPI, returning the extra in cash' });
    void w1;
    data.tables.sessions = [];
    return data;
  }

  function load() {
    try { var s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) {}
    return seed();
  }
  function save(data) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }

  var world = null;
  root.nikadiStaffDemo = function (action, req) {
    if (!world) world = load();
    var name = action.charAt(4).toLowerCase() + action.slice(5);
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        try {
          var api = deskCore(memoryDb(world));
          if (!api.hasOwnProperty(name)) throw new Error('unknown_action');
          var out = api[name](JSON.parse(JSON.stringify(req || {})));
          save(world);
          resolve(Object.assign({ ok: true }, out));
        } catch (e) { reject(String(e && e.message || e)); }
      }, 250);
    });
  };
  root.nikadiStaffDemoReset = function () { world = seed(); save(world); };
  root.nikadiStaffMemoryDb = memoryDb;
})(typeof window !== 'undefined' ? window : globalThis);
