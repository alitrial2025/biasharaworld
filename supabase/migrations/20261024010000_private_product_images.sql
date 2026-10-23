-- Each business has its own private prefix; no anonymous object reads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy business_product_images_read on storage.objects for select to authenticated
using (bucket_id = 'product-images' and exists (
  select 1 from public.business_members m
  where m.user_id = (select auth.uid()) and m.business_id::text = (storage.foldername(name))[1]
));
create policy business_product_images_insert on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' and exists (
  select 1 from public.business_members m
  where m.user_id = (select auth.uid()) and m.business_id::text = (storage.foldername(name))[1] and m.role in ('Owner','Manager')
));
create policy business_product_images_update on storage.objects for update to authenticated
using (bucket_id = 'product-images' and exists (
  select 1 from public.business_members m
  where m.user_id = (select auth.uid()) and m.business_id::text = (storage.foldername(name))[1] and m.role in ('Owner','Manager')
))
with check (bucket_id = 'product-images' and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' and exists (
  select 1 from public.business_members m
  where m.user_id = (select auth.uid()) and m.business_id::text = (storage.foldername(name))[1] and m.role in ('Owner','Manager')
));
create policy business_product_images_delete on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and exists (
  select 1 from public.business_members m
  where m.user_id = (select auth.uid()) and m.business_id::text = (storage.foldername(name))[1] and m.role in ('Owner','Manager')
));
