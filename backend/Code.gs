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
  members: ['Phone', 'Name', 'Email', 'City', 'Date of birth', 'Joined', 'Points', 'Lifetime points', 'Status', 'Notes'],
  tx: ['Date', 'Phone', 'Name', 'Type', 'Amount (₹)', 'Points', 'Balance after', 'Note', 'By'],
  otps: ['Phone', 'Hash', 'Purpose', 'Expires', 'Attempts', 'Payload'],
  sessions: ['Token', 'Phone', 'Role', 'Expires'],
  settings: ['Key', 'Value', 'What it means']
};
var SHEET_NAMES = { members: 'Members', tx: 'Transactions', otps: 'Otps', sessions: 'Sessions', settings: 'Settings' };

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
      sh.getRange(1, 1, 1, TABS[k].length).setFontWeight('bold').setBackground('#1b1714').setFontColor('#e0be7a');
      sh.setFrozenRows(1);
    }
  });
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
  var req;
  try { req = JSON.parse(e.postData.contents || '{}'); } catch (err) { return json_({ ok: false, error: 'bad_request' }); }
  var actions = {
    config: apiConfig_, lookup: apiLookup_, join: apiJoin_, otpSend: apiOtpSend_, otpVerify: apiOtpVerify_, me: apiMe_,
    staffLogin: staffLogin_, staffMember: staffMember_, staffCreate: staffCreate_, staffAddStay: staffAddStay_,
    staffRedeemStart: staffRedeemStart_, staffRedeemConfirm: staffRedeemConfirm_, staffAdjust: staffAdjust_, staffRecent: staffRecent_
  };
  var fn = actions[req.action];
  // Staff app (Staff.gs): every action starting with "desk"
  if (!fn && /^desk[A-Z]\w*$/.test(String(req.action)) && typeof deskHandle_ === 'function') fn = deskHandle_;
  if (!fn) return json_({ ok: false, error: 'unknown_action' });
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var out = fn(req);
    return json_(Object.assign({ ok: true }, out));
  } catch (err) {
    var code = String(err && err.message || err);
    if (!/^[a-z_]+$/.test(code)) { console.error(err); code = 'server_error'; }
    return json_({ ok: false, error: code });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

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
    if (String(vals[i][0]) === phone) {
      var r = vals[i];
      return { row: i + 2, phone: phone, name: r[1], email: r[2], city: r[3], dob: r[4], joined: r[5], points: num_(r[6], 0), lifetime: num_(r[7], 0), status: r[8] || 'Active' };
    }
  }
  return null;
}
function publicMember_(m) {
  var s = settings_();
  return {
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

function createMember_(d, by) {
  var phone = normPhone_(d.phone);
  if (findMember_(phone)) throw new Error('already_member');
  var name = clean_(d.name, 80);
  if (name.length < 2) throw new Error('name_required');
  var email = clean_(d.email, 120);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('invalid_email');
  var ms = sheet_('members');
  ms.appendRow(["'" + phone, name, email, clean_(d.city, 80), clean_(d.dob, 20), new Date(), 0, 0, 'Active', clean_(d.note, 200)]);
  var m = findMember_(phone);
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
    discountValue: num_(s.DISCOUNT_VALUE, 500), freeNightPoints: num_(s.FREE_NIGHT_POINTS, 500), channel: String(s.OTP_CHANNEL || 'email')
  };
}

/** Balance check by phone number only. Shows first name and points, nothing else. */
function apiLookup_(req) {
  var phone = normPhone_(req.phone);
  var m = findMember_(phone);
  if (!m) return { found: false };
  var p = publicMember_(m);
  return { found: true, member: { firstName: p.firstName, masked: p.masked, points: p.points, freeNightPoints: p.freeNightPoints, discountPoints: p.discountPoints, discountValue: p.discountValue, status: p.status } };
}

function apiJoin_(req) {
  var m = createMember_(req, 'Website');
  return { member: publicMember_(m) };
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
  return { token: sessionCreate_(phone, 'member', 60), member: publicMember_(m), history: history_(phone, 50) };
}

function apiMe_(req) {
  var phone = sessionGet_(req.token, 'member');
  var m = findMember_(phone);
  if (!m) throw new Error('not_member');
  return { member: publicMember_(m), history: history_(phone, 50) };
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
