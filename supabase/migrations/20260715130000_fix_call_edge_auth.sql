-- 2026-07-15 (bis) — call_edge : le gateway des Edge Functions exige un header
-- Authorization (JWT valide). On passe la clé anon (publique — déjà dans le
-- bundle JS du site) ; l'autorisation réelle reste le X-Cron-Key (Vault).

create or replace function public.call_edge(fn_name text, payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_key text;
begin
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'cron_shared_secret' limit 1;
  if v_key is null then return; end if;
  perform net.http_post(
    url     := 'https://ytmflrwfapxaeryehgal.supabase.co/functions/v1/' || fn_name,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0bWZscndmYXB4YWVyeWVoZ2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MjM2MzIsImV4cCI6MjA5MjI5OTYzMn0.0NQ4DhBeVw5egBYLYQPOEoN7eLZIz0AJc7St1ov2u-8',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0bWZscndmYXB4YWVyeWVoZ2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MjM2MzIsImV4cCI6MjA5MjI5OTYzMn0.0NQ4DhBeVw5egBYLYQPOEoN7eLZIz0AJc7St1ov2u-8',
      'X-Cron-Key', v_key
    ),
    body    := payload
  );
exception when others then
  null;
end $$;

revoke all on function public.call_edge(text, jsonb) from public, anon, authenticated;
