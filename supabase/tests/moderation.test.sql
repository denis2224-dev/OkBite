begin;
select plan(4);
select ok(not has_function_privilege('anon','public.moderate_product(uuid,text,uuid,jsonb,jsonb,text)','EXECUTE'), 'anon cannot invoke privileged moderation RPC');
select ok(not has_function_privilege('authenticated','public.moderate_product(uuid,text,uuid,jsonb,jsonb,text)','EXECUTE'), 'users cannot forge the moderator actor');
select ok(has_function_privilege('service_role','public.moderate_product(uuid,text,uuid,jsonb,jsonb,text)','EXECUTE'), 'verified handler can moderate');
select throws_ok($$select public.moderate_product('c7000000-0000-4000-8000-000000000001','hide','c2000000-0000-4000-8000-000000000001',null,null,'test')$$,
  '42501','Unauthorized','transaction rechecks moderator membership');
select * from finish();
rollback;
