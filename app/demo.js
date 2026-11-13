/* Demo mode (open the app with ?demo=1). Sample data only, nothing is saved.
   Demo member 98765 43210 · password: hare krishna · codes 123456 · staff PIN 2468 */
(function () {
  if (!NIKADI.demo) return;
  var TIERS = [{ key: "silver", name: "Silver", nights: 0, discount: 5, earn: 1 }, { key: "gold", name: "Gold", nights: 15, discount: 10, earn: 1.5 },
    { key: "platinum", name: "Platinum", nights: 40, discount: 15, earn: 2 }, { key: "plus", name: "Platinum Plus", nights: 80, discount: 20, earn: 4 }];
  var RATES = { "Deluxe Double (King)": 5000, "Deluxe Twin": 4500, "Large Twin": 5000 };
  var cfg = { pointsPer100: 1, welcome: 100, discountPoints: 100, discountValue: 500, freeNightPoints: 500, channel: "email", tiers: TIERS, rates: RATES, plusYears: 10, windowYears: 2 };
  var members = {
    "9876543210": { phone: "9876543210", name: "Radha Devi", city: "Kolkata", joined: "14 Jan 2026", points: 335, lifetime: 535, status: "Active", pw: "hare krishna", nights: 18,
      stays: { stays: [
        { id: "S1", room: 5, checkin: "2026-10-31", checkout: "2026-11-02", nights: 2, rate: 4275, roomTotal: 8550, extras: 40, paid: 8590, balance: 0, status: "Checked out" },
        { id: "S2", room: 3, checkin: "2026-08-15", checkout: "2026-08-18", nights: 3, rate: 5000, roomTotal: 15000, extras: 150, paid: 14150, balance: 0, status: "Checked out" },
        { id: "S3", room: 7, checkin: "2026-02-27", checkout: "2026-03-03", nights: 4, rate: 4875, roomTotal: 19500, extras: 0, paid: 19500, balance: 0, status: "Checked out" }],
        bookings: [{ id: "BDEMO1", status: "Confirmed", checkin: "2026-12-24", checkout: "2026-12-27", nights: 3, guests: 2, rooms: "4", roomsNeeded: 1, roomType: "Deluxe Double (King)", rate: 4500, total: 13500, advanceDue: 6750, advancePaid: 6750, refunded: 0 }] },
      hist: [
        { date: "2 Nov 2026, 9:10 AM", type: "Stay", amount: 9000, points: 90, balance: 335, note: "2 nights · Deluxe Twin" },
        { date: "18 Aug 2026, 8:45 AM", type: "Redeem", amount: "", points: -200, balance: 245, note: "₹1000 discount" },
        { date: "18 Aug 2026, 8:40 AM", type: "Stay", amount: 15000, points: 150, balance: 445, note: "3 nights · Deluxe Double" },
        { date: "3 Mar 2026, 9:05 AM", type: "Stay", amount: 19500, points: 195, balance: 295, note: "Gaura Purnima · 4 nights" },
        { date: "14 Jan 2026, 2:15 PM", type: "Welcome", amount: "", points: 100, balance: 100, note: "Welcome bonus" }
      ] }
  };
  var pending = null;
  function mask(p) { return p.slice(0, 2) + "******" + p.slice(-2); }
  function tierOf(m) {
    var n = m.nights || 0, t = n >= 80 ? TIERS[3] : n >= 40 ? TIERS[2] : n >= 15 ? TIERS[1] : TIERS[0], i = TIERS.indexOf(t), next = TIERS[i + 1];
    return { t: t, next: next ? { name: next.name, need: next.nights - n, nights: next.nights } : null };
  }
  function pub(m) { var x = tierOf(m); return { phone: m.phone, masked: mask(m.phone), name: m.name, firstName: m.name.split(" ")[0], city: m.city, email: m.email || "radha@example.com", joined: m.joined, points: m.points, lifetime: m.lifetime, status: m.status,
    freeNightPoints: 500, discountPoints: 100, discountValue: 500, tier: x.t.name, tierKey: x.t.key, discount: x.t.discount, earn: x.t.earn, nights2y: m.nights || 0, nightsAll: m.nights || 0,
    plusUntil: x.t.key === "plus" ? "13 Nov 2036" : "", next: x.next, hasPassword: !!m.pw }; }
  function full(m) { return { token: "demo-" + m.phone, member: pub(m), history: m.hist, stays: m.stays || { stays: [], bookings: [] } }; }
  function now() { return new Date().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }); }
  function tx(m, type, amount, pts, note) { m.points += pts; if (pts > 0) m.lifetime += pts; m.hist.unshift({ date: now(), phone: m.phone, name: m.name, type: type, amount: amount, points: pts, balance: m.points, note: note }); }
  function ok(o) { return new Promise(function (res) { setTimeout(function () { res(Object.assign({ ok: true }, o)); }, 450); }); }
  function fail(c) { return new Promise(function (_, rej) { setTimeout(function () { rej(c); }, 450); }); }
  function get(p) { var d = nkPhoneOk(p); if (!d) throw "invalid_phone"; return d; }

  window.nkDemo = function (action, d) {
    try {
      var phone, m;
      switch (action) {
        case "config": return ok(cfg);
        case "lookup": phone = get(d.phone); m = members[phone]; return ok(m ? { found: true, member: pub(m) } : { found: false });
        case "join": case "staffJoin":
          phone = get(d.phone); if (members[phone]) return fail("already_member");
          if (!d.password && action === "join") return fail("password_required");
          if (d.password && String(d.password).length < 6) return fail("weak_password");
          m = members[phone] = { phone: phone, name: d.name, city: d.city, email: d.email, joined: now().replace(/,.*$/, ""), points: 0, lifetime: 0, status: "Active", hist: [], pw: d.password, nights: 0, stays: { stays: [], bookings: [] } };
          tx(m, "Welcome", "", 100, "Welcome bonus"); return ok(full(m));
        case "login": phone = get(d.phone); m = members[phone]; if (!m) return fail("not_member"); if (!m.pw) return fail("no_password"); if (d.password !== m.pw) return fail("wrong_password"); return ok(full(m));
        case "passStart": phone = get(d.phone); if (!members[phone]) return fail("not_member"); return ok({ channel: "email", to: "r***@example.com (demo code 123456)" });
        case "passSet": phone = get(d.phone); if (String(d.password || "").length < 6) return fail("weak_password"); if (d.code !== "123456") return fail("otp_wrong"); m = members[phone]; m.pw = d.password; return ok(full(m));
        case "book":
          m = members[String(d.token).replace("demo-", "")]; if (!m) return fail("not_logged_in");
          if (!d.checkin || !d.checkout || d.checkout <= d.checkin) return fail("bad_dates");
          var x = tierOf(m), base = RATES[d.roomType] || 5000, rate = Math.round(base * (100 - x.t.discount) / 100);
          var nn = Math.round((Date.parse(d.checkout) - Date.parse(d.checkin)) / 864e5), rn = Math.max(+d.roomsNeeded || 1, Math.ceil((+d.guests || 1) / 3));
          var id = "B" + Math.random().toString(36).slice(2, 8).toUpperCase();
          m.stays.bookings.unshift({ id: id, status: "Pending", checkin: d.checkin, checkout: d.checkout, nights: nn, guests: +d.guests, rooms: "", roomsNeeded: rn, roomType: d.roomType, rate: rate, total: nn * rn * rate, advanceDue: Math.ceil(nn * rn * rate / 2), advancePaid: 0, refunded: 0 });
          return ok({ booking: id, rate: rate, stays: m.stays });
        case "otpSend": phone = get(d.phone); if (!members[phone]) return fail("not_member"); return ok({ channel: "sms", to: mask(phone) + " (demo code 123456)" });
        case "otpVerify": phone = get(d.phone); if (d.code !== "123456") return fail("otp_wrong"); m = members[phone]; return ok(full(m));
        case "me": m = members[String(d.token).replace("demo-", "")]; if (!m) return fail("not_logged_in"); return ok(full(m));
        case "staffLogin": if (String(d.pin) !== "2468") return fail("wrong_pin"); return ok({ token: "demo-staff", config: cfg });
        case "staffMember": phone = get(d.phone); m = members[phone]; return ok(m ? { found: true, member: pub(m), history: m.hist } : { found: false, phone: phone });
        case "staffCreate": return window.nkDemo("staffJoin", d).then(function (r) { m = members[r.member.phone]; return { ok: true, member: r.member, history: m.hist }; });
        case "staffAddStay": m = members[get(d.phone)]; var amt = Math.round(+d.amount || 0); if (amt <= 0) return fail("invalid_amount"); var pts = Math.floor(amt / 100); tx(m, "Stay", amt, pts, d.note || "Stay"); return ok({ added: pts, member: pub(m), history: m.hist });
        case "staffRedeemStart":
          m = members[get(d.phone)]; var q = Math.max(1, +d.qty || 1), need = d.reward === "night" ? 500 * q : 100 * q;
          if (m.points < need) return fail("insufficient_points");
          pending = { points: need, label: d.reward === "night" ? q + " free night" + (q > 1 ? "s" : "") : "₹" + 500 * q + " discount" };
          return ok({ channel: "sms", to: mask(m.phone) + " (demo code 123456)", points: need, label: pending.label });
        case "staffRedeemConfirm": m = members[get(d.phone)]; if (d.code !== "123456") return fail("otp_wrong"); tx(m, "Redeem", "", -pending.points, pending.label); return ok({ redeemed: pending.points, label: pending.label, member: pub(m), history: m.hist });
        case "staffAdjust": m = members[get(d.phone)]; if (!d.note) return fail("note_required"); tx(m, "Adjustment", "", Math.round(+d.points), d.note); return ok({ member: pub(m), history: m.hist });
        case "staffRecent": var all = []; Object.keys(members).forEach(function (k) { members[k].hist.forEach(function (h) { all.push(Object.assign({ phone: k, name: members[k].name }, h)); }); }); return ok({ recent: all.slice(0, 40), members: Object.keys(members).length });
      }
      return fail("server_error");
    } catch (c) { return fail(typeof c === "string" ? c : "server_error"); }
  };
})();
