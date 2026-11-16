/* Nikadi member app — shared settings and helpers */

/* The Nikadi server (Supabase, Mumbai) since 16 Nov 2026. The old Google Apps Script address still works
   (it passes everything on); ?api=old uses it directly, ?api=new goes back to the normal setting. */
var NIKADI_GOOGLE_URL = "https://script.google.com/macros/s/AKfycbxMHXOtCvqvzIABjr2_SCPqWIFFrZsO2cLKN6USe3qaVTmRseiQJZLU21EMqx3Y2sYW/exec";
var NIKADI_EDGE_URL = "https://ebwdrqdsexjterbxyeoa.supabase.co/functions/v1/api";
var NIKADI_API_URL = NIKADI_EDGE_URL;
var NIKADI_TEST_DB = false;
try {
  var nkApiQ = new URLSearchParams(location.search).get('api');
  if (nkApiQ === 'old') localStorage.setItem('nk-api', 'old');
  if (nkApiQ === 'new') localStorage.removeItem('nk-api');
  if (localStorage.getItem('nk-api') === 'old') NIKADI_API_URL = NIKADI_GOOGLE_URL;
  else localStorage.removeItem('nk-api');
} catch (e) {}

var NIKADI = {
  phone: "917501101137",
  site: "https://www.nikadiguesthouse.com/",
  demo: /[?&]demo=1/.test(location.search)
};

/* Friendly messages for backend error codes */
var NIKADI_ERRORS = {
  invalid_phone: "Please check the mobile number and its country code (+91 for India).",
  not_member: "This number is not a Nikadi member yet. Join free to start earning points.",
  already_member: "This number is already a member. Log in or check your points instead.",
  name_required: "Please enter your full name.",
  invalid_email: "Please check the email address.",
  otp_wrong: "That code is not correct. Please check and try again.",
  otp_expired: "This code has expired. Please request a new one.",
  otp_not_found: "Please request a new code.",
  otp_too_many: "Too many wrong attempts. Please request a new code.",
  otp_rate_limited: "Too many codes requested. Please try again in an hour.",
  no_otp_channel: "We can't send a code to this number yet. Please contact us on WhatsApp to add your email.",
  sms_not_configured: "SMS is not set up yet. Please contact the front desk.",
  sms_failed: "We couldn't send the SMS. Please try again in a minute.",
  not_logged_in: "Please log in again.",
  session_expired: "Your session has ended. Please log in again.",
  wrong_pin: "Wrong PIN. Please try again.",
  too_many_attempts: "Too many wrong attempts. Please wait 15 minutes.",
  insufficient_points: "Not enough points for this reward.",
  invalid_amount: "Please enter the stay amount in rupees.",
  invalid_points: "Please enter the number of points.",
  note_required: "Please add a short reason.",
  invalid_reward: "Please choose a reward.",
  network: "No connection. Please check your internet and try again.",
  server_error: "Something went wrong on our side. Please try again.",
  not_setup: "The membership system is being set up. Please check back soon.",
  wrong_password: "Wrong password. Please try again, or tap “Forgot password”.",
  no_password: "You have not set a password yet. We will email you a code to set one.",
  weak_password: "Please choose a password of at least 6 characters.",
  password_required: "Please choose a password.",
  bad_dates: "Please check your dates. Check-out must be after check-in.",
  bad_guests: "Please check the number of guests.",
  max_guests: "That is too many guests for our rooms. Please contact us on WhatsApp.",
  too_many_requests: "Too many requests right now. Please try again later.",
  phone_required: "Please enter your phone number."
};

function nkError(code) { return NIKADI_ERRORS[code] || NIKADI_ERRORS.server_error; }

/** Calls the backend. Resolves with the response object; rejects with an error code string. */
function nkApi(action, data) {
  if (NIKADI.demo && window.nkDemo) return window.nkDemo(action, data || {});
  if (!NIKADI_API_URL) return Promise.reject("not_setup");
  var body = JSON.stringify(Object.assign({ action: action }, data || {}));
  return fetch(NIKADI_API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body, redirect: "follow" })
    .then(function (r) { return r.json(); }, function () { throw "network"; })
    .then(function (j) { if (!j || !j.ok) throw (j && j.error) || "server_error"; return j; });
}

