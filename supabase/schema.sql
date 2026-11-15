-- Nikadi: database for the staff app, WhatsApp bot and membership.
-- Every "tab" of the old Google Sheet is a group of rows in `records` (tbl = tab key, data = the row as JSON).
-- Only the server (Edge Function, service role) can read or write: no public access.
create table if not exists public.records (
  rid bigserial primary key,
  tbl text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists records_tbl_rid on public.records (tbl, rid);

-- version per tab: the server keeps a warm copy and only reloads tabs whose version changed
create table if not exists public.table_versions (tbl text primary key, ver bigint not null default 0);

-- small key/value store (the old CacheService / Script Properties)
create table if not exists public.kv (k text primary key, v text, until timestamptz);

-- change log: every change to money and records, with who did it and before / after
create table if not exists public.change_log (
  id bigserial primary key, at timestamptz not null default now(), who text, action text, tbl text, rid bigint, before jsonb, after jsonb
);
create index if not exists change_log_at on public.change_log (at desc);

-- jobs for Google (Drive, email, Sheet export) and anything that failed and must be retried
create table if not exists public.jobs (
  id bigserial primary key, at timestamptz not null default now(), kind text not null, payload jsonb, status text not null default 'new', tries int not null default 0, info text
);

alter table public.records enable row level security;
alter table public.table_versions enable row level security;
alter table public.kv enable row level security;
alter table public.change_log enable row level security;
alter table public.jobs enable row level security;
revoke all on public.records, public.table_versions, public.kv, public.change_log, public.jobs from anon, authenticated;

-- private file storage (ID copies, payment screenshots, bill PDFs, expense photos)
insert into storage.buckets (id, name, public) values ('files', 'files', false) on conflict (id) do nothing;

create table if not exists public.records_archive (rid bigint primary key, tbl text not null, data jsonb not null, moved_at timestamptz not null default now());
create index if not exists records_archive_tbl on public.records_archive (tbl);
alter table public.records_archive enable row level security;
revoke all on public.records_archive from anon, authenticated;


-- ===== server functions (called with the service key only) =====
-- nk_load: rows of the given tabs (all tabs when null) + the current version of every tab
create or replace function public.nk_load(tbls text[] default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'versions', coalesce((select jsonb_object_agg(tbl, ver) from table_versions), '{}'::jsonb),
    'rows', coalesce((select jsonb_object_agg(tbl, rs) from (
        select tbl, jsonb_agg(jsonb_build_array(rid, data) order by rid) rs from records
        where tbls is null or tbl = any(tbls) group by tbl) x), '{}'::jsonb)
  );
$$;

-- nk_commit: applies a list of changes in one transaction.
--  expect: {tbl: version} the caller read; if any changed meanwhile nothing is written and {conflict:[tbls]} comes back (caller retries).
--  ops: [{op:'add',t,data} | {op:'set',t,rid,patch} | {op:'put',t,rid,data} | {op:'del',t,rid} | {op:'arch',t,rid} | {op:'kv',k,v,sec}]
create or replace function public.nk_commit(ops jsonb, expect jsonb default '{}'::jsonb, who text default null, act text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o jsonb; bad text[]; new_ids bigint[] := '{}'; r bigint; touched text[] := '{}'; t text; old jsonb;
begin
  perform pg_advisory_xact_lock(4242);
  select array_agg(e.key) into bad from jsonb_each_text(expect) e
    left join table_versions v on v.tbl = e.key
    where coalesce(v.ver, 0) <> e.value::bigint;
  if bad is not null then return jsonb_build_object('conflict', to_jsonb(bad)); end if;
  for o in select * from jsonb_array_elements(coalesce(ops, '[]'::jsonb)) loop
    t := o->>'t';
    if o->>'op' = 'add' then
      insert into records (tbl, data) values (t, o->'data') returning rid into r;
      new_ids := new_ids || r;
      if coalesce(act, '') <> 'migrate' and t not in ('sheet:Sessions', 'sheet:Otps', 'sessions', 'wifi', 'wamsgs') then insert into change_log (who, action, tbl, rid, after) values (who, act, t, r, o->'data'); end if;
    elsif o->>'op' = 'set' then
      update records set data = data || (o->'patch'), updated_at = now() where rid = (o->>'rid')::bigint returning data into old;
      if t not in ('sessions', 'wifi', 'wachats', 'attendance') then insert into change_log (who, action, tbl, rid, after) values (who, act, t, (o->>'rid')::bigint, o->'patch'); end if;
    elsif o->>'op' = 'put' then
      update records set data = o->'data', updated_at = now() where rid = (o->>'rid')::bigint;
    elsif o->>'op' = 'del' then
      delete from records where rid = (o->>'rid')::bigint returning data into old;
      if t not in ('sheet:Otps', 'sheet:Sessions', 'sessions') then insert into change_log (who, action, tbl, rid, before) values (who, coalesce(act, 'delete'), t, (o->>'rid')::bigint, old); end if;
    elsif o->>'op' = 'arch' then
      insert into records_archive (rid, tbl, data) select rid, tbl, data from records where rid = (o->>'rid')::bigint;
      delete from records where rid = (o->>'rid')::bigint;
    elsif o->>'op' = 'kv' then
      insert into kv (k, v, until) values (o->>'k', o->>'v', case when o ? 'sec' then now() + make_interval(secs => (o->>'sec')::int) else null end)
        on conflict (k) do update set v = excluded.v, until = excluded.until;
    end if;
    if t is not null and o->>'op' <> 'kv' and not (t = any(touched)) then touched := touched || t; end if;
  end loop;
  foreach t in array touched loop
    insert into table_versions (tbl, ver) values (t, 1) on conflict (tbl) do update set ver = table_versions.ver + 1;
  end loop;
  return jsonb_build_object('ids', to_jsonb(new_ids), 'versions', coalesce((select jsonb_object_agg(tbl, ver) from table_versions where tbl = any(touched)), '{}'::jsonb));
end $$;

-- kv read (unexpired)
create or replace function public.nk_kv(keys text[] default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from kv where (keys is null or k = any(keys)) and (until is null or until > now());
$$;

-- one archived row by a field (old bills opened from their QR code)
create or replace function public.nk_find_old(t text, field text, val text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_array(rid, data) from records_archive where tbl = t and data->>field = val order by rid desc limit 1;
$$;

revoke all on function public.nk_load, public.nk_commit, public.nk_kv, public.nk_find_old from anon, authenticated, public;
grant execute on function public.nk_load, public.nk_commit, public.nk_kv, public.nk_find_old to service_role;

-- nk_sync: one round trip at the start of every request.
--  have: {tbl: version} the server already holds; returns the current versions, the live key/values,
--  and the rows of every tab that is new or changed (except the big ones in `skip`, loaded only when needed).
create or replace function public.nk_sync(have jsonb default '{}'::jsonb, skip text[] default '{}')
returns jsonb language sql stable security definer set search_path = public as $$
  with need as (
    select tbl from table_versions where not (tbl = any(skip)) and (have->>tbl is null or (have->>tbl)::bigint <> ver)
  )
  select jsonb_build_object(
    'versions', coalesce((select jsonb_object_agg(tbl, ver) from table_versions), '{}'::jsonb),
    'kv', coalesce((select jsonb_object_agg(k, v) from kv where until is null or until > now()), '{}'::jsonb),
    'rows', coalesce((select jsonb_object_agg(n.tbl, coalesce(x.rs, '[]'::jsonb)) from need n left join (
        select r.tbl, jsonb_agg(jsonb_build_array(r.rid, r.data) order by r.rid) rs from records r where r.tbl in (select tbl from need) group by r.tbl) x on x.tbl = n.tbl), '{}'::jsonb)
  );
$$;
revoke all on function public.nk_sync from anon, authenticated, public;
grant execute on function public.nk_sync to service_role;

-- start again from an empty copy (used only while testing, before the switch)
create or replace function public.nk_reset()
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from kv where k = 'p:NK_MODE' and v = 'live') then raise exception 'live_database'; end if;
  delete from records where true; delete from table_versions where true; delete from records_archive where true; delete from change_log where true;
end $$;
revoke all on function public.nk_reset from anon, authenticated, public;
grant execute on function public.nk_reset to service_role;
