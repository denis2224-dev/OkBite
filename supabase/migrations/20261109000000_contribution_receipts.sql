-- One label upload is one submission, including HTTP retries with no barcode.
-- Receipts stay private and disappear with their product; no client API changes.
create table public.contribution_receipts (
  device_id text not null,
  upload_path text not null,
  product_id uuid not null references public.products on delete cascade,
  primary key (device_id, upload_path)
);
alter table public.contribution_receipts enable row level security;
revoke all on public.contribution_receipts from public, anon, authenticated;
grant select on public.contribution_receipts to service_role;

create or replace function public.commit_product(p_product jsonb, p_links jsonb, p_event bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.products;
  new_product_id uuid;
  existing_status text;
  upload_key text := p_product->>'ingredients_upload_path';
begin
  v := jsonb_populate_record(null::public.products,p_product);
  perform 1 from public.usage_events where id=p_event and kind='added'
    and device_id=v.added_by_device and product_id is null for update;
  if not found then raise exception 'Invalid quota reservation'; end if;
  -- Older server versions omit upload_key; preserve their existing RPC contract.
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
  insert into public.products(id,code,name,brand,quantity,category_slug,unit,portion_label,
    kcal,fat,sat,sugar,salt,protein,fiber,fruit_veg_pct,ingredients_text,allergens,may_contain,
    image_path,ingredients_photo_path,nutrition_photo_path,source,added_by_device)
  values(v.id,v.code,v.name,v.brand,v.quantity,v.category_slug,v.unit,'100 '||v.unit,
    v.kcal,v.fat,v.sat,v.sugar,v.salt,v.protein,v.fiber,v.fruit_veg_pct,v.ingredients_text,
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
