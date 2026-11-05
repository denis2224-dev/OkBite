-- Run with operator/service privileges; these queries never write data.
select day, photos, barcodes, identified, not_found, read_labels, added
from public.daily_stats
where day >= current_date - 30 order by day desc;

select message, screen, app_version, platform, count(*) as occurrences
from public.client_errors
where created_at >= now() - interval '7 days'
group by message, screen, app_version, platform
order by occurrences desc limit 20;
