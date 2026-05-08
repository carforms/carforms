-- 1. Pin search_path on the four email helper functions and revoke broad EXECUTE
alter function public.enqueue_email(text, jsonb) set search_path = public, pgmq;
alter function public.delete_email(text, bigint) set search_path = public, pgmq;
alter function public.read_email_batch(text, integer, integer) set search_path = public, pgmq;
alter function public.move_to_dlq(text, text, bigint, jsonb) set search_path = public, pgmq;

revoke execute on function public.enqueue_email(text, jsonb) from public, anon, authenticated;
revoke execute on function public.delete_email(text, bigint) from public, anon, authenticated;
revoke execute on function public.read_email_batch(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.move_to_dlq(text, text, bigint, jsonb) from public, anon, authenticated;

grant execute on function public.enqueue_email(text, jsonb) to service_role;
grant execute on function public.delete_email(text, bigint) to service_role;
grant execute on function public.read_email_batch(text, integer, integer) to service_role;
grant execute on function public.move_to_dlq(text, text, bigint, jsonb) to service_role;

-- 2. Replace broad email-assets read policy with a file-scoped one (no listing).
drop policy if exists "Public read email-assets" on storage.objects;

create policy "Public read carforms logo"
on storage.objects
for select
using (bucket_id = 'email-assets' and name = 'logo-carforms.jpg');
