/**
 * Nikadi Guest House — Membership points backend
 * ------------------------------------------------
 * Runs as a Google Apps Script web app attached to a Google Sheet.
 * The Sheet is the database: Members, Transactions, Otps, Sessions, Settings.
 *
 * First-time setup (see backend/SETUP.md):
 *   1. Paste this file into Extensions > Apps Script of a new Google Sheet.
 *   2. Run the function `setup` once (creates the tabs and default settings).
 *   3. Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 *   4. Send the Web app URL to Claude to connect the website.
 */

var TABS = {
  members: ['Phone', 'Name', 'Email', 'City', 'Date of birth', 'Joined', 'Points', 'Lifetime points', 'Status', 'Notes',
    'Password (hashed)', 'Tier', 'Platinum Plus until', 'Nights (last 2 years)', 'Lifetime nights'],
  tx: ['Date', 'Phone', 'Name', 'Type', 'Amount (₹)', 'Points', 'Balance after', 'Note', 'By'],
  otps: ['Phone', 'Hash', 'Purpose', 'Expires', 'Attempts', 'Payload'],
  sessions: ['Token', 'Phone', 'Role', 'Expires'],
  settings: ['Key', 'Value', 'What it means']
};
var SHEET_NAMES = { members: 'Members', tx: 'Transactions', otps: 'Otps', sessions: 'Sessions', settings: 'Settings' };

/* Membership levels. Gold and Platinum count nights in the last 2 years (they renew).
   Platinum Plus: 100 nights in total; once reached it is kept for 10 years. */
/* Benefits: each level lists what it ADDS or IMPROVES (same id = replaces the lower level's line).
   onsite = staff must honour it during the stay (shown in the staff app). */
var TIERS = [
  { key: 'silver', name: 'Silver', nights: 0, discount: 5, earn: 1, birthday: 50, perks: [
    { id: 'rate', text: '5% member rate on every booking' },
    { id: 'points', text: '1 point for every ₹100 of room tariff' },
    { id: 'welcome', text: '100 welcome points when you join' },
    { id: 'offers', text: 'Member-only offers on WhatsApp' },
    { id: 'birthday', text: '50 bonus points in your birthday month' }] },
  { key: 'gold', name: 'Gold', nights: 15, discount: 10, earn: 1.5, birthday: 100, perks: [
    { id: 'rate', text: '10% member rate on every booking' },
    { id: 'points', text: '1.5 points for every ₹100 of room tariff' },
    { id: 'earlyci', text: 'Early check-in from 9 AM, when available', onsite: true },
    { id: 'birthday', text: '100 bonus points in your birthday month' }] },
  { key: 'platinum', name: 'Platinum', nights: 40, discount: 15, earn: 2, birthday: 100, perks: [
    { id: 'rate', text: '15% member rate on every booking' },
    { id: 'points', text: '2 points for every ₹100 of room tariff' },
    { id: 'latecheckout', text: 'Free late check-out till 11 AM (usually ₹1,500)', onsite: true },
    { id: 'upgrade', text: 'Free room upgrade, when available', onsite: true },
    { id: 'dental', text: 'Free dental kit every stay', onsite: true }] },
  { key: 'plus', name: 'Platinum Plus', nights: 100, discount: 20, earn: 4, birthday: 100, perks: [
    { id: 'rate', text: '20% member rate on every booking' },
    { id: 'points', text: '4 points for every ₹100 of room tariff' },
    { id: 'latecheckout', text: 'Free late check-out till 12 noon', onsite: true },
    { id: 'mattress', text: 'Free extra mattress when needed', onsite: true },
    { id: 'festival', text: 'Priority booking for festivals (Gaura Purnima, Kartik)' },
    { id: 'hold', text: 'Your level is kept for 10 years' }] }
];
/** All benefits a level has, including what it inherits from the levels below. */
function tierPerks_(tier) {
  var out = [], idx = {};
  for (var i = 0; i < TIERS.length; i++) {
    TIERS[i].perks.forEach(function (p) {
      var row = { id: p.id, text: p.text, onsite: !!p.onsite, from: TIERS[i].key };
      if (idx.hasOwnProperty(p.id)) out[idx[p.id]] = row; else { idx[p.id] = out.length; out.push(row); }
    });
    if (TIERS[i].key === tier.key) break;
  }
  return out;
}
var TIER_WINDOW_DAYS = 730;   // Gold / Platinum: nights in the last 2 years
var PLUS_HOLD_YEARS = 10;     // Platinum Plus is kept this long once reached
var BASE_RATES = { 'Deluxe Double (King)': 5000, 'Deluxe Twin': 4500, 'Large Twin': 5000 };
/* Room price by the date of each night. Same table as /pricing.js (website) and staff/logic.js (staff app): change all three together. */
var RATE_PERIODS = [
  { from: '2000-01-01', to: '2026-12-23', double: 3500, twin: 3000, offer: 'Special offer till 23 December' },
  { from: '2026-12-24', to: '2027-05-05', double: 5000, twin: 4500, offer: '' },
  { from: '2027-05-06', to: '9999-12-31', double: 3500, twin: 3000, offer: 'Summer Darshan Special' }
];
function rateKind_(type) { var t = String(type || ''); return /large/i.test(t) ? 'double' : /twin/i.test(t) ? 'twin' : 'double'; }
function todayIst_() { return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd'); }
function ratePeriod_(ymd) { ymd = String(ymd || todayIst_()).slice(0, 10); for (var i = 0; i < RATE_PERIODS.length; i++) if (ymd >= RATE_PERIODS[i].from && ymd <= RATE_PERIODS[i].to) return RATE_PERIODS[i]; return RATE_PERIODS[RATE_PERIODS.length - 1]; }
function rateFor_(type, ymd) { return ratePeriod_(ymd)[rateKind_(type)]; }
function addDayYmd_(ymd, n) { var p = ymd.split('-'); return Utilities.formatDate(new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n, 12)), 'UTC', 'yyyy-MM-dd'); }
/** Price of a stay with every night priced on its own date; pct = member discount. */
function stayQuote_(type, ci, co, rooms, pct) {
  rooms = Math.max(1, Number(rooms) || 1);
  var q = { nights: 0, total: 0, offerTotal: 0, rates: [], offer: '' }, d = String(ci || '').slice(0, 10), end = String(co || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end <= d) return q;
  while (d < end && q.nights < 400) {
    var per = ratePeriod_(d), r = per[rateKind_(type)], m = Math.round(r * (100 - (Number(pct) || 0)) / 100);
    q.rates.push(m); q.total += m * rooms; q.offerTotal += r * rooms; if (per.offer && !q.offer) q.offer = per.offer;
    q.nights++; d = addDayYmd_(d, 1);
  }
  return q;
}

var DEFAULT_SETTINGS = [
  ['STAFF_PIN', '2468', 'PIN for the staff panel. CHANGE THIS to your own 4–8 digit PIN.'],
  ['POINTS_PER_100', 1, 'Points earned for every ₹100 of room tariff.'],
  ['WELCOME_POINTS', 100, 'Bonus points when a member joins.'],
  ['DISCOUNT_POINTS', 100, 'Points needed for one discount reward.'],
  ['DISCOUNT_VALUE', 500, 'Rupee value of one discount reward.'],
  ['FREE_NIGHT_POINTS', 500, 'Points needed for one free night (any room).'],
  ['OTP_CHANNEL', 'email', 'How OTPs and balance updates are sent: email, sms or none. Use sms once your SMS account is approved.'],
  ['SMS_PROVIDER', '', 'msg91 or fast2sms (set up later).'],
  ['SMS_API_KEY', '', 'API key from the SMS provider.'],
  ['SMS_SENDER_ID', '', 'DLT-approved 6-letter sender ID, e.g. NIKADI.'],
  ['SMS_TEMPLATE_OTP', '', 'DLT template ID for the OTP message.'],
  ['SMS_TEMPLATE_BALANCE', '', 'DLT template ID for the points balance message.'],
  ['OWNER_EMAIL', '', 'Your email, to get a notice when someone joins.']
];

/* ------------------------------------------------------------------ */
/* Setup                                                               */
/* ------------------------------------------------------------------ */

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABS).forEach(function (k) {
    var name = SHEET_NAMES[k];
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(TABS[k]);
      sh.setFrozenRows(1);
    } else if (sh.getLastColumn() < TABS[k].length) {
      sh.getRange(1, 1, 1, TABS[k].length).setValues([TABS[k]]); // new columns added in a later version
    }
    sh.getRange(1, 1, 1, TABS[k].length).setFontWeight('bold').setBackground('#1b1714').setFontColor('#e0be7a');
  });
  ss.getSheetByName('Members').getRange('K:K').setNumberFormat('@');
  // Phone columns are plain text so leading digits are never lost
  ss.getSheetByName('Members').getRange('A:A').setNumberFormat('@');
  ss.getSheetByName('Transactions').getRange('B:B').setNumberFormat('@');
  ss.getSheetByName('Otps').getRange('A:A').setNumberFormat('@');
  var st = ss.getSheetByName('Settings');
  var have = st.getLastRow() > 1 ? st.getRange(2, 1, st.getLastRow() - 1, 1).getValues().map(function (r) { return r[0]; }) : [];
  DEFAULT_SETTINGS.forEach(function (row) { if (have.indexOf(row[0]) < 0) st.appendRow(row); });
  st.autoResizeColumns(1, 3);
  ['Otps', 'Sessions'].forEach(function (n) { ss.getSheetByName(n).hideSheet(); });
  var def = ss.getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
  if (typeof deskSetup_ === 'function') deskSetup_();
  return 'Setup complete';
}

/* ------------------------------------------------------------------ */
/* HTTP entry points                                                   */
/* ------------------------------------------------------------------ */

function doGet() {
  return json_({ ok: true, service: 'Nikadi Membership', time: new Date().toISOString() });
}

function doPost(e) {
  if (e && e.parameter && e.parameter.yc) return ycWebhook_(e); // WhatsApp (YCloud) webhook
  var req;
  try { req = JSON.parse(e.postData.contents || '{}'); } catch (err) { return json_({ ok: false, error: 'bad_request' }); }
  var actions = {
    config: apiConfig_, lookup: apiLookup_, join: apiJoin_, otpSend: apiOtpSend_, otpVerify: apiOtpVerify_, me: apiMe_,
    login: apiLogin_, passStart: apiPassStart_, passSet: apiPassSet_, book: apiBook_,
    payConfig: payConfig_, payOrder: payOrder_, payVerify: payVerify_,
    staffLogin: staffLogin_, staffMember: staffMember_, staffCreate: staffCreate_, staffAddStay: staffAddStay_,
    staffRedeemStart: staffRedeemStart_, staffRedeemConfirm: staffRedeemConfirm_, staffAdjust: staffAdjust_, staffRecent: staffRecent_
  };
  if (req.action === 'nkBridge') return nkBridgeRun_(req); // the new Nikadi server asks Google to do Drive / email work
  if (req.action === 'nkPair') return nkPair_(req);
  var fn = actions[req.action];
  // Staff app (Staff.gs): every action starting with "desk"
  if (!fn && /^desk[A-Z]\w*$/.test(String(req.action)) && typeof deskHandle_ === 'function') fn = deskHandle_;
  if (!fn) return json_({ ok: false, error: 'unknown_action' });
  // Screens the staff app refreshes all the time only read the sheet: they don't wait in the queue for the lock
  // (so a busy WhatsApp minute or another device saving can't make every phone slow).
  if (DESK_READ_ONLY_[req.action]) {
    try { DESK_NO_LOCK_ = true; return json_(Object.assign({ ok: true }, fn(req))); }
    catch (err) { var c0 = String(err && err.message || err); if (!/^[a-z_]+$/.test(c0)) { console.error(err); nkAlert_('Error in ' + req.action, nkErr_(err)); c0 = 'server_error'; } return json_({ ok: false, error: c0 }); }
  }
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var out = fn(req);
    return json_(Object.assign({ ok: true }, out));
  } catch (err) {
    var code = String(err && err.message || err);
    if (!/^[a-z_]+$/.test(code)) { console.error(err); code = 'server_error'; nkAlert_(/Lock|timed out|lock/i.test(String(err)) ? 'App was too busy (' + req.action + ')' : 'Error in ' + req.action, nkErr_(err)); }
    return json_({ ok: false, error: code });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

var DESK_READ_ONLY_ = { deskState: 1, deskCalendar: 1, deskBookings: 1, deskWaChats: 1, deskWaChat: 1, deskWaPhoto: 1, config: 1, me: 1, deskBeat: 1, deskLive: 1 };
var DESK_NO_LOCK_ = false;

/* Error alerts: an email to the owner when something fails in the background (same problem at most once in 6 hours). */
function nkAlert_(subject, detail) {
  try {
    var c = CacheService.getScriptCache(), k = 'alert_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, subject)).slice(0, 20);
    if (c.get(k)) return; c.put(k, '1', 21600);
    var to = ''; try { to = settings_().OWNER_EMAIL; } catch (e) {}
    if (!to) to = NikadiBill.HOTEL.email; // the guest house Gmail (public address on the bills)
    MailApp.sendEmail(String(to), '⚠ Nikadi app: ' + subject, 'Something did not work in the Nikadi staff app / website and may need a look.\n\n' + subject + '\n\nDetails:\n' + String(detail || '').slice(0, 3000) +
      '\n\nTime: ' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd MMM yyyy, hh:mm a') + '\n(The same problem is reported at most once every 6 hours.)');
  } catch (e) { console.error(e); }
}
function nkErr_(err) { return String(err && (err.stack || err.message) || err); }

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function sheet_(k) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES[k]); }

