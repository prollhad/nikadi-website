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
