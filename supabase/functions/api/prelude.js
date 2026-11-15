/* ===== Apps Script look-alikes for the old Google code (Code.gs + Staff.gs), running on the Nikadi server =====
   Everything here is synchronous, like Apps Script. Anything that needs the internet (WhatsApp, Google Drive, email)
   is written down in CTX.pend and the request is run again once the answer is known (CTX.memo).
   Time and random numbers are fixed for one request, so every re-run asks for exactly the same things. */
var CTX = null; // the request being run (set by the server before each run)
var RealDate = globalThis.Date, RealMath = globalThis.Math;
function NkDate(a, b, c, d, e, f, g) {
  var n = arguments.length, x;
  if (n === 0) x = new RealDate(CTX && CTX.now ? CTX.now : RealDate.now());
  else if (n === 1) x = new RealDate(a);
  else x = new RealDate(a, b, c == null ? 1 : c, d || 0, e || 0, f || 0, g || 0);
  if (!(this instanceof NkDate)) return x.toString();
  Object.setPrototypeOf(x, NkDate.prototype);
  return x;
}
NkDate.prototype = Object.create(RealDate.prototype); NkDate.prototype.constructor = NkDate;
NkDate.now = function () { return CTX && CTX.now ? CTX.now : RealDate.now(); };
NkDate.UTC = RealDate.UTC; NkDate.parse = RealDate.parse;
Object.defineProperty(NkDate, Symbol.hasInstance, { value: function (x) { return x instanceof RealDate; } });
var Date = NkDate;
var Math = Object.create(RealMath);
Math.random = function () { if (!CTX) return RealMath.random(); var s = CTX.seed = (CTX.seed * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

function nkWait_(item) { // ask the server to do something on the internet, then run again
  if (!(item.key in CTX.memo)) {
    if (!CTX.pend.some(function (p) { return p.key === item.key; })) CTX.pend.push(item);
    throw new Error('__NK_WAIT__');
  }
  var r = CTX.memo[item.key];
  if (r && r.__err) throw new Error(r.__err);
  return r;
}
function nkHash_(s) { var h = 2166136261 >>> 0; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36) + ':' + s.length; }
function nkBytesB64_(b) { var s = ''; for (var i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, Array.prototype.slice.call(b, i, i + 32768).map(function (x) { return x & 255; })); return btoa(s); }
function nkB64Bytes_(s) { var bin = atob(String(s).replace(/-/g, '+').replace(/_/g, '/')), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }

function NkBlob(bytes, mime, name) { this.b = bytes || new Uint8Array(0); this.mime = mime || 'application/octet-stream'; this.name = name || 'file'; }
NkBlob.prototype.getBytes = function () { return this.b; };
NkBlob.prototype.getDataAsString = function () { return new TextDecoder().decode(this.b); };
NkBlob.prototype.getContentType = function () { return this.mime; };
NkBlob.prototype.setContentType = function (m) { this.mime = m; return this; };
NkBlob.prototype.getName = function () { return this.name; };
NkBlob.prototype.setName = function (n) { this.name = n; return this; };
NkBlob.prototype.getAs = function () { throw new Error('convert_in_google_only'); };
NkBlob.prototype.copyBlob = function () { return new NkBlob(this.b, this.mime, this.name); };
function nkBlobJson_(b) { return { b64: nkBytesB64_(b.b), mime: b.mime, name: b.name }; }

var Utilities = {
  DigestAlgorithm: { MD5: 'MD5', SHA_256: 'SHA_256', SHA_1: 'SHA_1' }, Charset: { UTF_8: 'UTF_8' },
  computeDigest: function (alg, v) { return alg === 'MD5' ? md5(v) : sha256(v); },
  computeHmacSha256Signature: function (v, key) { return hmacSha256(v, key); },
  base64Encode: function (x) { return typeof x === 'string' ? nkBytesB64_(utf8(x)) : nkBytesB64_(x); },
  base64EncodeWebSafe: function (x) { return Utilities.base64Encode(x).replace(/\+/g, '-').replace(/\//g, '_'); },
  base64Decode: function (s) { return nkB64Bytes_(s); },
  base64DecodeWebSafe: function (s) { return nkB64Bytes_(s); },
  newBlob: function (data, mime, name) { return new NkBlob(typeof data === 'string' ? new TextEncoder().encode(data) : data instanceof Uint8Array ? data : new Uint8Array(Array.from(data || [], function (x) { return x & 255; })), mime, name); },
  getUuid: function () { var h = ''; for (var i = 0; i < 32; i++) h += RealMath.floor(Math.random() * 16).toString(16); return h.slice(0, 8) + '-' + h.slice(8, 12) + '-4' + h.slice(13, 16) + '-a' + h.slice(17, 20) + '-' + h.slice(20, 32); },
  sleep: function () {},
  formatDate: function (d, tz, fmt) {
    var off = /Kolkata|Calcutta|IST|\+0?5:?30/.test(String(tz)) ? 330 : 0, x = new RealDate(new RealDate(d).getTime() + off * 60000);
    var Y = x.getUTCFullYear(), M = x.getUTCMonth(), D = x.getUTCDate(), H = x.getUTCHours(), m = x.getUTCMinutes(), s = x.getUTCSeconds(), w = x.getUTCDay();
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], DAYL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    function p(n, l) { n = String(n); while (n.length < l) n = '0' + n; return n; }
    return String(fmt).replace(/'([^']*)'|yyyy|yy|MMMM|MMM|MM|M|dd|d|HH|H|hh|h|mm|m|ss|s|a|EEEE|EEE|E|u/g, function (t, lit) {
      if (lit != null) return lit;
      switch (t) {
        case 'yyyy': return Y; case 'yy': return p(Y % 100, 2); case 'MMMM': return MONL[M]; case 'MMM': return MON[M]; case 'MM': return p(M + 1, 2); case 'M': return M + 1;
        case 'dd': return p(D, 2); case 'd': return D; case 'HH': return p(H, 2); case 'H': return H; case 'hh': return p((H % 12) || 12, 2); case 'h': return (H % 12) || 12;
        case 'mm': return p(m, 2); case 'm': return m; case 'ss': return p(s, 2); case 's': return s; case 'a': return H < 12 ? 'AM' : 'PM';
        case 'EEEE': return DAYL[w]; case 'EEE': case 'E': return DAY[w]; case 'u': return w === 0 ? 7 : w;
      }
      return t;
    });
  }
};

