/* Nikadi data layer for the new database (Supabase / Postgres).
   The staff app logic (logic.js) and the old Apps Script code (Code.gs) only ever see plain arrays of rows:
   db.all(tab) / db.add / db.set for the staff app, and a Google-Sheet look-alike (getRange, appendRow…) for the
   membership tabs. Every change is written down in ctx.ops and saved in ONE database transaction at the end
   of the request (nk_commit), which also checks nobody changed the same tabs meanwhile (then the request re-runs).

   base = { versions: {tab: n}, tables: {tab: [[rid, data], …]}, kv: {key: value} }   (shared, only changed after a commit)
   ctx  = { ops: [], read: {}, cl: {}, kv: {…}, pend: [], memo: {} }                   (one per run of a request)       */

export function nkNormalizer(schema) {
  /* the same value types the Google Sheet adapter returned: numbers for 'n' columns, text for the rest */
  return function (t, o) {
    var def = schema[t]; if (!def) return o;
    def.cols.forEach(function (c) {
      var v = o[c[0]];
      if (c[2] === 'n') o[c[0]] = v === '' || v == null ? 0 : Number(v);
      else o[c[0]] = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    });
    return o;
  };
}

export function nkDb(base, ctx, opt) {
  opt = opt || {};
  var norm = opt.normalize || function (t, o) { return o; };
  function rows(t) {
    ctx.read[t] = true;
    if (ctx.cl[t]) return ctx.cl[t];
    if (!(t in base.tables) && opt.lazy && opt.lazy[t] && !(base.versions[t] == null)) {
      ctx.need(t); // big tab not loaded yet: load it and run again
      return (ctx.cl[t] = []);
    }
    var a = (base.tables[t] || []).map(function (r) { var o = Object.assign({}, r[1]); o._rid = r[0]; return o; });
    return (ctx.cl[t] = a);
  }
  function strip(o) { var d = {}; Object.keys(o).forEach(function (k) { if (k.charAt(0) !== '_') d[k] = o[k]; }); return d; }
  function plain(v) { return v instanceof Date ? { $d: v.toISOString() } : v; }
  var db = {
    all: function (t) { return rows(t); },
    add: function (t, o) {
      var a = rows(t); norm(t, o); o._new = true; a.push(o);
      ctx.ops.push({ op: 'add', t: t, obj: o });
      return o;
    },
    set: function (t, o, patch) {
      if (o._old) throw new Error('old_record');
      Object.keys(patch).forEach(function (k) { o[k] = patch[k]; });
      norm(t, o);
      if (o._new) return; // not saved yet: the insert takes the final values
      var p = {}; Object.keys(patch).forEach(function (k) { p[k] = plain(o[k]); });
      ctx.ops.push({ op: 'set', t: t, rid: o._rid, patch: p });
    },
    put: function (t, o) { // the whole row again (Sheet look-alike)
      if (o._new) return;
      ctx.ops.push({ op: 'put', t: t, rid: o._rid, obj: o });
    },
    del: function (t, o) {
      var a = rows(t), i = a.indexOf(o); if (i >= 0) a.splice(i, 1);
      if (o._new) { ctx.ops = ctx.ops.filter(function (x) { return x.obj !== o; }); return; }
      ctx.ops.push({ op: 'del', t: t, rid: o._rid });
    },
    moveOut: function (t, list) {
      var a = rows(t);
      list.forEach(function (o) { var i = a.indexOf(o); if (i >= 0) a.splice(i, 1); if (!o._new) ctx.ops.push({ op: 'arch', t: t, rid: o._rid }); });
      return list.length;
    },
    findOld: function (t, key, field) {
      var k = 'old|' + t + '|' + (field || '') + '|' + key;
      if (!(k in ctx.memo)) { ctx.pend.push({ key: k, kind: 'findOld', t: t, field: field || (opt.firstCol ? opt.firstCol(t) : 'id'), val: String(key) }); return null; }
      var r = ctx.memo[k]; if (!r) return null;
      var o = Object.assign({}, r[1]); o._rid = r[0]; o._old = true; return o;
    },
    kvGet: function (k) { var v = ctx.kv['c:desk_' + k]; return v == null ? null : v; },
    kvSet: function (k, v, sec) { ctx.kv['c:desk_' + k] = String(v); ctx.ops.push({ op: 'kv', k: 'c:desk_' + k, v: String(v), sec: Math.min(sec || 600, 21600) }); }
  };
  db._strip = strip; db._plain = plain;
  return db;
}

/* ops ready for nk_commit + the "expect" list (versions of every tab this run read) */
export function nkCommitPayload(base, ctx) {
  var ops = [], adds = [];
  function clean(o) { var d = {}; Object.keys(o).forEach(function (k) { if (k.charAt(0) !== '_') { var v = o[k]; d[k] = v instanceof Date ? { $d: v.toISOString() } : v; } }); return d; }
  ctx.ops.forEach(function (x) {
    if (x.op === 'add') { ops.push({ op: 'add', t: x.t, data: clean(x.obj) }); adds.push(x.obj); }
    else if (x.op === 'set') ops.push({ op: 'set', t: x.t, rid: x.rid, patch: x.patch });
    else if (x.op === 'put') ops.push({ op: 'put', t: x.t, rid: x.rid, data: clean(x.obj) });
    else if (x.op === 'del' || x.op === 'arch') ops.push({ op: x.op, t: x.t, rid: x.rid });
    else if (x.op === 'kv') ops.push(x);
  });
  var expect = {};
  var writes = ops.some(function (o) { return o.op !== 'kv'; });
  if (writes) Object.keys(ctx.read).forEach(function (t) { expect[t] = base.versions[t] || 0; });
  return { ops: ops, expect: expect, adds: adds };
}

