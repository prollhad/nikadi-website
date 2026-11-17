/* ===== Nikadi server: runs the staff app, website membership and WhatsApp bot on the database =====
   Each request: 1) one call to the database gets what changed (nk_sync); 2) the old code runs on that copy;
   3) anything it needs from the internet is fetched and it runs again; 4) all changes are saved in one
   transaction (nk_commit). If someone else changed the same tabs in between, it simply runs again.            */
var NK_ENV = (typeof Deno !== 'undefined' ? { get: function (k) { return Deno.env.get(k); } } : { get: function (k) { return globalThis.process && process.env[k]; } });
var NK_SB = NK_ENV.get('SUPABASE_URL'), NK_SB_KEY = NK_ENV.get('SUPABASE_SERVICE_ROLE_KEY');
var NK_SELF = (NK_SB || '') + '/functions/v1/api';
var NK_LAZY = { billpdfs: 1 };
var NK_BASE = { versions: {}, tables: {}, kv: {} };
var NK_NORM = nkNormalizer(DESK_SCHEMA);

async function nkRpc(fn, args) {
  if (globalThis.NK_TEST_RPC) return globalThis.NK_TEST_RPC(fn, args);
  var r = await fetch(NK_SB + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: NK_SB_KEY, Authorization: 'Bearer ' + NK_SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  var t = await r.text();
  if (!r.ok) throw new Error('db ' + r.status + ' ' + t.slice(0, 300));
  return t ? JSON.parse(t) : null;
}
function nkLoadRows(t, rows) {
  NK_BASE.tables[t] = rows.map(function (r) { return [r[0], DESK_SCHEMA[t] ? NK_NORM(t, r[1]) : r[1]]; });
}
async function nkSync() {
  var have = {}, skip = [];
  Object.keys(NK_BASE.tables).forEach(function (t) { have[t] = NK_BASE.versions[t] || 0; });
  Object.keys(NK_LAZY).forEach(function (t) { if (!(t in NK_BASE.tables)) skip.push(t); });
  var res = await nkRpc('nk_sync', { have: have, skip: skip });
  Object.keys(res.rows || {}).forEach(function (t) { nkLoadRows(t, res.rows[t]); });
  NK_BASE.versions = res.versions || {};
  NK_BASE.kv = res.kv || {};
}

function nkRun(body, query, memo, now, seed, entry) {
  var ctx = { ops: [], read: {}, cl: {}, kv: Object.assign({}, NK_BASE.kv), pend: [], memo: memo, now: now, seed: seed, selfUrl: NK_SELF };
  ctx.need = function (t) { if (!ctx.pend.some(function (p) { return p.key === 'load|' + t; })) ctx.pend.push({ key: 'load|' + t, kind: 'load', t: t }); };
  ctx.db = nkDb(NK_BASE, ctx, { normalize: NK_NORM, lazy: NK_LAZY, firstCol: function (t) { return DESK_SCHEMA[t] ? DESK_SCHEMA[t].cols[0][0] : 'id'; } });
  ctx.ss = nkSheets(ctx.db, function (t) { return t in NK_BASE.versions || t in NK_BASE.tables || !!ctx.cl[t]; });
  _waOutbox = null; _waCoreInst = null; DESK_NO_LOCK_ = false; // old per-request globals
  CTX = ctx;
  try {
    var e = { postData: { contents: body, type: 'text/plain' }, parameter: query || {}, parameters: {} };
    var out = entry ? entry(e) : query && query.__get ? doGet(e) : doPost(e);
    ctx.out = out && out.getContent ? out.getContent() : JSON.stringify({ ok: true });
  } catch (err) {
    if (String(err && err.message) !== '__NK_WAIT__') { console.error(err); ctx.out = JSON.stringify({ ok: false, error: 'server_error' }); ctx.crash = String(err && err.stack || err); }
  } finally { CTX = null; }
  return ctx;
}

async function nkDo(p, memo) {
  try {
    if (p.kind === 'load') {
      var r = await nkRpc('nk_load', { tbls: [p.t] });
      nkLoadRows(p.t, (r.rows || {})[p.t] || []);
      Object.assign(NK_BASE.versions, r.versions || {});
      memo[p.key] = true;
    } else if (p.kind === 'findOld') {
      memo[p.key] = await nkRpc('nk_find_old', { t: p.t, field: p.field, val: p.val });
    } else if (p.kind === 'fetch') {
      memo[p.key] = await nkFetch(p.req);
    } else if (p.kind === 'bridge') {
      memo[p.key] = await nkBridgePhoto(p.fn, p.args);
    } else if (p.kind === 'claim' && !NK_SB_KEY) { memo[p.key] = true;
    } else if (p.kind === 'claim') { // one-time claim: only the first request that asks gets true (stops double WhatsApp sends)
      var cr = await nkStore('POST', 'claims/' + nkSafeId(p.k), new TextEncoder().encode(String(RealDate.now())), 'text/plain', true), ctext = cr.ok ? '' : await cr.text();
      memo[p.key] = cr.ok ? true : (cr.status === 409 || /duplicate|already exists/i.test(ctext)) ? false : true; // storage trouble: behave as before
    } else if (p.kind === 'changelog') {
      memo[p.key] = await nkRpc('nk_changelog', { lim: p.lim, before_id: p.before || null, who_f: p.who || null });
    }
  } catch (e) { memo[p.key] = { __err: String(e && e.message || e).slice(0, 300) }; }
}
function nkTestMode() { return NK_BASE.kv['p:NK_TEST_MODE'] === '1'; }
async function nkFetch(q) {
  if (nkTestMode() && /ycloud\.com|graph\.facebook\.com|msg91|fast2sms|razorpay/.test(q.url) && q.method !== 'GET') return { code: 200, text: '{"id":"test-mode-not-sent"}' }; // test copy: never message real guests
  var init = { method: q.method, headers: Object.assign({}, q.headers) };
  if (q.form) {
    var fd = new FormData();
    Object.keys(q.form).forEach(function (k) {
      var v = q.form[k];
      if (v && v.__blob) fd.append(k, new Blob([nkB64Bytes_(v.__blob.b64)], { type: v.__blob.mime }), v.__blob.name);
      else fd.append(k, v);
    });
    init.body = fd;
  } else if (q.payload != null) { init.body = q.payload; if (q.contentType) init.headers['Content-Type'] = q.contentType; }
  var r = await fetch(q.url, init), ct = r.headers.get('content-type') || '';
  var buf = new Uint8Array(await r.arrayBuffer()), text = new TextDecoder().decode(buf);
  var out = { code: r.status, text: text, mime: ct };
  if (!/json|text|xml|html/.test(ct)) out.b64 = nkBytesB64_(buf);
  return out;
}
/* ID copies and payment screenshots: kept in fast storage after the first time they come from Google Drive */
async function nkStore(method, path, body, type, once) {
  var h = { apikey: NK_SB_KEY, Authorization: 'Bearer ' + NK_SB_KEY };
  if (type) { h['Content-Type'] = type; if (!once) h['x-upsert'] = 'true'; }
  return fetch(NK_SB + '/storage/v1/object/files/' + path, { method: method, headers: h, body: body });
}
function nkSafeId(id) { return String(id || '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120); }
async function nkBridgePhoto(fn, argsJson) {
  if (fn === 'deskGetPhoto_' && NK_SB_KEY) {
    var id = nkSafeId(JSON.parse(argsJson)[0]);
    try {
      var r = await nkStore('GET', 'photos/' + id);
      if (r.ok) { var ct = r.headers.get('content-type') || 'image/jpeg', b = new Uint8Array(await r.arrayBuffer()); return 'data:' + ct + ';base64,' + nkBytesB64_(b); }
    } catch (e) {}
    if (/^test-/.test(id)) return '';
    var url = await nkBridgeCall(fn, argsJson), m = /^data:([^;]+);base64,(.*)$/.exec(String(url || ''));
    if (m) try { await nkStore('POST', 'photos/' + id, nkB64Bytes_(m[2]), m[1]); } catch (e) {}
    return url;
  }
  var res = await nkBridgeCall(fn, argsJson);
  if (fn === 'deskSavePhoto_' && res && NK_SB_KEY) try { await nkStore('POST', 'photos/' + nkSafeId(res), nkB64Bytes_(JSON.parse(argsJson)[0]), 'image/jpeg'); } catch (e) {}
  return res;
}
var NK_TEST_FAKE = { // test copy: nothing reaches guests, and the real Drive records are not touched
  nkMail_: function () { return true; }, deskSendBill_: function () { return true; }, deskTrash_: function () { return true; },
  deskArchive_: function (a) { return a[1] || {}; }, deskStayFolder_: function (a) { return a[1] || 'test-folder'; },
  deskSavePhoto_: function () { return 'test-' + RealDate.now().toString(36) + RealMath.random().toString(36).slice(2, 7); },
  deskOwnBillFile_: function () { return 'test-ownbill'; }, deskLaundryFile_: function () { return 'test-laundry'; }
};
async function nkBridgeCall(fn, argsJson) {
  if (nkTestMode() && NK_TEST_FAKE[fn]) return NK_TEST_FAKE[fn](JSON.parse(argsJson));
  var key = NK_BASE.kv['p:NK_BRIDGE_KEY'], url = NK_BASE.kv['p:NK_GOOGLE_URL'];
  if (!key || !url) throw new Error('google_not_connected');
  var r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'nkBridge', key: key, fn: fn, args: argsJson }), redirect: 'follow' });
  var j = await r.json();
  if (!j.ok) throw new Error(j.error || 'google_error');
  return j.result === undefined ? null : j.result;
}