function NkResp(r) { this.r = r || {}; }
NkResp.prototype.getResponseCode = function () { return this.r.code || 0; };
NkResp.prototype.getContentText = function () { return this.r.text || ''; };
NkResp.prototype.getBlob = function () { return new NkBlob(this.r.b64 ? nkB64Bytes_(this.r.b64) : new TextEncoder().encode(this.r.text || ''), this.r.mime, this.r.name); };
NkResp.prototype.getContent = function () { return this.getBlob().getBytes(); };
NkResp.prototype.getHeaders = function () { return this.r.headers || {}; };
NkResp.prototype.getAllHeaders = NkResp.prototype.getHeaders;
var UrlFetchApp = {
  fetch: function (url, o) {
    o = o || {};
    var pay = o.payload, payJ = null;
    if (pay != null && typeof pay === 'object' && !(pay instanceof Uint8Array)) { payJ = {}; Object.keys(pay).forEach(function (k) { var v = pay[k]; payJ[k] = v instanceof NkBlob ? { __blob: nkBlobJson_(v) } : String(v); }); }
    var req = { url: String(url), method: String(o.method || (pay != null ? 'post' : 'get')).toUpperCase(), headers: o.headers || {}, contentType: o.contentType || '',
      payload: payJ ? null : pay == null ? null : String(pay), form: payJ, mute: !!o.muteHttpExceptions, binary: !!o.__binary };
    var r = nkWait_({ key: 'f|' + req.method + '|' + req.url + '|' + nkHash_(JSON.stringify([req.payload, req.form, req.headers])), kind: 'fetch', req: req });
    if (!req.mute && r.code >= 400) throw new Error('Request failed for ' + url + ' returned code ' + r.code + '. ' + String(r.text || '').slice(0, 300));
    return new NkResp(r);
  },
  fetchAll: function (list) { return list.map(function (x) { return UrlFetchApp.fetch(x.url, x); }); }
};
function nkBridge_(fn, args) { // run one of the Google functions in Apps Script (Drive, email) and get its answer
  var j = JSON.stringify(args, function (k, v) { return v instanceof NkBlob ? { __blob: nkBlobJson_(v) } : v; });
  return nkWait_({ key: 'g|' + fn + '|' + nkHash_(j), kind: 'bridge', fn: fn, args: j });
}
var MailApp = {
  sendEmail: function (a, b, c, d) {
    var msg = typeof a === 'object' ? a : Object.assign({ to: a, subject: b, body: c }, d || {});
    return nkBridge_('nkMail_', [msg]);
  },
  getRemainingDailyQuota: function () { return 100; }
};
var GmailApp = { sendEmail: function (a, b, c, d) { return MailApp.sendEmail(a, b, c, d); } };

