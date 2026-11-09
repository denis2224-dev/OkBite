-- Disposable local DB ONLY. Install before C6_PENDING_COMMIT_FIXTURE=1 tests.
-- Remove afterward: drop function public.c6_test_commit_waiting();
-- drop trigger c6_test_delay on public.products; drop function public.c6_test_delay();
create or replace function public.c6_test_delay() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.name='C6 slow commit fixture' then perform pg_sleep(2); end if;
  return new;
end $$;
drop trigger if exists c6_test_delay on public.products;
create trigger c6_test_delay before insert on public.products
  for each row execute function public.c6_test_delay();
create function public.c6_test_commit_waiting() returns boolean
language sql security definer set search_path='' as $$
  select exists(select 1 from pg_catalog.pg_stat_activity
    where wait_event='PgSleep' and query like '%commit_product%');
$$;
revoke all on function public.c6_test_delay(),public.c6_test_commit_waiting() from public,anon,authenticated;
grant execute on function public.c6_test_commit_waiting() to service_role;
