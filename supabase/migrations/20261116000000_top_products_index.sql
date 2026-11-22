create index products_verified_category on public.products (category_slug)
where status = 'verified';
