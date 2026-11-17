-- Per-field water provenance, multi-device enrichment on waters, and submission conflict moderation queue.
alter table public.enrichment_receipts drop constraint if exists enrichment_receipts_product_id_key;
create index if not exists enrichment_receipts_product_id on public.enrichment_receipts (product_id);

create table public.water_submissions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products on delete cascade,
  device_id text not null,
  photo_path text not null,
  proposed_water jsonb not null check (jsonb_typeof(proposed_water) = 'object'),
  kind text not null check (kind in ('fill', 'conflict', 'verified_update')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users
);
create index water_submissions_product_status
  on public.water_submissions (product_id, status, created_at desc);

alter table public.water_submissions enable row level security;
create policy water_submissions_moderate on public.water_submissions for all to authenticated
  using ((select public.is_moderator())) with check ((select public.is_moderator()));

revoke all on public.water_submissions from public, anon, authenticated;
grant select (id, product_id, photo_path, proposed_water, kind, status, created_at, reviewed_at, reviewed_by)
  on public.water_submissions to authenticated;
grant all on public.water_submissions to service_role;

create function public.classify_water_submission(
  p_existing jsonb,
  p_proposed jsonb,
  p_product_status text,
  p_source text,
  p_today text
) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_base constant jsonb := '{"tdsMgL":null,"dryResidueMgL":null,"ph":null,"carbonation":null,"classification":null,"caMgL":null,"mgMgL":null,"naMgL":null,"kMgL":null,"naPlusKMgL":null,"hco3MgL":null,"so4MgL":null,"clMgL":null,"fMgL":null,"no3MgL":null,"bMgL":null,"h3bo3MgL":null,"iUgL":null}'::jsonb;
  v_enum_keys constant text[] := array['carbonation', 'classification'];
  v_num_keys constant text[] := array['tdsMgL','dryResidueMgL','ph','caMgL','mgMgL','naMgL','kMgL','naPlusKMgL','hco3MgL','so4MgL','clMgL','fMgL','no3MgL','bMgL','h3bo3MgL','iUgL'];
  v_cur jsonb := coalesce(p_existing, '{}'::jsonb);
  v_prop jsonb := coalesce(p_proposed, '{}'::jsonb);
  v_next jsonb := v_base || coalesce(p_existing, '{}'::jsonb);
  v_ranges jsonb := coalesce(v_cur->'ranges', '{}'::jsonb);
  v_evidence jsonb := coalesce(v_cur->'evidence', '{}'::jsonb);
  v_apply jsonb := '{}'::jsonb;
  v_conflict jsonb := '{}'::jsonb;
  v_apply_ranges jsonb := '{}'::jsonb;
  v_conflict_ranges jsonb := '{}'::jsonb;
  v_k text;
  v_has_cur boolean;
  v_new_val numeric;
  v_cur_val numeric;
  v_new_range jsonb;
  v_cur_range jsonb;
  v_cur_min numeric;
  v_cur_max numeric;
  v_new_min numeric;
  v_new_max numeric;