function settings_() {
  var cache = CacheService.getScriptCache();
  var c = cache.get('settings');
  if (c) return JSON.parse(c);
  var sh = sheet_('settings'), out = {};
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) { out[r[0]] = r[1]; });
  cache.put('settings', JSON.stringify(out), 60);
  return out;
}
function num_(v, d) { var n = Number(v); return isFinite(n) && v !== '' ? n : d; }

function normPhone_(p) {
  var d = String(p || '').replace(/\D/g, '');
  if (d.length === 12 && d.indexOf('91') === 0) d = d.slice(2);
  if (d.length === 11 && d.charAt(0) === '0') d = d.slice(1);
  if (!/^[6-9]\d{9}$/.test(d)) throw new Error('invalid_phone');
  return d;
}
function maskPhone_(p) { return p.slice(0, 2) + '******' + p.slice(-2); }
function firstName_(n) { return String(n || '').trim().split(/\s+/)[0]; }
function hash_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function token_() { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); }
function clean_(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 120); }
function fmtDate_(d) { return Utilities.formatDate(new Date(d), 'Asia/Kolkata', 'd MMM yyyy, h:mm a'); }

function findMember_(phone) {
  var sh = sheet_('members'), n = sh.getLastRow();
  if (n < 2) return null;
  var vals = sh.getRange(2, 1, n - 1, TABS.members.length).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).replace(/^'/, '') === phone) {
      var r = vals[i];
      return { row: i + 2, phone: phone, name: r[1], email: r[2], city: r[3], dob: r[4], joined: r[5], points: num_(r[6], 0), lifetime: num_(r[7], 0), status: r[8] || 'Active',
        pass: String(r[10] || ''), tierName: String(r[11] || ''), plusUntil: r[12] ? new Date(r[12]) : null, nights2y: num_(r[13], 0), nightsAll: num_(r[14], 0) };
    }
  }
  return null;
}
function publicMember_(m) {
  var s = settings_();
  var t = tierOf_(m);
  return {
    tier: t.tier.name, tierKey: t.tier.key, discount: t.tier.discount, earn: t.tier.earn, nights2y: t.nights2y, nightsAll: t.nightsAll, perks: tierPerks_(t.tier),
    plusUntil: t.plusUntil ? Utilities.formatDate(t.plusUntil, 'Asia/Kolkata', 'd MMM yyyy') : '',
    next: t.next ? { name: t.next.name, need: t.need, nights: t.next.nights } : null, hasPassword: !!m.pass,
    phone: m.phone, masked: maskPhone_(m.phone), name: m.name, firstName: firstName_(m.name), email: m.email, city: m.city,
    joined: m.joined ? fmtDate_(m.joined) : '', points: m.points, lifetime: m.lifetime, status: m.status,
    freeNightPoints: num_(s.FREE_NIGHT_POINTS, 500), discountPoints: num_(s.DISCOUNT_POINTS, 100), discountValue: num_(s.DISCOUNT_VALUE, 500)
  };
}
function history_(phone, limit) {
  var sh = sheet_('tx'), n = sh.getLastRow(), out = [];
  if (n < 2) return out;
  var vals = sh.getRange(2, 1, n - 1, TABS.tx.length).getValues();
  for (var i = vals.length - 1; i >= 0 && out.length < (limit || 50); i--) {
    var r = vals[i];
    if (phone && String(r[1]) !== phone) continue;
    out.push({ date: fmtDate_(r[0]), phone: String(r[1]), name: r[2], type: r[3], amount: r[4], points: r[5], balance: r[6], note: r[7] });
  }
  return out;
}

/** Adds a transaction and updates the member's balance. Returns the new balance. */
function addTx_(m, type, amount, points, note, by) {
  var newBal = m.points + points;
  if (newBal < 0) throw new Error('insufficient_points');
  var ms = sheet_('members');
  ms.getRange(m.row, 7).setValue(newBal);
  if (points > 0) ms.getRange(m.row, 8).setValue(m.lifetime + points);
  sheet_('tx').appendRow([new Date(), m.phone, m.name, type, amount || '', points, newBal, clean_(note, 200), by || '']);
  m.points = newBal;
  if (points > 0) m.lifetime += points;
  return newBal;
}

/* ---------------- Levels (tiers) ---------------- */

