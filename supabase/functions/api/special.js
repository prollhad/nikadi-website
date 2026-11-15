/* ===== Setup actions: pairing with the Google (Apps Script) side and copying the data over ===== */
async function nkKvPut(map, sec) {
  var ops = Object.keys(map).map(function (k) { return { op: 'kv', k: k, v: map[k] == null ? null : String(map[k]), sec: sec }; });
  if (ops.length) await nkRpc('nk_commit', { ops: ops, expect: {}, who: 'setup', act: 'setup' });
  Object.keys(map).forEach(function (k) { if (map[k] == null) delete NK_BASE.kv[k]; else NK_BASE.kv[k] = String(map[k]); });
}
async function nkSpecial(body, q) {
  var b = {}; try { b = body ? JSON.parse(body) : {}; } catch (e) { return null; }
  var a = b.action;
  if (['nkPair', 'nkPaired', 'nkMigrate', 'nkStatus', 'nkCron', 'nkCronSetup', 'nkSetLive', 'nkExport'].indexOf(a) < 0) return null;
  await nkSync();
  var live = NK_BASE.kv['p:NK_MODE'] === 'live';
  function owner() { // a logged-in Owner of the staff app
    var s = (NK_BASE.tables.sessions || []).filter(function (r) { return r[1].token === b.token; })[0]; if (!s) return false;
    var p = (NK_BASE.tables.staff || []).filter(function (r) { return r[1].name === s[1].name; })[0];
    return !!p && p[1].role === 'Owner' && String(p[1].active).toLowerCase() === 'yes' && String(s[1].expires) > Utilities.formatDate(new RealDate(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm');
  }
  if (a === 'nkCronSetup') { // the database timer reads this key from the database itself
    if (!NK_BASE.kv['p:NK_CRON_KEY']) await nkKvPut({ 'p:NK_CRON_KEY': Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '') });
    return JSON.stringify({ ok: true });
  }
  if (a === 'nkCron') {
    if (!b.key || b.key !== NK_BASE.kv['p:NK_CRON_KEY']) return JSON.stringify({ ok: false, error: 'forbidden' });
    if (!live && !b.force) return JSON.stringify({ ok: true, skipped: 'test copy' });
    var opts = b.opts || {};
    var out = await nkHandle('{}', {}, function () { return nkCronRun_(opts); }, 'timer');
    var hour = +Utilities.formatDate(new RealDate(), 'Asia/Kolkata', 'H'), day = Utilities.formatDate(new RealDate(), 'Asia/Kolkata', 'yyyy-MM-dd');
    if (live && hour >= 3 && hour < 5 && NK_BASE.kv['p:NK_LAST_EXPORT'] !== day) {
      try { await nkExportToSheet(); await nkKvPut({ 'p:NK_LAST_EXPORT': day }); }
      catch (e) { console.error(e); try { await nkBridgeCall('nkMail_', JSON.stringify([{ to: NikadiBill.HOTEL.email, subject: '⚠ Nikadi app: nightly copy to the Google Sheet failed', body: String(e && e.message || e) }])); } catch (e2) {} }
    }
    return out;
  }
  if (a === 'nkExport') { // copy the database into the Google Sheet now (Owner, live only)
    if (!owner()) return JSON.stringify({ ok: false, error: 'not_allowed' });
    if (!live) return JSON.stringify({ ok: false, error: 'test_copy' });
    var n = await nkExportToSheet();
    return JSON.stringify({ ok: true, rows: n });
  }
  if (a === 'nkSetLive') { // the switch (and the way back): Owner only
    if (!owner()) return JSON.stringify({ ok: false, error: 'not_allowed' });
    var on = !!b.on;
    await nkBridgeCall('nkSetLive_', JSON.stringify([on]));
    await nkKvPut({ 'p:NK_MODE': on ? 'live' : null, 'p:NK_TEST_MODE': on ? null : '1' });
    return JSON.stringify({ ok: true, live: on });
  }
  if (a === 'nkStatus') return JSON.stringify({ ok: true, paired: !!NK_BASE.kv['p:NK_BRIDGE_KEY'], mode: NK_BASE.kv['p:NK_MODE'] || 'test', test: nkTestMode(),
    tables: Object.keys(NK_BASE.versions).length, rows: Object.keys(NK_BASE.tables).reduce(function (s, t) { return s + NK_BASE.tables[t].length; }, 0) });
  if (a === 'nkPair') { // ask Google to send its key straight to this server (it goes only to this fixed address)
    var nonce = Utilities.getUuid().replace(/-/g, '');
    await nkKvPut({ 'c:nk_pair': nonce }, 300);
    var url = NK_BASE.kv['p:NK_GOOGLE_URL'] || NK_API_EXEC;
    var r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'nkPair', nonce: nonce }), redirect: 'follow' });
    var j = await r.json().catch(function () { return {}; });
    await nkSync();
    return JSON.stringify({ ok: !!j.ok && !!NK_BASE.kv['p:NK_BRIDGE_KEY'], google: j });
  }
  if (a === 'nkPaired') {
    if (!b.nonce || b.nonce !== NK_BASE.kv['c:nk_pair'] || !/^[a-f0-9]{40,80}$/.test(String(b.key || ''))) return JSON.stringify({ ok: false, error: 'bad_pairing' });
    await nkKvPut({ 'p:NK_BRIDGE_KEY': b.key, 'p:NK_GOOGLE_URL': String(b.url || NK_API_EXEC), 'c:nk_pair': null });
    return JSON.stringify({ ok: true });
  }
  if (a === 'nkMigrate') { // copy everything from the Google Sheet (only before the switch; Owner once there is data)
    if (live) return JSON.stringify({ ok: false, error: 'live_database' });
    if ((NK_BASE.tables.sessions || []).length && !owner()) return JSON.stringify({ ok: false, error: 'not_allowed' });
    var data = await nkBridgeCall('nkExport_', '[]');
    await nkRpc('nk_reset', {});
    var ops = [], count = {};
    Object.keys(data.desk || {}).forEach(function (t) { (data.desk[t] || []).forEach(function (o) { ops.push({ op: 'add', t: t, data: o }); }); count[t] = (data.desk[t] || []).length; });
    Object.keys(data.sheets || {}).forEach(function (n) { (data.sheets[n] || []).forEach(function (row) { ops.push({ op: 'add', t: 'sheet:' + n, data: { v: row } }); }); count['sheet:' + n] = (data.sheets[n] || []).length; });
    for (var i = 0; i < ops.length; i += 800) await nkRpc('nk_commit', { ops: ops.slice(i, i + 800), expect: {}, who: 'migrate', act: 'migrate' });
    var props = {}; Object.keys(data.props || {}).forEach(function (k) { if (k !== 'NK_BRIDGE_KEY' && k !== 'NK_LIVE') props['p:' + k] = data.props[k]; });
    props['p:NK_TEST_MODE'] = '1'; // stays a test copy until nkSetLive
    await nkKvPut(props);
    NK_BASE = { versions: {}, tables: {}, kv: {} };
    return JSON.stringify({ ok: true, rows: ops.length, tables: count });
  }
  return null;
}

/* the whole database into the Google Sheet (it becomes the readable copy / way back) */
async function nkExportToSheet() {
  await nkSync();
  for (var t in NK_LAZY) if (!(t in NK_BASE.tables) && NK_BASE.versions[t] != null) { var r = await nkRpc('nk_load', { tbls: [t] }); nkLoadRows(t, (r.rows || {})[t] || []); }
  var desk = {}, sheets = {}, n = 0;
  Object.keys(NK_BASE.tables).forEach(function (t) {
    var rows = NK_BASE.tables[t].map(function (r) { return r[1]; }); n += rows.length;
    if (t.indexOf('sheet:') === 0) sheets[t.slice(6)] = rows.map(function (o) { return o.v || []; });
    else if (DESK_SCHEMA[t]) desk[t] = rows;
  });
  await nkBridgeCall('nkImport_', JSON.stringify([{ desk: desk, sheets: sheets }]));
  return n;
}
