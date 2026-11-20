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
  if (String(url).includes('/storage/v1/object/files/claims/')) { const k = String(url).split('/claims/')[1]; calls.claims = calls.claims || {}; if (calls.claims[k]) return new Response('{"statusCode":"409","error":"Duplicate","message":"The resource already exists"}', { status: 400 }); calls.claims[k] = 1; return new Response('{}'); }
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

// same inbound message delivered twice at the same moment, assistant ON: only one reply
DB.records.push({ rid: DB.next++, tbl: 'config', data: { key: 'waBot', value: 'on' } }); DB.versions.config = (DB.versions.config || 0) + 1;
const ev2 = { id: 'ev2', type: 'whatsapp.inbound_message.received', whatsappInboundMessage: { id: 'm2', wamid: 'wamid.DUP1', from: '+919812345679', customerProfile: { name: 'Bina' }, type: 'text', text: { body: 'Hi' } } };
delete DB.kv['p:NK_TEST_MODE'];
const b2 = calls.fetch.length;
await Promise.all([1, 2].map(() => M.nkServe(new Request('https://test.local/functions/v1/api?yc=hook1', { method: 'POST', body: JSON.stringify(ev2) })).then(r => r.json())));
console.log('double webhook → ycloud sends', calls.fetch.length - b2, '(want 1 set of replies, not 2)', calls.fetch.slice(b2).map(u => String(u).replace('https://api.ycloud.com/v2/', '')).join(','));
console.log('claims', Object.keys(calls.claims || {}).join(','));
DB.kv['p:NK_TEST_MODE'] = '1';
// a waiting welcome message, two timer runs at the same moment, automatic messages ON: sent once
delete DB.kv['p:NK_TEST_MODE'];
DB.records.push({ rid: DB.next++, tbl: 'config', data: { key: 'waAuto', value: 'on' } }); DB.versions.config++;
const nowS = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
DB.records.push({ rid: DB.next++, tbl: 'wa', data: { id: 'W-dup', at: nowS, sendAt: nowS, to: '9812345670', name: 'Chandan', kind: 'welcome', ref: ci.stay.id, status: 'Waiting', info: '' } }); DB.versions.wa = (DB.versions.wa || 0) + 1;
const b3 = calls.fetch.length;
const r3 = await Promise.all([1, 2].map(() => call('nkCron', { key: 'k1', force: true, opts: { archive: false } })));
console.log('double timer → ycloud sends', calls.fetch.length - b3, '(want 1)', JSON.stringify(r3.map(r => r.out && r.out.due && r.out.due.sent)), JSON.stringify(DB.records.find(r => r.data.id === 'W-dup').data));
DB.kv['p:NK_TEST_MODE'] = '1';
// automatic sending off: messages wait for the owner / a manager to send by hand
DB.records.filter(r => r.tbl === 'config' && r.data.key === 'waAuto').forEach(r => r.data.value = 'off'); DB.versions.config++;
const st3 = await call('deskState', { token: tok });
const ci3 = await call('deskCheckIn', { token: tok, room: 5, guest: 'Hand Send', phone: '9876500011', guests: 1, checkin: st3.today, checkout: st3.today.slice(0, 8) + String(+st3.today.slice(8) + 1).padStart(2, '0'), rate: 3000, advance: 0, method: 'Cash', waOk: 'Yes', waOffers: 'Yes' });
const ts = await call('deskWaToSend', { token: tok });
console.log('to send', ci3.ok || ci3.error, ts.ok, (ts.list || []).map(m => m.kind + ':' + m.phone).join(','), 'state count', (await call('deskState', { token: tok })).waToSend);
console.log('text', JSON.stringify((ts.list || [])[0] && ts.list[0].text).slice(0, 120));
const hd = await call('deskWaHandDone', { token: tok, id: ts.list[0].id, type: ts.list[0].type });
console.log('after done', hd.ok, hd.list.length);
const rec = await call('deskLogin', { pin: '2222' });
console.log('manager login role', rec.me && rec.me.role);
const kit = await call('deskWaKit', { token: tok });
console.log('kit', kit.ok, 'in', kit.in.length, kit.in.map(g => g.name + ':' + g.msgs.map(m => m.kind).join('/')).join(' | '), 'out', kit.out.length, kit.out.map(g => g.name + ':' + g.msgs.map(m => m.kind).join('/')).join(' | '));
const ks = await call('deskWaKitSent', { token: tok, ref: kit.in[0].key, kind: 'welcome', phone: kit.in[0].phone, name: kit.in[0].name });
console.log('kit sent', ks.ok, ks.in[0].msgs.find(m => m.kind === 'welcome').sent);
const st4 = await call('deskState', { token: tok });
const eq = await call('deskWaEnquiry', { token: tok, phone: '9812300000', name: 'Gopal Das', checkin: st4.today, checkout: '', nights: 2, rooms: 1, type: 'Deluxe Twin' });
console.log('enquiry', eq.ok, eq.phone, eq.msgs.map(m => m.kind).join('/'));
console.log(eq.msgs.find(m => m.kind === 'rooms').text);
console.log(eq.msgs.find(m => m.kind === 'advance').text.slice(0, 160));
const k2 = await call('deskWaKit', { token: tok }); console.log('enq folder', k2.enq.length);
const rg = await call('deskGuestRegister', { name: 'Gopal Das', phone: '9876500011', email: 'g@x.in', checkin: st4.today, checkout: st4.today, fields: [['Full name', 'Gopal Das'], ['Address', 'Kolkata'], ['ID type', 'Aadhaar']], people: ['Radha | Age: 30 | wife | ID: -'] });
const rl = await call('deskRegistrations', { token: tok });
console.log('reg', rg.ok, rl.ok, rl.list.length, rl.list[0].fields.length, rl.list[0].status, (await call('deskState', { token: tok })).regNew);
const bk = await call('deskBookingRequest', { guest: 'Mr Anil Kumar Saha', phone: '9800011122', guests: 2, roomsNeeded: 1, roomType: 'Deluxe Double', checkin: st4.today.slice(0, 8) + '28', checkout: st4.today.slice(0, 8) + '30', waOk: true });
const k3 = await call('deskWaKit', { token: tok });
console.log('advpending', bk.ok, k3.enq.length, '\n' + (k3.enq[0] && k3.enq[0].msgs[0].text));
const dm1 = await call('deskDummy', { token: tok, on: true });
const dm2 = await call('deskDummy', { token: tok, rooms: [1, 5, 6, 99] });
console.log('dummy', JSON.stringify(dm1), JSON.stringify(dm2), JSON.stringify((await call('deskState', { token: tok })).dummy));
const k5 = await call('deskWaKit', { token: tok }); const og = k5.out[0];
const c1 = (await call('deskState', { token: tok })).waToSend;
const dn = await call('deskWaKitDone', { token: tok, folder: 'out', refs: [og.key] });
console.log('done', dn.ok, 'still listed', !!dn.out.find(g => g.key === og.key), 'count', c1, '->', (await call('deskState', { token: tok })).waToSend);
const k6 = await call('deskWaKit', { token: tok }); console.log('gen', k6.gen.length, '\n' + k6.gen.find(m => m.kind === 'grooms').text);
const bkc = await call('deskBookingRequest', { guest: 'Sita Ram Ghosh', phone: '9800022233', guests: 2, roomsNeeded: 1, roomType: 'Deluxe Twin', checkin: st4.today.slice(0, 8) + '27', checkout: st4.today.slice(0, 8) + '28', waOk: true });
const cc = await call('deskBookingCancel', { token: tok, id: bkc.id || (bkc.booking && bkc.booking.id), reason: 'test' });
const k7 = await call('deskWaKit', { token: tok }); const cg = k7.enq.find(g => g.cancelled);
console.log('cancel', cc.ok || cc.error, !!cg, cg && cg.msgs.map(m => m.kind).join('/'), '\n' + (cg && cg.msgs[0].text));
const sav = await call('deskSiteAvailability', { days: 30 });
console.log('siteAvailability', sav.ok || sav.error, sav.days && sav.days.length, sav.types, sav.days && JSON.stringify(sav.days.filter(x => Object.values(x.t).some(v => v !== 'free')).slice(0, 3)));
if (!sav.ok || sav.days.length !== 30) throw new Error('siteAvailability broken');
const dShow = sav.days[5].d, tShow = sav.types[0];
const ss1 = await call('deskSiteShow', { token: tok, day: dShow, type: '*', show: 'full' });
const sav2 = await call('deskSiteAvailability', { days: 30 });
const ss2 = await call('deskSiteShow', { token: tok, day: dShow, type: tShow, show: 'fill' });
const sav3 = await call('deskSiteAvailability', { days: 30 });
const calS = await call('deskCalendar', { token: tok, from: dShow, days: 3 });
const ss3 = await call('deskSiteShow', { token: tok, day: dShow, type: '*', show: 'auto' });
const sav4 = await call('deskSiteAvailability', { days: 30 });
const ssBad = await call('deskSiteShow', { day: dShow, type: '*', show: 'full' });
console.log('siteShow', ss1.ok || ss1.error, JSON.stringify(sav2.days[5].t), JSON.stringify(sav3.days[5].t), JSON.stringify(calS.site), JSON.stringify(sav4.days[5].t), 'noLogin:', ssBad.error);
if (!Object.values(sav2.days[5].t).every(v => v === 'full') || sav3.days[5].t[tShow] !== 'fill' || !calS.site[dShow] || Object.values(sav4.days[5].t).some(v => v !== 'free') || ssBad.ok) throw new Error('siteShow broken');
// ---- housekeeping: water count and extra bedding/towels ----
{
  const st0 = await call('deskState', { token: tok });
  const hkLine = st0.hk.stay.find(l => l[0] === 'water');
  const lx0 = await call('deskLinenExtra', { token: tok });
  console.log('hk water line', JSON.stringify(hkLine), 'linenExtra', lx0.ok || lx0.error, 'rooms', (lx0.rooms || []).length, 'items', (lx0.items || []).length);
  if (!hkLine[2] || hkLine[2][0] !== 'No water needed' || !lx0.ok) throw new Error('hk water / linenExtra broken');
  if (lx0.rooms.length) {
    const rn = lx0.rooms[0].room, t0 = lx0.items.find(i => i.item === 'Towel').store;
    const g = await call('deskLinenExtra', { token: tok, room: rn, items: { 'Towel': 2, 'Hand towel': 1 } });
    const given = g.rooms.find(r => r.room === rn).given;
    const back = await call('deskLinenExtra', { token: tok, back: given[0].id, unused: true });
    console.log('extra given', JSON.stringify(given.map(x => x.qty + 'x' + x.item)), 'store towel', t0, '->', g.items.find(i => i.item === 'Towel').store, 'after back', back.rooms.find(r => r.room === rn).given.length);
    if (given.length !== 2 || back.rooms.find(r => r.room === rn).given.length !== 1) throw new Error('linenExtra give/back broken');
  }
}
// ---- tonight's late price ----
{
  const s1 = await call('deskSiteAvailability', { days: 7 });
  const hourIst = new Date(Date.now() + 330 * 60000).getUTCHours();
  console.log('tonight deal at IST hour', hourIst, JSON.stringify(s1.deal));
  if (hourIst < 18 && s1.deal) throw new Error('deal before 6 pm');
}
// ---- reverse check-in ----
{
  const st = await call('deskState', { token: tok });
  const ready = st.rooms.filter(r => r.status === 'Ready').map(r => r.room);
  console.log('ready rooms for undo test', ready.length);
  if (ready.length >= 3) {
    const t0 = st.today, t2 = new Date(Date.parse(t0) + 2 * 864e5).toISOString().slice(0, 10);
    // walk-in, reversed from the room
    const ci = await call('deskCheckIn', { token: tok, room: ready[0], guest: 'Undo Walkin', guests: 2, checkin: t0, checkout: t2, rate: 3000 });
    const sid = ci.stay && ci.stay.id;
    const u1 = await call('deskUndoCheckin', { token: tok, id: sid, reason: 'test mistake' });
    const st1 = await call('deskState', { token: tok });
    console.log('walk-in undo', ci.ok || ci.error, 'undoIn flag', ci.stay && ci.stay.undoIn, '->', u1.ok || u1.error, 'room now', st1.rooms.find(r => r.room === ready[0]).status);
    if (!u1.ok || st1.rooms.find(r => r.room === ready[0]).status !== 'Ready') throw new Error('undo walk-in check-in broken');
    // booking with two rooms, reversed from the booking
    const bc = await call('deskBookingCreate', { token: tok, guest: 'Undo Group', phone: '9876500011', guests: 4, roomsNeeded: 2, roomType: st.rooms.find(r => r.room === ready[1]).type, checkin: t0, checkout: t2, rate: 3000, rooms: [ready[1], ready[2]] });
    const bid = bc.booking && bc.booking.id;
    const cf = await call('deskBookingConfirm', { token: tok, id: bid, amount: 1000, method: 'Cash', rooms: [ready[1], ready[2]] });
    const bi = await call('deskBookingCheckIn', { token: tok, id: bid });
    const bv = await call('deskBooking', { token: tok, id: bid });
    const u2 = await call('deskUndoCheckin', { token: tok, booking: bid, reason: 'guest not arrived yet' });
    const st2 = await call('deskState', { token: tok });
    console.log('booking undo', bc.ok || bc.error, cf.ok || cf.error, bi.ok || bi.error, 'flag', bv.booking && bv.booking.undoIn, JSON.stringify(bv.booking && bv.booking.undoInRooms), '->', u2.ok || u2.error, u2.booking && u2.booking.status, 'advance kept', u2.booking && u2.booking.advancePaid,
      'rooms', [ready[1], ready[2]].map(n => st2.rooms.find(r => r.room === n).status).join('/'));
    if (bi.ok && (!u2.ok || u2.booking.status !== 'Confirmed' || u2.booking.advancePaid !== 1000 || [ready[1], ready[2]].some(n => st2.rooms.find(r => r.room === n).status !== 'Ready'))) throw new Error('undo booking check-in broken');
    // can check in again afterwards
    const bi2 = bi.ok ? await call('deskBookingCheckIn', { token: tok, id: bid }) : { ok: false };
    // a stay with money cannot be reversed
    const ci3 = await call('deskCheckIn', { token: tok, room: ready[0], guest: 'Paid Walkin', guests: 1, checkin: t0, checkout: t2, rate: 3000, advance: 500, method: 'Cash' });
    const u3 = await call('deskUndoCheckin', { token: tok, id: ci3.stay && ci3.stay.id, reason: 'x' });
    console.log('check in again', bi2.ok || bi2.error, '| paid stay undo refused:', u3.error);
    if (u3.ok || (bi.ok && !bi2.ok)) throw new Error('undo check-in guards broken');
  }
}
// ---- no-show: message with the statement link, public statement ----
{
  const st = await call('deskState', { token: tok });
  const ready = st.rooms.filter(r => r.status === 'Ready').map(r => r.room);
  if (ready.length) {
    const t0 = st.today, t2 = new Date(Date.parse(t0) + 2 * 864e5).toISOString().slice(0, 10);
    const bc = await call('deskBookingCreate', { token: tok, guest: 'Noshow Test', phone: '9876500022', guests: 2, roomsNeeded: 1, roomType: st.rooms.find(r => r.room === ready[0]).type, checkin: t0, checkout: t2, rate: 12000, rooms: [ready[0]] });
    const bid = bc.booking.id;
    await call('deskBookingConfirm', { token: tok, id: bid, amount: 10000, method: 'UPI', ref: 'UTR123', rooms: [ready[0]] });
    const ns = await call('deskBookingNoShow', { token: tok, id: bid });
    const url = ns.booking && ns.booking.stmtUrl, key = url && url.split('?s=')[1];
    const pub = await call('deskStatementView', { id: key });
    const bad = await call('deskStatementView', { id: 'AAAAAAAAAAAAAAAAAAAAAA' });
    const kit = await call('deskWaKit', { token: tok });
    const g = (kit.enq || []).find(x => x.booking === bid), msg = g && g.msgs.find(m => m.kind === 'noshow');
    console.log('no-show', ns.ok || ns.error, 'url', url, '| public', pub.ok || pub.error, pub.statement && [pub.statement.total, pub.statement.paid, pub.statement.payments.length].join('/'), '| bad key', bad.error, '| msg has link', !!(msg && msg.text.includes(url)), '\n' + (msg ? msg.text : ''));
    if (!pub.ok || pub.statement.total !== 24000 || pub.statement.paid !== 10000 || bad.ok || !msg || !msg.text.includes(url)) throw new Error('no-show statement broken');
  }
}
{ // website visitors + admin figures
  const a = { sid: 'aaaaaaaaaaaa', vid: 'vvvvvvvvvvv1', path: '/index.html', ref: 'www.google.com', dev: 'mobile', tz: 'Asia/Kolkata', lang: 'en-IN', first: true };
  await call('deskSiteHit', a);
  await call('deskSiteHit', { sid: a.sid, vid: a.vid, path: '/temple.html?x=1', page: true, secs: 40 });
  await call('deskSiteHit', { sid: a.sid, vid: a.vid, path: '/temple', secs: 95, ev: 'wa' });
  await call('deskSiteHit', { sid: 'bbbbbbbbbbbb', vid: 'vvvvvvvvvvv2', path: '/membership.html', dev: 'desktop', tz: 'Europe/London', secs: 10 });
  await call('deskSiteHit', { sid: '<script>', vid: 'x', path: '/' }); // junk is ignored
  const no = await call('deskSiteStats', {}), mgr = await call('deskSiteStats', { token: tok });
  console.log('site stats', no.error, '|', mgr.ok || mgr.error, JSON.stringify(mgr.day), 'live', mgr.live, 'pages', JSON.stringify(mgr.pages), 'refs', JSON.stringify(mgr.refs), 'zones', JSON.stringify(mgr.zones), 'members', mgr.members && mgr.members.list.length, 'bookings', JSON.stringify(mgr.bookings));
  if (no.ok || !mgr.ok || mgr.day.visits !== 2 || mgr.day.visitors !== 2 || mgr.day.pages !== 3 || mgr.day.secs !== 105 || mgr.day.taps.wa !== 1 || mgr.live !== 2 || mgr.days.length !== 90 || !mgr.members) throw new Error('site stats broken');
}
{ // admin page login
  const h0 = await call('deskAdminHasLogin', {});
  const bad = await call('deskAdminSetLogin', { user: 'boss', pass: 'Test#Pass99' });
  const set = await call('deskAdminSetLogin', { token: tok, user: 'boss', pass: 'Test#Pass99' });
  const h1 = await call('deskAdminHasLogin', {});
  const wrong = await call('deskAdminLogin', { user: 'boss', pass: 'nope-nope' });
  const good = await call('deskAdminLogin', { user: 'BOSS', pass: 'Test#Pass99' });
  const st = good.token ? await call('deskSiteStats', { token: good.token }) : {};
  console.log('admin login', h0.set, bad.error, set.ok || set.error, h1.set, wrong.error, !!good.token, st.ok || st.error);
  if (h0.set || bad.ok || !set.ok || !h1.set || wrong.ok || !good.token || !st.ok) throw new Error('admin login broken');
}
{ // admin history screens
  const days = await call('deskSiteHistory', { token: tok, what: 'days' }), no = await call('deskSiteHistory', { what: 'days' });
  const day = await call('deskSiteHistory', { token: tok, what: 'day', day: days.days[0].d });
  const rng = await call('deskSiteHistory', { token: tok, what: 'range', days: 30 });
  const bk = await call('deskSiteHistory', { token: tok, what: 'bookings' });
  const mem = await call('deskSiteHistory', { token: tok, what: 'member', phone: '0000000000' });
  console.log('history', no.error, days.days.length, JSON.stringify(days.days[0]), '| day', day.visits.length, JSON.stringify(day.visits[day.visits.length - 1].paths), JSON.stringify(day.sum.pages_), '| range', rng.visits, JSON.stringify(rng.refs), JSON.stringify(rng.zones), '| bookings', bk.month, bk.list.length, JSON.stringify(bk.months), '| member', mem.error);
  if (no.ok || !days.ok || days.days[0].visits !== 2 || day.visits.length !== 2 || rng.visits !== 2 || !bk.ok || mem.ok) throw new Error('admin history broken');
}
{ // walk-ins show with the bookings in admin
  const bk = await call('deskSiteHistory', { token: tok, what: 'bookings' }), st = await call('deskSiteStats', { token: tok });
  const w = bk.list.filter(x => x.walkin);
  console.log('walk-ins', bk.list.length, 'of which walk-in', w.length, JSON.stringify(w[0] || null), JSON.stringify(st.bookings));
}
