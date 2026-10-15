-- Execute uma vez no SQL Editor do projeto Supabase usado pela loja.
-- Usa o papel de administrador já existente em public.profiles.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'jmg-product-images', 'jmg-product-images', true, 5242880,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "jmg_product_images_admin_insert" on storage.objects;
create policy "jmg_product_images_admin_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'jmg-product-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  )
);
-- A leitura pública das fotos é fornecida pelo bucket público.
-- Não permite sobrescrever nem excluir imagens por esta política.
commit;
