-- ============================================================================
-- 20260917 — Champs fiscaux/légaux de la facture (Décret 05-468)
--   1) cars.fuel_level        : corrige l'erreur PGRST204 lors de la mise à jour
--                               d'un véhicule (colonne absente du schéma).
--   2) website_settings.*      : identifiants légaux du FOURNISSEUR (l'agence)
--                               affichés sur les documents imprimés.
--   3) entreprises.*           : informations complémentaires du CLIENT société.
-- Réexécutable sans risque (IF NOT EXISTS partout).
-- ============================================================================

-- 1) VÉHICULES — niveau de carburant courant --------------------------------
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS fuel_level text DEFAULT 'full';

-- Contrainte de valeurs (ignorée si déjà présente).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cars_fuel_level_check'
  ) THEN
    ALTER TABLE public.cars
      ADD CONSTRAINT cars_fuel_level_check
      CHECK (fuel_level IN ('full', 'half', 'quarter', 'eighth', 'empty'));
  END IF;
END $$;

-- 2) AGENCE / FOURNISSEUR — identité fiscale et commerciale ------------------
ALTER TABLE public.website_settings
  ADD COLUMN IF NOT EXISTS email           text,
  ADD COLUMN IF NOT EXISTS fax             text,
  ADD COLUMN IF NOT EXISTS city            text,
  ADD COLUMN IF NOT EXISTS rc              text,   -- Registre de commerce
  ADD COLUMN IF NOT EXISTS nif             text,   -- N° d'identification fiscale
  ADD COLUMN IF NOT EXISTS nis             text,   -- N° d'identification statistique
  ADD COLUMN IF NOT EXISTS art             text,   -- Article d'imposition (AI)
  ADD COLUMN IF NOT EXISTS forme_juridique text,   -- SARL / SPA / EURL / …
  ADD COLUMN IF NOT EXISTS activite        text,   -- Activité commerciale
  ADD COLUMN IF NOT EXISTS capital         text,   -- Capital social
  ADD COLUMN IF NOT EXISTS bank_name       text;   -- Nom de la banque (RIB)

-- 3) ENTREPRISES / CLIENT SOCIÉTÉ — informations complémentaires -------------
ALTER TABLE public.entreprises
  ADD COLUMN IF NOT EXISTS fax             text,
  ADD COLUMN IF NOT EXISTS city            text,
  ADD COLUMN IF NOT EXISTS bp              text,   -- Boîte postale
  ADD COLUMN IF NOT EXISTS forme_juridique text,
  ADD COLUMN IF NOT EXISTS activite        text,
  ADD COLUMN IF NOT EXISTS capital         text;
