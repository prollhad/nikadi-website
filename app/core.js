/* Nikadi member app — shared settings and helpers */

/* After deploying backend/Code.gs as a Google Apps Script web app,
   paste its URL here (ends with /exec). Leave empty until then. */
var NIKADI_API_URL = "https://script.google.com/macros/s/AKfycbxMHXOtCvqvzIABjr2_SCPqWIFFrZsO2cLKN6USe3qaVTmRseiQJZLU21EMqx3Y2sYW/exec";

var NIKADI = {
  phone: "917501101137",
  site: "https://www.nikadiguesthouse.com/",
  demo: /[?&]demo=1/.test(location.search)
};

/* Friendly messages for backend error codes */
var NIKADI_ERRORS = {
  invalid_phone: "Please enter a valid 10-digit Indian mobile number.",
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

function nkPhoneOk(p) {
  var d = String(p || "").replace(/\D/g, "");
  if (d.length === 12 && d.indexOf("91") === 0) d = d.slice(2);
  if (d.length === 11 && d.charAt(0) === "0") d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : "";
}
function nkInr(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }
function nkEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function nkWa(text) { return "https://wa.me/" + NIKADI.phone + "?text=" + encodeURIComponent(text); }

/* Offline support + install */
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
}
