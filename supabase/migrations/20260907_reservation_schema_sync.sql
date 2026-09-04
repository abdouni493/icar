-- ════════════════════════════════════════════════════════════════════════
-- 20260907_reservation_schema_sync.sql
--
-- Aligne la base sur ce que l'application écrit réellement dans les tables
-- reservations / payments / reservation_services. Sur le projet « icar », ces
-- colonnes manquaient, ce qui provoquait à la création d'une réservation :
--   « Could not find the 'assurance_enabled' column of 'reservations'
--     in the schema cache »
-- (et des erreurs similaires pour d'autres colonnes / le paiement / les
--  services une fois la première contournée).
--
-- Sûr à ré-exécuter : chaque ajout est conditionné par IF NOT EXISTS et
-- n'écrase aucune donnée existante.
-- ════════════════════════════════════════════════════════════════════════

-- ── reservations : assurance, caution, timbre TVA, conditions ───────────────
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS assurance_enabled    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS assurance_percentage numeric,
  ADD COLUMN IF NOT EXISTS caution_enabled      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS caution_currency     text DEFAULT 'DZD',
  ADD COLUMN IF NOT EXISTS caution_amount_dzd   numeric,
  ADD COLUMN IF NOT EXISTS euro_rate            numeric,
  ADD COLUMN IF NOT EXISTS conditions_text      text,
  ADD COLUMN IF NOT EXISTS tva_amount           numeric DEFAULT 0;

-- ── payments : l'app lit / écrit `payment_method` ──────────────────────────
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_method text;

-- Reprend l'ancienne colonne `method` si elle existe, pour conserver
-- l'historique des paiements déjà enregistrés.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'method'
  ) THEN
    UPDATE public.payments
      SET payment_method = COALESCE(payment_method, method)
      WHERE payment_method IS NULL;
  END IF;
END $$;

-- ── reservation_services : chauffeur attaché au service ─────────────────────
ALTER TABLE public.reservation_services
  ADD COLUMN IF NOT EXISTS driver_id      uuid,
  ADD COLUMN IF NOT EXISTS driver_caution numeric DEFAULT 0;

-- Lien (facultatif) vers l'employé chauffeur. Ajouté seulement s'il n'existe pas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'reservation_services'
      AND constraint_name = 'reservation_services_driver_id_fkey'
  ) THEN
    ALTER TABLE public.reservation_services
      ADD CONSTRAINT reservation_services_driver_id_fkey
      FOREIGN KEY (driver_id) REFERENCES public.workers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── Force PostgREST à recharger son cache de schéma ────────────────────────
-- (sans quoi l'erreur « in the schema cache » peut persister quelques minutes)
NOTIFY pgrst, 'reload schema';
