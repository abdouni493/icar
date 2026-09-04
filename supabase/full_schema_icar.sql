-- ============================================================================
-- iCar / MHD AUTO — SCHÉMA COMPLET (à exécuter sur un projet Supabase NEUF)
-- Projet cible : https://bmwgwmaapiojtwruprzz.supabase.co
-- ----------------------------------------------------------------------------
-- À coller dans Supabase → SQL Editor → New query → Run.
-- Ce script est IDEMPOTENT (ré-exécutable) et regroupe TOUT ce dont
-- l'application a besoin :
--   • toutes les tables métier + relations (clés étrangères) + index
--   • le modèle d'authentification : admin (auth.signUp) ET employés
--     (RPC upsert_worker_auth_user → auth.users) + permissions par employé
--   • les policies RLS (CRUD complet pour l'utilisateur connecté ;
--     lecture anonyme des tables affichées sur le site public)
--   • les buckets de stockage (cars / clients / inspection / website / worker)
--     et leurs policies (upload/lecture)
--   • toutes les RPC appelées par l'app (réservation site public, codes promo,
--     disponibilité, comptes employés, sessions, login employé…)
--   • les données de départ (types de maintenance, réglages de location)
--
-- FLUX D'AUTHENTIFICATION
--   1. Le TOUT PREMIER admin se crée depuis la page de connexion (bouton
--      « Créer un compte admin ») : supabase.auth.signUp() crée la ligne
--      auth.users, puis l'app insère une ligne `profiles` (role='admin').
--      La vue `admin_count` passe alors à 1 → le bouton disparaît.
--   2. L'admin crée les employés depuis « Équipe ». Quand un compte de
--      connexion est activé, l'app appelle la RPC `upsert_worker_auth_user`
--      qui écrit l'employé dans `auth.users` (mot de passe chiffré bcrypt).
--      L'employé se connecte ensuite normalement (email + mot de passe).
--   3. Un employé ne voit que les interfaces / boutons cochés dans
--      `workers.permissions` (JSONB) — appliqué côté app.
-- ============================================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;      -- gen_random_uuid(), crypt(), gen_salt()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4() (compat migrations)


-- ============================================================================
-- 1) TABLES DE RÉFÉRENCE (sans dépendances)
-- ============================================================================

-- Agences (points de départ / retour des véhicules)
CREATE TABLE IF NOT EXISTS public.agencies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  address    text,
  city       text,
  created_at timestamptz DEFAULT now()
);

-- Rôles métier d'employés (créés librement par l'admin : Gérant, Réceptionniste…)
CREATE TABLE IF NOT EXISTS public.worker_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT worker_roles_name_unique UNIQUE (name)
);