/** Nights a member has stayed: checked-out stays in the staff app (matched by phone) + manual "Nights" entries. */
function memberNights_(phone, skipStay) {
  var out = [];
  if (typeof deskDb_ === 'function') {
    try {
      deskDb_().all('stays').forEach(function (st) {
        if (String(st.phone) === phone && st.status === 'Checked out' && st.id !== skipStay) out.push({ date: st.checkout, nights: num_(st.nights, 0) });
      });
    } catch (e) {}
  }
  var sh = sheet_('tx'), n = sh.getLastRow();
  if (n > 1) sh.getRange(2, 1, n - 1, 5).getValues().forEach(function (r) {
    if (String(r[1]).replace(/^'/, '') === phone && r[3] === 'Nights') out.push({ date: Utilities.formatDate(new Date(r[0]), 'Asia/Kolkata', 'yyyy-MM-dd'), nights: num_(r[4], 0) });
  });
  return out;
}

function tierOf_(m, skipStay) {
  var list = memberNights_(m.phone, skipStay), now = new Date();
  var since = Utilities.formatDate(new Date(now.getTime() - TIER_WINDOW_DAYS * 864e5), 'Asia/Kolkata', 'yyyy-MM-dd');
  var nightsAll = 0, nights2y = 0;
  list.forEach(function (x) { nightsAll += x.nights; if (x.date >= since) nights2y += x.nights; });
  var plus = TIERS[3], plusUntil = m.plusUntil && !isNaN(m.plusUntil) ? m.plusUntil : null, tier;
  if (plusUntil && plusUntil > now) tier = plus;
  else {
    // Platinum Plus: 100 nights counted after any earlier Platinum Plus period ended
    var from = plusUntil ? Utilities.formatDate(plusUntil, 'Asia/Kolkata', 'yyyy-MM-dd') : '0000';
    var forPlus = 0; list.forEach(function (x) { if (x.date >= from) forPlus += x.nights; });
    if (forPlus >= plus.nights) { tier = plus; plusUntil = new Date(now.getTime()); plusUntil.setFullYear(plusUntil.getFullYear() + PLUS_HOLD_YEARS); }
    else tier = nights2y >= TIERS[2].nights ? TIERS[2] : nights2y >= TIERS[1].nights ? TIERS[1] : TIERS[0];
  }
  var next = tier.key === 'plus' ? null : tier.key === 'platinum' ? plus : TIERS[TIERS.indexOf(tier) + 1];
  var need = next ? (next.key === 'plus' ? Math.max(0, plus.nights - nightsAll) : Math.max(0, next.nights - nights2y)) : 0;
  // keep the sheet columns readable for the owner (only write when something changed)
  if (m.row && !skipStay && (m.tierName !== tier.name || m.nights2y !== nights2y || m.nightsAll !== nightsAll || String(m.plusUntil || '') !== String(tier.key === 'plus' ? plusUntil : m.plusUntil || ''))) {
    sheet_('members').getRange(m.row, 12, 1, 4).setValues([[tier.name, tier.key === 'plus' ? plusUntil : (m.plusUntil || ''), nights2y, nightsAll]]);
    m.tierName = tier.name; m.nights2y = nights2y; m.nightsAll = nightsAll; if (tier.key === 'plus') m.plusUntil = plusUntil;
  }
  return { tier: tier, next: next, need: need, nights2y: nights2y, nightsAll: nightsAll, plusUntil: tier.key === 'plus' ? plusUntil : null };
}

/** Staff app check-out → points for members (room tariff only, × level multiplier). Called from Staff.gs. */
function memberStayPoints_(st) {
  var phone; try { phone = normPhone_(st.phone); } catch (e) { return null; }
  var m = findMember_(phone);
  if (!m || m.status === 'Blocked' || !(st.roomTotal > 0)) return null;
  birthdayBonus_(m);
  var t = tierOf_(m, st.id); // the level held before this stay decides the earning rate
  var pts = Math.floor(st.roomTotal / 100 * num_(settings_().POINTS_PER_100, 1) * t.tier.earn);
  addTx_(m, 'Stay', st.roomTotal, pts, 'Room ' + st.room + ' · ' + st.nights + (st.nights > 1 ? ' nights' : ' night') + ' · ' + st.checkin + ' to ' + st.checkout + ' · ' + t.tier.name + ' ×' + t.tier.earn, 'Staff app');
  var after = tierOf_(m);
  notify_(m, 'Thank you for staying with us! ' + pts + ' points added for your stay in room ' + st.room + '. Your balance: ' + m.points + ' points. Level: ' + after.tier.name +
    (after.tier.key !== t.tier.key ? ' (congratulations, you moved up!)' : '') + '.');
  return { name: m.name, points: pts, balance: m.points, tier: after.tier.name };
}

/** A check-out was reversed (the guest is still staying): take back the points given for that stay.
    They are given again at the real check-out. Called from Staff.gs. */
function memberCheckoutUndo_(st) {
  var phone; try { phone = normPhone_(st.phone); } catch (e) { return null; }
  var m = findMember_(phone);
  if (!m || m.status === 'Blocked' || !(st.roomTotal > 0)) return null;
  var t = tierOf_(m, st.id);
  var pts = Math.floor(st.roomTotal / 100 * num_(settings_().POINTS_PER_100, 1) * t.tier.earn);
  if (pts > m.points) pts = m.points; // never below zero
  if (!pts) return { points: 0, balance: m.points };
  addTx_(m, 'Stay correction', -st.roomTotal, -pts, 'Room ' + st.room + ' · check-out reversed (guest still staying) · points come back at check-out', 'Staff app');
  return { points: -pts, balance: m.points };
}

/** A manager corrected the room charges of a stay after check-out: add or take back the difference in points. */
function memberStayAdjust_(st) {
  var phone; try { phone = normPhone_(st.phone); } catch (e) { return null; }
  var m = findMember_(phone);
  if (!m || m.status === 'Blocked') return null;
  var t = tierOf_(m, st.id), per = num_(settings_().POINTS_PER_100, 1) * t.tier.earn;
  var pts = Math.floor(Math.max(0, st.roomTotal) / 100 * per) - Math.floor(Math.max(0, st.before) / 100 * per);
  if (!pts) return { points: 0, balance: m.points };
  if (m.points + pts < 0) pts = -m.points; // never below zero
  addTx_(m, 'Stay correction', st.roomTotal - st.before, pts, 'Room ' + st.room + ' · bill corrected to ' + st.nights + (st.nights > 1 ? ' nights' : ' night') + ', room ₹' + st.roomTotal + ' (was ₹' + st.before + ')', 'Staff app');
  return { points: pts, balance: m.points };
}

/** Birthday bonus: once a year, in the member's birthday month, the next time they use the app or check out. */
function birthdayBonus_(m) {
  try {
    if (!m || !m.dob || m.status === 'Blocked') return;
    var dob = m.dob instanceof Date ? Utilities.formatDate(m.dob, 'Asia/Kolkata', 'yyyy-MM-dd') : String(m.dob);
    var mm = dob.slice(5, 7), now = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM');
    if (!/^\d{2}$/.test(mm) || now.slice(5, 7) !== mm) return;
    var year = now.slice(0, 4), sh = sheet_('tx'), n = sh.getLastRow();
    if (n > 1) {
      var rows = sh.getRange(2, 1, n - 1, 8).getValues();
      for (var i = 0; i < rows.length; i++) if (String(rows[i][1]).replace(/^'/, '') === m.phone && rows[i][3] === 'Birthday' && String(rows[i][7]).indexOf(year) >= 0) return;
    }
    var t = tierOf_(m);
    addTx_(m, 'Birthday', '', t.tier.birthday, 'Birthday bonus ' + year + ' · ' + t.tier.name, 'Automatic');
    notify_(m, 'Happy birthday from Nikadi Guest House! ' + t.tier.birthday + ' bonus points have been added. Your balance: ' + m.points + ' points.');
  } catch (e) {}
}

/** For the staff app: is this phone a member, at what level, and which perks must staff honour? */
function memberDesk_(phone) {
  var m = findMember_(phone);
  if (!m || m.status === 'Blocked') return null;
  var t = tierOf_(m);
  return { name: m.name, email: m.email || '', tier: t.tier.name, tierKey: t.tier.key, discount: t.tier.discount, points: m.points,
    onsite: tierPerks_(t.tier).filter(function (p) { return p.onsite; }).map(function (p) { return p.text; }),
    rates: Object.keys(BASE_RATES).reduce(function (o, k) { o[k] = Math.round(rateFor_(k) * (100 - t.tier.discount) / 100); return o; }, {}) };
}

/* ---------------- Passwords ---------------- */
function pwHash_(pw, salt) { var h = salt + ':' + pw; for (var i = 0; i < 150; i++) h = hash_(salt + h); return h; }
function pwMake_(pw) {
  pw = String(pw || '');
  if (pw.length < 6 || pw.length > 64) throw new Error('weak_password');
  var salt = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  return salt + '$' + pwHash_(pw, salt);
}
function pwCheck_(m, pw) {
  if (!m.pass) return false;
  var parts = m.pass.split('$');
  return parts.length === 2 && pwHash_(String(pw || ''), parts[0]) === parts[1];
}
function pwSet_(m, pw) { var v = pwMake_(pw); sheet_('members').getRange(m.row, 11).setValue(v); m.pass = v; }

function createMember_(d, by) {
  var phone = normPhone_(d.phone);
  if (findMember_(phone)) throw new Error('already_member');
  var name = clean_(d.name, 80);
  if (name.length < 2) throw new Error('name_required');
  var email = clean_(d.email, 120);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('invalid_email');
  var ms = sheet_('members');
  if (d.password != null && d.password !== '') pwMake_(d.password); // validate before saving anything
  ms.appendRow(["'" + phone, name, email, clean_(d.city, 80), clean_(d.dob, 20), new Date(), 0, 0, 'Active', clean_(d.note, 200), '', 'Silver', '', 0, 0]);
  var m = findMember_(phone);
  if (d.password) pwSet_(m, d.password);
  var s = settings_(), wp = num_(s.WELCOME_POINTS, 100);
  if (wp > 0) addTx_(m, 'Welcome', '', wp, 'Welcome bonus', by || 'Website');
  notify_(m, 'Welcome to Nikadi Membership! ' + wp + ' welcome points have been added. Your balance: ' + m.points + ' points.');
  if (s.OWNER_EMAIL) {
    try { MailApp.sendEmail(String(s.OWNER_EMAIL), 'New Nikadi member: ' + name, name + ' (' + phone + ', ' + (d.city || '') + ') joined via ' + (by || 'Website') + '.'); } catch (e) {}
  }
  return m;
}

/* ---------------- Messaging (OTP + balance updates) ---------------- */

function channelFor_(m) {
  var ch = String(settings_().OTP_CHANNEL || 'email').toLowerCase();
  if (ch === 'sms' && settings_().SMS_API_KEY) return 'sms';
  if (m && m.email) return 'email';
  return 'none';
}

/** Sends a short message to a member (balance updates). Never throws. */
function notify_(m, text) {
  try {
    var ch = channelFor_(m);
    if (ch === 'sms') sendSms_(m.phone, 'balance', { name: firstName_(m.name), points: m.points, text: text });
    else if (ch === 'email') MailApp.sendEmail(m.email, 'Nikadi Membership: ' + m.points + ' points', 'Hare Krishna ' + firstName_(m.name) + ',\n\n' + text + '\n\nNikadi Guest House, Sri Dham Mayapur\nwww.nikadiguesthouse.com');
  } catch (e) { console.error(e); }
}

function sendOtpMessage_(m, code, purposeText) {
  var ch = channelFor_(m);
  if (ch === 'sms') { sendSms_(m.phone, 'otp', { otp: code }); return 'sms'; }
  if (ch === 'email') {
    MailApp.sendEmail(m.email, 'Your Nikadi OTP: ' + code,
      'Hare Krishna ' + firstName_(m.name) + ',\n\nYour one-time code ' + purposeText + ' is: ' + code + '\n\nIt is valid for 10 minutes. Do not share it with anyone except Nikadi Guest House staff at the front desk.\n\nNikadi Guest House, Sri Dham Mayapur');
    return 'email';
  }
  throw new Error('no_otp_channel');
}

/**
 * SMS sending. Filled in once the SMS account and DLT templates are approved.
 * Supports MSG91 (Flow API) and Fast2SMS (DLT route). Values come from the Settings tab.
 */
function sendSms_(phone, kind, vars) {
  var s = settings_();
  var provider = String(s.SMS_PROVIDER || '').toLowerCase();
  var template = kind === 'otp' ? s.SMS_TEMPLATE_OTP : s.SMS_TEMPLATE_BALANCE;
  if (!provider || !s.SMS_API_KEY || !template) throw new Error('sms_not_configured');
  var res;
  if (provider === 'msg91') {
    var rec = { mobiles: '91' + phone };
    Object.keys(vars).forEach(function (k) { rec[k] = String(vars[k]); });
    res = UrlFetchApp.fetch('https://control.msg91.com/api/v5/flow', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { authkey: String(s.SMS_API_KEY) },
      payload: JSON.stringify({ template_id: String(template), short_url: '0', recipients: [rec] })
    });
  } else if (provider === 'fast2sms') {
    var values = kind === 'otp' ? String(vars.otp) : [vars.name, vars.points].join('|');
    res = UrlFetchApp.fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { authorization: String(s.SMS_API_KEY) },
      payload: JSON.stringify({ route: 'dlt', sender_id: String(s.SMS_SENDER_ID), message: String(template), variables_values: values, numbers: phone, flash: 0 })
    });
  } else {
    throw new Error('sms_not_configured');
  }
  if (res.getResponseCode() >= 300) { console.error(res.getContentText()); throw new Error('sms_failed'); }
}

/* ---------------- OTP store ---------------- */

function otpCreate_(phone, purpose, payload) {
  var code = String(Math.floor(100000 + Math.random() * 900000));
  var sh = sheet_('otps');
  otpClear_(phone, purpose);
  sh.appendRow(["'" + phone, hash_(phone + ':' + code), purpose, new Date(Date.now() + 10 * 60 * 1000), 0, payload ? JSON.stringify(payload) : '']);
  return code;
}
function otpClear_(phone, purpose) {
  var sh = sheet_('otps'), n = sh.getLastRow();
  if (n < 2) return;
  var vals = sh.getRange(2, 1, n - 1, 3).getValues();
  for (var i = vals.length - 1; i >= 0; i--) if (String(vals[i][0]) === phone && vals[i][2] === purpose) sh.deleteRow(i + 2);
}
function otpCheck_(phone, purpose, code) {
  var sh = sheet_('otps'), n = sh.getLastRow();
  if (n < 2) throw new Error('otp_not_found');
  var vals = sh.getRange(2, 1, n - 1, 6).getValues();
  for (var i = vals.length - 1; i >= 0; i--) {
    var r = vals[i];
    if (String(r[0]) !== phone || r[2] !== purpose) continue;
    if (new Date(r[3]).getTime() < Date.now()) { sh.deleteRow(i + 2); throw new Error('otp_expired'); }
    if (num_(r[4], 0) >= 5) { sh.deleteRow(i + 2); throw new Error('otp_too_many'); }
    if (r[1] !== hash_(phone + ':' + String(code || '').replace(/\D/g, ''))) { sh.getRange(i + 2, 5).setValue(num_(r[4], 0) + 1); throw new Error('otp_wrong'); }
    sh.deleteRow(i + 2);
    return r[5] ? JSON.parse(r[5]) : {};
  }
  throw new Error('otp_not_found');
}
/** Max 5 OTPs per phone per hour. */
function otpRate_(phone) {
  var cache = CacheService.getScriptCache(), k = 'otprate_' + phone, c = num_(cache.get(k), 0);
  if (c >= 5) throw new Error('otp_rate_limited');
  cache.put(k, String(c + 1), 3600);
}

/* ---------------- Sessions ---------------- */

function sessionCreate_(phone, role, days) {
  var t = token_();
  sheet_('sessions').appendRow([hash_(t), "'" + phone, role, new Date(Date.now() + days * 864e5)]);
  return t;
}
function sessionGet_(token, role) {
  if (!token) throw new Error('not_logged_in');
  var h = hash_(String(token)), sh = sheet_('sessions'), n = sh.getLastRow();
  if (n < 2) throw new Error('not_logged_in');
  var vals = sh.getRange(2, 1, n - 1, 4).getValues();
  for (var i = vals.length - 1; i >= 0; i--) {
    if (vals[i][0] === h && vals[i][2] === role) {
      if (new Date(vals[i][3]).getTime() < Date.now()) { sh.deleteRow(i + 2); throw new Error('session_expired'); }
      return String(vals[i][1]);
    }
  }
  throw new Error('not_logged_in');
}

/* ------------------------------------------------------------------ */
/* Public API (member app + website)                                   */
/* ------------------------------------------------------------------ */

function apiConfig_() {
  var s = settings_();
  return {
    pointsPer100: num_(s.POINTS_PER_100, 1), welcome: num_(s.WELCOME_POINTS, 100), discountPoints: num_(s.DISCOUNT_POINTS, 100),
    discountValue: num_(s.DISCOUNT_VALUE, 500), freeNightPoints: num_(s.FREE_NIGHT_POINTS, 500), channel: String(s.OTP_CHANNEL || 'email'),
    tiers: TIERS, rates: Object.keys(BASE_RATES).reduce(function (o, k) { o[k] = rateFor_(k); return o; }, {}), standardRates: BASE_RATES, periods: RATE_PERIODS, plusYears: PLUS_HOLD_YEARS, windowYears: TIER_WINDOW_DAYS / 365
  };
}

/** Balance check by phone number only. Shows first name and points, nothing else. */
function apiLookup_(req) {
  var phone = normPhone_(req.phone);
  var m = findMember_(phone);
  if (!m) return { found: false };
  var p = publicMember_(m);
  return { found: true, member: { firstName: p.firstName, masked: p.masked, points: p.points, tier: p.tier, freeNightPoints: p.freeNightPoints, discountPoints: p.discountPoints, discountValue: p.discountValue, status: p.status } };
}

function apiJoin_(req) {
  if (!req.password) throw new Error('password_required');
  var m = createMember_(req, 'Website');
  return { token: sessionCreate_(m.phone, 'member', 60), member: publicMember_(m), history: history_(m.phone, 50), stays: memberStays_(m.phone) };
}

/** Phone number + password. */
function apiLogin_(req) {
  var phone = normPhone_(req.phone);
  var cache = CacheService.getScriptCache(), k = 'pwfail_' + phone, fails = num_(cache.get(k), 0);
  if (fails >= 8) throw new Error('too_many_attempts');
  var m = findMember_(phone);
  if (!m) throw new Error('not_member');
  if (!m.pass) throw new Error('no_password');
  if (!pwCheck_(m, req.password)) { cache.put(k, String(fails + 1), 900); throw new Error('wrong_password'); }
  cache.remove(k);
  birthdayBonus_(m);
  return { token: sessionCreate_(phone, 'member', 60), member: publicMember_(m), history: history_(phone, 50), stays: memberStays_(phone) };
}

/** Forgot / set password: a code is emailed, then code + new password. */
function apiPassStart_(req) {
  var phone = normPhone_(req.phone);
  var m = findMember_(phone);
  if (!m) throw new Error('not_member');
  otpRate_(phone);
  var code = otpCreate_(phone, 'reset');
  var ch = sendOtpMessage_(m, code, 'to set your Nikadi member app password');
  return { channel: ch, to: ch === 'email' ? m.email.replace(/^(.).*(@.*)$/, '$1***$2') : maskPhone_(phone) };
}
function apiPassSet_(req) {
  var phone = normPhone_(req.phone);
  pwMake_(req.password);
  otpCheck_(phone, 'reset', req.code);
  var m = findMember_(phone);
  if (!m) throw new Error('not_member');
  pwSet_(m, req.password);
  CacheService.getScriptCache().remove('pwfail_' + phone);
  return { token: sessionCreate_(phone, 'member', 60), member: publicMember_(m), history: history_(phone, 50), stays: memberStays_(phone) };
}

/** A member's stays (from the staff app) and bookings, newest first. */
function memberStays_(phone) {
  if (typeof deskDb_ !== 'function') return { stays: [], bookings: [] };
  var db = deskDb_(), stays = [], bookings = [];
  try {
    db.all('stays').forEach(function (s) {
      if (String(s.phone) !== phone || (s.status !== 'Checked out' && s.status !== 'In house')) return;
      stays.push({ id: s.id, room: s.room, checkin: s.checkin, checkout: s.checkout, nights: s.nights, rate: s.rate, roomTotal: s.roomTotal, extras: s.extras,
        paid: s.paid, balance: s.balance, status: s.status });
    });
    db.all('bookings').forEach(function (b) {
      if (String(b.phone) !== phone) return;
      bookings.push({ id: b.id, status: b.status, checkin: b.checkin, checkout: b.checkout, nights: b.nights, guests: b.guests, rooms: b.rooms, roomsNeeded: b.roomsNeeded,
        roomType: b.roomType, rate: b.rate, total: b.total, advanceDue: b.advanceDue, advancePaid: b.advancePaid, refunded: b.refunded, created: b.created });
    });
  } catch (e) {}
  return { stays: stays.reverse(), bookings: bookings.reverse() };
}

/** Members book in the app: lands in the staff app as Pending with their member rate. */
function apiBook_(req) {
  var phone = sessionGet_(req.token, 'member');
  var m = findMember_(phone);
  if (!m) throw new Error('not_member');
  if (typeof deskCore !== 'function') throw new Error('server_error');
  var t = tierOf_(m), type = BASE_RATES[req.roomType] ? req.roomType : 'Deluxe Double (King)';
  var q = stayQuote_(type, req.checkin, req.checkout, 1, t.tier.discount);
  var rate = q.nights ? Math.round(q.total / q.nights) : Math.round(rateFor_(type, req.checkin) * (100 - t.tier.discount) / 100);
  var mixed = q.rates.some(function (x) { return x !== q.rates[0]; });
  var api = deskCore(deskDb_());
  var r = api.bookingRequest({ _internal: true, source: 'Member app', rate: rate, guest: m.name, phone: phone, email: m.email, guests: req.guests, roomsNeeded: req.roomsNeeded,
    roomType: type, checkin: req.checkin, checkout: req.checkout,
    notes: [t.tier.name + ' member · ' + t.tier.discount + '% off ' + (q.offer ? q.offer + ' price' : 'room price') + (mixed ? ' · nightly ₹' + q.rates.join(', ₹') + ' (average ₹' + rate + ')' : ' (₹' + rate + ' a night)'), clean_(req.notes, 200)].filter(Boolean).join(' · ') });
  try {
    var s = settings_();
    if (s.OWNER_EMAIL) MailApp.sendEmail(String(s.OWNER_EMAIL), 'New member booking: ' + m.name, m.name + ' (' + t.tier.name + ', ' + phone + ') asked to book ' + type + ' from ' + req.checkin + ' to ' + req.checkout + '. Open the staff app → Bookings to confirm after the advance is paid.');
  } catch (e) {}
  return { booking: r.id, duplicate: !!r.duplicate, rate: rate, stays: memberStays_(phone) };
}

function apiOtpSend_(req) {
  var phone = normPhone_(req.phone);
  var m = findMember_(phone);
  if (!m) throw new Error('not_member');
  otpRate_(phone);
  var code = otpCreate_(phone, 'login');
  var ch = sendOtpMessage_(m, code, 'to log in to the Nikadi member app');
  return { channel: ch, to: ch === 'email' ? m.email.replace(/^(.).*(@.*)$/, '$1***$2') : maskPhone_(phone) };
}

function apiOtpVerify_(req) {
  var phone = normPhone_(req.phone);
  otpCheck_(phone, 'login', req.code);
  var m = findMember_(phone);
  if (!m) throw new Error('not_member');
  return { token: sessionCreate_(phone, 'member', 60), member: publicMember_(m), history: history_(phone, 50), stays: memberStays_(phone) };
}

function apiMe_(req) {
  var phone = sessionGet_(req.token, 'member');
  var m = findMember_(phone);
  if (!m) throw new Error('not_member');
  birthdayBonus_(m);
  return { member: publicMember_(m), history: history_(phone, 50), stays: memberStays_(phone) };
}

/* ------------------------------------------------------------------ */
/* Staff API                                                           */
/* ------------------------------------------------------------------ */

function staffLogin_(req) {
  var cache = CacheService.getScriptCache(), fails = num_(cache.get('staff_fails'), 0);
  if (fails >= 10) throw new Error('too_many_attempts');
  if (String(req.pin || '') !== String(settings_().STAFF_PIN)) {
    cache.put('staff_fails', String(fails + 1), 900);
    throw new Error('wrong_pin');
  }
  cache.remove('staff_fails');
  return { token: sessionCreate_('STAFF', 'staff', 1), config: apiConfig_() };
}
function staff_(req) { sessionGet_(req.token, 'staff'); }

function staffMember_(req) {
  staff_(req);
  var phone = normPhone_(req.phone);
  var m = findMember_(phone);
  if (!m) return { found: false, phone: phone };
  return { found: true, member: publicMember_(m), history: history_(phone, 30) };
}

function staffCreate_(req) {
  staff_(req);
  var m = createMember_(req, 'Front desk');
  return { member: publicMember_(m), history: history_(m.phone, 30) };
}

function staffAddStay_(req) {
  staff_(req);
  var m = findMember_(normPhone_(req.phone));
  if (!m) throw new Error('not_member');
  var amount = Math.round(num_(req.amount, 0));
  if (amount <= 0 || amount > 1000000) throw new Error('invalid_amount');
  var pts = Math.floor(amount / 100 * num_(settings_().POINTS_PER_100, 1));
  var note = clean_(req.note, 150) || 'Stay';
  addTx_(m, 'Stay', amount, pts, note, 'Front desk');
  notify_(m, 'Thank you for staying with us! ' + pts + ' points added for your stay (₹' + amount + '). Your balance: ' + m.points + ' points.');
  return { added: pts, member: publicMember_(m), history: history_(m.phone, 30) };
}

function rewardCost_(reward, qty) {
  var s = settings_();
  qty = Math.max(1, Math.min(20, Math.floor(num_(qty, 1))));
  if (reward === 'night') return { points: qty * num_(s.FREE_NIGHT_POINTS, 500), label: qty + ' free night' + (qty > 1 ? 's' : ''), qty: qty };
  if (reward === 'discount') return { points: qty * num_(s.DISCOUNT_POINTS, 100), label: '₹' + (qty * num_(s.DISCOUNT_VALUE, 500)) + ' discount', qty: qty };
  throw new Error('invalid_reward');
}

function staffRedeemStart_(req) {
  staff_(req);
  var m = findMember_(normPhone_(req.phone));
  if (!m) throw new Error('not_member');
  var c = rewardCost_(req.reward, req.qty);
  if (m.points < c.points) throw new Error('insufficient_points');
  otpRate_(m.phone);
  var code = otpCreate_(m.phone, 'redeem', { reward: req.reward, qty: c.qty, points: c.points, label: c.label });
  var ch = sendOtpMessage_(m, code, 'to redeem ' + c.points + ' points for ' + c.label);
  return { channel: ch, to: ch === 'email' ? m.email.replace(/^(.).*(@.*)$/, '$1***$2') : maskPhone_(m.phone), points: c.points, label: c.label };
}

function staffRedeemConfirm_(req) {
  staff_(req);
  var m = findMember_(normPhone_(req.phone));
  if (!m) throw new Error('not_member');
  var p = otpCheck_(m.phone, 'redeem', req.code);
  addTx_(m, 'Redeem', '', -p.points, p.label + (req.note ? ' · ' + clean_(req.note, 100) : ''), 'Front desk');
  notify_(m, p.points + ' points redeemed for ' + p.label + '. Your balance: ' + m.points + ' points.');
  return { redeemed: p.points, label: p.label, member: publicMember_(m), history: history_(m.phone, 30) };
}

function staffAdjust_(req) {
  staff_(req);
  var m = findMember_(normPhone_(req.phone));
  if (!m) throw new Error('not_member');
  var pts = Math.round(num_(req.points, 0));
  if (!pts || Math.abs(pts) > 100000) throw new Error('invalid_points');
  var note = clean_(req.note, 150);
  if (!note) throw new Error('note_required');
  addTx_(m, 'Adjustment', '', pts, note, 'Front desk');
  return { member: publicMember_(m), history: history_(m.phone, 30) };
}

function staffRecent_(req) {
  staff_(req);
  var ms = sheet_('members');
  return { recent: history_(null, 40), members: Math.max(0, ms.getLastRow() - 1) };
}


/* ------------------------------------------------------------------ */
/* Online payments (Razorpay)                                          */
/* ------------------------------------------------------------------ */
/* To switch on: Apps Script editor > Project Settings > Script properties, add
     RAZORPAY_KEY_ID      rzp_live_xxxxxxxx   (or rzp_test_xxxxxxxx to try it first)
     RAZORPAY_KEY_SECRET  the matching key secret
   then Deploy > Manage deployments > edit > New version. The website shows "Pay online" by itself once the key is set.
   Every payment is written to the "Online payments" tab and emailed to OWNER_EMAIL. */
var PAY_TAB = 'Online payments';
var PAY_COLS = ['Paid at', 'Status', 'Amount (₹)', 'Name', 'Phone', 'Email', 'Booking / note', 'Room', 'Check-in', 'Check-out', 'Razorpay order', 'Razorpay payment', 'Method'];
function payKeys_() {
  var p = PropertiesService.getScriptProperties();
  return { id: String(p.getProperty('RAZORPAY_KEY_ID') || ''), secret: String(p.getProperty('RAZORPAY_KEY_SECRET') || '') };
}
function payConfig_() {
  var k = payKeys_();
  return { enabled: !!(k.id && k.secret), keyId: k.id && k.secret ? k.id : '', test: /^rzp_test_/.test(k.id) };
}
function paySheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(PAY_TAB);
  if (!sh) { sh = ss.insertSheet(PAY_TAB); sh.appendRow(PAY_COLS); sh.setFrozenRows(1); sh.getRange(1, 1, 1, PAY_COLS.length).setFontWeight('bold'); }
  return sh;
}
function payOrder_(req) {
  var k = payKeys_();
  if (!k.id || !k.secret) throw new Error('pay_not_setup');
  var amount = Math.round(Number(req.amount) || 0);
  if (!(amount >= 100 && amount <= 300000)) throw new Error('pay_bad_amount');
  var phone = normPhone_(req.phone);
  var name = clean_(req.name, 80);
  if (!name) throw new Error('name_required');
  var receipt = 'NGH' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyMMddHHmmss') + Math.floor(Math.random() * 90 + 10);
  var notes = { name: name, phone: phone, booking: clean_(req.note, 120), room: clean_(req.room, 40), checkin: clean_(req.checkin, 10), checkout: clean_(req.checkout, 10) };
  var res = UrlFetchApp.fetch('https://api.razorpay.com/v1/orders', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(k.id + ':' + k.secret) },
    payload: JSON.stringify({ amount: amount * 100, currency: 'INR', receipt: receipt, notes: notes })
  });
  if (res.getResponseCode() !== 200) { console.error(res.getContentText()); throw new Error('pay_failed'); }
  var o = JSON.parse(res.getContentText());
  paySheet_().appendRow([Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd MMM yyyy, h:mm a'), 'Started', amount, name, phone, clean_(req.email, 120), notes.booking, notes.room, notes.checkin, notes.checkout, o.id, '', '']);
  return { order: o.id, amount: amount * 100, keyId: k.id, name: name, phone: phone };
}
function payVerify_(req) {
  var k = payKeys_();
  if (!k.secret) throw new Error('pay_not_setup');
  var oid = String(req.order || ''), pid = String(req.payment || ''), sig = String(req.signature || '');
  var mac = Utilities.computeHmacSha256Signature(oid + '|' + pid, k.secret).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
  if (!oid || !pid || mac !== sig) throw new Error('pay_unverified');
  var sh = paySheet_(), rows = sh.getDataRange().getValues(), row = -1;
  for (var i = rows.length - 1; i >= 1; i--) if (rows[i][10] === oid) { row = i; break; }
  var method = '';
  try {
    var pr = UrlFetchApp.fetch('https://api.razorpay.com/v1/payments/' + encodeURIComponent(pid), { headers: { Authorization: 'Basic ' + Utilities.base64Encode(k.id + ':' + k.secret) }, muteHttpExceptions: true });
    if (pr.getResponseCode() === 200) method = String(JSON.parse(pr.getContentText()).method || '');
  } catch (e) {}
  if (row > 0) {
    if (rows[row][1] !== 'Paid') { sh.getRange(row + 1, 1).setValue(Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd MMM yyyy, h:mm a')); sh.getRange(row + 1, 2).setValue('Paid'); sh.getRange(row + 1, 12, 1, 2).setValues([[pid, method]]); }
    var r = rows[row];
    try {
      var s = settings_();
      if (s.OWNER_EMAIL) MailApp.sendEmail(String(s.OWNER_EMAIL), 'Online payment received: ₹' + r[2] + ' from ' + r[3],
        r[3] + ' (' + r[4] + ') paid ₹' + r[2] + ' online' + (method ? ' by ' + method : '') + '.\n' + (r[6] ? 'Booking / note: ' + r[6] + '\n' : '') + (r[7] ? 'Room: ' + r[7] + ' · ' + r[8] + ' to ' + r[9] + '\n' : '') + 'Razorpay payment: ' + pid + '\n\nAdd it to the booking in the staff app as an advance (method: Online).');
    } catch (e2) {}
    return { paid: true, amount: r[2], ref: pid };
  }
  return { paid: true, ref: pid };
}

/* ------------------------------------------------------------------ */
/* WhatsApp: automatic assistant + staff-app messages through YCloud   */
/* ------------------------------------------------------------------ */
/* The number +91 75011 01137 stays on the WhatsApp Business app (coexistence) and is also connected to YCloud.
   YCloud sends every incoming message to this script (webhook: the web app URL + ?yc=<YC_HOOK_KEY>).
   The assistant answers booking questions by itself, checks free rooms in the staff app, takes booking requests
   (they land in the staff app as Pending, source "WhatsApp bot") and hands over to reception when asked.
   When reception replies from the phone, the assistant goes quiet for that guest (6 hours).
   Script Properties: YC_API_KEY (YCloud → Developers → API keys), YC_FROM (+917501101137), YC_HOOK_KEY (made by whatsappBotSetup). */
var YC_API = 'https://api.ycloud.com/v2/';
var NK_PHONE_TEXT = '+91 75011 01137';
var NK_SITE = 'https://www.nikadiguesthouse.com';
var NK_MAP = 'https://maps.google.com/?cid=4814848157732686064';
var NK_GEO = { latitude: 23.42668, longitude: 88.3880999, name: 'Nikadi Guest House',
  address: 'Bhaktisiddhanta Saraswati Marg, Opp. ISKCON Gate No. 4 (Namahatta Bhavan), Mayapur, Nadia, West Bengal 741313' };
var WA_ROOM_INFO = {
  'Deluxe Double': { title: 'Deluxe Double', beds: 'king bed', fits: 'up to 2 adults' },
  'Deluxe Twin': { title: 'Deluxe Twin', beds: '2 single beds', fits: 'up to 2 adults' },
  'Large Twin': { title: 'Large Twin', beds: '2 single beds, more space', fits: 'up to 3 adults' }
};

/* Google Sheet menu "Nikadi" → "Connect WhatsApp (YCloud)": the owner pastes the YCloud API key here (kept in Script Properties)
   and copies the webhook address for YCloud → Developers → Webhooks. */
var NK_API_EXEC = 'https://script.google.com/macros/s/AKfycbxMHXOtCvqvzIABjr2_SCPqWIFFrZsO2cLKN6USe3qaVTmRseiQJZLU21EMqx3Y2sYW/exec';
function onOpen() {
  try { SpreadsheetApp.getUi().createMenu('Nikadi').addItem('Connect WhatsApp (YCloud)', 'whatsappConnect').addItem('Show WhatsApp webhook address', 'whatsappShowWebhook').addSeparator().addItem('Refresh staff app data', 'deskRefreshData').addItem('Move old records to the archive now', 'deskArchiveNow').addItem('Back up now (copy of this Sheet)', 'deskBackupNow').addToUi(); } catch (e) {}
}
/* Hand edits in the Sheet: the staff app re-reads that tab (it keeps a fast copy otherwise). */
function onEdit(e) { try { if (typeof deskSheetEdited_ === 'function') deskSheetEdited_(e && e.range ? e.range.getSheet().getName() : ''); } catch (x) {} }
function whatsappConnect() {
  var ui = SpreadsheetApp.getUi(), p = PropertiesService.getScriptProperties();
  var r = ui.prompt('Connect WhatsApp (YCloud)', 'Paste the YCloud API key (YCloud → Developers → API key → Look → copy).' + (p.getProperty('YC_API_KEY') ? '\nA key is already saved; pasting a new one replaces it.' : ''), ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var key = String(r.getResponseText() || '').trim();
  if (!/^[A-Za-z0-9_\-]{16,128}$/.test(key)) { ui.alert('That does not look like a YCloud API key. Nothing was saved.'); return; }
  p.setProperty('YC_API_KEY', key);
  whatsappShowWebhook();
}
function whatsappShowWebhook() {
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty('YC_HOOK_KEY')) p.setProperty('YC_HOOK_KEY', Utilities.getUuid().replace(/-/g, ''));
  if (!p.getProperty('YC_FROM')) p.setProperty('YC_FROM', '+917501101137');
  var url = NK_API_EXEC + '?yc=' + p.getProperty('YC_HOOK_KEY');
  var html = HtmlService.createHtmlOutput('<div style="font:14px Arial;line-height:1.5">' +
    '<p><b>' + (p.getProperty('YC_API_KEY') ? '✅ YCloud API key saved.' : '⚠️ No YCloud API key saved yet.') + '</b></p>' +
    '<p>In YCloud → Developers → Webhooks → <b>Add Endpoints</b>, paste this as the <b>Endpoint URL</b>:</p>' +
    '<textarea id="u" readonly style="width:100%;height:70px;font:12px monospace" onclick="this.select()">' + url + '</textarea>' +
    '<p><button onclick="var t=document.getElementById(\'u\');t.select();document.execCommand(\'copy\');this.textContent=\'Copied ✓\'">Copy</button></p>' +
    '<p>Events: tick <b>whatsapp.inbound_message.received</b> and <b>whatsapp.smb.message.echoes</b>, then Confirm.</p></div>').setWidth(520).setHeight(330);
  SpreadsheetApp.getUi().showModalDialog(html, 'WhatsApp webhook');
}

function ycProps_() { var p = PropertiesService.getScriptProperties(); return { key: p.getProperty('YC_API_KEY') || '', from: p.getProperty('YC_FROM') || '', hook: p.getProperty('YC_HOOK_KEY') || '' }; }
function ycReady_() { var y = ycProps_(); return !!(y.key && y.from); }

/** Run once from the editor: makes the webhook secret and logs the URL to paste in YCloud → Developers → Webhooks. */
function whatsappBotSetup() {
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty('YC_HOOK_KEY')) p.setProperty('YC_HOOK_KEY', Utilities.getUuid().replace(/-/g, ''));
  if (!p.getProperty('YC_FROM')) p.setProperty('YC_FROM', '+917501101137');
  var url = ScriptApp.getService().getUrl() + '?yc=' + p.getProperty('YC_HOOK_KEY');
  console.log('Webhook URL for YCloud: ' + url);
  return url;
}

function ycCall_(path, body, method) {
  var y = ycProps_(); if (!y.key) throw new Error('yc_not_connected');
  var r = UrlFetchApp.fetch(YC_API + path, { method: method || 'post', contentType: 'application/json', headers: { 'X-API-Key': y.key },
    payload: body ? JSON.stringify(body) : null, muteHttpExceptions: true });
  var j = {}; try { j = JSON.parse(r.getContentText()); } catch (e) {}
  if (r.getResponseCode() >= 300) throw new Error('WhatsApp: ' + ((j.error && (j.error.message || j.error.whatsappApiError && j.error.whatsappApiError.message)) || 'HTTP ' + r.getResponseCode()));
  return j;
}
/** One message to one number (msg is the WhatsApp message body without from/to: {type:'text', text:{body}} etc.). */
var _waOutbox = null; // while a WhatsApp webhook is being handled, messages wait here and go out after the lock is released
function ycSend_(to, msg, noLog) {
  var y = ycProps_(), d = String(to).replace(/\D/g, '');
  var num = d.length > 10 && d.slice(0, 2) !== '91' ? '+' + d : '+91' + d.slice(-10); // overseas numbers keep their country code
  var body = Object.assign({ from: y.from, to: num }, msg), j = {};
  if (_waOutbox) _waOutbox.push(body); else j = ycCall_('whatsapp/messages/sendDirectly', body);
  if (!noLog && d.length === 10) { // keep the conversation complete in the staff app
    var t = msg.text ? msg.text.body : msg.interactive ? msg.interactive.body && msg.interactive.body.text : msg.document ? '📄 ' + (msg.document.caption || msg.document.filename || 'File') :
      msg.image ? '📷 ' + (msg.image.caption || 'Photo') : msg.location ? '📍 Location pin' : msg.template ? '[' + msg.template.name + ']' : '';
    try { waCore_().waOut({ _internal: true, phone: d, dir: msg.template || msg.document ? 'Automatic message' : 'Assistant', text: String(t || '').slice(0, 500) }); } catch (e) {}
  }
  return j.wamid || j.id || '';
}
var _waCoreInst = null;
function waCore_() { return _waCoreInst || (_waCoreInst = deskCore(deskDb_(), { memberInfo: typeof memberDesk_ === 'function' ? memberDesk_ : null })); }
/** Staff app → "Send" in a WhatsApp chat (text and / or a photo). Reception is now handling the chat, so the assistant goes quiet. */
function waStaffReply_(phone, text, photo) {
  var id;
  if (photo) {
    var media = ycUploadMedia_(photo, 'image/jpeg', 'photo.jpg');
    id = ycSend_(phone, { type: 'image', image: { id: media, caption: String(text || '').slice(0, 1024) } }, true);
  } else id = ycSend_(phone, { type: 'text', text: { body: String(text).slice(0, 4000), preview_url: true } }, true);
  waHuman_(String(phone).replace(/\D/g, '').slice(-10), 'reception replying from the staff app');
  return id;
}
function waText_(to, body) { return ycSend_(to, { type: 'text', text: { body: String(body).slice(0, 4000), preview_url: true } }); }
function waButtons_(to, body, buttons, footer) {
  var it = { type: 'button', body: { text: String(body).slice(0, 1024) },
    action: { buttons: buttons.slice(0, 3).map(function (b) { return { type: 'reply', reply: { id: b[0], title: String(b[1]).slice(0, 20) } }; }) } };
  if (footer) it.footer = { text: String(footer).slice(0, 60) };
  return ycSend_(to, { type: 'interactive', interactive: it });
}
function waList_(to, body, button, rows, footer) {
  var it = { type: 'list', body: { text: String(body).slice(0, 1024) }, action: { button: String(button).slice(0, 20),
    sections: [{ title: 'Nikadi Guest House', rows: rows.slice(0, 10).map(function (r) { return { id: r[0], title: String(r[1]).slice(0, 24), description: String(r[2] || '').slice(0, 72) }; }) }] } };
  if (footer) it.footer = { text: String(footer).slice(0, 60) };
  return ycSend_(to, { type: 'interactive', interactive: it });
}

/** Run once from the editor: creates the four staff-app message templates in YCloud for Meta's approval (uses the saved API key). */
function whatsappCreateTemplates() {
  var waba = '2190141911588918', foot = { type: 'FOOTER', text: 'Nikadi Guest House · Mayapur' };
  var site = { type: 'URL', text: 'Visit our website', url: NK_SITE };
  var call = { type: 'PHONE_NUMBER', text: 'Call reception', phone_number: '+917501101137' };
  var body = function (name, ex) { return { type: 'BODY', text: WA_TEXTS[name].replace(/\{(\d)\}/g, '{{$1}}'), example: { body_text: [ex] } }; };
  var list = [
    { name: 'nikadi_welcome', category: 'UTILITY', components: [body('nikadi_welcome', ['Radha', '3', '17 Nov 2026', '19 Nov 2026']), foot, { type: 'BUTTONS', buttons: [site, call] }] },
    { name: 'nikadi_membership', category: 'MARKETING', components: [body('nikadi_membership', ['Radha']), foot, { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Join free now', url: NK_SITE + '/app/?join=1' }, site] }] },
    { name: 'nikadi_booking_confirmed', category: 'UTILITY', components: [body('nikadi_booking_confirmed', ['Radha', 'BAOKCD14X', '1', '17 Nov 2026', '19 Nov 2026', '₹3,500']), foot, { type: 'BUTTONS', buttons: [site, call] }] },
    { name: 'nikadi_bill', category: 'UTILITY', components: [{ type: 'HEADER', format: 'DOCUMENT', example: { header_url: [NK_SITE + '/bill/sample-bill.pdf'] } },
      body('nikadi_bill', ['Mrs. Paul', 'NGH/26-27/0142', '₹7,000', 'paid in full']), foot] }
  ];
  var out = list.map(function (t) {
    try { var j = ycCall_('whatsapp/templates', Object.assign({ wabaId: waba, language: 'en' }, t)); return t.name + ': ' + (j.status || 'sent'); }
    catch (e) { return t.name + ': ' + e.message; }
  });
  console.log(out.join('\n'));
  return out;
}

/** Saves a guest's WhatsApp photo / PDF (payment screenshot) to Drive: "Nikadi WhatsApp Payments / yyyy-MM". Returns the file id. */
function waSaveMedia_(media, type, phone, name) {
  var y = ycProps_(), url = media.link || media.url;
  if (!url && media.id) { var j = ycCall_('whatsapp/media/' + encodeURIComponent(media.id), null, 'get'); url = j.url || j.link; }
  if (!url) return '';
  var r = UrlFetchApp.fetch(url, { headers: { 'X-API-Key': y.key }, muteHttpExceptions: true });
  if (r.getResponseCode() >= 300) throw new Error('media download ' + r.getResponseCode());
  var mime = media.mime_type || (type === 'image' ? 'image/jpeg' : 'application/pdf');
  var ext = /pdf/.test(mime) ? '.pdf' : /png/.test(mime) ? '.png' : '.jpg';
  var month = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM'), stamp = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd MMM HH.mm');
  var folder = deskPhotoFolder_(month, 'Nikadi WhatsApp Payments');
  var blob = r.getBlob().setContentType(mime).setName(stamp + ' · ' + (name || '').replace(/[^\w .-]+/g, '') + ' · ' + phone + (media.filename ? ' · ' + String(media.filename).slice(0, 40) : '') + ext);
  return folder.createFile(blob).getId();
}

/* -------- Webhook -------- */
function ycWebhook_(e) {
  var y = ycProps_();
  if (!y.hook || e.parameter.yc !== y.hook) return json_({ ok: false });
  var ev; try { ev = JSON.parse(e.postData.contents || '{}'); } catch (err) { return json_({ ok: true }); }
  var cache = CacheService.getScriptCache(), evId = 'ycev_' + (ev.id || '');
  if (ev.id && cache.get(evId)) return json_({ ok: true }); // YCloud may deliver the same event twice
  if (ev.id) cache.put(evId, '1', 21600);
  var lock = LockService.getScriptLock();
  _waOutbox = [];
  try {
    lock.waitLock(25000);
    var type = String(ev.type || '');
    if (type === 'whatsapp.inbound_message.received' && ev.whatsappInboundMessage) waInbound_(ev.whatsappInboundMessage);
    else if (type === 'whatsapp.smb.message.echoes') { // reception replied from the WhatsApp Business app: let them talk
      var m = ev.whatsappMessage || ev.smbMessageEchoes || ev.whatsappSmbMessageEchoes || ev.smbMessageEcho || {};
      if (!m.to) Object.keys(ev).forEach(function (k) { if (ev[k] && typeof ev[k] === 'object' && ev[k].to && !m.to) m = ev[k]; });
      var to = String(m.to || m.recipient || '').replace(/\D/g, '').slice(-10);
      if (to && m.bizType !== 'api') {
        waHuman_(to, 'staff replied from the phone');
        try { waCore_().waSeen({ _internal: true, phone: to, text: m.text && m.text.body || (m.type && m.type !== 'text' ? '[' + m.type + ']' : '') }); } catch (e) {}
      }
    }
  } catch (err) {
    console.error(err); nkAlert_('WhatsApp message from a guest could not be handled', nkErr_(err));
  } finally { try { lock.releaseLock(); } catch (e2) {} }
  var out = _waOutbox || []; _waOutbox = null;
  out.forEach(function (b) { try { ycCall_('whatsapp/messages/sendDirectly', b); } catch (e) { console.error(e); nkAlert_('WhatsApp reply could not be sent', nkErr_(e) + '\n\nMessage: ' + JSON.stringify(b).slice(0, 500)); } }); // in order, without holding up the staff app
  return json_({ ok: true });
}

function waState_(phone) { var c = CacheService.getScriptCache().get('wast_' + phone); return c ? JSON.parse(c) : {}; }
function waSave_(phone, st) { CacheService.getScriptCache().put('wast_' + phone, JSON.stringify(st), 21600); }
function waHuman_(phone, why) { var st = waState_(phone); st.human = Date.now() + 6 * 3600e3; st.step = ''; st.why = why; waSave_(phone, st); }
function waMember_(phone) {
  try { var m = findMember_(phone); if (!m || m.status === 'Closed') return null; var t = tierOf_(m); return { name: m.name, tier: t.tier.name, pct: t.tier.discount }; } catch (e) { return null; }
}
function waMoney_(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
function waDd_(ymd) { var p = ymd.split('-'), M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return +p[2] + ' ' + M[+p[1] - 1] + ' ' + p[0]; }
function waDow_(ymd) { var p = ymd.split('-'); return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay()]; }

/** "today", "tomorrow", "24 Nov", "Nov 24", "24/11", "24-11-2026", "2026-11-24" → yyyy-mm-dd (null if not a date). */
function waParseDate_(txt, today) {
  var s = String(txt || '').toLowerCase().trim();
  if (/^(today|aaj|aj)\b/.test(s)) return today;
  if (/^(tomorrow|tmrw|tmr|kal)\b/.test(s)) return addDayYmd_(today, 1);
  if (/^day after/.test(s) || /^parso/.test(s)) return addDayYmd_(today, 2);
  var M = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  var y = null, mo = null, d = null, m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = s.match(/^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?:\s*[\/\-.]\s*(\d{2,4}))?/))) { d = +m[1]; mo = +m[2]; if (m[3]) y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; }
  else if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s*)?([a-z]{3})[a-z]*\.?(?:,?\s*(\d{4}))?/)) && M[m[2]]) { d = +m[1]; mo = M[m[2]]; if (m[3]) y = +m[3]; }
  else if ((m = s.match(/^([a-z]{3})[a-z]*\.?\s*(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/)) && M[m[1]]) { mo = M[m[1]]; d = +m[2]; if (m[3]) y = +m[3]; }
  else return null;
  if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return null;
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  if (!y) { y = +today.slice(0, 4); if (y + '-' + pad(mo) + '-' + pad(d) < today) y++; }
  var out = y + '-' + pad(mo) + '-' + pad(d);
  if (addDayYmd_(out, 0) !== out) return null; // 31 Nov etc.
  return out;
}