/* after a successful commit: bring the shared copy up to date without reloading */
export function nkApply(base, payload, res) {
  var ids = res.ids || [], n = 0;
  payload.ops.forEach(function (o) {
    if (o.op === 'kv') { if (o.v == null) delete base.kv[o.k]; else base.kv[o.k] = o.v; return; }
    var a = base.tables[o.t] || (base.tables[o.t] = []);
    if (o.op === 'add') { var rid = ids[n++]; a.push([rid, o.data]); var ob = payload.adds && payload.adds[n - 1]; if (ob) { ob._rid = rid; delete ob._new; } return; }
    var i = -1; for (var j = a.length - 1; j >= 0; j--) if (a[j][0] === o.rid) { i = j; break; }
    if (i < 0) return;
    if (o.op === 'set') a[i] = [o.rid, Object.assign({}, a[i][1], o.patch)];
    else if (o.op === 'put') a[i] = [o.rid, o.data];
    else a.splice(i, 1);
  });
  Object.keys(res.versions || {}).forEach(function (t) { base.versions[t] = res.versions[t]; });
}

/* ---------- Google Sheet look-alike for the membership tabs (Members, Transactions, Otps, Sessions, Settings…) ----------
   Each sheet row is one database row {v: [cell, cell, …]}; row 1 is the heading row. Text starting with ' is
   stored without it (like Sheets), dates are kept as dates. */
export function nkSheets(db, known) {
  function tbl(name) { return 'sheet:' + name; }
  function cellIn(v) {
    if (v instanceof Date) return { $d: v.toISOString() };
    if (typeof v === 'string' && v.charAt(0) === "'") return v.slice(1);
    return v == null ? '' : v;
  }
  function cellOut(v) { return v && typeof v === 'object' && v.$d ? new Date(v.$d) : v == null ? '' : v; }
  function Sheet(name) { this.name = name; this.t = tbl(name); }
  Sheet.prototype.rows = function () { return db.all(this.t); };
  Sheet.prototype.getName = function () { return this.name; };
  Sheet.prototype.getLastRow = function () { return this.rows().length; };
  Sheet.prototype.getLastColumn = function () { return this.rows().reduce(function (m, r) { return Math.max(m, (r.v || []).length); }, 0); };
  Sheet.prototype.getMaxRows = function () { return Math.max(1000, this.getLastRow()); };
  Sheet.prototype.appendRow = function (arr) { db.add(this.t, { v: arr.map(cellIn) }); return this; };
  Sheet.prototype.deleteRow = function (i) { var o = this.rows()[i - 1]; if (o) db.del(this.t, o); return this; };
  Sheet.prototype.deleteRows = function (i, n) { var a = this.rows().slice(i - 1, i - 1 + n), self = this; a.forEach(function (o) { db.del(self.t, o); }); return this; };
  Sheet.prototype.getDataRange = function () { return new Range(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); };
  Sheet.prototype.getRange = function (r, c, nr, nc) {
    if (typeof r === 'string') { var m = /^([A-Z]+)\d*:([A-Z]+)\d*$/.exec(r) || /^([A-Z]+)/.exec(r); var col = colNum(m[1]); return new Range(this, 1, col, Math.max(1, this.getLastRow()), 1); }
    return new Range(this, r, c, nr || 1, nc || 1);
  };
  ['setFrozenRows', 'hideSheet', 'setColumnWidth', 'autoResizeColumns', 'setName', 'showSheet'].forEach(function (f) { Sheet.prototype[f] = function () { return this; }; });
  function colNum(s) { var n = 0; for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64); return n; }
  function Range(sh, r, c, nr, nc) { this.sh = sh; this.r = r; this.c = c; this.nr = nr; this.nc = nc; }
  Range.prototype.getValues = function () {
    var rows = this.sh.rows(), out = [];
    for (var i = 0; i < this.nr; i++) {
      var row = rows[this.r - 1 + i], v = row ? row.v || [] : [], line = [];
      for (var j = 0; j < this.nc; j++) line.push(cellOut(v[this.c - 1 + j]));
      out.push(line);
    }
    return out;
  };
  Range.prototype.getValue = function () { return this.getValues()[0][0]; };
  Range.prototype.getDisplayValues = function () { return this.getValues().map(function (l) { return l.map(function (x) { return x instanceof Date ? x.toISOString() : String(x); }); }); };
  Range.prototype.setValues = function (vals) {
    var rows = this.sh.rows();
    for (var i = 0; i < vals.length; i++) {
      var ri = this.r - 1 + i;
      while (rows.length <= ri) db.add(this.sh.t, { v: [] });
      var o = rows[ri], v = (o.v || []).slice();
      for (var j = 0; j < vals[i].length; j++) { while (v.length < this.c - 1 + j) v.push(''); v[this.c - 1 + j] = cellIn(vals[i][j]); }
      o.v = v; db.put(this.sh.t, o);
    }
    return this;
  };
  Range.prototype.setValue = function (x) { return this.setValues([[x]]); };
  Range.prototype.getRow = function () { return this.r; };
  ['setNumberFormat', 'setFontWeight', 'setBackground', 'setFontColor', 'setWrap', 'setHorizontalAlignment', 'setNote', 'clearContent'].forEach(function (f) { Range.prototype[f] = function () { return this; }; });
  var ss = {
    getSheetByName: function (name) { return known(tbl(name)) ? new Sheet(name) : null; },
    insertSheet: function (name) { db.all(tbl(name)); return new Sheet(name); },
    getSheets: function () { return []; },
    getId: function () { return 'nikadi-db'; }, getName: function () { return 'Nikadi'; }, getUrl: function () { return ''; },
    toast: function () {}, getSpreadsheetTimeZone: function () { return 'Asia/Kolkata'; }
  };
  return ss;
}
