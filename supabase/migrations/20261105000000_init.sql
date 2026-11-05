create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create function public.f_unaccent(text) returns text language sql immutable parallel safe
  set search_path = '' as $$ select extensions.unaccent('extensions.unaccent', $1) $$;

create table public.categories (slug text primary key, name text not null,
  score_kind text not null check (score_kind in ('general','cheese','red_meat','fat','beverage','water')));
create table public.ingredients (slug text primary key, name text not null, aliases text[] not null default '{}',
  grp text not null check (grp in ('base','fat','taste','add','cult')), role text not null,
  explanation text not null, source text not null, allergen text);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  code text unique check (code ~ '^([0-9]{8}|[0-9]{13})$'),
  status text not null default 'unverified' check (status in ('verified','unverified','hidden')),
  name text not null, brand text not null, quantity text not null,
  category_slug text not null references public.categories, unit text not null check (unit in ('g','ml')),
  portion_amount numeric not null default 100 check (portion_amount > 0), portion_label text not null default '100 g',
  kcal numeric, fat numeric, sat numeric, sugar numeric, salt numeric, protein numeric, fiber numeric,
  fruit_veg_pct numeric check (fruit_veg_pct between 0 and 100),
  ingredients_text text not null, allergens text[] not null default '{}', may_contain text[] not null default '{}',
  image_path text, ingredients_photo_path text, nutrition_photo_path text, source text not null,
  added_by_device text, added_at timestamptz not null default now(), verified_at timestamptz,
  verified_by uuid references auth.users, hidden_reason text,
  search_text text generated always as (lower(public.f_unaccent(brand || ' ' || name))) stored);
create index products_search_trgm on public.products using gin (search_text extensions.gin_trgm_ops);
create table public.product_ingredients (product_id uuid references public.products on delete cascade,
  position int not null, raw_name text not null, ingredient_slug text references public.ingredients,
  primary key (product_id, position));
create table public.reports (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products,
  message text not null check (length(message) between 3 and 1000), device_id text not null,
  status text not null default 'open' check (status in ('open','closed')), created_at timestamptz not null default now());
create table public.moderators (user_id uuid primary key references auth.users);
create table public.usage_events (id bigserial primary key,
  kind text not null check (kind in ('photo','barcode','identified','not_found','read_label','added','report')),
  device_id text not null, product_id uuid, created_at timestamptz not null default now());
create index usage_events_device_kind_time on public.usage_events (device_id, kind, created_at);
create table public.client_errors (id bigserial primary key, device_id text not null, message text not null,
  stack text, screen text, app_version text, platform text, created_at timestamptz not null default now());

create function public.is_moderator() returns boolean language sql stable security definer
  set search_path = '' as $$ select exists (select 1 from public.moderators where user_id = auth.uid()) $$;
create function public.search_products(q text, max_results int default 3)
returns table(id uuid, name text, brand text, quantity text, image_path text, similarity real)
language sql stable security definer set search_path = '' set pg_trgm.similarity_threshold = 0.35 as $$
  select p.id, p.name, p.brand, p.quantity, p.image_path,
    extensions.similarity(p.search_text, lower(public.f_unaccent(q))) as similarity
  from public.products p
  where p.status <> 'hidden' and p.search_text operator(extensions.%) lower(public.f_unaccent(q))
  order by similarity desc, p.id
  limit greatest(0, least(coalesce(max_results, 3), 3))
$$;

alter table public.categories enable row level security;
alter table public.ingredients enable row level security;
alter table public.products enable row level security;
alter table public.product_ingredients enable row level security;
alter table public.reports enable row level security;
alter table public.moderators enable row level security;
alter table public.usage_events enable row level security;
alter table public.client_errors enable row level security;
create policy categories_read on public.categories for select to anon, authenticated using (true);
create policy ingredients_read on public.ingredients for select to anon, authenticated using (true);
create policy products_read on public.products for select to anon, authenticated using (status <> 'hidden');
create policy product_ingredients_read on public.product_ingredients for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status <> 'hidden'));
create policy products_moderate on public.products for all to authenticated
  using ((select public.is_moderator())) with check ((select public.is_moderator()));
create policy product_ingredients_moderate on public.product_ingredients for all to authenticated
  using ((select public.is_moderator())) with check ((select public.is_moderator()));
create policy reports_moderate on public.reports for all to authenticated
  using ((select public.is_moderator())) with check ((select public.is_moderator()));

-- Supabase default grants are broad; RLS and SQL privileges must both be explicit.
revoke all on public.categories, public.ingredients, public.products, public.product_ingredients,
  public.reports, public.moderators, public.usage_events, public.client_errors from public, anon, authenticated;
revoke all on sequence public.usage_events_id_seq, public.client_errors_id_seq from public, anon, authenticated;
grant select on public.categories, public.ingredients, public.product_ingredients to anon, authenticated;
-- Device IDs stay service-only, including for ordinary signed-in users.
grant select (id,code,status,name,brand,quantity,category_slug,unit,portion_amount,portion_label,
  kcal,fat,sat,sugar,salt,protein,fiber,fruit_veg_pct,ingredients_text,allergens,may_contain,
  image_path,ingredients_photo_path,nutrition_photo_path,source,added_at,verified_at,search_text)
  on public.products to anon, authenticated;
grant select (verified_by,hidden_reason) on public.products to authenticated;
grant insert, update, delete on public.products to authenticated;
grant insert, update, delete on public.product_ingredients to authenticated;
grant select, insert, update, delete on public.reports to authenticated;
grant all on public.categories, public.ingredients, public.products, public.product_ingredients,
  public.reports, public.moderators, public.usage_events, public.client_errors to service_role;
grant all on sequence public.usage_events_id_seq, public.client_errors_id_seq to service_role;
revoke all on function public.f_unaccent(text), public.is_moderator(), public.search_products(text,int)
  from public, anon, authenticated;
grant execute on function public.f_unaccent(text), public.search_products(text,int) to anon, authenticated, service_role;
grant execute on function public.is_moderator() to authenticated, service_role;

create view public.daily_stats with (security_invoker = true) as
select (created_at at time zone 'UTC')::date as day,
  count(*) filter (where kind='photo') as photos, count(*) filter (where kind='barcode') as barcodes,
  count(*) filter (where kind='identified') as identified, count(*) filter (where kind='not_found') as not_found,
  count(*) filter (where kind='read_label') as read_labels, count(*) filter (where kind='added') as added
from public.usage_events group by 1;
revoke all on public.daily_stats from public, anon, authenticated;
grant select on public.daily_stats to service_role;
insert into storage.buckets (id,name,public) values ('uploads','uploads',false),('products','products',true);
