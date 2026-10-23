-- Private bucket for recorded lesson narration. Each user can only touch narration/{auth.uid()}/*.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('narration', 'narration', false, 5242880, array['audio/wav', 'audio/x-wav', 'audio/wave'])
on conflict (id) do nothing;

create policy narration_select_own on storage.objects for select
  using (bucket_id = 'narration' and (storage.foldername(name))[1] = auth.uid()::text);
create policy narration_insert_own on storage.objects for insert
  with check (bucket_id = 'narration' and (storage.foldername(name))[1] = auth.uid()::text);
create policy narration_update_own on storage.objects for update
  using (bucket_id = 'narration' and (storage.foldername(name))[1] = auth.uid()::text);
create policy narration_delete_own on storage.objects for delete
  using (bucket_id = 'narration' and (storage.foldername(name))[1] = auth.uid()::text);
