-- Intent survives commit rejection, failed compensation and a worker disappearing.
-- No FK to products/events: those may roll back or be released before withdrawal.
create table public.photo_publications (
  attempt_product_id uuid not null,
  suffix text not null check(suffix in ('front','ingredients','nutrition')),
  upload_path text not null,
  event_id bigint not null,
  device_id uuid not null,
  path text generated always as (attempt_product_id::text || '/' || suffix || '.jpg') stored,
  created_at timestamptz not null default now(),
  primary key(attempt_product_id,suffix)
);
create index photo_publications_upload on public.photo_publications(upload_path);
create index photo_publications_path on public.photo_publications(path);
alter table public.photo_publications enable row level security;
revoke all on public.photo_publications from public,anon,authenticated;
grant select,delete on public.photo_publications to service_role;

create function public.record_photo_publication(p_event bigint,p_device uuid,p_product_id uuid,p_upload_path text,p_suffix text)
returns void language plpgsql security definer set search_path='' as $$
begin
  -- Same order as commit/hide: photo lock, then usage-event row lock.
  perform pg_advisory_xact_lock(hashtextextended('okbite-photo-references',0));
  perform 1 from public.usage_events where id=p_event and kind='added'
    and device_id=p_device::text and product_id is null for update;
  if not found or p_product_id is null or p_suffix is null or p_suffix not in ('front','ingredients','nutrition')
      or p_upload_path is null or p_upload_path !~ ('^'||p_device::text||'/[0-9a-f-]{36}-(front|ingredients|nutrition)\.jpg$')
      or exists(select 1 from public.products where id=p_product_id)
      or exists(select 1 from public.photo_removals where bucket_id='uploads' and path=p_upload_path)
      or exists(select 1 from public.contribution_photo_sources where upload_path=p_upload_path and product_id<>p_product_id)
      or exists(select 1 from public.photo_publications where attempt_product_id=p_product_id and suffix=p_suffix
        and (upload_path<>p_upload_path or event_id<>p_event or device_id<>p_device)) then
    raise exception 'Upload unavailable' using errcode='P0004';
  end if;
  -- Preserve existing failed-copy semantics: an absent owned source is a backend
  -- publication failure, distinct from a rejected ownership/tombstone request.
  if not exists(select 1 from storage.objects where bucket_id='uploads' and name=p_upload_path) then
    raise exception 'Publication source missing' using errcode='P0005';
  end if;
  insert into public.photo_publications(attempt_product_id,suffix,upload_path,event_id,device_id)
    values(p_product_id,p_suffix,p_upload_path,p_event,p_device)
    on conflict(attempt_product_id,suffix) do nothing;
end $$;
revoke all on function public.record_photo_publication(bigint,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.record_photo_publication(bigint,uuid,uuid,text,text) to service_role;

-- A copy already in flight must not restore a path after hide completed. The
-- Storage transaction and hide serialize on the same lock; do not replace any
-- Supabase-managed triggers or delete Storage metadata directly.
create function public.guard_removed_product_storage() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.bucket_id='products' then
    perform pg_advisory_xact_lock(hashtextextended('okbite-photo-references',0));
    if exists(select 1 from public.photo_removals where bucket_id='products' and path=new.name) then
      raise exception 'Removed photo cannot be published' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_removed_product_storage() from public,anon,authenticated,service_role;
create trigger guard_removed_product_storage before insert or update on storage.objects
  for each row execute function public.guard_removed_product_storage();

create or replace function public.queue_hidden_product_photos(p_id uuid) returns void
language plpgsql set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('okbite-photo-references',0));
  with product_paths as (
    select path from public.products p,
      lateral unnest(array[p.image_path,p.ingredients_photo_path,p.nutrition_photo_path]) path
      where p.id=p_id and p.status='hidden' and path is not null
    union select name from storage.objects where bucket_id='products' and split_part(name,'/',1)=p_id::text
  ), originals as (
    select upload_path from public.contribution_receipts where product_id=p_id
    union select upload_path from public.contribution_photo_sources where product_id=p_id
    union select upload_path from public.photo_publications where path in (select path from product_paths)
  ), destinations as (
    select path from product_paths
    union select path from public.photo_publications where upload_path in (select upload_path from originals)
  )
  insert into public.photo_removals(product_id,bucket_id,path)
    select p_id,'products',path from destinations
    union select p_id,'uploads',upload_path from originals
    on conflict do nothing;
  update public.products set
    image_path=case when image_path in (select path from public.photo_removals where product_id=p_id and bucket_id='products') then null else image_path end,
    ingredients_photo_path=case when ingredients_photo_path in (select path from public.photo_removals where product_id=p_id and bucket_id='products') then null else ingredients_photo_path end,
    nutrition_photo_path=case when nutrition_photo_path in (select path from public.photo_removals where product_id=p_id and bucket_id='products') then null else nutrition_photo_path end
    where array[image_path,ingredients_photo_path,nutrition_photo_path] &&
      array(select path from public.photo_removals where product_id=p_id and bucket_id='products');
end $$;