-- Clients société (facturation / contrats entreprise)
CREATE TABLE IF NOT EXISTS public.entreprises (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  rc         text,
  art        text,
  nis        text,
  nif        text,
  address    text,
  phone      text,
  email      text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS entreprises_name_idx ON public.entreprises (lower(name));

-- Véhicules (flotte de l'agence + véhicules confiés par un tiers)
CREATE TABLE IF NOT EXISTS public.cars (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand               text NOT NULL,
  model               text NOT NULL,
  plate_number        text,
  year                integer,
  color               text,
  vin                 text,
  energy              text,
  transmission        text,
  seats               integer DEFAULT 5,
  doors               integer DEFAULT 4,
  price_per_day       numeric NOT NULL DEFAULT 0,
  price_week          numeric,
  price_month         numeric,
  deposit             numeric,
  image_url           text,
  mileage             integer DEFAULT 0,
  -- Seul 'maintenance' est saisi manuellement ; les autres statuts sont dérivés.
  status              text DEFAULT 'disponible',
  is_hidden_from_site boolean NOT NULL DEFAULT false,
  owner_type          text NOT NULL DEFAULT 'personal',
  owner_name          text,
  owner_phone         text,
  agency_share_per_day numeric NOT NULL DEFAULT 0,
  currencies          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz DEFAULT now(),
  CONSTRAINT cars_owner_type_check CHECK (owner_type IN ('personal', 'third_party'))
);

-- Clients particuliers
CREATE TABLE IF NOT EXISTS public.clients (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name                text NOT NULL DEFAULT '',
  last_name                 text NOT NULL DEFAULT '',
  phone                     text NOT NULL DEFAULT '',
  email                     text,
  date_of_birth             date,
  place_of_birth            text,
  id_card_number            text,
  license_number            text NOT NULL DEFAULT '',
  license_expiration_date   date,
  license_delivery_date     date,
  license_delivery_place    text,
  document_type             text DEFAULT 'none',
  document_number           text,
  document_delivery_date    date,
  document_expiration_date  date,
  document_delivery_address text,
  wilaya                    text NOT NULL DEFAULT '',
  complete_address          text,
  profile_photo             text,
  scanned_documents         text[] DEFAULT '{}'::text[],
  agency_id                 uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  created_at                timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clients_name_idx ON public.clients (lower(first_name), lower(last_name));
CREATE INDEX IF NOT EXISTS clients_phone_idx ON public.clients (phone);

-- Employés (comptes de connexion + rémunération + permissions)
CREATE TABLE IF NOT EXISTS public.workers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       text NOT NULL,
  date_of_birth   date,
  phone           text,
  email           text,
  address         text,
  profile_photo   text,
  id_card_number  text,
  type            text NOT NULL DEFAULT 'worker',
  role_id         uuid REFERENCES public.worker_roles(id) ON DELETE SET NULL,
  start_date      date,
  payment_enabled boolean NOT NULL DEFAULT true,
  payment_type    text,
  base_salary     numeric NOT NULL DEFAULT 0,
  username        text,
  password        text,
  account_enabled boolean NOT NULL DEFAULT false,
  auth_user_id    uuid,
  -- { "interfaces": ["planner", ...], "actions": { "planner": ["create", "delete"] } }
  permissions     jsonb NOT NULL DEFAULT '{"interfaces": [], "actions": {}}'::jsonb,
  created_at      timestamptz DEFAULT now(),
  CONSTRAINT workers_type_check CHECK (type IN ('admin', 'worker', 'driver'))
);
CREATE INDEX IF NOT EXISTS workers_email_idx ON public.workers (lower(email));

-- Acomptes / absences / paiements d'employés
CREATE TABLE IF NOT EXISTS public.worker_advances (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id  uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  amount     numeric NOT NULL DEFAULT 0,
  date       date,
  note       text,
  settled    boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.worker_absences (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id  uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  cost       numeric NOT NULL DEFAULT 0,
  date       date,
  note       text,
  settled    boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.worker_payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id   uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  amount      numeric NOT NULL DEFAULT 0,
  date        date,
  base_salary numeric NOT NULL DEFAULT 0,
  advances    numeric NOT NULL DEFAULT 0,
  absences    numeric NOT NULL DEFAULT 0,
  net_salary  numeric NOT NULL DEFAULT 0,
  note        text,
  period_key  text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS worker_payments_period_idx ON public.worker_payments (worker_id, period_key);

-- Services additionnels (décoration, équipement, assurance, service…)
CREATE TABLE IF NOT EXISTS public.services (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category     text NOT NULL DEFAULT 'service',
  service_name text NOT NULL,
  description  text,
  price        numeric NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  is_mandatory boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

-- Forfaits d'assurance de protection + items réutilisables
CREATE TABLE IF NOT EXISTS public.protection_assurances (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  price_per_day numeric NOT NULL DEFAULT 0,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.protection_assurance_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name     text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.protection_assurance_item_links (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assurance_id uuid NOT NULL REFERENCES public.protection_assurances(id) ON DELETE CASCADE,
  item_id      uuid NOT NULL REFERENCES public.protection_assurance_items(id) ON DELETE CASCADE,
  status       boolean NOT NULL DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  CONSTRAINT protection_assurance_item_links_unique UNIQUE (assurance_id, item_id)
);

-- Réglages globaux de location (singleton id = 1)
CREATE TABLE IF NOT EXISTS public.rental_settings (
  id                        integer PRIMARY KEY DEFAULT 1,
  mileage_limit_per_day     numeric NOT NULL DEFAULT 0,
  excess_mileage_fee_per_km numeric NOT NULL DEFAULT 0,
  fuel_fee_per_level        numeric NOT NULL DEFAULT 0,
  updated_at                timestamptz DEFAULT now(),
  CONSTRAINT rental_settings_singleton CHECK (id = 1)
);
INSERT INTO public.rental_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Types de maintenance / dépense (système + personnalisés)
CREATE TABLE IF NOT EXISTS public.maintenance_types (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key                   text NOT NULL UNIQUE,
  label_fr              text NOT NULL,
  label_ar              text NOT NULL DEFAULT '',
  icon                  text NOT NULL DEFAULT '🔧',
  tracking              text NOT NULL DEFAULT 'mileage' CHECK (tracking IN ('mileage', 'date', 'simple')),
  default_interval_km   integer,
  default_interval_days integer,
  color                 text NOT NULL DEFAULT 'slate'
                          CHECK (color IN ('red','blue','amber','green','purple','teal','orange','indigo','pink','slate')),
  is_system             boolean NOT NULL DEFAULT false,
  is_active             boolean NOT NULL DEFAULT true,
  sort_order            integer NOT NULL DEFAULT 100,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_maintenance_types_sort ON public.maintenance_types (is_active, sort_order);

-- Dépenses véhicule (maintenance, vidange, assurance…) et dépenses magasin
CREATE TABLE IF NOT EXISTS public.vehicle_expenses (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id              uuid REFERENCES public.cars(id) ON DELETE CASCADE,
  type                text NOT NULL DEFAULT 'autre',
  cost                numeric NOT NULL DEFAULT 0,
  date                date,
  note                text,
  current_mileage     integer,
  next_vidange_km     integer,
  expiration_date     date,
  expense_name        text,
  oil_filter_changed  boolean NOT NULL DEFAULT false,
  air_filter_changed  boolean NOT NULL DEFAULT false,
  fuel_filter_changed boolean NOT NULL DEFAULT false,
  ac_filter_changed   boolean NOT NULL DEFAULT false,
  created_at          timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_car_date ON public.vehicle_expenses (car_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_type ON public.vehicle_expenses (type);

CREATE TABLE IF NOT EXISTS public.store_expenses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  cost       numeric NOT NULL DEFAULT 0,
  date       date,
  note       text,
  icon       text,
  created_at timestamptz DEFAULT now()
);

-- Alertes de maintenance (calculées et persistées)
CREATE TABLE IF NOT EXISTS public.maintenance_alerts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id               uuid,
  car_info             text,
  type                 text,
  title                text,
  message              text,
  severity             text,
  due_date             date,
  is_expired           boolean DEFAULT false,
  days_until_due       integer,
  current_mileage      integer,
  next_service_mileage integer,
  created_at           timestamptz DEFAULT now()
);

-- Offres spéciales (promotions liées à une voiture)
CREATE TABLE IF NOT EXISTS public.special_offers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id         uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  old_price      numeric NOT NULL DEFAULT 0,
  new_price      numeric NOT NULL DEFAULT 0,
  note           text,
  is_active      boolean NOT NULL DEFAULT true,
  label          text,
  discount_type  text CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric,
  start_date     date,
  end_date       date,
  created_at     timestamptz DEFAULT now()
);

-- Réglages du site public + coordonnées + réglages agence + modèles de documents
CREATE TABLE IF NOT EXISTS public.website_settings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text,
  description        text,
  logo               text,
  phone_number_2     text,
  bank_number        text,
  address            text,
  phone              text,
  landing_background text,
  updated_at         timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.website_contacts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facebook   text,
  instagram  text,
  tiktok     text,
  whatsapp   text,
  phone      text,
  address    text,
  email      text,
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.agency_settings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_name        text,
  slogan             text,
  address            text,
  phone              text,
  logo               text,
  document_templates jsonb DEFAULT '{}'::jsonb,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.document_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text,
  template      jsonb,
  name          text,
  agency_id     uuid,
  created_at    timestamptz DEFAULT now()
);

-- Checklist d'inspection (items maîtres)
CREATE TABLE IF NOT EXISTS public.inspection_checklist_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category      text,
  item_name     text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);


-- ============================================================================
-- 2) RÉSERVATIONS + DÉPENDANCES (client / voiture / agence / assurance / entreprise)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reservations (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                  uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  car_id                     uuid REFERENCES public.cars(id) ON DELETE SET NULL,
  departure_date             date,
  departure_time             time,
  departure_agency_id        uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  return_date                date,
  return_time                time,
  return_agency_id           uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  price_per_day              numeric NOT NULL DEFAULT 0,
  price_week                 numeric,
  price_month                numeric,
  total_days                 integer NOT NULL DEFAULT 1,
  total_price                numeric NOT NULL DEFAULT 0,
  deposit                    numeric NOT NULL DEFAULT 0,
  discount_amount            numeric NOT NULL DEFAULT 0,
  discount_type              text DEFAULT 'fixed',
  advance_payment            numeric NOT NULL DEFAULT 0,
  remaining_payment          numeric NOT NULL DEFAULT 0,
  additional_fees            numeric NOT NULL DEFAULT 0,
  tva_applied                boolean NOT NULL DEFAULT false,
  excess_mileage             numeric,
  missing_fuel               numeric,
  notes                      text,
  conditions                 text,
  status                     text NOT NULL DEFAULT 'pending',
  source                     text NOT NULL DEFAULT 'agency',
  created_by                 uuid,
  created_by_name            text,
  protection_assurance_id    uuid,
  protection_assurance_name  text,
  protection_assurance_price numeric DEFAULT 0,
  timbre_enabled             boolean NOT NULL DEFAULT false,
  timbre_rate                numeric,
  timbre_amount              numeric NOT NULL DEFAULT 0,
  currency                   text NOT NULL DEFAULT 'DZD',
  currency_rate              numeric NOT NULL DEFAULT 1,
  total_price_currency       numeric,
  promo_code                 text,
  promo_discount_percentage  numeric,
  promo_discount_amount      numeric,
  flight_number              text,
  flight_date                date,
  flight_time                time,
  flight_ticket_image        text,
  entreprise_id              uuid REFERENCES public.entreprises(id) ON DELETE SET NULL,
  payment_status             text NOT NULL DEFAULT 'unpaid',
  activated_at               timestamptz,
  completed_at               timestamptz,
  deleted_at                 timestamptz,
  created_at                 timestamptz DEFAULT now(),
  CONSTRAINT reservations_status_check CHECK (status = ANY (ARRAY[
    'website_reservation','pending','accepted','confirmed','active','completed','cancelled'])),
  CONSTRAINT reservations_payment_status_check CHECK (payment_status IN ('unpaid','partial','paid')),
  CONSTRAINT reservations_protection_assurance_fkey
    FOREIGN KEY (protection_assurance_id) REFERENCES public.protection_assurances(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS reservations_entreprise_idx ON public.reservations (entreprise_id);
CREATE INDEX IF NOT EXISTS reservations_car_idx ON public.reservations (car_id);
CREATE INDEX IF NOT EXISTS reservations_client_idx ON public.reservations (client_id);
CREATE INDEX IF NOT EXISTS reservations_status_idx ON public.reservations (status);
CREATE INDEX IF NOT EXISTS idx_reservations_deleted_at ON public.reservations (deleted_at);

-- Services attachés à une réservation
CREATE TABLE IF NOT EXISTS public.reservation_services (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  category       text DEFAULT 'service',
  service_name   text,
  description    text,
  price          numeric NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reservation_services_res_idx ON public.reservation_services (reservation_id);

-- Paiements d'une réservation
CREATE TABLE IF NOT EXISTS public.payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  amount         numeric NOT NULL DEFAULT 0,
  date           date DEFAULT now(),
  method         text DEFAULT 'cash',
  note           text,
  status         text NOT NULL DEFAULT 'completed',
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_res_idx ON public.payments (reservation_id);

-- Codes promo (créés par l'admin, consommés par le site public)
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text NOT NULL,
  discount_percentage numeric NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  is_active           boolean NOT NULL DEFAULT true,
  is_used             boolean NOT NULL DEFAULT false,
  used_at             timestamptz,
  reservation_id      uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  created_at          timestamptz DEFAULT now(),
  CONSTRAINT promo_codes_code_unique UNIQUE (code)
);

-- Inspections de véhicule (départ / retour) + réponses de checklist
CREATE TABLE IF NOT EXISTS public.vehicle_inspections (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id       uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  type                 text NOT NULL CHECK (type IN ('departure', 'return')),
  mileage              integer,
  fuel_level           text,
  agency_id            uuid,
  exterior_front_photo text,
  exterior_rear_photo  text,
  interior_photo       text,
  other_photos         text[] DEFAULT '{}'::text[],
  client_signature     text,
  notes                text,
  date                 date,
  time                 time,
  created_at           timestamptz DEFAULT now(),
  CONSTRAINT vehicle_inspections_res_type_unique UNIQUE (reservation_id, type)
);
CREATE TABLE IF NOT EXISTS public.inspection_responses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id     uuid NOT NULL REFERENCES public.vehicle_inspections(id) ON DELETE CASCADE,
  checklist_item_id uuid NOT NULL REFERENCES public.inspection_checklist_items(id) ON DELETE CASCADE,
  status            boolean NOT NULL DEFAULT false,
  note              text,
  created_at        timestamptz DEFAULT now(),
  CONSTRAINT inspection_responses_unique UNIQUE (inspection_id, checklist_item_id)
);


-- ============================================================================
-- 3) AUTHENTIFICATION : profils + vue du nombre d'admins + sessions
-- ============================================================================
-- `profiles` : lie une ligne d'auth.users à un rôle applicatif.
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   text,
  role       text NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

-- Vue lue par la page de connexion (rôle anon) pour savoir si un admin existe.
-- Une vue appartenant au propriétaire (postgres) contourne la RLS de profiles,
-- ce qui permet à l'anon de compter les admins avant toute connexion.
CREATE OR REPLACE VIEW public.admin_count AS
  SELECT count(*)::int AS count FROM public.profiles WHERE role = 'admin';
GRANT SELECT ON public.admin_count TO anon, authenticated;

-- Journal de sessions (audit — écriture best-effort par les RPC ci-dessous).
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid,
  access_token  text,
  refresh_token text,
  expires_at    bigint,
  user_agent    text,
  ip_address    text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_sessions_token_idx ON public.user_sessions (access_token);


-- ============================================================================
-- 4) ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Règle générale : l'utilisateur CONNECTÉ (authenticated) a un accès CRUD
-- complet à toutes les tables métier. Le rôle ANONYME (site public) ne peut
-- que LIRE les tables affichées sur le site, et écrire via les RPC dédiées.
-- ============================================================================

-- Helper : (ré)active la RLS + policy « authenticated = tout » sur une table.
DO $$
DECLARE
  t text;
  auth_tables text[] := ARRAY[
    'agencies','worker_roles','entreprises','cars','clients','workers',
    'worker_advances','worker_absences','worker_payments','services',
    'protection_assurances','protection_assurance_items','protection_assurance_item_links',
    'rental_settings','maintenance_types','vehicle_expenses','store_expenses',
    'maintenance_alerts','special_offers','website_settings','website_contacts',
    'agency_settings','document_templates','inspection_checklist_items',
    'reservations','reservation_services','payments','promo_codes',
    'vehicle_inspections','inspection_responses','profiles','user_sessions'
  ];
BEGIN
  FOREACH t IN ARRAY auth_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_auth_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      t || '_auth_all', t
    );
  END LOOP;
END $$;

-- Lectures ANONYMES nécessaires au site public.
DO $$
DECLARE
  t text;
  anon_read_tables text[] := ARRAY[
    'cars','agencies','special_offers','services','website_settings',
    'website_contacts','protection_assurances','protection_assurance_items',
    'protection_assurance_item_links','maintenance_types'
  ];
BEGIN
  FOREACH t IN ARRAY anon_read_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_anon_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon USING (true);',
      t || '_anon_read', t
    );
  END LOOP;
END $$;


-- ============================================================================
-- 5) BUCKETS DE STOCKAGE + POLICIES
-- ----------------------------------------------------------------------------
-- cars       : photos des véhicules (public)
-- clients    : photo + documents scannés du client (public ; upload anon via wizard)
-- inspection : photos d'état des lieux (public ; suppression à la clôture)
-- website    : logo + image de fond du site (public)
-- worker     : photo de profil des employés (public)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('cars', 'cars', true),
  ('clients', 'clients', true),
  ('inspection', 'inspection', true),
  ('website', 'website', true),
  ('worker', 'worker', true)