function nkWho(body) {
  try {
    var b = JSON.parse(body), tok = b.token;
    if (!tok) return b.action || '';
    var s = (NK_BASE.tables.sessions || []).filter(function (r) { return r[1].token === tok; })[0];
    return s ? s[1].name : '';
  } catch (e) { return ''; }
}

async function nkHandle(body, query, entry, actName) {
  var memo = {}, now = RealDate.now(), seed = (RealMath.random() * 4294967296) >>> 0, action = '';
  try { action = JSON.parse(body || '{}').action || ''; } catch (e) {}
  if (query && query.yc) action = 'whatsapp-webhook';
  if (actName) action = actName;
  for (var attempt = 0; attempt < 6; attempt++) {
    await nkSync();
    var ctx = null;
    for (var pass = 0; pass < 60; pass++) {
      ctx = nkRun(body, query, memo, now, seed, entry);
      if (!ctx.pend.length) break;
      /* do the FIRST thing it waited for (anything after it may come from a branch that assumed it failed);
         database reads are safe to do together */
      var reads = ctx.pend.filter(function (p) { return p.kind === 'load' || p.kind === 'findOld' || p.kind === 'changelog'; });
      if (reads.length) { for (var i = 0; i < reads.length; i++) await nkDo(reads[i], memo); }
      else await nkDo(ctx.pend[0], memo);
    }
    if (ctx.pend.length) return JSON.stringify({ ok: false, error: 'server_error' });
    var pay = nkCommitPayload(NK_BASE, ctx);
    if (!pay.ops.length) return ctx.out;
    var res = await nkRpc('nk_commit', { ops: pay.ops, expect: pay.expect, who: nkWho(body) || null, act: action || null });
    if (res && res.conflict) { await new Promise(function (r) { setTimeout(r, 30 + attempt * 60); }); continue; }
    nkApplySafe(pay, res);
    return ctx.out;
  }
  return JSON.stringify({ ok: false, error: 'busy_retry' });
}
/* bring the warm copy up to date with what was just saved (only where nobody else's change is mixed in) */
function nkApplySafe(pay, res) {
  var ok = {}, vers = res.versions || {};
  Object.keys(vers).forEach(function (t) { ok[t] = (NK_BASE.versions[t] || 0) === vers[t] - 1 && t in NK_BASE.tables; });
  var mine = { ops: pay.ops.filter(function (o) { return o.op === 'kv' || ok[o.t]; }), adds: [] };
  var ids = res.ids || [], n = 0, idsMine = [];
  pay.ops.forEach(function (o) { if (o.op === 'add') { if (ok[o.t]) idsMine.push(ids[n]); n++; } });
  nkApply(NK_BASE, mine, { ids: idsMine, versions: {} });
  Object.keys(vers).forEach(function (t) { if (ok[t]) NK_BASE.versions[t] = vers[t]; else delete NK_BASE.tables[t]; }); // reload next time
}

var NK_CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS' };
async function nkServe(req) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: NK_CORS });
  var u = new URL(req.url), q = {}, body = '';
  u.searchParams.forEach(function (v, k) { q[k] = v; });
  try {
    body = req.method === 'POST' ? await req.text() : '';
    var special = await nkSpecial(body, q);
    var out = special != null ? special : req.method === 'GET' && !q.yc ? JSON.stringify({ ok: true, service: 'nikadi' }) : await nkHandle(body, q);
    return new Response(out, { headers: Object.assign({ 'Content-Type': 'application/json' }, NK_CORS) });
  } catch (e) {
    console.error(e);
    var setup = /"action"\s*:\s*"nk[A-Z]/.test(body || '');
    return new Response(JSON.stringify({ ok: false, error: 'server_error', detail: setup ? String(e && e.message || e).slice(0, 400) : undefined }), { headers: Object.assign({ 'Content-Type': 'application/json' }, NK_CORS) });
  }
}