var WA_MENU_ROWS = [
  ['m_book', '📅 Check rooms & book', 'Free rooms and prices for your dates'],
  ['m_rooms', '🛏️ Rooms & prices', 'Our rooms, today\'s offer and member prices'],
  ['m_loc', '📍 Location', 'Opposite ISKCON Gate No. 4, Mayapur'],
  ['m_policy', '🕚 Check-in & refunds', 'Timings, 50% advance, refunds'],
  ['m_member', '⭐ Membership', 'Free to join: member prices and points'],
  ['m_talk', '📞 Talk to us', 'Call or chat with reception']
];
function waMenu_(to, st, hello) {
  var mem = st.member;
  var head = hello
    ? 'Hare Krishna' + (st.name ? ' ' + st.name : '') + ' 🙏 Welcome to *Nikadi Guest House*, steps away from the Mayapur ISKCON Temple.' +
      (mem ? '\nYou are a *' + mem.tier + ' member*, so you get ' + mem.pct + '% off every night.' : '') +
      '\n\nI am the automatic assistant. I can show free rooms and prices and book your stay right here, any time.' +
      (mem ? '' : '\n⭐ Free membership, join in one tap: ' + NK_SITE + '/app/?join=1') + '\n🌐 ' + NK_SITE
    : 'How else can I help?';
  waList_(to, head + '\n\nPlease choose 👇', 'Menu', WA_MENU_ROWS, 'Reply "menu" any time · "call" to talk to us');
  st.step = 'menu';
}

