-- Match the nullable, nonnegative contract on every database write path.
-- PostgreSQL numeric also accepts NaN/Infinity; neither is label nutrition.
do $$
declare nutrient text;
begin
  foreach nutrient in array array['kcal','fat','sat','sugar','salt','protein','fiber']
  loop
    execute format('alter table public.products add constraint %I check (%I >= 0 and %I < ''Infinity''::numeric)',
      'products_' || nutrient || '_valid', nutrient, nutrient);
  end loop;
end $$;

-- Existing public column grants are sufficient: search must honor product RLS.
alter function public.search_products(text,integer) security invoker;

-- Only the membership lookup needs elevated privileges. Keep its implementation
-- outside the exposed API schema, retaining the public RPC used by clients/RLS.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;
create function private.is_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.moderators where user_id = (select auth.uid()))
$$;
revoke all on function private.is_moderator() from public, anon, authenticated, service_role;
grant execute on function private.is_moderator() to authenticated, service_role;
create or replace function public.is_moderator() returns boolean
language sql stable security invoker set search_path = '' as $$
  select private.is_moderator()
$$;
revoke all on function public.is_moderator() from public, anon;
grant execute on function public.is_moderator() to authenticated, service_role;
