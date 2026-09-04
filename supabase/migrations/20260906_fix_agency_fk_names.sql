-- ============================================================================
-- CORRECTIF — NOMS DES CLÉS ÉTRANGÈRES agence sur `reservations` — 2026-09-06
-- ============================================================================
-- À exécuter dans Supabase → SQL Editor si vous avez DÉJÀ appliqué
-- full_schema_icar.sql. Sans données perdues : on renomme simplement deux
-- contraintes de clé étrangère.
--
-- PROBLÈME
--   L'application charge les réservations avec l'indice PostgREST explicite :
--     departure_agency:agencies!reservations_departure_agency_fkey(*)
--     return_agency:agencies!reservations_return_agency_fkey(*)
--   PostgREST résout l'embed par le NOM EXACT de la contrainte. Or une clé
--   étrangère déclarée « en ligne » est auto-nommée
--   `reservations_departure_agency_id_fkey` (avec _id) → l'embed échoue en
--   PGRST200 « Could not find a relationship between 'reservations' and
--   'agencies' ».
--
-- CORRECTIF
--   Supprimer toute FK existante sur departure_agency_id / return_agency_id,
--   puis la recréer avec le nom attendu par l'application, et recharger le
--   cache de schéma de PostgREST.
-- ============================================================================

DO $$
DECLARE
  c record;
BEGIN
  -- Supprime toute clé étrangère portant sur ces deux colonnes, quel que soit
  -- son nom (auto-généré ou déjà correct : on la recrée juste après).
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute a
      ON a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey)
    WHERE con.conrelid = 'public.reservations'::regclass
      AND con.contype = 'f'
      AND a.attname IN ('departure_agency_id', 'return_agency_id')
  LOOP
    EXECUTE format('ALTER TABLE public.reservations DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_departure_agency_fkey
    FOREIGN KEY (departure_agency_id) REFERENCES public.agencies(id) ON DELETE SET NULL,
  ADD CONSTRAINT reservations_return_agency_fkey
    FOREIGN KEY (return_agency_id) REFERENCES public.agencies(id) ON DELETE SET NULL;

-- Force PostgREST à relire le schéma immédiatement (sinon l'embed reste en
-- erreur jusqu'au rechargement automatique du cache).
NOTIFY pgrst, 'reload schema';

-- Vérification :
--   SELECT conname FROM pg_constraint
--   WHERE conrelid = 'public.reservations'::regclass AND contype = 'f'
--   ORDER BY conname;
-- Doit lister : reservations_departure_agency_fkey,
--               reservations_return_agency_fkey,
--               reservations_protection_assurance_fkey, …
-- ============================================================================