begin
  foreach v_k in array v_enum_keys loop
    if (v_prop ? v_k) and jsonb_typeof(v_prop->v_k) = 'string' then
      v_has_cur := (v_cur ? v_k) and jsonb_typeof(v_cur->v_k) = 'string';
      if p_product_status = 'verified' then
        if not v_has_cur or (v_cur->>v_k) <> (v_prop->>v_k) then
          v_conflict := jsonb_set(v_conflict, array[v_k], v_prop->v_k, true);
        end if;
      elsif not v_has_cur then
        v_next := jsonb_set(v_next, array[v_k], v_prop->v_k, true);
        v_evidence := jsonb_set(v_evidence, array[v_k], jsonb_build_object('status', 'unverified', 'source', p_source, 'addedAt', p_today), true);
        v_apply := jsonb_set(v_apply, array[v_k], v_prop->v_k, true);
      elsif (v_cur->>v_k) <> (v_prop->>v_k) then
        v_conflict := jsonb_set(v_conflict, array[v_k], v_prop->v_k, true);
      end if;
    end if;
  end loop;

  foreach v_k in array v_num_keys loop
    if (v_prop ? v_k) and jsonb_typeof(v_prop->v_k) = 'number' then
      v_new_val := (v_prop->>v_k)::numeric;
      v_new_range := case when (v_prop->'ranges' ? v_k) and jsonb_typeof(v_prop->'ranges'->v_k) = 'object'
        then v_prop->'ranges'->v_k else null end;
      v_cur_range := case when (v_cur->'ranges' ? v_k) and jsonb_typeof(v_cur->'ranges'->v_k) = 'object'
        then v_cur->'ranges'->v_k else null end;
      v_has_cur := (v_cur ? v_k) and jsonb_typeof(v_cur->v_k) = 'number';

      if p_product_status = 'verified' then
        if not v_has_cur or abs((v_cur->>v_k)::numeric - v_new_val) > 0.000001
           or v_cur_range is distinct from v_new_range then
          v_conflict := jsonb_set(v_conflict, array[v_k], v_prop->v_k, true);
          if v_new_range is not null then
            v_conflict_ranges := jsonb_set(v_conflict_ranges, array[v_k], v_new_range, true);
          end if;
        end if;
      elsif not v_has_cur then
        v_next := jsonb_set(v_next, array[v_k], v_prop->v_k, true);
        if v_new_range is not null then
          v_ranges := jsonb_set(v_ranges, array[v_k], v_new_range, true);
          v_apply_ranges := jsonb_set(v_apply_ranges, array[v_k], v_new_range, true);
        end if;
        v_evidence := jsonb_set(v_evidence, array[v_k], jsonb_build_object('status', 'unverified', 'source', p_source, 'addedAt', p_today), true);
        v_apply := jsonb_set(v_apply, array[v_k], v_prop->v_k, true);
      else
        v_cur_val := (v_cur->>v_k)::numeric;
        if v_cur_range is not null then
          v_cur_min := (v_cur_range->>'min')::numeric;
          v_cur_max := (v_cur_range->>'max')::numeric;
          v_new_min := coalesce((v_new_range->>'min')::numeric, v_new_val);
          v_new_max := coalesce((v_new_range->>'max')::numeric, v_new_val);
          if v_new_min >= v_cur_min and v_new_max <= v_cur_max then
            if v_new_min <> v_cur_min or v_new_max <> v_cur_max or abs(v_new_val - v_cur_val) > 0.000001 then
              v_next := jsonb_set(v_next, array[v_k], v_prop->v_k, true);
              if v_new_range is not null then
                v_ranges := jsonb_set(v_ranges, array[v_k], v_new_range, true);
                v_apply_ranges := jsonb_set(v_apply_ranges, array[v_k], v_new_range, true);
              else
                v_ranges := v_ranges - v_k;
              end if;
              v_evidence := jsonb_set(v_evidence, array[v_k], jsonb_build_object('status', 'unverified', 'source', p_source, 'addedAt', p_today), true);
              v_apply := jsonb_set(v_apply, array[v_k], v_prop->v_k, true);
            end if;
          else
            v_conflict := jsonb_set(v_conflict, array[v_k], v_prop->v_k, true);
            if v_new_range is not null then
              v_conflict_ranges := jsonb_set(v_conflict_ranges, array[v_k], v_new_range, true);
            end if;
          end if;
        elsif abs(v_cur_val - v_new_val) > 0.000001
           or (v_new_range is not null and ((v_new_range->>'min')::numeric > v_cur_val or (v_new_range->>'max')::numeric < v_cur_val)) then
          v_conflict := jsonb_set(v_conflict, array[v_k], v_prop->v_k, true);
          if v_new_range is not null then
            v_conflict_ranges := jsonb_set(v_conflict_ranges, array[v_k], v_new_range, true);
          end if;
        end if;
      end if;
    end if;
  end loop;

  if v_apply_ranges <> '{}'::jsonb then
    v_apply := jsonb_set(v_apply, array['ranges'], v_apply_ranges, true);
  end if;
  if v_conflict_ranges <> '{}'::jsonb then
    v_conflict := jsonb_set(v_conflict, array['ranges'], v_conflict_ranges, true);
  end if;
  if v_ranges <> '{}'::jsonb then
    v_next := jsonb_set(v_next, array['ranges'], v_ranges, true);
  else
    v_next := v_next - 'ranges';
  end if;
  if v_evidence <> '{}'::jsonb then
    v_next := jsonb_set(v_next, array['evidence'], v_evidence, true);
  end if;

  return jsonb_build_object('next', v_next, 'apply', v_apply, 'conflict', v_conflict);
end $$;
revoke all on function public.classify_water_submission(jsonb,jsonb,text,text,text) from public, anon, authenticated, service_role;

