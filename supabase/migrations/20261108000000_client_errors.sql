create index client_errors_device_time on public.client_errors(device_id,created_at);

create function public.record_client_error(
  p_device uuid, p_message text, p_stack text, p_screen text,
  p_app_version text, p_platform text
) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_device is null or p_message is null or char_length(p_message) not between 1 and 1000
    or char_length(p_stack)>2000 or p_screen is null or char_length(p_screen)>200
    or p_screen ~ '[?#]' or p_app_version is null or char_length(p_app_version) not between 1 and 50
    or p_platform is null or p_platform not in ('ios','android','web') then
    raise exception 'Invalid client error' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('client-error:' || p_device::text,0));
  if (select count(*) from public.client_errors where device_id=p_device::text
      and created_at >= now()-interval '24 hours') >= 50 then
    return false;
  end if;
  insert into public.client_errors(device_id,message,stack,screen,app_version,platform)
    values(p_device::text,p_message,p_stack,p_screen,p_app_version,p_platform);
  return true;
end $$;

revoke all on function public.record_client_error(uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.record_client_error(uuid,text,text,text,text,text) to service_role;
