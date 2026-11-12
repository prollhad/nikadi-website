/* Nikadi Staff — demo mode (open /staff/?demo=1).
   Runs the real staff logic (logic.js) on sample data kept only on this phone.
   Demo PINs: 1111 Owner · 2222 Reception (Manager) · 3333 Housekeeping (Staff) */
(function (root) {
  var KEY = 'nikadi-staff-demo-v1';

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
