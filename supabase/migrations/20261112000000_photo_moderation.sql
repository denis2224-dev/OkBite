-- Only the membership-checked service transaction may mutate moderation data.
revoke insert,update,delete on public.products,public.product_ingredients,public.reports from authenticated;

create table public.contribution_photo_sources (
  product_id uuid not null references public.products on delete cascade,
  upload_path text not null unique,
  primary key(product_id,upload_path)
);
create table public.photo_removals (
  product_id uuid not null,
  bucket_id text not null check(bucket_id in ('products','uploads')),
  path text not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key(product_id,bucket_id,path)
);
create index photo_removals_path on public.photo_removals(bucket_id,path);
alter table public.contribution_photo_sources enable row level security;
alter table public.photo_removals enable row level security;
revoke all on public.contribution_photo_sources,public.photo_removals from public,anon,authenticated;
grant select on public.contribution_photo_sources to service_role;
grant select,update,delete on public.photo_removals to service_role;
insert into public.contribution_photo_sources select distinct product_id,upload_path from public.contribution_receipts;

create function public.guard_removed_product_photos() returns trigger language plpgsql set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('okbite-photo-references',0));
  if exists(select 1 from public.photo_removals where bucket_id='products'
    and path=any(array[new.image_path,new.ingredients_photo_path,new.nutrition_photo_path])) then
    raise exception 'Removed photo cannot be referenced' using errcode='23514';
  end if;
  return new;
end $$;
revoke all on function public.guard_removed_product_photos() from public,anon,authenticated,service_role;
create trigger guard_removed_product_photos before insert or update of image_path,ingredients_photo_path,nutrition_photo_path
  on public.products for each row execute function public.guard_removed_product_photos();

-- Keep the proven replay/quota transaction intact, but capture every supplied
-- original in the SAME transaction. A shared original cannot be relinked later.
alter function public.commit_product(jsonb,jsonb,bigint) rename to commit_product_before_photo_sources;
revoke all on function public.commit_product_before_photo_sources(jsonb,jsonb,bigint) from service_role;
create function public.commit_product(p_product jsonb,p_links jsonb,p_event bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; v_upload_path text;
begin
  perform pg_advisory_xact_lock(hashtextextended('okbite-photo-references',0));
  result := public.commit_product_before_photo_sources(p_product,p_links,p_event);
  for v_upload_path in select distinct value from jsonb_array_elements_text(coalesce(p_product->'photo_upload_paths',
      jsonb_build_array(p_product->>'ingredients_upload_path'))) where value is not null loop
    if v_upload_path not like (p_product->>'added_by_device') || '/%' then raise exception 'Invalid upload ownership'; end if;
    if exists(select 1 from public.photo_removals r where r.bucket_id='uploads' and r.path=v_upload_path) then
      raise exception 'Upload not found' using errcode='P0004';
    end if;
    if exists(select 1 from public.contribution_photo_sources s
        where s.upload_path=v_upload_path and s.product_id<>(result->>'id')::uuid) then
      raise exception 'Upload already used' using errcode='P0004';
    end if;
    insert into public.contribution_photo_sources values((result->>'id')::uuid,v_upload_path)
      on conflict(product_id,upload_path) do nothing;
  end loop;
  return result;
end $$;
revoke all on function public.commit_product(jsonb,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.commit_product(jsonb,jsonb,bigint) to service_role;

create function public.queue_hidden_product_photos(p_id uuid) returns void
language plpgsql set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('okbite-photo-references',0));
  insert into public.photo_removals(product_id,bucket_id,path)
    select p_id,'products',path from public.products p,
      lateral unnest(array[p.image_path,p.ingredients_photo_path,p.nutrition_photo_path]) path
      where p.id=p_id and p.status='hidden' and path is not null
    union select p_id,'products',name from storage.objects
      where bucket_id='products' and split_part(name,'/',1)=p_id::text
    union select p_id,'uploads',upload_path from public.contribution_receipts where product_id=p_id
    union select p_id,'uploads',upload_path from public.contribution_photo_sources where product_id=p_id
    on conflict do nothing;
  -- Withdraw shared references rather than preserve a public copy of hidden content.
  update public.products set
    image_path=case when image_path in (select path from public.photo_removals where product_id=p_id and bucket_id='products') then null else image_path end,
    ingredients_photo_path=case when ingredients_photo_path in (select path from public.photo_removals where product_id=p_id and bucket_id='products') then null else ingredients_photo_path end,
    nutrition_photo_path=case when nutrition_photo_path in (select path from public.photo_removals where product_id=p_id and bucket_id='products') then null else nutrition_photo_path end
    where array[image_path,ingredients_photo_path,nutrition_photo_path] &&
      array(select path from public.photo_removals where product_id=p_id and bucket_id='products');
end $$;
revoke all on function public.queue_hidden_product_photos(uuid) from public,anon,authenticated,service_role;

alter function public.moderate_product(uuid,text,uuid,jsonb,jsonb,text) rename to moderate_product_before_photo_removal;
revoke all on function public.moderate_product_before_photo_removal(uuid,text,uuid,jsonb,jsonb,text) from service_role;
create function public.moderate_product(p_actor uuid,p_action text,p_id uuid,
  p_product jsonb default null,p_links jsonb default null,p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.moderators where user_id=p_actor) then
    raise exception 'Unauthorized' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('okbite-photo-references',0));
  if p_action='verify' and exists(select 1 from public.products where id=p_id and status='hidden') then
    raise exception 'Not found' using errcode='P0002';
  end if;
  perform public.moderate_product_before_photo_removal(p_actor,p_action,p_id,p_product,p_links,p_reason);
  if p_action='hide' then perform public.queue_hidden_product_photos(p_id); end if;
end $$;
revoke all on function public.moderate_product(uuid,text,uuid,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.moderate_product(uuid,text,uuid,jsonb,jsonb,text) to service_role;

-- Historical hidden rows also need an operator retry; no Storage bytes deleted in SQL.
do $$ declare p uuid; begin
  for p in select id from public.products where status='hidden' loop
    perform public.queue_hidden_product_photos(p);
  end loop;
end $$;