function waInbound_(msg) {
  var phone = String(msg.from || '').replace(/\D/g, '');
  if (phone.length < 10 || (phone.length > 10 && phone.slice(0, 2) !== '91')) { // overseas numbers: hand to reception
    phone = phone.slice(-15);
  } else phone = phone.slice(-10);
  var cache = CacheService.getScriptCache();
  if (msg.wamid && cache.get('ycw_' + msg.wamid)) return;
  if (msg.wamid) cache.put('ycw_' + msg.wamid, '1', 21600);
  cache.put('ycwin_' + phone.slice(-10), String(Date.now()), 21600); // customer-service window is open: free-form messages allowed

  var st = waState_(phone), text = '', choice = '';
  if (msg.type === 'text' && msg.text) text = String(msg.text.body || '').trim();
  else if (msg.type === 'interactive' && msg.interactive) {
    var r = msg.interactive.button_reply || msg.interactive.list_reply || {}; choice = r.id || ''; text = r.title || '';
  } else if (msg.type === 'button' && msg.button) text = String(msg.button.text || '');
  var low = text.toLowerCase();
  if (!st.name && msg.customerProfile && msg.customerProfile.name) { st.full = String(msg.customerProfile.name).replace(/[^\p{L}\p{M} .'-]/gu, '').trim().slice(0, 60); st.name = st.full.split(/\s+/)[0].slice(0, 30); }
  if (st.member === undefined) st.member = phone.length === 10 ? waMember_(phone) : null;

  /* file every message in the staff app's WhatsApp lists; photos / PDFs (payment screenshots) are saved to Drive */
  var human = !!(st.human && st.human > Date.now()), media = msg.image || msg.document || null, logged = null;
  if (media && media.caption && !text) text = String(media.caption).trim();
  if (phone.length === 10) {
    var fileId = '';
    if (media) { try { fileId = waSaveMedia_(media, msg.type, phone, st.full || st.name || ''); } catch (e) { console.error(e); } }
    try {
      logged = waCore_().waIn({ _internal: true, phone: phone, name: st.full || '',
        text: text || (msg.type === 'interactive' ? '' : msg.type !== 'text' ? '[' + msg.type + ']' : ''), file: fileId, type: media ? msg.type : msg.type === 'interactive' ? 'button' : msg.type,
        mime: media ? media.mime_type || '' : '', wamid: msg.wamid || '', attention: human || (!choice && st.step === 'done') });
    } catch (e) { console.error(e); }
    if (media && logged && logged.proof && !human) {
      var bk = logged.booking;
      waButtons_(phone, '🙏 Thank you' + (st.name ? ' ' + st.name : '') + '! We have received your ' + (msg.type === 'image' ? 'photo' : 'file') + (bk ? ' for booking *' + bk.id + '*' : '') + '.\n\n' +
        (bk ? 'Reception will check the payment and confirm your room here shortly.' : 'Our reception will look at it and reply here shortly.'), [['m_talk', '📞 Talk to us'], ['menu', 'Main menu']]);
      waNotify_((bk ? 'Payment screenshot · booking ' + bk.id : 'WhatsApp photo / file') + ' from ' + (st.full || phone), phone, 'Open the staff app → WhatsApp → Advance paid to see it and confirm the booking.');
      st.step = 'done'; waSave_(phone, st); return;
    }
  }

  var wake = /^(menu|hi+|hello|hey|hare krishna|haribol|namaste|start|bot|0)\b/.test(low);
  if (st.human && st.human > Date.now()) {
    if (choice === 'm_bot' || /^(menu|bot)$/.test(low)) { st.human = 0; waMenu_(phone, st, false); }
    waSave_(phone, st); return; // reception is handling this chat
  }
  if (phone.length !== 10) { waText_(phone, 'Hare Krishna 🙏 Thank you for your message. Our reception will reply to you here shortly. You can also call us on ' + NK_PHONE_TEXT + '.'); waHuman_(phone, 'overseas number'); waNotify_('WhatsApp: overseas guest', phone, text); return; }

  if (!choice) { // typed words
    if (/\b(call|talk|human|person|agent|manager|reception|baat|speak)\b/.test(low)) choice = 'm_talk';
    else if (wake && st.step !== 'date') choice = 'menu';
    else if (!st.step || st.step === 'menu' || st.step === 'done') {
      if (/\b(book|booking|room|rooms|available|availability|vacan|stay|night)/.test(low)) choice = 'm_book';
      else if (/\b(price|rate|tariff|cost|charge|kitna|koto|offer)/.test(low)) choice = 'm_rooms';
      else if (/\b(where|location|address|map|direction|reach|route)/.test(low)) choice = 'm_loc';
      else if (/\b(check.?in|check.?out|cancel|refund|advance|policy|time)/.test(low)) choice = 'm_policy';
      else if (/\b(member|points|card|discount)/.test(low)) choice = 'm_member';
    }
  }
  if (choice === 'menu') { waMenu_(phone, st, true); waSave_(phone, st); return; }
  if (/^m_/.test(choice)) st.step = '';
  var today = todayIst_();

  switch (choice) {
    case 'm_book': case 'b_dates':
      st.step = 'date'; st.ci = st.nights = st.rooms = st.type = null;
      waButtons_(phone, '📅 When would you like to check in?\n\nTap a button, or type the date, for example *24 Nov*.', [['d_today', 'Today'], ['d_tom', 'Tomorrow'], ['d_other', 'Another date']]);
      break;
    case 'm_rooms': waRooms_(phone, st); break;
    case 'm_loc':
      ycSend_(phone, { type: 'location', location: NK_GEO });
      waButtons_(phone, '📍 *Nikadi Guest House*\nBhaktisiddhanta Saraswati Marg, opposite ISKCON Gate No. 4 (Namahatta Bhavan), Mayapur, West Bengal 741313.\n\nReception is on the first floor: enter at the left corner of the building and take the stairs up, near the Mahaprabhu photo.\n\nGoogle Maps: ' + NK_MAP, [['m_book', 'Check rooms & book'], ['menu', 'Main menu'], ['m_talk', 'Talk to us']]);
      st.step = 'menu'; break;
    case 'm_policy':
      waButtons_(phone, '🕚 *Check-in* from 11:00 AM · *Check-out* by 9:00 AM (early arrival or late departure when a room is free).\n\n💳 A *50% advance* holds your room; the balance is paid at check-in. Pay by UPI or bank transfer.\n\n↩️ *Cancellation*: cancel 3 or more days before check-in for a full refund of the advance. Less than 3 days before, on the day, or no-show: the advance is not refunded.\n\nFull details: ' + NK_SITE + '/#book', [['m_book', 'Check rooms & book'], ['menu', 'Main menu'], ['m_talk', 'Talk to us']]);
      st.step = 'menu'; break;
    case 'm_member': waMembership_(phone, st); break;
    case 'm_talk':
      waButtons_(phone, '📞 Please call us on *' + NK_PHONE_TEXT + '* (tap the number to call), or just write your question here.\n\nOur reception will reply to you in this chat personally. The automatic assistant is paused for now.', [['m_bot', 'Back to assistant']]);
      waNotify_('WhatsApp: guest wants to talk', phone, 'Name: ' + (st.name || '') + (st.ci ? '\nLooking at: ' + waDd_(st.ci) + ', ' + (st.nights || '?') + ' night(s), ' + (st.rooms || '?') + ' room(s)' + (st.type ? ', ' + st.type : '') : '') + '\nLast message: ' + text);
      try { waCore_().waMark({ _internal: true, phone: phone, important: 'Wants to talk to reception', unread: true }); } catch (e) {}
      waHuman_(phone, 'guest asked'); return;
    case 'm_bot': waMenu_(phone, st, false); break;
    case 'd_today': case 'd_tom': case 'd_other': case '':
      if (choice === 'd_other') { st.step = 'date'; waText_(phone, 'Please type your check-in date, for example *24 Nov* or *24/11*.'); break; }
      if (st.step === 'date') {
        var ci = choice === 'd_today' ? today : choice === 'd_tom' ? addDayYmd_(today, 1) : waParseDate_(low, today);
        if (!ci) { waText_(phone, 'Sorry, I could not read that date. Please type it like *24 Nov* or *24/11*.'); break; }
        if (ci < today) { waText_(phone, 'That date has passed. Please type a check-in date from today onwards.'); break; }
        if (ci > addDayYmd_(today, 365)) { waText_(phone, 'We take bookings up to one year ahead. Please choose an earlier date, or tap "Talk to us".'); break; }
        st.ci = ci; st.step = 'nights';
        waButtons_(phone, 'Check-in *' + waDow_(ci) + ', ' + waDd_(ci) + '* ✅\n\nHow many nights will you stay? Tap a button or type a number.', [['n_1', '1 night'], ['n_2', '2 nights'], ['n_3', '3 nights']]);
        break;
      }
      if (st.step === 'nights' || st.step === 'rooms') { waNumberStep_(phone, st, low, today); break; }
      waFallback_(phone, st, text); break;
    default:
      if (/^n_\d$/.test(choice)) { st.nights = +choice.slice(2); waAskRooms_(phone, st); break; }
      if (/^r_\d$/.test(choice)) { st.rooms = +choice.slice(2); waAvailability_(phone, st); break; }
      if (/^t_/.test(choice)) { st.type = choice.slice(2); waConfirm_(phone, st); break; }
      if (choice === 'b_yes') { waBook_(phone, st); break; }
      waFallback_(phone, st, text);
  }
  waSave_(phone, st);
}

function waNumberStep_(phone, st, low, today) {
  var n = parseInt(low.replace(/[^\d]/g, ''), 10);
  if (st.step === 'nights') {
    if (!(n >= 1 && n <= 30)) { waText_(phone, 'Please type the number of nights, for example *2*. For stays longer than 30 nights, reply "call".'); return; }
    st.nights = n; waAskRooms_(phone, st);
  } else {
    if (!(n >= 1 && n <= 11)) { waText_(phone, 'Please type how many rooms you need, from 1 to 11.'); return; }
    st.rooms = n; waAvailability_(phone, st);
  }
}
function waAskRooms_(phone, st) {
  st.step = 'rooms';
  waButtons_(phone, waDd_(st.ci) + ' → ' + waDd_(addDayYmd_(st.ci, st.nights)) + ' · ' + st.nights + ' night' + (st.nights > 1 ? 's' : '') + ' ✅\n\nHow many rooms do you need? Each room is for 2 adults (Large Twin: 3). Tap a button or type a number.',
    [['r_1', '1 room'], ['r_2', '2 rooms'], ['r_3', '3 rooms']]);
}

/** Free rooms of each type from the staff app, with the price of every night for this guest. */
function waAvailability_(phone, st) {
  var co = addDayYmd_(st.ci, st.nights), pct = st.member ? st.member.pct : 0;
  var av = waCore_().availability({ _internal: true, checkin: st.ci, checkout: co });
  var lines = [], rows = [], when = waDd_(st.ci) + ' → ' + waDd_(co) + ' · ' + st.nights + ' night' + (st.nights > 1 ? 's' : '') + ' · ' + st.rooms + ' room' + (st.rooms > 1 ? 's' : '');
  st.quotes = {};
  ['Deluxe Double', 'Deluxe Twin', 'Large Twin'].forEach(function (k) {
    var t = av.types.filter(function (x) { return x.type === k; })[0]; if (!t || t.free < st.rooms) return;
    var q = stayQuote_(k, st.ci, co, st.rooms, pct), std = BASE_RATES[k === 'Deluxe Double' ? 'Deluxe Double (King)' : k] * st.nights * st.rooms;
    var info = WA_ROOM_INFO[k], perNight = Math.round(q.total / q.nights / st.rooms);
    var was = std > q.total ? '~' + waMoney_(std) + '~ ' : '';
    lines.push('🛏️ *' + info.title + '* (' + info.beds + ', ' + info.fits + ')\n   ' + was + '*' + waMoney_(q.total) + '* total · ' + waMoney_(perNight) + '/night' + (t.free <= 2 ? ' · only ' + t.free + ' left' : ''));
    rows.push(['t_' + k, info.title, waMoney_(q.total) + ' total · ' + waMoney_(perNight) + ' a night']);
    st.quotes[k] = { total: q.total, perNight: perNight, offer: q.offer, rates: q.rates };
  });
  if (!rows.length) {
    st.step = 'menu';
    waButtons_(phone, '🙏 Sorry, we are full for ' + when + '.\n\nTry other dates, or talk to us: sometimes a room frees up.', [['b_dates', 'Change dates'], ['m_talk', 'Talk to us'], ['menu', 'Main menu']]);
    waNotify_('WhatsApp: guest found no free room', phone, 'Name: ' + (st.name || '') + '\nWanted: ' + when);
    return;
  }
  var any = st.quotes[Object.keys(st.quotes)[0]];
  var note = (any.offer ? '🎉 *' + any.offer + '* prices' : 'Prices') + (st.member ? ', with your *' + st.member.tier + ' member* ' + st.member.pct + '% off' : '') + '.';
  rows.push(['b_dates', 'Change dates', 'Pick other dates'], ['m_talk', 'Talk to us', 'Call or chat with reception']);
  st.step = 'pick';
  waList_(phone, '✨ Rooms free for *' + when + '*:\n\n' + lines.join('\n\n') + '\n\n' + note + (st.member ? '' : '\n💡 Members pay 5–20% less: reply "member" to know more.') + '\n\nTap *Choose room* to book.', 'Choose room', rows);
}

function waConfirm_(phone, st) {
  var q = st.quotes && st.quotes[st.type];
  if (!st.ci || !q) { waText_(phone, 'Sorry, that choice has expired. Let us check again.'); return waAvailability_(phone, st); }
  var co = addDayYmd_(st.ci, st.nights), adv = Math.round(q.total / 2);
  st.step = 'confirm';
  waButtons_(phone, '📝 *Your booking request*\n\n' +
    '👤 ' + (st.full || st.name || 'Guest') + ' · ' + phone + '\n' +
    '🛏️ ' + st.rooms + ' × ' + st.type + '\n' +
    '📅 ' + waDow_(st.ci) + ' ' + waDd_(st.ci) + ' → ' + waDow_(co) + ' ' + waDd_(co) + ' (' + st.nights + ' night' + (st.nights > 1 ? 's' : '') + ')\n' +
    '💰 Total *' + waMoney_(q.total) + '* · 50% advance ' + waMoney_(adv) + ' after we confirm\n\n' +
    'Tap *Book it* and reception will confirm your room in this chat.', [['b_yes', '✅ Book it'], ['b_dates', 'Change dates'], ['m_talk', 'Talk to us']]);
}

function waBook_(phone, st) {
  var q = st.quotes && st.quotes[st.type];
  if (!st.ci || !q) { waText_(phone, 'Sorry, that request expired. Reply "book" to start again.'); st.step = 'menu'; return; }
  var co = addDayYmd_(st.ci, st.nights), av = waCore_().availability({ _internal: true, checkin: st.ci, checkout: co });
  var t = av.types.filter(function (x) { return x.type === st.type; })[0];
  if (!t || t.free < st.rooms) { waText_(phone, 'Sorry, that room was just taken. Here is what is free now:'); return waAvailability_(phone, st); }
  var mixed = q.rates.some(function (x) { return x !== q.rates[0]; });
  var r = waCore_().bookingRequest({ _internal: true, source: 'WhatsApp bot', rate: q.perNight, guest: st.full || st.name || 'WhatsApp guest', phone: phone,
    guests: st.rooms * (st.type === 'Large Twin' ? 3 : 2), roomsNeeded: st.rooms, roomType: st.type, checkin: st.ci, checkout: co,
    notes: ['Booked on WhatsApp (automatic assistant). Guest count not asked: please confirm.', st.member ? st.member.tier + ' member · ' + st.member.pct + '% off' : '',
      q.offer ? q.offer + ' price' : '', mixed ? 'nightly ₹' + q.rates.join(', ₹') + ' (average ₹' + q.perNight + ')' : '₹' + q.perNight + ' a night', 'quoted total ₹' + q.total].filter(Boolean).join(' · ') });
  st.step = 'done'; st.booking = r.id;
  try { waCore_().waMark({ _internal: true, phone: phone, unread: true }); } catch (e) {}
  waButtons_(phone, '🙏 Thank you' + (st.name ? ' ' + st.name : '') + '! Your request *' + r.id + '* has reached our reception.' + (r.duplicate ? ' (We already had this request.)' : '') + '\n\n' +
    'Next steps:\n1️⃣ Reception checks and confirms your room in this chat.\n2️⃣ You pay the 50% advance (' + waMoney_(Math.round(q.total / 2)) + ') by UPI. Your room is then held for you.\n3️⃣ Pay the balance at check-in, from 11:00 AM.\n\n' +
    'Want to talk to us? Call *' + NK_PHONE_TEXT + '*.', [['m_talk', '📞 Talk to us'], ['menu', 'Main menu']]);
  waNotify_('New WhatsApp booking request ' + r.id, phone, 'Name: ' + (st.name || '') + '\n' + st.rooms + ' × ' + st.type + ', ' + waDd_(st.ci) + ' → ' + waDd_(co) + ' (' + st.nights + ' nights)\nQuoted total ₹' + q.total +
    (st.member ? '\nMember: ' + st.member.tier : '') + '\n\nOpen the staff app → Bookings to confirm. Reply to the guest on WhatsApp with the UPI details.');
}

function waRooms_(phone, st) {
  var today = todayIst_(), per = ratePeriod_(today), pct = st.member ? st.member.pct : 0;
  var line = function (k, kind) {
    var std = BASE_RATES[k === 'Deluxe Double' ? 'Deluxe Double (King)' : k], r = per[kind], m = Math.round(r * (100 - pct) / 100), i = WA_ROOM_INFO[k];
    return '🛏️ *' + i.title + '*: ' + i.beds + ', ' + i.fits + '\n   ' + (std > m ? '~' + waMoney_(std) + '~ ' : '') + '*' + waMoney_(m) + '* a night';
  };
  waButtons_(phone, '✨ *Our rooms*: air conditioning, private bathroom with geyser, Wi-Fi 24/7 and TV.\n\n' +
    line('Deluxe Double', 'double') + '\n' + line('Deluxe Twin', 'twin') + '\n' + line('Large Twin', 'double') + '\n\n' +
    (per.offer ? '🎉 *' + per.offer + '*' + (st.member ? ' + your ' + st.member.pct + '% member discount' : '') + '.\n' : st.member ? 'Your ' + st.member.pct + '% member discount is included.\n' : '') +
    'Prices can change by date; I show the exact price for your dates when you check rooms.\n\nPhotos: ' + NK_SITE + '/#rooms', [['m_book', 'Check rooms & book'], ['menu', 'Main menu'], ['m_talk', 'Talk to us']]);
  st.step = 'menu';
}

function waMembership_(phone, st) {
  var tiers = TIERS.map(function (t) { return '⭐ *' + t.name + '*' + (t.nights ? ' (' + t.nights + ' nights)' : ' (on joining)') + ': ' + t.discount + '% off every night'; }).join('\n');
  waButtons_(phone, (st.member ? 'You are a *' + st.member.tier + ' member* 🎉 Your discount is applied automatically when you book here.\n\n' : '⭐ *Nikadi Membership* is free. Members get a lower price on every night, points on every stay, and birthday gifts.\n\n') +
    tiers + '\n\n' + (st.member ? 'Your points and card: ' : 'Join in one minute: ') + NK_SITE + '/app/' + (st.member ? '' : '?join=1'),
    [['m_book', 'Check rooms & book'], ['menu', 'Main menu']]);
  st.step = 'menu';
}

function waFallback_(phone, st, text) {
  if (st.step === 'pick' || st.step === 'confirm') { waText_(phone, 'Please tap one of the buttons above, or reply "menu" to start again, or "call" to talk to us.'); return; }
  if (st.step === 'done') { // after a request, anything typed is for reception
    waNotify_('WhatsApp message after booking ' + (st.booking || ''), phone, text);
    waButtons_(phone, 'Thank you, I have passed your message to reception. They will reply here shortly.', [['m_talk', '📞 Talk to us'], ['menu', 'Main menu']]); return;
  }
  waMenu_(phone, st, !st.greeted); st.greeted = true;
}

function waNotify_(subject, phone, body) {
  var s = settings_(); if (!s.OWNER_EMAIL) return;
  try { MailApp.sendEmail(String(s.OWNER_EMAIL), subject, 'Guest WhatsApp: +91 ' + phone + '\nOpen chat: https://wa.me/91' + phone + '\n\n' + body); } catch (e) { console.error(e); }
}

/* -------- Staff-app messages (welcome, membership, booking confirmed, bill) through YCloud --------
   Inside the 24-hour window after the guest's last message, a plain message is sent (free, no template needed).
   Otherwise the approved template is used. */
var WA_TEXTS = {
  nikadi_welcome: 'Hare Krishna {1} 🙏 Welcome to Nikadi Guest House!\nYour room is {2}, from {3} to {4}. Check-out is by 9:00 AM.\nReception is on the first floor: enter at the left corner of the building and take the stairs up, near the Mahaprabhu photo.\nFor anything you need, just reply here or call +91 75011 01137.',
  nikadi_membership: 'Hare Krishna {1} 🙏 Thank you for choosing Nikadi Guest House.\nJoin the free Nikadi Membership and get 100 welcome points:\n⭐ Silver (on joining): 5% off every stay, 1 point per ₹100, birthday points\n⭐ Gold (15 nights in 2 years): 10% off, 1.5 points per ₹100, early check-in\n⭐ Platinum (40 nights in 2 years): 15% off, 2 points per ₹100, late check-out till 11 AM, free room upgrade, free dental kit\n⭐ Platinum Plus (100 nights, kept for 10 years): 20% off, 4 points per ₹100, late check-out till 12 noon, free extra mattress, festival booking priority\nJoin before you check out and this stay counts too. Tap the button below to join in one minute 👇',
  nikadi_booking_confirmed: 'Hare Krishna {1} 🙏 Your booking {2} at Nikadi Guest House is confirmed: {3} room(s), {4} to {5}. Advance received: {6}.\nCheck-in from 11:00 AM, check-out by 9:00 AM. Cancel 3 or more days before check-in for a full refund; after that the advance is not refundable.\nReception: first floor, left corner of the building, near the Mahaprabhu photo. Questions: +91 75011 01137.',
  nikadi_bill: 'Dear {1}, thank you so much for staying with us at Nikadi Guest House. Your bill {2} is attached as a PDF. Total {3} (incl. GST), {4}.\nWe hope your time in Sri Dham Mayapur was peaceful and full of blessings, and we will be happy to welcome you again.\n⭐ Enjoyed your stay? A short Google review helps other devotees find us: https://g.page/r/CfDIGanjxtFCEAE/review'
};
/* Free-form version of each template's button (a WhatsApp message can carry one link button). */
var WA_CTA = {
  nikadi_welcome: { text: 'Visit our website', url: NK_SITE },
  nikadi_membership: { text: 'Join free now', url: NK_SITE + '/app/?join=1' },
  nikadi_booking_confirmed: { text: 'Visit our website', url: NK_SITE }
};
function ycUploadPdf_(pdf, fileName) { return ycUploadMedia_(pdf, 'application/pdf', fileName || 'bill.pdf'); }
function ycUploadMedia_(b64, mime, fileName) {
  var y = ycProps_();
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, fileName);
  var r = UrlFetchApp.fetch(YC_API + 'whatsapp/media/' + encodeURIComponent(y.from) + '/upload', { method: 'post', headers: { 'X-API-Key': y.key }, payload: { file: blob }, muteHttpExceptions: true });
  var j = {}; try { j = JSON.parse(r.getContentText()); } catch (e) {}
  if (r.getResponseCode() >= 300 || !j.id) throw new Error('WhatsApp: upload failed (HTTP ' + r.getResponseCode() + ')');
  return j.id;
}
function ycDeskSend_(template, to10, params, pdf, fileName, url, lang) {
  to10 = String(to10).replace(/\D/g, '').slice(-10);
  var open = Number(CacheService.getScriptCache().get('ycwin_' + to10) || 0) > Date.now() - 23 * 3600e3;
  if (!open) { // the cache only lasts 6 hours: check the last message time saved in "WhatsApp chats" (24-hour window)
    try {
      var ch = deskDb_().all('wachats').filter(function (x) { return String(x.phone).replace(/\D/g, '').slice(-10) === to10; })[0];
      if (ch && ch.lastIn) open = new Date(String(ch.lastIn).replace(' ', 'T') + ':00+05:30').getTime() > Date.now() - 23 * 3600e3;
    } catch (e) {}
  }
  var media = pdf ? ycUploadPdf_(pdf, fileName) : null;
  if (template === 'nikadi_bill' && !pdf) throw new Error('no_pdf');
  if (open && WA_TEXTS[template]) {
    var body = WA_TEXTS[template].replace(/\{(\d)\}/g, function (_, i) { return params && params[i - 1] != null ? String(params[i - 1]) : ''; });
    if (media) return ycSend_(to10, { type: 'document', document: { id: media, filename: fileName || 'bill.pdf', caption: body.slice(0, 1024) } });
    var cta = WA_CTA[template];
    if (cta) return ycSend_(to10, { type: 'interactive', interactive: { type: 'cta_url', body: { text: body.slice(0, 1024) }, footer: { text: 'Nikadi Guest House · Mayapur' },
      action: { name: 'cta_url', parameters: { display_text: cta.text, url: cta.url } } } });
    return waText_(to10, body);
  }
  var comps = [];
  if (media) comps.push({ type: 'header', parameters: [{ type: 'document', document: { id: media, filename: fileName || 'bill.pdf' } }] });
  if (params && params.length) comps.push({ type: 'body', parameters: params.map(function (t) { return { type: 'text', text: String(t) }; }) });
  return ycSend_(to10, { type: 'template', template: { name: template, language: { code: lang || 'en' }, components: comps } });
}


/* =====================================================================
   Bridge to the new Nikadi server (Supabase). The server runs the app; Google keeps Drive, Gmail and the Sheet.
   ===================================================================== */
var NK_EDGE = 'https://ebwdrqdsexjterbxyeoa.supabase.co/functions/v1/api';
function nkBridgeKey_() {
  var p = PropertiesService.getScriptProperties(), k = p.getProperty('NK_BRIDGE_KEY');
  if (!k) { k = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); p.setProperty('NK_BRIDGE_KEY', k); }
  return k;
}
/* pairing: the key is sent only to the fixed address of the Nikadi server */
function nkPair_(req) {
  var r = UrlFetchApp.fetch(NK_EDGE, { method: 'post', contentType: 'text/plain', payload: JSON.stringify({ action: 'nkPaired', nonce: String(req.nonce || ''), key: nkBridgeKey_(), url: NK_API_EXEC }), muteHttpExceptions: true });
  var j = {}; try { j = JSON.parse(r.getContentText()); } catch (e) {}
  return json_({ ok: !!j.ok });
}
var NK_BRIDGE_FNS = { deskSavePhoto_: 1, deskGetPhoto_: 1, deskStayFolder_: 1, deskTrash_: 1, deskOwnBillFile_: 1, deskSendBill_: 1, deskArchive_: 1, waSaveMedia_: 1, nkMail_: 1, nkExport_: 1 };
function nkBridgeRun_(req) {
  if (!req.key || req.key !== PropertiesService.getScriptProperties().getProperty('NK_BRIDGE_KEY')) return json_({ ok: false, error: 'forbidden' });
  if (!NK_BRIDGE_FNS[req.fn]) return json_({ ok: false, error: 'not_allowed' });
  var args = JSON.parse(req.args || '[]', function (k, v) { return v && v.__blob ? Utilities.newBlob(Utilities.base64Decode(v.__blob.b64), v.__blob.mime, v.__blob.name) : v; });
  try {
    var out = this[req.fn].apply(null, args);
    return json_({ ok: true, result: out === undefined ? null : out });
  } catch (e) { console.error(e); return json_({ ok: false, error: String(e && e.message || e).slice(0, 300) }); }
}
function nkMail_(msg) {
  if (msg.attachments) msg.attachments = msg.attachments.map(function (a) { return a.getBytes ? a : Utilities.newBlob(Utilities.base64Decode(a.b64), a.mime, a.name); });
  MailApp.sendEmail(msg);
  return true;
}
/* everything in this Sheet, for copying into the new database */
function nkExport_() {
  var db = deskDb_(), desk = {};
  Object.keys(DESK_SCHEMA).forEach(function (t) {
    var def = DESK_SCHEMA[t];
    if ((def.lazy || t === 'billpdfs' || t === 'bills') && !SpreadsheetApp.getActiveSpreadsheet().getSheetByName(def.sheet)) return;
    desk[t] = db.all(t).map(function (o) { var d = {}; def.cols.forEach(function (c) { d[c[0]] = o[c[0]]; }); return d; });
  });
  var sheets = {}, ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEET_NAMES).map(function (k) { return SHEET_NAMES[k]; }).concat([PAY_TAB]).forEach(function (n) {
    var sh = ss.getSheetByName(n); if (!sh || sh.getLastRow() < 1) return;
    sheets[n] = sh.getDataRange().getValues().map(function (row) { return row.map(function (v) { return v instanceof Date ? { $d: v.toISOString() } : v; }); });
  });
  var props = PropertiesService.getScriptProperties().getProperties();
  props.OWNER_GMAIL = NikadiBill.HOTEL.email;
  return { desk: desk, sheets: sheets, props: props };
}