function nkCache_(prefix, ttl) {
  return {
    get: function (k) { var v = CTX.kv[prefix + k]; return v == null ? null : String(v); },
    put: function (k, v, sec) { CTX.kv[prefix + k] = String(v); CTX.ops.push({ op: 'kv', k: prefix + k, v: String(v), sec: ttl ? Math.min(sec || 600, 21600) : undefined }); },
    remove: function (k) { delete CTX.kv[prefix + k]; CTX.ops.push({ op: 'kv', k: prefix + k, v: null, sec: 1 }); },
    getAll: function (keys) { var o = {}; keys.forEach(function (k) { var v = CTX.kv[prefix + k]; if (v != null) o[k] = String(v); }); return o; },
    putAll: function (m, sec) { var self = this; Object.keys(m).forEach(function (k) { self.put(k, m[k], sec); }); },
    removeAll: function (keys) { var self = this; keys.forEach(function (k) { self.remove(k); }); }
  };
}
var CacheService = { getScriptCache: function () { return nkCache_('c:', true); }, getUserCache: function () { return nkCache_('c:', true); }, getDocumentCache: function () { return nkCache_('c:', true); } };
function nkProps_() {
  var c = nkCache_('p:', false);
  return {
    getProperty: function (k) { return c.get(k); }, setProperty: function (k, v) { c.put(k, v); return this; }, deleteProperty: function (k) { c.remove(k); return this; },
    getProperties: function () { var o = {}; Object.keys(CTX.kv).forEach(function (k) { if (k.indexOf('p:') === 0 && CTX.kv[k] != null) o[k.slice(2)] = String(CTX.kv[k]); }); return o; },
    setProperties: function (m) { Object.keys(m).forEach(function (k) { c.put(k, m[k]); }); return this; }, getKeys: function () { return Object.keys(this.getProperties()); }
  };
}
var PropertiesService = { getScriptProperties: nkProps_, getUserProperties: nkProps_, getDocumentProperties: nkProps_ };
var LockService = { getScriptLock: function () { return { waitLock: function () {}, tryLock: function () { return true; }, releaseLock: function () {}, hasLock: function () { return true; } }; } };
LockService.getUserLock = LockService.getDocumentLock = LockService.getScriptLock;
var SpreadsheetApp = {
  getActiveSpreadsheet: function () { return CTX.ss; }, getActive: function () { return CTX.ss; }, openById: function () { return CTX.ss; },
  flush: function () {}, getUi: function () { throw new Error('no_ui'); }
};
var Session = { getEffectiveUser: function () { return { getEmail: function () { return CTX.kv['p:OWNER_GMAIL'] || ''; } }; }, getActiveUser: function () { return Session.getEffectiveUser(); }, getScriptTimeZone: function () { return 'Asia/Kolkata'; } };
var ContentService = { MimeType: { JSON: 'json', TEXT: 'text' }, createTextOutput: function (s) { return { s: String(s == null ? '' : s), setMimeType: function () { return this; }, getContent: function () { return this.s; } }; } };
var MimeType = { JSON: 'application/json', PLAIN_TEXT: 'text/plain', PDF: 'application/pdf', JPEG: 'image/jpeg' };
var HtmlService = { createHtmlOutput: function () { throw new Error('no_ui'); } };
var ScriptApp = { getService: function () { return { getUrl: function () { return CTX.selfUrl || ''; } }; }, newTrigger: function () { throw new Error('no_triggers'); }, getProjectTriggers: function () { return []; } };
var DriveApp = new Proxy({}, { get: function () { return function () { throw new Error('drive_in_google_only'); }; } });
var Logger = { log: function () { console.log.apply(console, arguments); } };
