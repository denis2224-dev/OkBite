-- N21: barcodes Open Food Facts genuinely does not have, so lookup skips OFF for 24 h.
-- Only the lookup function (service role) reads or writes it; timeouts and 429s are never stored.
create table public.off_misses (
  code text primary key check (code ~ '^([0-9]{8}|[0-9]{13})$'),
  checked_at timestamptz not null default now()
);
alter table public.off_misses enable row level security;
revoke all on public.off_misses from public, anon, authenticated;
grant select, insert, update, delete on public.off_misses to service_role;
