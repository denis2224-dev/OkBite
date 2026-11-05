create function public.moderate_product(p_actor uuid,p_action text,p_id uuid,
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
      fruit_veg_pct=v.fruit_veg_pct,ingredients_text=v.ingredients_text,
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
revoke all on function public.moderate_product(uuid,text,uuid,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.moderate_product(uuid,text,uuid,jsonb,jsonb,text) to service_role;