create function public.apply_accepted_water_submission(
  p_existing jsonb,
  p_proposed jsonb,
  p_source text,
  p_today text
) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_base constant jsonb := '{"tdsMgL":null,"dryResidueMgL":null,"ph":null,"carbonation":null,"classification":null,"caMgL":null,"mgMgL":null,"naMgL":null,"kMgL":null,"naPlusKMgL":null,"hco3MgL":null,"so4MgL":null,"clMgL":null,"fMgL":null,"no3MgL":null,"bMgL":null,"h3bo3MgL":null,"iUgL":null}'::jsonb;
  v_enum_keys constant text[] := array['carbonation', 'classification'];
  v_num_keys constant text[] := array['tdsMgL','dryResidueMgL','ph','caMgL','mgMgL','naMgL','kMgL','naPlusKMgL','hco3MgL','so4MgL','clMgL','fMgL','no3MgL','bMgL','h3bo3MgL','iUgL'];
  v_prop jsonb := coalesce(p_proposed, '{}'::jsonb);
  v_next jsonb := v_base || coalesce(p_existing, '{}'::jsonb);
  v_ranges jsonb := coalesce(v_next->'ranges', '{}'::jsonb);
  v_evidence jsonb := coalesce(v_next->'evidence', '{}'::jsonb);
  v_k text;
begin
  foreach v_k in array v_enum_keys loop
    if (v_prop ? v_k) and jsonb_typeof(v_prop->v_k) = 'string' then
      v_next := jsonb_set(v_next, array[v_k], v_prop->v_k, true);
      v_evidence := jsonb_set(v_evidence, array[v_k], jsonb_build_object('status', 'verified', 'source', p_source, 'addedAt', p_today), true);
    end if;
  end loop;
  foreach v_k in array v_num_keys loop
    if (v_prop ? v_k) and jsonb_typeof(v_prop->v_k) = 'number' then
      v_next := jsonb_set(v_next, array[v_k], v_prop->v_k, true);
      if (v_prop->'ranges' ? v_k) and jsonb_typeof(v_prop->'ranges'->v_k) = 'object' then
        v_ranges := jsonb_set(v_ranges, array[v_k], v_prop->'ranges'->v_k, true);
      else
        v_ranges := v_ranges - v_k;
      end if;
      v_evidence := jsonb_set(v_evidence, array[v_k], jsonb_build_object('status', 'verified', 'source', p_source, 'addedAt', p_today), true);
    end if;
  end loop;
  if v_ranges <> '{}'::jsonb then
    v_next := jsonb_set(v_next, array['ranges'], v_ranges, true);
  else
    v_next := v_next - 'ranges';
  end if;
  if v_evidence <> '{}'::jsonb then
    v_next := jsonb_set(v_next, array['evidence'], v_evidence, true);
  end if;
  return v_next;
end $$;
revoke all on function public.apply_accepted_water_submission(jsonb,jsonb,text,text) from public, anon, authenticated, service_role;

