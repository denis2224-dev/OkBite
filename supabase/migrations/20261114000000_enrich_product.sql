-- Follows the existing 12/13 Nov photo migrations, whose ordering is already fixed.
create table public.enrichment_receipts (
  device_id uuid not null,
  upload_path text not null,
  product_id uuid not null unique references public.products on delete cascade,
  primary key(device_id, upload_path)
);
alter table public.enrichment_receipts enable row level security;
revoke all on public.enrichment_receipts from public, anon, authenticated;
grant select, delete on public.enrichment_receipts to service_role;

-- Separate destinations keep competing copies from overwriting the winner.
alter table public.photo_publications drop constraint photo_publications_suffix_check;
alter table public.photo_publications add constraint photo_publications_suffix_check
  check(suffix in ('front','ingredients','nutrition') or suffix ~ '^nutrition-[0-9a-f]{20}$');

-- Null event = eligibility check; null nutrients = prepare; supplied nutrients = commit.
-- Both phases serialize with hide/verify and preserve the existing photo journal.
create function public.enrich_product(p_id uuid, p_device uuid, p_upload text,
  p_suffix text, p_event bigint, p_nutrients jsonb default null, p_unit text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v public.products; receipt_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('okbite-photo-references',0));
  select * into v from public.products where id=p_id for update;
  if not found or v.status='hidden' then
    raise exception 'Product unavailable' using errcode='P0003';
  end if;
  select product_id into receipt_id from public.enrichment_receipts
    where device_id=p_device and upload_path=p_upload;
  if found then
    if receipt_id<>p_id then raise exception 'Upload already used' using errcode='P0004'; end if;
    delete from public.usage_events where id=p_event and kind='added'
      and device_id=p_device::text and product_id is null;
    return receipt_id;
  end if;
  if v.status<>'unverified' or v.added_by_device is distinct from p_device::text
    or num_nonnulls(v.kcal,v.fat,v.sat,v.sugar,v.salt,v.protein,v.fiber,v.fruit_veg_pct)>0
    or exists(select 1 from public.enrichment_receipts where product_id=p_id) then
    raise exception 'Product cannot be enriched' using errcode='P0003';
  end if;
  if p_upload is null or p_upload !~ ('^'||p_device::text||'/[0-9a-f-]{36}-(front|ingredients|nutrition)\.jpg$')
    or p_suffix is null or p_suffix !~ '^nutrition-[0-9a-f]{20}$'
    or not exists(select 1 from storage.objects where bucket_id='uploads' and name=p_upload)
    or exists(select 1 from public.photo_removals where bucket_id='uploads' and path=p_upload)
    or exists(select 1 from public.contribution_photo_sources where upload_path=p_upload and product_id<>p_id) then
    raise exception 'Photo unavailable' using errcode='P0004';
  end if;
  -- Read-only eligibility preflight gives 409 even when the quota is full.
  if p_event is null and p_nutrients is null then return null; end if;
  perform 1 from public.usage_events where id=p_event and kind='added'
    and device_id=p_device::text and product_id is null for update;
  if not found then raise exception 'Invalid quota reservation'; end if;
  if p_nutrients is null then
    insert into public.photo_publications(attempt_product_id,suffix,upload_path,event_id,device_id)
      values(p_id,p_suffix,p_upload,p_event,p_device);
    -- Hide must know this original before a delayed Storage copy even starts.
    insert into public.contribution_photo_sources values(p_id,p_upload) on conflict do nothing;
    return null;
  end if;
  if p_unit is null or p_unit not in ('g','ml') or not exists(
    select 1 from public.photo_publications where attempt_product_id=p_id and suffix=p_suffix
      and upload_path=p_upload and event_id=p_event and device_id=p_device) then
    raise exception 'Invalid enrichment publication';
  end if;
  update public.products set
    kcal=coalesce(kcal,(p_nutrients->>'kcal')::numeric),
    fat=coalesce(fat,(p_nutrients->>'fat')::numeric),
    sat=coalesce(sat,(p_nutrients->>'sat')::numeric),
    sugar=coalesce(sugar,(p_nutrients->>'sugar')::numeric),
    salt=coalesce(salt,(p_nutrients->>'salt')::numeric),
    protein=coalesce(protein,(p_nutrients->>'protein')::numeric),
    fiber=coalesce(fiber,(p_nutrients->>'fiber')::numeric),
    fruit_veg_pct=coalesce(fruit_veg_pct,(p_nutrients->>'fruit_veg_pct')::numeric),
    unit=p_unit, portion_label=portion_amount::text||' '||p_unit,
    nutrition_photo_path=p_id::text||'/'||p_suffix||'.jpg'
    where id=p_id;
  insert into public.enrichment_receipts values(p_device,p_upload,p_id);
  insert into public.contribution_photo_sources values(p_id,p_upload) on conflict do nothing;
  update public.usage_events set product_id=p_id where id=p_event;
  return p_id;
end $$;
revoke all on function public.enrich_product(uuid,uuid,text,text,bigint,jsonb,text) from public,anon,authenticated;
grant execute on function public.enrich_product(uuid,uuid,text,text,bigint,jsonb,text) to service_role;
