-- ============================================================================
-- 20261110 — Envoi des documents imprimables via WhatsApp
--
--   Permet d'envoyer les documents (contrat, devis, inspection, facture, reçu,
--   engagement, réservation) au numéro WhatsApp du client — comme l'email.
--
--   Solution 100 % gratuite et compatible Vercel (serverless) :
--     1. Le PDF est généré côté navigateur (html2pdf).
--     2. Le PDF est téléversé dans le bucket public « documents » (ci-dessous)
--        pour obtenir une URL publique.
--     3. On ouvre le lien officiel WhatsApp « click to chat »
--        https://wa.me/<numero>?text=<message + lien du PDF>.
--
--   Ce script est réexécutable sans risque (IF NOT EXISTS / ON CONFLICT).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Bucket public « documents » : héberge les PDF partagés par WhatsApp.
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Lecture publique (indispensable : le client ouvre le lien PDF sans compte).
DROP POLICY IF EXISTS "documents_bucket_public_read" ON storage.objects;
CREATE POLICY "documents_bucket_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'documents');

-- Téléversement par l'application (utilisateur connecté + anon par robustesse).
DROP POLICY IF EXISTS "documents_bucket_insert" ON storage.objects;
CREATE POLICY "documents_bucket_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_bucket_update" ON storage.objects;
CREATE POLICY "documents_bucket_update" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_bucket_delete" ON storage.objects;
CREATE POLICY "documents_bucket_delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'documents');

-- ----------------------------------------------------------------------------
-- 2) Journal des envois WhatsApp (optionnel mais utile pour le suivi).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_sent_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id text,
  client_name    text,
  phone          text,
  document_type  text,
  language       text,
  pdf_url        text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_sent_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_sent_log_all" ON public.whatsapp_sent_log;
CREATE POLICY "whatsapp_sent_log_all" ON public.whatsapp_sent_log
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS whatsapp_sent_log_reservation_idx
  ON public.whatsapp_sent_log (reservation_id);
