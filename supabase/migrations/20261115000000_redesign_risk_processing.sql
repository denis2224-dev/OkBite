-- N1: additive risk on the ingredient knowledge base and NOVA processing on products.
-- Null means not assessed / unknown. Checks keep bad rows from failing lookup's Zod parse.
alter table public.ingredients
  add column risk text check (risk in ('low','moderate','high')),
  add column risk_source text check (risk_source ~ '^https?://'),
  -- Only additives carry a risk, and no risk without a source a human opened.
  add constraint ingredients_risk_additive_only check (risk is null or grp = 'add'),
  add constraint ingredients_risk_has_source check (risk is null or risk_source is not null);

alter table public.products
  add column nova_group smallint check (nova_group between 1 and 4),
  add column nova_source text check (nova_source in ('off','team')),
  add constraint products_nova_pair check ((nova_group is null) = (nova_source is null));

-- RLS unchanged. Products use column grants (init), so shoppers need the new columns granted;
-- ingredients already grant select on the whole table.
grant select (nova_group, nova_source) on public.products to anon, authenticated;