create or replace function public.enrich_product(p_id uuid, p_device uuid, p_upload text,
  p_suffix text, p_event bigint, p_nutrients jsonb default null, p_unit text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  v public.products;
  receipt_id uuid;
  v_proposed jsonb;
  v_classified jsonb;
  v_apply jsonb;
  v_conflict jsonb;
  v_today text := to_char(now() at time zone 'UTC', 'YYYY-MM-DD');
  v_published_path text;
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
  if v.category_slug<>'apa' and (
    v.status<>'unverified' or v.added_by_device is distinct from p_device::text
    or num_nonnulls(v.kcal,v.fat,v.sat,v.sugar,v.salt,v.protein,v.fiber,v.fruit_veg_pct)>0
    or v.water is not null
    or exists(select 1 from public.enrichment_receipts where product_id=p_id)
  ) then
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

  v_proposed := nullif(p_nutrients->'water', 'null'::jsonb);
  v_published_path := p_id::text || '/' || p_suffix || '.jpg';
  if v.category_slug = 'apa' and v_proposed is not null then
    if jsonb_typeof(v_proposed) <> 'object' then
      raise exception 'Invalid water profile';
    end if;
    v_classified := public.classify_water_submission(
      v.water, v_proposed, v.status, 'Fotografie utilizator', v_today
    );
    v_apply := v_classified->'apply';
    v_conflict := v_classified->'conflict';
    if v.status = 'unverified' and v_apply <> '{}'::jsonb then
      update public.products set
        water = v_classified->'next',
        unit = p_unit,
        portion_label = portion_amount::text || ' ' || p_unit,
        nutrition_photo_path = coalesce(nutrition_photo_path, v_published_path)
        where id = p_id;
      insert into public.water_submissions(product_id, device_id, photo_path, proposed_water, kind, status, reviewed_at)
        values (p_id, p_device::text, v_published_path, v_apply, 'fill', 'accepted', now());
    end if;
    if v_conflict <> '{}'::jsonb then
      insert into public.water_submissions(product_id, device_id, photo_path, proposed_water, kind, status)
        values (
          p_id,
          p_device::text,
          v_published_path,
          v_conflict,
          case when v.status = 'verified' then 'verified_update' else 'conflict' end,
          'pending'
        );
    end if;
  else
    if v.status<>'unverified' or v.added_by_device is distinct from p_device::text
      or num_nonnulls(v.kcal,v.fat,v.sat,v.sugar,v.salt,v.protein,v.fiber,v.fruit_veg_pct)>0
      or v.water is not null
      or exists(select 1 from public.enrichment_receipts where product_id=p_id) then
      raise exception 'Product cannot be enriched' using errcode='P0003';
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
      water=coalesce(water,v_proposed),
      unit=p_unit, portion_label=portion_amount::text||' '||p_unit,
      nutrition_photo_path=v_published_path
      where id=p_id;
  end if;

  insert into public.enrichment_receipts values(p_device,p_upload,p_id);
  insert into public.contribution_photo_sources values(p_id,p_upload) on conflict do nothing;
  update public.usage_events set product_id=p_id where id=p_event;
  return p_id;
end $$;
revoke all on function public.enrich_product(uuid,uuid,text,text,bigint,jsonb,text) from public,anon,authenticated;
grant execute on function public.enrich_product(uuid,uuid,text,text,bigint,jsonb,text) to service_role;

create or replace function public.moderate_product_before_photo_removal(
  p_actor uuid,
  p_action text,
  p_id uuid,
  p_product jsonb default null,
  p_links jsonb default null,
  p_reason text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v public.products;
  v_sub public.water_submissions;
  v_today text := to_char(now() at time zone 'UTC', 'YYYY-MM-DD');
begin
  if not exists(select 1 from public.moderators where user_id=p_actor) then
    raise exception 'Unauthorized' using errcode='42501';
  end if;
  if p_action='resolve_water_submission' then
    select * into v_sub from public.water_submissions where id=p_id for update;
    if not found or v_sub.status<>'pending' then
      raise exception 'Not found' using errcode='P0002';
    end if;
    select * into v from public.products where id=v_sub.product_id for update;
    if not found or v.status='hidden' then
      raise exception 'Not found' using errcode='P0002';
    end if;
    if p_reason='accept' then
      update public.products set
        water = public.apply_accepted_water_submission(v.water, v_sub.proposed_water, 'Verificat de echipă', v_today)
        where id = v.id;
      update public.water_submissions set status='accepted', reviewed_at=now(), reviewed_by=p_actor where id=p_id;
    elsif p_reason='reject' then
      update public.water_submissions set status='rejected', reviewed_at=now(), reviewed_by=p_actor where id=p_id;
    else
      raise exception 'Invalid moderation action';
    end if;
    return;
  end if;

  if p_action='close_report' then
    update public.reports set status='closed' where id=p_id;
  elsif p_action='hide' then
    if length(trim(p_reason))<3 or p_reason is null then raise exception 'Invalid reason'; end if;
    update public.products set status='hidden',hidden_reason=p_reason where id=p_id;
    if found then
      update public.water_submissions set status='rejected', reviewed_at=now(), reviewed_by=p_actor
        where product_id=p_id and status='pending';
      return;
    end if;
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
  else
    raise exception 'Invalid moderation action';
  end if;
  if not found then raise exception 'Not found' using errcode='P0002'; end if;
  if p_action='verify' then
    delete from public.product_ingredients where product_id=p_id;
    insert into public.product_ingredients(product_id,position,raw_name,ingredient_slug)
      select p_id,x.position::int,x.item->>'rawName',x.item->>'slug'
      from jsonb_array_elements(p_links) with ordinality as x(item,position);
  end if;
end $$;
revoke all on function public.moderate_product_before_photo_removal(uuid,text,uuid,jsonb,jsonb,text) from public,anon,authenticated,service_role;
