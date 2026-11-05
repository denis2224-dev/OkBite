-- A quota reservation is an event until committed, or removed on failed submission.
-- Serializing admission per device/kind prevents concurrent count-then-insert races.
create function public.reserve_usage(p_device uuid, p_kind text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare max_events int; event_id bigint;
begin
  max_events := case p_kind when 'added' then 10 when 'report' then 20
    when 'photo' then 40 when 'read_label' then 20 else null end;
  if max_events is null then raise exception 'Unsupported quota kind'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_device::text || ':' || p_kind, 0));
  if (select count(*) from public.usage_events where device_id=p_device::text
      and kind=p_kind and created_at >= now()-interval '24 hours') >= max_events then
    return null;
  end if;
  insert into public.usage_events(kind,device_id) values(p_kind,p_device::text) returning id into event_id;
  return event_id;
end $$;

create function public.commit_product(p_product jsonb, p_links jsonb, p_event bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.products; new_product_id uuid; existing_status text;
begin
  v := jsonb_populate_record(null::public.products,p_product);
  perform 1 from public.usage_events where id=p_event and kind='added'
    and device_id=v.added_by_device and product_id is null for update;
  if not found then raise exception 'Invalid quota reservation'; end if;
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
    delete from public.usage_events where id=p_event;
    return jsonb_build_object('id',new_product_id,'created',false);
  end if;
  insert into public.product_ingredients(product_id,position,raw_name,ingredient_slug)
    select new_product_id,x.position::int,x.item->>'rawName',x.item->>'slug'
    from jsonb_array_elements(p_links) with ordinality as x(item,position);
  update public.usage_events set product_id=v.id where id=p_event;
  return jsonb_build_object('id',new_product_id,'created',true);
end $$;

create function public.commit_report(p_device uuid,p_product uuid,p_message text,p_event bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.usage_events where id=p_event and kind='report'
    and device_id=p_device::text and product_id is null for update;
  if not found then raise exception 'Invalid quota reservation'; end if;
  if not exists(select 1 from public.products where id=p_product and status<>'hidden') then
    raise exception 'Product not found' using errcode='P0002';
  end if;
  insert into public.reports(product_id,message,device_id) values(p_product,p_message,p_device::text);
  update public.usage_events set product_id=p_product where id=p_event;
end $$;

revoke all on function public.reserve_usage(uuid,text), public.commit_product(jsonb,jsonb,bigint),
  public.commit_report(uuid,uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.reserve_usage(uuid,text), public.commit_product(jsonb,jsonb,bigint),
  public.commit_report(uuid,uuid,text,bigint) to service_role;