function nkStore(key, val) {
  try {
    if (val === undefined) return localStorage.getItem(key);
    if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, val);
  } catch (e) { return null; }
}

/* Phone numbers in any country. Indian mobiles are kept as 10 digits (as always); other countries as the full
   international number in digits, country code first (e.g. 447700900123). */
function nkPhoneOk(p) {
  var s = String(p || "").trim(), d = s.replace(/\D/g, "");
  if (!d) return "";
  var intl = /^(\+|00)/.test(s);
  if (intl && s.charAt(0) === "0") d = d.slice(2);
  if (intl) { if (d.indexOf("91") === 0 && /^[6-9]\d{9}$/.test(d.slice(2))) return d.slice(2); return d.length >= 8 && d.length <= 15 && d.indexOf("91") !== 0 ? d : ""; }
  if (d.length === 12 && d.indexOf("91") === 0) d = d.slice(2);
  if (d.length === 11 && d.charAt(0) === "0") d = d.slice(1);
  if (/^[6-9]\d{9}$/.test(d)) return d;
  return d.length >= 11 && d.length <= 15 && d.charAt(0) !== "0" && d.indexOf("91") !== 0 ? d : "";
}
/* country codes are prefix-free: these are the 1- and 2-digit ones, every other code has 3 digits */
var NK_CC12 = "1 7 20 27 30 31 32 33 34 36 39 40 41 43 44 45 46 47 48 49 51 52 53 54 55 56 57 58 60 61 62 63 64 65 66 81 82 84 86 90 91 92 93 94 95 98".split(" ");
function nkPhoneSplit(p) { // stored number → ["+44", "7700900123"]
  var d = String(p || "").replace(/\D/g, "");
  if (!d) return ["+91", ""];
  if (d.length === 10 && /^[6-9]/.test(d)) return ["+91", d];
  var n = NK_CC12.indexOf(d.slice(0, 1)) >= 0 ? 1 : NK_CC12.indexOf(d.slice(0, 2)) >= 0 ? 2 : 3;
  return ["+" + d.slice(0, n), d.slice(n)];
}
function nkPhoneShow(p) { // for showing: "+91 98765 43210" / "+44 7700900123"
  var x = nkPhoneSplit(p); if (!x[1]) return "";
  return x[0] === "+91" && x[1].length === 10 ? "+91 " + x[1].slice(0, 5) + " " + x[1].slice(5) : x[0] + " " + x[1];
}
function nkPhoneSet(id, value, root) { var x = nkPhoneSplit(value), q = function (s) { return (root || document).querySelector("#" + s); }; if (q(id + "-cc")) q(id + "-cc").value = x[0]; if (q(id)) q(id).value = x[1]; }
function nkMasked(m) { m = String(m || ""); return m.length === 10 ? "+91 " + m : "+" + m; } // member number as the server shows it (44******23 → +44…)
function nkPhoneTel(p) { var x = nkPhoneSplit(p); return x[1] ? x[0] + x[1] : ""; } // for tel: and wa.me links
/* the phone box: an editable country code (+91 by default) and the number */
function nkPhoneHtml(id, value, attrs) {
  var x = nkPhoneSplit(value), e = function (v) { return String(v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  return '<div class="phonewrap"><input class="cc" id="' + id + '-cc" value="' + e(x[0]) + '" inputmode="tel" maxlength="5" aria-label="Country code" autocomplete="tel-country-code">' +
    '<input class="input" id="' + id + '" type="tel" inputmode="tel" maxlength="18" value="' + e(x[1]) + '"' + (attrs || "") + '></div>';
}
function nkPhoneVal(id, root) { // what was typed, as "+CC number" (a number typed with its own + code wins)
  var q = function (s) { return (root || document).querySelector("#" + s); };
  var n = q(id), c = q(id + "-cc"), num = String(n ? n.value : "").trim();
  if (!num) return "";
  if (/^(\+|00)/.test(num) || !c) return num;
  var cc = String(c.value || "").replace(/\D/g, "") || "91";
  return "+" + cc + " " + num.replace(/^0+/, "");
}
function nkInr(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }
function nkEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function nkWa(text) { return "https://wa.me/" + NIKADI.phone + "?text=" + encodeURIComponent(text); }

/* Offline support + install */
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
}
