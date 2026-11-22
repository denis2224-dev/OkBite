-- Water chemical profile column, RLS column grant, and RPC support.
alter table public.products
  add column water jsonb check (water is null or jsonb_typeof(water) = 'object');

grant select (water) on public.products to anon, authenticated;

create or replace function public.commit_product_before_photo_sources(p_product jsonb, p_links jsonb, p_event bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.products;
  new_product_id uuid;
  existing_status text;
  upload_key text := p_product->>'ingredients_upload_path';
begin
  v := jsonb_populate_record(null::public.products,p_product);
  if p_event is not null then
    perform 1 from public.usage_events where id=p_event and kind='added'
      and device_id=v.added_by_device and product_id is null for update;
    if not found then raise exception 'Invalid quota reservation'; end if;
  end if;
  if upload_key is not null then
    if upload_key not like v.added_by_device || '/%' then
      raise exception 'Invalid upload ownership';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(v.added_by_device || ':' || upload_key, 0));
    select product_id into new_product_id from public.contribution_receipts
      where device_id=v.added_by_device and upload_path=upload_key;
    if found then
      select status into existing_status from public.products where id=new_product_id;
      if existing_status='hidden' then
        raise exception 'Duplicate code' using errcode='P0003';
      end if;
      delete from public.usage_events where id=p_event;
      return jsonb_build_object('id',new_product_id,'created',false);
    end if;
  end if;
  if p_event is null then
    if upload_key is null or not exists(select 1 from storage.objects
        where bucket_id='uploads' and name=upload_key) then
      raise exception 'Upload not found' using errcode='P0004';
    end if;
    select id,status into new_product_id,existing_status from public.products where code=v.code;
    if not found then raise exception 'Product not found' using errcode='P0002'; end if;
    if existing_status='hidden' then raise exception 'Duplicate code' using errcode='P0003'; end if;
    insert into public.contribution_receipts values(v.added_by_device,upload_key,new_product_id);
    return jsonb_build_object('id',new_product_id,'created',false);
  end if;
  insert into public.products(id,code,name,brand,quantity,category_slug,unit,portion_label,
    kcal,fat,sat,sugar,salt,protein,fiber,fruit_veg_pct,water,ingredients_text,allergens,may_contain,
    image_path,ingredients_photo_path,nutrition_photo_path,source,added_by_device)
  values(v.id,v.code,v.name,v.brand,v.quantity,v.category_slug,v.unit,'100 '||v.unit,
    v.kcal,v.fat,v.sat,v.sugar,v.salt,v.protein,v.fiber,v.fruit_veg_pct,v.water,v.ingredients_text,
    v.allergens,v.may_contain,v.image_path,v.ingredients_photo_path,v.nutrition_photo_path,
    'Fotografiile utilizatorului',v.added_by_device)
  on conflict(code) do nothing returning id into new_product_id;
  if new_product_id is null then
    select id,status into new_product_id,existing_status from public.products where code=v.code;
    if existing_status='hidden' then raise exception 'Duplicate code' using errcode='P0003'; end if;
    if upload_key is not null then
      insert into public.contribution_receipts values(v.added_by_device,upload_key,new_product_id);
    end if;
    delete from public.usage_events where id=p_event;
    return jsonb_build_object('id',new_product_id,'created',false);
  end if;
  insert into public.product_ingredients(product_id,position,raw_name,ingredient_slug)
    select new_product_id,x.position::int,x.item->>'rawName',x.item->>'slug'
    from jsonb_array_elements(p_links) with ordinality as x(item,position);
  if upload_key is not null then
    insert into public.contribution_receipts values(v.added_by_device,upload_key,new_product_id);
  end if;
  update public.usage_events set product_id=v.id where id=p_event;
  return jsonb_build_object('id',new_product_id,'created',true);
end $$;

create or replace function public.moderate_product_before_photo_removal(p_actor uuid,p_action text,p_id uuid,
  p_product jsonb default null,p_links jsonb default null,p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.products;
begin
  if not exists(select 1 from public.moderators where user_id=p_actor) then
    raise exception 'Unauthorized' using errcode='42501';
  end if;
  if p_action='close_report' then
    update public.reports set status='closed' where id=p_id;
  elsif p_action='hide' then
    if length(trim(p_reason))<3 or p_reason is null then raise exception 'Invalid reason'; end if;
    update public.products set status='hidden',hidden_reason=p_reason where id=p_id;
  elsif p_action='verify' then
    v := jsonb_populate_record(null::public.products,p_product);
    update public.products set code=v.code,name=v.name,brand=v.brand,quantity=v.quantity,
      category_slug=v.category_slug,unit=v.unit,portion_amount=100,portion_label='100 '||v.unit,
      kcal=v.kcal,fat=v.fat,sat=v.sat,sugar=v.sugar,salt=v.salt,protein=v.protein,fiber=v.fiber,
      fruit_veg_pct=v.fruit_veg_pct,
      water=case when p_product ? 'water' then v.water else water end,
      ingredients_text=v.ingredients_text,
      allergens=v.allergens,may_contain=v.may_contain,status='verified',hidden_reason=null,
      verified_at=now(),verified_by=p_actor where id=p_id;
  else raise exception 'Invalid moderation action';
  end if;
  if not found then raise exception 'Not found' using errcode='P0002'; end if;
  if p_action='verify' then
    delete from public.product_ingredients where product_id=p_id;
    insert into public.product_ingredients(product_id,position,raw_name,ingredient_slug)
      select p_id,x.position::int,x.item->>'rawName',x.item->>'slug'
      from jsonb_array_elements(p_links) with ordinality as x(item,position);
  end if;
end $$;

create or replace function public.enrich_product(p_id uuid, p_device uuid, p_upload text,
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
    or v.water is not null
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
  if p_event is null and p_nutrients is null then return null; end if;
  perform 1 from public.usage_events where id=p_event and kind='added'
    and device_id=p_device::text and product_id is null for update;
  if not found then raise exception 'Invalid quota reservation'; end if;
  if p_nutrients is null then
    insert into public.photo_publications(attempt_product_id,suffix,upload_path,event_id,device_id)
      values(p_id,p_suffix,p_upload,p_event,p_device);
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
    water=coalesce(water,nullif(p_nutrients->'water','null'::jsonb)),
    unit=p_unit, portion_label=portion_amount::text||' '||p_unit,
    nutrition_photo_path=p_id::text||'/'||p_suffix||'.jpg'
    where id=p_id;
  insert into public.enrichment_receipts values(p_device,p_upload,p_id);
  insert into public.contribution_photo_sources values(p_id,p_upload) on conflict do nothing;
  update public.usage_events set product_id=p_id where id=p_event;
  return p_id;
end $$;
