create policy "Public read avatars"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Public read posts media"
on storage.objects for select
using (bucket_id = 'posts');

create policy "Public read communities media"
on storage.objects for select
using (bucket_id = 'communities');
