/* Runs the Nikadi server code against an in-memory copy of the database (same rules as the SQL functions). */
process.env.SUPABASE_URL = 'https://test.local'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
const DB = { records: [], next: 1, versions: {}, kv: {}, archive: [] };
let calls = { sync: 0, commit: 0, bridge: [] , fetch: [] };
globalThis.NK_TEST_RPC = async (fn, a) => {
  if (fn === 'nk_sync') { calls.sync++; const rows = {}; for (const t of Object.keys(DB.versions)) { if ((a.skip || []).includes(t)) continue; if (a.have[t] == null || a.have[t] !== DB.versions[t]) rows[t] = DB.records.filter(r => r.tbl === t).map(r => [r.rid, JSON.parse(JSON.stringify(r.data))]); } return { versions: { ...DB.versions }, kv: { ...DB.kv }, rows }; }
  if (fn === 'nk_load') { const rows = {}; for (const t of a.tbls) rows[t] = DB.records.filter(r => r.tbl === t).map(r => [r.rid, JSON.parse(JSON.stringify(r.data))]); return { versions: { ...DB.versions }, rows }; }
  if (fn === 'nk_find_old') { const r = DB.archive.filter(r => r.tbl === a.t && String(r.data[a.field]) === a.val).pop(); return r ? [r.rid, r.data] : null; }
  if (fn === 'nk_changelog') return [{ id: 5, at: new Date().toISOString(), who: 'Owner', action: 'deskCheckIn', tbl: 'stays', after: { guest: 'X', room: 1 } }];
  if (fn === 'nk_reset') { DB.records = []; DB.versions = {}; return null; }
  if (fn === 'nk_commit') {
    calls.commit++;
    const bad = Object.keys(a.expect || {}).filter(t => (DB.versions[t] || 0) !== a.expect[t]);
    if (bad.length) return { conflict: bad };
    const ids = [], touched = new Set();
    for (const o of a.ops) {
      if (o.op === 'kv') { if (o.v == null) delete DB.kv[o.k]; else DB.kv[o.k] = o.v; continue; }
      touched.add(o.t);
      if (o.op === 'add') { const rid = DB.next++; DB.records.push({ rid, tbl: o.t, data: JSON.parse(JSON.stringify(o.data)) }); ids.push(rid); }
      else { const i = DB.records.findIndex(r => r.rid === o.rid); if (i < 0) continue;
        if (o.op === 'set') Object.assign(DB.records[i].data, JSON.parse(JSON.stringify(o.patch)));
        else if (o.op === 'put') DB.records[i].data = JSON.parse(JSON.stringify(o.data));
        else { if (o.op === 'arch') DB.archive.push(DB.records[i]); DB.records.splice(i, 1); } }
    }
    const versions = {}; for (const t of touched) { DB.versions[t] = (DB.versions[t] || 0) + 1; versions[t] = DB.versions[t]; }
    return { ids, versions };
  }
  throw new Error('rpc ' + fn);
};
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const body = init && typeof init.body === 'string' ? JSON.parse(init.body) : null;
  if (body && body.action === 'nkBridge') { calls.bridge.push(body.fn); const res = body.fn === 'deskGetPhoto_' ? 'data:image/jpeg;base64,AAA' : body.fn === 'deskSavePhoto_' ? 'DRIVEFILE1' : body.fn === 'deskStayFolder_' ? 'FOLDER1' : true;
    return new Response(JSON.stringify({ ok: true, result: res }), { headers: { 'content-type': 'application/json' } }); }
  calls.fetch.push(url);
  return new Response(JSON.stringify({ id: 'wamid.TEST' }), { headers: { 'content-type': 'application/json' } });
};
const M = await import('/home/claude/nikadi-website/supabase/functions/api/index.js');
// seed: like a fresh Sheet (defaults) + membership tabs with headings
const seed = [];
const g = await import('/home/claude/nikadi-website/supabase/functions/api/index.js');
// use the code's own defaults via a tiny run: DESK_DEFAULTS is a global inside the module, so seed through a migrate-like commit
const defaults = JSON.parse(JSON.stringify((await (async () => { const s = await M.nkServe(new Request('https://x/?__get=1', { method: 'GET' })); return {}; })())));
async function call(action, data = {}, q = '') {
  const r = await M.nkServe(new Request('https://test.local/functions/v1/api' + q, { method: 'POST', body: JSON.stringify(Object.assign({ action }, data)) }));
  return r.json();
}
// put defaults: rooms / items / staff / config straight into the DB
const ops = [];
const rooms = Array.from({ length: 11 }, (_, i) => ({ room: i + 1, type: i % 2 ? 'Deluxe Double' : 'Deluxe Twin', beds: '2 beds', rate: 3000, status: 'Ready', stay: '', updated: '', by: '' }));
rooms.forEach(o => ops.push({ op: 'add', t: 'rooms', data: o }));
[{ item: 'Water bottle', price: 20, track: 'Yes', stock: 100, low: 20, active: 'Yes', sell: 'Yes' }, { item: 'Dental kit', price: 30, track: 'Yes', stock: 20, low: 5, active: 'Yes', sell: 'Yes' }].forEach(o => ops.push({ op: 'add', t: 'items', data: o }));
[{ name: 'Owner', pin: '1111', role: 'Owner', active: 'Yes' }, { name: 'Reception', pin: '2222', role: 'Manager', active: 'Yes' }].forEach(o => ops.push({ op: 'add', t: 'staff', data: o }));
for (const t of ['stays', 'bookings', 'charges', 'payments', 'requests', 'bills', 'stocklog', 'sessions']) ops.push({ op: 'add', t, data: {} });
ops.push({ op: 'add', t: 'sheet:Members', data: { v: ['Phone', 'Name', 'Email', 'City', 'Date of birth', 'Joined', 'Points', 'Lifetime points', 'Status', 'Note', 'Password (hashed)', 'Tier', 'Platinum Plus until', 'Nights (last 2 years)', 'Nights (all time)'] } });
ops.push({ op: 'add', t: 'sheet:Transactions', data: { v: ['Date', 'Phone', 'Name', 'Type', 'Amount (₹)', 'Points', 'Balance', 'Note', 'By'] } });
ops.push({ op: 'add', t: 'sheet:Otps', data: { v: ['Phone', 'Hash', 'Purpose', 'Expires', 'Attempts', 'Payload'] } });
ops.push({ op: 'add', t: 'sheet:Sessions', data: { v: ['Token', 'Phone', 'Role', 'Expires'] } });
ops.push({ op: 'add', t: 'sheet:Settings', data: { v: ['Key', 'Value', 'What it means'] } });
await globalThis.NK_TEST_RPC('nk_commit', { ops, expect: {} });
// remove the empty placeholder rows
DB.records = DB.records.filter(r => Object.keys(r.data).length);
DB.kv['p:NK_TEST_MODE'] = '1';
const t0 = Date.now();
const login = await call('deskLogin', { pin: '1111' });
console.log('login', login.ok, login.me);
const tok = login.token;
const st = await call('deskState', { token: tok });
console.log('state', st.ok, st.rooms && st.rooms.length, 'rooms; error:', st.error);
const ci = await call('deskCheckIn', { token: tok, room: 1, guest: 'Test Guest', phone: '9876543210', guests: 2, checkin: st.today, checkout: st.today.slice(0, 8) + String(+st.today.slice(8) + 1).padStart(2, '0'), rate: 2500, advance: 1000, method: 'Cash', kit: 'Dental kit' });
console.log('checkin', ci.ok, ci.error || (ci.stay && ci.stay.balance));
const ch = await call('deskCharge', { token: tok, room: 1, item: 'Water bottle', qty: 2 });
console.log('charge', ch.ok, ch.error || '');
const st2 = await call('deskState', { token: tok });
console.log('room1', st2.rooms[0].status, st2.rooms[0].stay && st2.rooms[0].stay.guest, 'items', st2.items.map(i => i.item + ':' + i.stock).join(','));
const join = await call('join', { name: 'Ravi Kumar', phone: '9123456780', city: 'Kolkata', email: '' });
console.log('website join', JSON.stringify(join).slice(0, 160));
const cfg = await call('config', {});
console.log('website config', cfg.ok, Object.keys(cfg).slice(0, 6).join(','));
const out = await call('deskCheckOut', { token: tok, id: ci.stay.id, nights: 1 });
console.log('checkout', out.ok, out.error || (out.bill && out.bill.no));
console.log('calls', JSON.stringify({ sync: calls.sync, commit: calls.commit, bridge: calls.bridge, fetch: calls.fetch.length }), 'ms', Date.now() - t0);
console.log('db rows', DB.records.length, 'versions', JSON.stringify(DB.versions));

