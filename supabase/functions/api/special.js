/* ===== Setup actions: pairing with the Google (Apps Script) side and copying the data over ===== */
async function nkKvPut(map, sec) {
  var ops = Object.keys(map).map(function (k) { return { op: 'kv', k: k, v: map[k] == null ? null : String(map[k]), sec: sec }; });
  if (ops.length) await nkRpc('nk_commit', { ops: ops, expect: {}, who: 'setup', act: 'setup' });
  Object.keys(map).forEach(function (k) { if (map[k] == null) delete NK_BASE.kv[k]; else NK_BASE.kv[k] = String(map[k]); });
}
async function nkSpecial(body, q) {
  var b = {}; try { b = body ? JSON.parse(body) : {}; } catch (e) { return null; }
  var a = b.action;
  if (a !== 'nkPair' && a !== 'nkPaired' && a !== 'nkMigrate' && a !== 'nkStatus') return null;
  await nkSync();
  var live = NK_BASE.kv['p:NK_MODE'] === 'live';
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
  if (a === 'nkMigrate') { // copy everything from the Google Sheet (only before the switch)
    if (live) return JSON.stringify({ ok: false, error: 'live_database' });
    var data = await nkBridgeCall('nkExport_', '[]');
    await nkRpc('nk_reset', {});
    var ops = [], count = {};
    Object.keys(data.desk || {}).forEach(function (t) { (data.desk[t] || []).forEach(function (o) { ops.push({ op: 'add', t: t, data: o }); }); count[t] = (data.desk[t] || []).length; });
    Object.keys(data.sheets || {}).forEach(function (n) { (data.sheets[n] || []).forEach(function (row) { ops.push({ op: 'add', t: 'sheet:' + n, data: { v: row } }); }); count['sheet:' + n] = (data.sheets[n] || []).length; });
    for (var i = 0; i < ops.length; i += 800) await nkRpc('nk_commit', { ops: ops.slice(i, i + 800), expect: {}, who: 'migrate', act: 'migrate' });
    var props = {}; Object.keys(data.props || {}).forEach(function (k) { if (k !== 'NK_BRIDGE_KEY') props['p:' + k] = data.props[k]; });
    props['p:NK_TEST_MODE'] = b.live ? null : '1';
    await nkKvPut(props);
    NK_BASE = { versions: {}, tables: {}, kv: {} };
    return JSON.stringify({ ok: true, rows: ops.length, tables: count });
  }
  return null;
}
