/* Nikadi Guest House: room price schedule (single source for the website and the member app).
   The staff app (staff/logic.js) and backend (backend/Code.gs) carry the same table: change all three together.
   A night's price depends on the date of that night, not the booking date. Member discounts come off the price of the night. */
(function (root) {
  var STANDARD = { double: 5000, twin: 4500 };
  /* Fridays and Saturdays in offer months cost 500 more a night (busy days in Mayapur). */
  var WEEKEND_UP = 500;
  function isFriSat(ymd) { var p = String(ymd).split('-'), w = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); return w === 5 || w === 6; }
  /* Tonight's late price: after 6 pm, when the front desk still has 6 or more rooms empty for tonight, tonight (only) costs 3,000 / 2,500.
     The server decides and sends it (deskSiteAvailability → deal); it applies to today's night only, and only in offer months. */
  var DEAL = null;
  function setDeal(d) { DEAL = d && d.date && d.date === todayIST() && d.double > 0 && d.twin > 0 ? { date: d.date, double: +d.double, twin: +d.twin } : null; }
  function deal() { return DEAL && DEAL.date === todayIST() ? DEAL : null; }
  function baseRate(p, k, ymd) { return p[k] + (p.offer && ymd && isFriSat(ymd) ? WEEKEND_UP : 0); }
  function nightRate(p, k, ymd) { var r = baseRate(p, k, ymd), d = deal(); return d && p.offer && ymd === d.date ? Math.min(r, d[k]) : r; }
  var PERIODS = [
    { from: '2000-01-01', to: '2026-12-23', double: 3500, twin: 3000,
      offer: { name: 'Special offer', until: '23 December',
        line: 'Special offer till 23 December · come and enjoy your nights at Nikadi',
        short: 'Special offer till 23 Dec · rooms from ₹3,000' } },
    { from: '2026-12-24', to: '2027-05-05', double: 5000, twin: 4500 },
    { from: '2027-05-06', to: '9999-12-31', double: 3500, twin: 3000,
      offer: { name: 'Summer Darshan Special', until: '',
        line: 'Summer Darshan Special · our best price of the year, steps away from the Mayapur ISKCON Temple',
        short: 'Summer Darshan Special · rooms from ₹3,000' } }
  ];
  function kind(type) { var t = String(type || ''); return /large/i.test(t) ? 'double' : /twin/i.test(t) ? 'twin' : 'double'; }
  function todayIST() { return new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10); }
  function period(ymd) { ymd = String(ymd || todayIST()).slice(0, 10); for (var i = 0; i < PERIODS.length; i++) if (ymd >= PERIODS[i].from && ymd <= PERIODS[i].to) return PERIODS[i]; return PERIODS[PERIODS.length - 1]; }
  function rate(type, ymd) { ymd = String(ymd || todayIST()).slice(0, 10); return nightRate(period(ymd), kind(type), ymd); }
  function standard(type) { return STANDARD[kind(type)]; }
  function memberRate(r, pct) { return Math.round(r * (100 - (Number(pct) || 0)) / 100); }
  function addDay(ymd, n) { var p = ymd.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)).toISOString().slice(0, 10); }
  /* Full price of a stay: every night priced on its own date. pct = member discount (0 for guests). */
  function quote(type, ci, co, rooms, pct) {
    rooms = Math.max(1, Number(rooms) || 1);
    var out = { nights: 0, standard: 0, offer: 0, total: 0, perNight: [], offerName: '', mixed: false };
    if (!ci || !co || co <= ci) return out;
    var d = ci, first = null;
    while (d < co && out.nights < 400) {
      var p = period(d), r = nightRate(p, kind(type), d), m = memberRate(r, pct);
      out.perNight.push({ date: d, rate: r, member: m, offer: !!p.offer });
      out.standard += standard(type) * rooms; out.offer += r * rooms; out.total += m * rooms;
      if (p.offer && !out.offerName) out.offerName = p.offer.name;
      if (first === null) first = r; else if (r !== first) out.mixed = true;
      out.nights++; d = addDay(d, 1);
    }
    return out;
  }
  root.NikadiRates = { setDeal: setDeal, deal: deal, usual: function (type, ymd) { ymd = String(ymd || todayIST()).slice(0, 10); return baseRate(period(ymd), kind(type), ymd); }, STANDARD: STANDARD, PERIODS: PERIODS, kind: kind, period: period, rate: rate, standard: standard, memberRate: memberRate, quote: quote, today: todayIST, isFriSat: isFriSat, WEEKEND_UP: WEEKEND_UP };
})(typeof window !== 'undefined' ? window : this);
