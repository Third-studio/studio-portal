-- 2026-05-19 — Triggers d'automatisation projects → auto-quote / auto-invoice
-- Dépend de 2026-05-19_brain_vague2.sql, pg_net, pg_cron

-- ⚠️ Remplace <PROJECT_REF> et <CRON_SHARED_SECRET> avant exécution.

-- Helper : appel HTTP non-bloquant vers une Edge Function
create or replace function call_edge(fn_name text, payload jsonb)
returns void language plpgsql security definer as $$
declare
  v_url text := format('https://<PROJECT_REF>.functions.supabase.co/%s', fn_name);
  v_key text := '<CRON_SHARED_SECRET>';
begin
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'X-Cron-Key', v_key
    ),
    body := payload
  );
exception when others then
  -- Trigger ne doit JAMAIS bloquer une écriture utilisateur
  insert into mail_logs(source, action, success, message)
  values ('trigger:'||fn_name, 'error', false, sqlerrm);
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- À l'INSERT d'un projet : génère un devis draft
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function trg_project_auto_quote()
returns trigger language plpgsql as $$
begin
  perform call_edge('auto-quote', jsonb_build_object('project_id', new.id));
  return new;
end $$;

drop trigger if exists trg_projects_auto_quote on projects;
create trigger trg_projects_auto_quote
  after insert on projects
  for each row execute function trg_project_auto_quote();

-- ─────────────────────────────────────────────────────────────────────────────
-- Au passage en status='livraison' : génère la facture draft
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function trg_project_auto_invoice()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'UPDATE') and (old.status is distinct from new.status) and (new.status = 'livraison') then
    perform call_edge('auto-invoice', jsonb_build_object('project_id', new.id));
  end if;
  return new;
end $$;

drop trigger if exists trg_projects_auto_invoice on projects;
create trigger trg_projects_auto_invoice
  after update on projects
  for each row execute function trg_project_auto_invoice();

-- ─────────────────────────────────────────────────────────────────────────────
-- À l'INSERT d'une PJ avec kind_hint devis/facture : OCR auto
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function trg_attachment_ocr()
returns trigger language plpgsql as $$
begin
  if new.kind_hint in ('devis', 'facture') then
    perform call_edge('attachment-ocr', jsonb_build_object('attachment_id', new.id));
  end if;
  return new;
end $$;

drop trigger if exists trg_attachments_ocr on email_attachments;
create trigger trg_attachments_ocr
  after insert on email_attachments
  for each row execute function trg_attachment_ocr();