ON CONFLICT (id) DO NOTHING;

-- Lecture publique de tous ces buckets.
DROP POLICY IF EXISTS "icar_buckets_public_read" ON storage.objects;
CREATE POLICY "icar_buckets_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('cars','clients','inspection','website','worker'));

-- Écriture / mise à jour / suppression par l'utilisateur connecté (admin/employé).
DROP POLICY IF EXISTS "icar_buckets_auth_write" ON storage.objects;
CREATE POLICY "icar_buckets_auth_write" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id IN ('cars','clients','inspection','website','worker'))
  WITH CHECK (bucket_id IN ('cars','clients','inspection','website','worker'));

-- Le wizard public téléverse la photo + les documents du client (bucket clients).
DROP POLICY IF EXISTS "icar_clients_anon_insert" ON storage.objects;
CREATE POLICY "icar_clients_anon_insert" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'clients');


-- ============================================================================
-- 6) RPC — COMPTES DE CONNEXION DES EMPLOYÉS (auth.users)
-- ----------------------------------------------------------------------------
-- Crée / met à jour un utilisateur Supabase Auth sans clé de service et SANS
-- déconnecter l'admin. L'employé se connecte ensuite avec signInWithPassword.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_worker_auth_user(
  p_email text,
  p_password text,
  p_full_name text DEFAULT '',
  p_role text DEFAULT 'worker'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_email text := lower(trim(p_email));
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'EMAIL_REQUIRED';
  END IF;
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'PASSWORD_TOO_SHORT';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_email LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
                             || jsonb_build_object('full_name', p_full_name, 'role', p_role),
        updated_at = now()
    WHERE id = v_user_id;
    RETURN jsonb_build_object('user_id', v_user_id, 'created', false);
  END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name, 'role', p_role),
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  RETURN jsonb_build_object('user_id', v_user_id, 'created', true);
END;
$$;
REVOKE ALL ON FUNCTION public.upsert_worker_auth_user(text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.upsert_worker_auth_user(text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_worker_auth_user(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
  IF v_user_id IS NULL THEN RETURN; END IF;
  DELETE FROM auth.identities WHERE user_id = v_user_id;
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_worker_auth_user(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_worker_auth_user(text) TO authenticated;


-- ============================================================================
-- 7) RPC — CONNEXION EMPLOYÉ (repli pour les employés sans compte auth)
-- ----------------------------------------------------------------------------
-- La page de connexion tente d'abord signInWithPassword (compte auth). Si ça
-- échoue, elle appelle cette RPC, qui valide email/username + mot de passe
-- stockés dans `workers`. Utile pour les comptes legacy créés avant l'auth.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.login_worker(
  p_email_or_username text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_worker record;
  v_input text := trim(p_email_or_username);
BEGIN
  IF v_input IS NULL OR v_input = '' OR p_password IS NULL OR p_password = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'MISSING_CREDENTIALS');
  END IF;

  SELECT * INTO v_worker
  FROM public.workers
  WHERE (lower(email) = lower(v_input) OR lower(username) = lower(v_input))
    AND password = p_password
    AND account_enabled = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_CREDENTIALS');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'worker', jsonb_build_object(
      'id', v_worker.id,
      'full_name', v_worker.full_name,
      'email', v_worker.email,
      'type', v_worker.type,
      'profile_photo', v_worker.profile_photo,
      'permissions', v_worker.permissions
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.login_worker(text, text) TO anon, authenticated;


-- ============================================================================
-- 8) RPC — SESSIONS (audit best-effort, appelées par sessionService)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_admin_session(
  p_access_token text,
  p_refresh_token text,
  p_expires_at bigint,
  p_user_agent text DEFAULT NULL,
  p_ip_address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.user_sessions (user_id, access_token, refresh_token, expires_at, user_agent, ip_address)
  VALUES (auth.uid(), p_access_token, p_refresh_token, p_expires_at, p_user_agent, p_ip_address)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_admin_session(text, text, bigint, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_session(p_token text)
RETURNS TABLE (is_valid boolean, is_expired boolean, seconds_until_expiry bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v record;
  v_now bigint := extract(epoch FROM now())::bigint;
BEGIN
  SELECT * INTO v FROM public.user_sessions
  WHERE access_token = p_token AND is_active = true
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, true, 0::bigint;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    (v.expires_at > v_now),
    (v.expires_at <= v_now),
    (v.expires_at - v_now);
END;
$$;
GRANT EXECUTE ON FUNCTION public.validate_session(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.invalidate_session(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_sessions SET is_active = false WHERE access_token = p_token;
END;
$$;
GRANT EXECUTE ON FUNCTION public.invalidate_session(text) TO anon, authenticated;


-- ============================================================================
-- 9) RPC — DISPONIBILITÉ DES VOITURES (site public)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_unavailable_car_ids(p_from date, p_to date)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT DISTINCT r.car_id
  FROM public.reservations r
  WHERE r.status IN ('website_reservation','pending','accepted','confirmed','active')
    AND r.deleted_at IS NULL
    AND r.departure_date <= p_to
    AND r.return_date >= p_from;
$$;
GRANT EXECUTE ON FUNCTION public.get_unavailable_car_ids(date, date) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_reserved_periods(p_car_id uuid)
RETURNS TABLE (departure_date text, return_date text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT r.departure_date::text, r.return_date::text
  FROM public.reservations r
  WHERE r.car_id = p_car_id
    AND r.deleted_at IS NULL
    AND r.status IN ('website_reservation','pending','accepted','confirmed','active');
$$;
GRANT EXECUTE ON FUNCTION public.get_reserved_periods(uuid) TO anon, authenticated;


-- ============================================================================
-- 10) RPC — CODE PROMO (vérification anonyme, sans exposer la table)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.verify_promo_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v record;
BEGIN
  IF p_code IS NULL OR btrim(p_code) = '' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'empty');
  END IF;

  SELECT * INTO v FROM public.promo_codes
  WHERE upper(code) = upper(btrim(p_code)) LIMIT 1;

  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false, 'reason', 'not_found'); END IF;
  IF v.is_used THEN RETURN jsonb_build_object('valid', false, 'reason', 'already_used'); END IF;
  IF NOT v.is_active THEN RETURN jsonb_build_object('valid', false, 'reason', 'inactive'); END IF;

  RETURN jsonb_build_object('valid', true, 'discount_percentage', v.discount_percentage);
END;
$$;
GRANT EXECUTE ON FUNCTION public.verify_promo_code(text) TO anon, authenticated;


-- ============================================================================
-- 11) RPC — CRÉER UNE RÉSERVATION DEPUIS LE SITE PUBLIC (client + résa +
--     services + code promo, en une seule transaction SECURITY DEFINER)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_website_reservation(
  p_client jsonb,
  p_reservation jsonb,
  p_services jsonb DEFAULT '[]'::jsonb,
  p_promo_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_reservation_id uuid;
  v_promo record;
  v_service jsonb;
  v_car_id uuid := (p_reservation->>'car_id')::uuid;
  v_from date := (p_reservation->>'departure_date')::date;
  v_to date := (p_reservation->>'return_date')::date;
  v_promo_amount numeric := 0;
BEGIN
  IF v_car_id IS NULL OR v_from IS NULL OR v_to IS NULL THEN
    RAISE EXCEPTION 'INVALID_RESERVATION_DATA';
  END IF;
  IF v_to < v_from THEN RAISE EXCEPTION 'INVALID_DATES'; END IF;

  IF p_promo_code IS NOT NULL AND btrim(p_promo_code) <> '' THEN
    SELECT * INTO v_promo FROM public.promo_codes
    WHERE upper(code) = upper(btrim(p_promo_code)) AND is_active = true AND is_used = false
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'PROMO_CODE_INVALID'; END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.reservations r
    WHERE r.car_id = v_car_id
      AND r.deleted_at IS NULL
      AND r.status IN ('website_reservation','pending','accepted','confirmed','active')
      AND r.departure_date <= v_to
      AND r.return_date >= v_from
  ) THEN
    RAISE EXCEPTION 'CAR_UNAVAILABLE';
  END IF;

  INSERT INTO public.clients (
    first_name, last_name, phone, email, date_of_birth, place_of_birth,
    id_card_number, license_number, license_expiration_date, license_delivery_date,
    license_delivery_place, document_type, document_number, document_delivery_date,
    document_expiration_date, document_delivery_address, wilaya, complete_address,
    profile_photo, scanned_documents
  ) VALUES (
    coalesce(p_client->>'first_name',''), coalesce(p_client->>'last_name',''),
    coalesce(p_client->>'phone',''), NULLIF(p_client->>'email',''),
    NULLIF(p_client->>'date_of_birth','')::date, p_client->>'place_of_birth',
    p_client->>'id_card_number', coalesce(p_client->>'license_number',''),
    NULLIF(p_client->>'license_expiration_date','')::date,
    NULLIF(p_client->>'license_delivery_date','')::date,
    p_client->>'license_delivery_place', coalesce(NULLIF(p_client->>'document_type',''),'none'),
    p_client->>'document_number', NULLIF(p_client->>'document_delivery_date','')::date,
    NULLIF(p_client->>'document_expiration_date','')::date,
    p_client->>'document_delivery_address', coalesce(p_client->>'wilaya',''),
    p_client->>'complete_address', NULLIF(p_client->>'profile_photo',''),
    coalesce((SELECT array_agg(value::text) FROM jsonb_array_elements_text(coalesce(p_client->'scanned_documents','[]'::jsonb)) AS value), ARRAY[]::text[])
  )
  RETURNING id INTO v_client_id;

  v_promo_amount := coalesce(NULLIF(p_reservation->>'promo_discount_amount','')::numeric, 0);

  INSERT INTO public.reservations (
    client_id, car_id,
    departure_date, departure_time, departure_agency_id,
    return_date, return_time, return_agency_id,
    price_per_day, price_week, price_month,
    total_days, total_price, deposit,
    discount_amount, discount_type, advance_payment, remaining_payment, notes,
    protection_assurance_id, protection_assurance_name, protection_assurance_price,
    currency, currency_rate, total_price_currency,
    promo_code, promo_discount_percentage, promo_discount_amount,
    flight_number, flight_date, flight_time, flight_ticket_image,
    status, source
  ) VALUES (
    v_client_id, v_car_id,
    v_from, coalesce(NULLIF(p_reservation->>'departure_time',''),'10:00')::time, NULLIF(p_reservation->>'departure_agency_id','')::uuid,
    v_to, coalesce(NULLIF(p_reservation->>'return_time',''),'10:00')::time, NULLIF(p_reservation->>'return_agency_id','')::uuid,
    coalesce(NULLIF(p_reservation->>'price_per_day','')::numeric, 0),
    NULLIF(p_reservation->>'price_week','')::numeric,
    NULLIF(p_reservation->>'price_month','')::numeric,
    coalesce(NULLIF(p_reservation->>'total_days','')::integer, 1),
    coalesce(NULLIF(p_reservation->>'total_price','')::numeric, 0),
    coalesce(NULLIF(p_reservation->>'deposit','')::numeric, 0),
    coalesce(NULLIF(p_reservation->>'discount_amount','')::numeric, 0),
    coalesce(NULLIF(p_reservation->>'discount_type',''),'fixed'),
    0, coalesce(NULLIF(p_reservation->>'total_price','')::numeric, 0),
    p_reservation->>'notes',
    NULLIF(p_reservation->>'protection_assurance_id','')::uuid,
    NULLIF(p_reservation->>'protection_assurance_name',''),
    coalesce(NULLIF(p_reservation->>'protection_assurance_price','')::numeric, 0),
    coalesce(NULLIF(p_reservation->>'currency',''),'DZD'),
    coalesce(NULLIF(p_reservation->>'currency_rate','')::numeric, 1),
    NULLIF(p_reservation->>'total_price_currency','')::numeric,
    NULLIF(p_reservation->>'promo_code',''),
    NULLIF(p_reservation->>'promo_discount_percentage','')::numeric,
    NULLIF(v_promo_amount, 0),
    NULLIF(p_reservation->>'flight_number',''),
    NULLIF(p_reservation->>'flight_date','')::date,
    NULLIF(p_reservation->>'flight_time','')::time,
    NULLIF(p_reservation->>'flight_ticket_image',''),
    'website_reservation', 'website'
  )
  RETURNING id INTO v_reservation_id;

  IF p_services IS NOT NULL AND jsonb_typeof(p_services) = 'array' THEN
    FOR v_service IN SELECT * FROM jsonb_array_elements(p_services) LOOP
      INSERT INTO public.reservation_services (reservation_id, category, service_name, description, price)
      VALUES (
        v_reservation_id,
        coalesce(v_service->>'category','service'),
        coalesce(v_service->>'service_name',''),
        v_service->>'description',
        coalesce(NULLIF(v_service->>'price','')::numeric, 0)
      );
    END LOOP;
  END IF;

  IF v_promo.id IS NOT NULL THEN
    UPDATE public.promo_codes
    SET is_used = true, used_at = now(), reservation_id = v_reservation_id, is_active = false
    WHERE id = v_promo.id;
  END IF;

  RETURN jsonb_build_object('reservation_id', v_reservation_id, 'client_id', v_client_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_website_reservation(jsonb, jsonb, jsonb, text) TO anon, authenticated;


-- ============================================================================
-- 12) DÉCLENCHEUR updated_at (maintenance_types) + DONNÉES DE DÉPART
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_maintenance_types_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_maintenance_types_updated_at ON public.maintenance_types;
CREATE TRIGGER trg_maintenance_types_updated_at
  BEFORE UPDATE ON public.maintenance_types
  FOR EACH ROW EXECUTE FUNCTION public.set_maintenance_types_updated_at();

INSERT INTO public.maintenance_types
  (key, label_fr, label_ar, icon, tracking, default_interval_km, default_interval_days, color, is_system, sort_order)
VALUES
  ('vidange',   'Vidange',               'تغيير الزيت',   '🛢️', 'mileage', 10000, NULL, 'amber',  true, 10),
  ('chaine',    'Chaîne / Distribution', 'السلسلة',       '⛓️', 'mileage', 60000, NULL, 'teal',   true, 20),
  ('bougies',   'Bougies',               'شمعات الإشعال', '🔌', 'mileage', 30000, NULL, 'purple', true, 30),
  ('assurance', 'Assurance',             'التأمين',       '🛡️', 'date',    NULL,  365,  'blue',   true, 40),
  ('controle',  'Contrôle technique',    'الفحص الفني',   '🛠️', 'date',    NULL,  365,  'indigo', true, 50),
  ('autre',     'Autre',                 'أخرى',          '❓', 'simple',  NULL,  NULL, 'slate',  true, 900)
ON CONFLICT (key) DO NOTHING;


-- ============================================================================
-- FIN — Le schéma iCar est prêt.
-- Étapes suivantes :
--   1. Dans le SQL Editor, exécuter tout ce script (Run).
--   2. Dans l'application, ouvrir la page de connexion et cliquer
--      « Créer un compte admin » pour créer le premier administrateur.
--   3. Se connecter, puis créer les employés depuis « Équipe » (activer le
--      compte de connexion pour qu'ils puissent se connecter) et cocher leurs
--      permissions.
-- ============================================================================