// change log (owner)
const cl = await call('deskChangeLog', { token: tok });
console.log('changelog', cl.ok, cl.error || cl.rows.length, cl.rows && cl.rows[0].tab);
// timer
DB.kv['p:NK_CRON_KEY'] = 'k1';
const cr = await call('nkCron', { key: 'k1', force: true, opts: { archive: false } });
console.log('cron', JSON.stringify(cr).slice(0, 200));
// WhatsApp webhook: a guest says hi
Object.assign(DB.kv, { 'p:YC_HOOK_KEY': 'hook1', 'p:YC_API_KEY': 'ycKEY', 'p:YC_FROM': '+917501101137' });
const ev = { id: 'ev1', type: 'whatsapp.inbound_message.received', whatsappInboundMessage: { id: 'm1', from: '+919812345678', customerProfile: { name: 'Asha' }, type: 'text', text: { body: 'Hi' } } };
const before = calls.fetch.length;
const wh = await M.nkServe(new Request('https://test.local/functions/v1/api?yc=hook1', { method: 'POST', body: JSON.stringify(ev) })).then(r => r.json());
console.log('webhook', JSON.stringify(wh), 'ycloud calls', calls.fetch.length - before, calls.fetch.slice(before).map(u => String(u).replace('https://api.ycloud.com/v2/', '')).join(','));
const chats = await call('deskWaChats', { token: tok });
console.log('chats', chats.ok, chats.error || JSON.stringify(chats).slice(0, 160));
