-- Required even when the optional reference-data import has not run.
insert into public.categories (slug, name, score_kind)
values ('necunoscut', 'Necunoscut', 'general')
on conflict (slug) do nothing;
