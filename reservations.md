-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.cars (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  brand text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  plate_number text NOT NULL UNIQUE,
  price_per_day numeric NOT NULL,
  status text NOT NULL DEFAULT 'available'::text,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  color text,
  vin text,
  energy text DEFAULT 'Essence'::text,
  transmission text DEFAULT 'Manuelle'::text,
  seats integer DEFAULT 5,
  doors integer DEFAULT 5,
  price_week numeric,
  price_month numeric,
  deposit numeric,
  mileage integer DEFAULT 0,
  fuel_level text DEFAULT 'full'::text CHECK (fuel_level = ANY (ARRAY['full'::text, 'half'::text, 'quarter'::text, 'eighth'::text, 'empty'::text])),
  owner_type text NOT NULL DEFAULT 'personal'::text CHECK (owner_type = ANY (ARRAY['personal'::text, 'third_party'::text])),
  owner_name text,
  owner_phone text,
  agency_share_per_day numeric NOT NULL DEFAULT 0,
  currencies jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT cars_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'user'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.store_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cost integer NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  icon text DEFAULT '🏪'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT store_expenses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.vehicle_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'autre'::text,
  cost integer NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  current_mileage integer,
  next_vidange_km integer,
  expiration_date date,
  expense_name text,
  created_at timestamp with time zone DEFAULT now(),
  expense_category text,
  category_icon text DEFAULT '❓'::text,
  alert_sent boolean DEFAULT false,
  oil_filter_changed boolean DEFAULT false,
  air_filter_changed boolean DEFAULT false,
  fuel_filter_changed boolean DEFAULT false,
  ac_filter_changed boolean DEFAULT false,
  CONSTRAINT vehicle_expenses_pkey PRIMARY KEY (id),
  CONSTRAINT vehicle_expenses_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id)
);
CREATE TABLE public.agencies (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agencies_pkey PRIMARY KEY (id)
);
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  email text,
  date_of_birth date,
  place_of_birth text,
  id_card_number text,
  license_number text NOT NULL,
  license_expiration_date date,
  license_delivery_date date,
  license_delivery_place text,
  document_type text CHECK (document_type = ANY (ARRAY['id_card'::text, 'passport'::text, 'none'::text])),
  document_number text,
  document_delivery_date date,
  document_expiration_date date,
  document_delivery_address text,
  wilaya text NOT NULL,
  complete_address text,
  profile_photo text,
  scanned_documents ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  agency_id uuid,
  CONSTRAINT clients_pkey PRIMARY KEY (id),
  CONSTRAINT clients_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id)
);
CREATE TABLE public.workers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  full_name text NOT NULL,
  date_of_birth date,
  phone text NOT NULL,
  email text NOT NULL,
  address text,
  profile_photo text,
  type text NOT NULL CHECK (type = ANY (ARRAY['admin'::text, 'worker'::text, 'driver'::text])),
  payment_type text CHECK (payment_type = ANY (ARRAY['daily'::text, 'monthly'::text])),
  base_salary integer NOT NULL,
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_login_at timestamp with time zone,
  failed_login_attempts integer DEFAULT 0,
  locked_until timestamp with time zone,
  id_card_number text,
  role_id uuid,
  start_date date,
  payment_enabled boolean NOT NULL DEFAULT true,
  account_enabled boolean NOT NULL DEFAULT false,
  auth_user_id uuid,
  permissions jsonb NOT NULL DEFAULT '{"actions": {}, "interfaces": []}'::jsonb,
  CONSTRAINT workers_pkey PRIMARY KEY (id),
  CONSTRAINT workers_role_fkey FOREIGN KEY (role_id) REFERENCES public.worker_roles(id)
);
CREATE TABLE public.worker_advances (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  worker_id uuid NOT NULL,
  amount integer NOT NULL,
  date date NOT NULL,
  note text,
  created_at timestamp with time zone DEFAULT now(),
  settled boolean NOT NULL DEFAULT false,
  CONSTRAINT worker_advances_pkey PRIMARY KEY (id),
  CONSTRAINT worker_advances_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.workers(id)
);
CREATE TABLE public.worker_absences (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  worker_id uuid NOT NULL,
  cost integer NOT NULL,
  date date NOT NULL,
  note text,
  created_at timestamp with time zone DEFAULT now(),
  settled boolean NOT NULL DEFAULT false,
  CONSTRAINT worker_absences_pkey PRIMARY KEY (id),
  CONSTRAINT worker_absences_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.workers(id)
);
CREATE TABLE public.worker_payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  worker_id uuid NOT NULL,
  amount integer NOT NULL,
  date date NOT NULL,
  base_salary integer NOT NULL,
  advances integer DEFAULT 0,
  absences integer DEFAULT 0,
  net_salary integer NOT NULL,
  note text,
  created_at timestamp with time zone DEFAULT now(),
  period_key text,
  CONSTRAINT worker_payments_pkey PRIMARY KEY (id),
  CONSTRAINT worker_payments_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.workers(id)
);
CREATE TABLE public.offers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL,
  price numeric NOT NULL CHECK (price > 0::numeric),
  note text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT offers_pkey PRIMARY KEY (id),
  CONSTRAINT offers_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id)
);
CREATE TABLE public.special_offers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL,
  old_price numeric NOT NULL CHECK (old_price > 0::numeric),
  new_price numeric NOT NULL CHECK (new_price > 0::numeric),
  note text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT special_offers_pkey PRIMARY KEY (id),
  CONSTRAINT special_offers_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id)
);
CREATE TABLE public.website_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  name text NOT NULL,
  description text,
  logo text,
  updated_at timestamp with time zone DEFAULT now(),
  phone_number_2 text,
  bank_number text,
  address text,
  phone text,
  landing_background text,
  CONSTRAINT website_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.website_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  facebook text,
  instagram text,
  tiktok text,
  whatsapp text,
  phone text,
  address text,
  email text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT website_contacts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.agency_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_name text NOT NULL DEFAULT 'LuxDrive Premium'::text,
  slogan text,
  address text,
  phone text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  logo text,
  phone_number_2 text,
  bank_number text,
  CONSTRAINT agency_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.reservations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  car_id uuid NOT NULL,
  departure_date date NOT NULL,
  departure_time time without time zone NOT NULL,
  departure_agency_id uuid NOT NULL,
  return_date date NOT NULL,
  return_time time without time zone NOT NULL,
  return_agency_id uuid NOT NULL,
  price_per_day numeric NOT NULL,
  price_week numeric,
  price_month numeric,
  total_days integer NOT NULL,
  total_price numeric NOT NULL,
  deposit numeric NOT NULL,
  discount_amount numeric DEFAULT 0,
  discount_type text CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text])),
  advance_payment numeric DEFAULT 0,
  remaining_payment numeric NOT NULL,
  tva_applied boolean DEFAULT false,
  tva_amount numeric DEFAULT 0,
  additional_fees numeric DEFAULT 0,
  excess_mileage numeric DEFAULT 0,
  missing_fuel numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['website_reservation'::text, 'pending'::text, 'accepted'::text, 'confirmed'::text, 'active'::text, 'completed'::text, 'cancelled'::text])),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  activated_at timestamp with time zone,
  completed_at timestamp with time zone,
  caution_enabled boolean DEFAULT false,
  conditions_text text,
  assurance_enabled boolean DEFAULT false,
  assurance_percentage numeric,
  caution_currency character varying DEFAULT 'DZD'::character varying,
  euro_rate numeric,
  caution_amount_dzd numeric,
  created_by uuid,
  created_by_name text,
  protection_assurance_id uuid,
  protection_assurance_name text,
  protection_assurance_price numeric DEFAULT 0,
  source text NOT NULL DEFAULT 'agency'::text,
  timbre_enabled boolean NOT NULL DEFAULT false,
  timbre_rate numeric,
  timbre_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD'::text,
  currency_rate numeric NOT NULL DEFAULT 1,
  total_price_currency numeric,
  promo_code text,
  promo_discount_percentage numeric,
  promo_discount_amount numeric,
  flight_number text,
  flight_date date,
  flight_time time without time zone,
  flight_ticket_image text,
  payment_status text NOT NULL DEFAULT 'unpaid'::text CHECK (payment_status = ANY (ARRAY['unpaid'::text, 'partial'::text, 'paid'::text])),
  entreprise_id uuid,
  deleted_at timestamp with time zone,
  CONSTRAINT reservations_pkey PRIMARY KEY (id),
  CONSTRAINT reservations_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT reservations_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id),
  CONSTRAINT reservations_departure_agency_fkey FOREIGN KEY (departure_agency_id) REFERENCES public.agencies(id),
  CONSTRAINT reservations_return_agency_fkey FOREIGN KEY (return_agency_id) REFERENCES public.agencies(id),
  CONSTRAINT reservations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.workers(id),
  CONSTRAINT reservations_protection_assurance_fkey FOREIGN KEY (protection_assurance_id) REFERENCES public.protection_assurances(id),
  CONSTRAINT reservations_entreprise_fkey FOREIGN KEY (entreprise_id) REFERENCES public.entreprises(id)
);
CREATE TABLE public.vehicle_inspections (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  reservation_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['departure'::text, 'return'::text])),
  mileage integer NOT NULL CHECK (mileage >= 0),
  fuel_level text NOT NULL CHECK (fuel_level = ANY (ARRAY['full'::text, 'half'::text, 'quarter'::text, 'eighth'::text, 'empty'::text])),
  agency_id text NOT NULL,
  exterior_front_photo text,
  exterior_rear_photo text,
  interior_photo text,
  other_photos ARRAY DEFAULT '{}'::text[],
  client_signature text,
  notes text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  time time without time zone NOT NULL DEFAULT CURRENT_TIME,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vehicle_inspections_pkey PRIMARY KEY (id),
  CONSTRAINT vehicle_inspections_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id)
);
CREATE TABLE public.inspection_checklist_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  category text NOT NULL CHECK (category = ANY (ARRAY['securite'::text, 'equipements'::text, 'confort'::text])),
  item_name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inspection_checklist_items_pkey PRIMARY KEY (id)
);
CREATE TABLE public.inspection_responses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  inspection_id uuid NOT NULL,
  checklist_item_id uuid NOT NULL,
  status boolean NOT NULL,
  note text,
  CONSTRAINT inspection_responses_pkey PRIMARY KEY (id),
  CONSTRAINT inspection_responses_checklist_item_id_fkey FOREIGN KEY (checklist_item_id) REFERENCES public.inspection_checklist_items(id),
  CONSTRAINT inspection_responses_inspection_id_fkey FOREIGN KEY (inspection_id) REFERENCES public.vehicle_inspections(id)
);
CREATE TABLE public.reservation_services (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  reservation_id uuid NOT NULL,
  category text NOT NULL CHECK (category = ANY (ARRAY['decoration'::text, 'equipment'::text, 'insurance'::text, 'service'::text, 'driver'::text])),
  service_name text NOT NULL,
  description text,
  price numeric NOT NULL,
  driver_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  driver_caution numeric DEFAULT 0,
  CONSTRAINT reservation_services_pkey PRIMARY KEY (id),
  CONSTRAINT reservation_services_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id),
  CONSTRAINT reservation_services_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.workers(id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  reservation_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_method text NOT NULL CHECK (payment_method = ANY (ARRAY['cash'::text, 'card'::text, 'transfer'::text, 'check'::text])),
  status text DEFAULT 'completed'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text])),
  note text,
  date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id)
);
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  category text NOT NULL CHECK (category = ANY (ARRAY['decoration'::text, 'equipment'::text, 'insurance'::text, 'service'::text])),
  service_name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price > 0::numeric),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  is_mandatory boolean NOT NULL DEFAULT false,
  CONSTRAINT services_pkey PRIMARY KEY (id)
);
CREATE TABLE public.vehicle_inspection_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL,
  photo_type text,
  url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_inspection_photos_pkey PRIMARY KEY (id),
  CONSTRAINT vehicle_inspection_photos_inspection_id_fkey FOREIGN KEY (inspection_id) REFERENCES public.vehicle_inspections(id)
);
CREATE TABLE public.document_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  template_type text NOT NULL CHECK (template_type = ANY (ARRAY['engagement'::text, 'contrat'::text, 'versement'::text, 'facture'::text, 'devis'::text])),
  template jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(template) = 'object'::text),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  is_default boolean DEFAULT false,
  has_conditions boolean DEFAULT false,
  CONSTRAINT document_templates_pkey PRIMARY KEY (id),
  CONSTRAINT document_templates_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id)
);
CREATE TABLE public.maintenance_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL,
  car_info text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['vidange'::text, 'assurance'::text, 'controle'::text, 'chaine'::text])),
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  due_date date,
  is_expired boolean DEFAULT false,
  days_until_due integer,
  current_mileage integer,
  next_service_mileage integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT maintenance_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT maintenance_alerts_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id)
);
CREATE TABLE public.auth_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  email text,
  ip_address text,
  user_agent text,
  status text,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT auth_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT auth_audit_log_user_fkey FOREIGN KEY (user_id) REFERENCES public.workers(id)
);
CREATE TABLE public.admin_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  expires_at bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  user_agent text,
  ip_address text,
  is_valid boolean DEFAULT true,
  CONSTRAINT admin_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT admin_sessions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id)
);
CREATE TABLE public.vehicle_expense_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_name text NOT NULL UNIQUE,
  icon text NOT NULL DEFAULT '❓'::text,
  description text,
  category_type text DEFAULT 'autre'::text CHECK (category_type = ANY (ARRAY['vidange'::text, 'assurance'::text, 'controle'::text, 'autre'::text])),
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vehicle_expense_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.maintenance_cost_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL,
  expense_id uuid,
  expense_type text NOT NULL CHECK (expense_type = ANY (ARRAY['vidange'::text, 'assurance'::text, 'controle'::text, 'chaine'::text, 'autre'::text])),
  expense_category text,
  cost integer NOT NULL,
  alert_date date NOT NULL DEFAULT CURRENT_DATE,
  alert_sent boolean DEFAULT false,
  alert_severity text DEFAULT 'medium'::text CHECK (alert_severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  alert_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT maintenance_cost_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT maintenance_cost_alerts_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id)
);
CREATE TABLE public.protection_assurances (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  price_per_day numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT protection_assurances_pkey PRIMARY KEY (id)
);
CREATE TABLE public.protection_assurance_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  item_name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT protection_assurance_items_pkey PRIMARY KEY (id)
);
CREATE TABLE public.protection_assurance_item_links (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assurance_id uuid NOT NULL,
  item_id uuid NOT NULL,
  status boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT protection_assurance_item_links_pkey PRIMARY KEY (id),
  CONSTRAINT protection_assurance_item_links_assurance_fkey FOREIGN KEY (assurance_id) REFERENCES public.protection_assurances(id),
  CONSTRAINT protection_assurance_item_links_item_fkey FOREIGN KEY (item_id) REFERENCES public.protection_assurance_items(id)
);
CREATE TABLE public.promo_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_percentage numeric NOT NULL CHECK (discount_percentage > 0::numeric AND discount_percentage <= 100::numeric),
  is_active boolean NOT NULL DEFAULT true,
  is_used boolean NOT NULL DEFAULT false,
  used_at timestamp with time zone,
  reservation_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT promo_codes_pkey PRIMARY KEY (id),
  CONSTRAINT promo_codes_reservation_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id)
);
CREATE TABLE public.entreprises (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rc text,
  art text,
  nis text,
  nif text,
  address text,
  phone text,
  email text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT entreprises_pkey PRIMARY KEY (id)
);
CREATE TABLE public.rental_settings (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
  mileage_limit_per_day numeric NOT NULL DEFAULT 0,
  excess_mileage_fee_per_km numeric NOT NULL DEFAULT 0,
  fuel_fee_per_level numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rental_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.worker_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT worker_roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.maintenance_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label_fr text NOT NULL,
  label_ar text NOT NULL DEFAULT ''::text,
  icon text NOT NULL DEFAULT '🔧'::text,
  tracking text NOT NULL DEFAULT 'mileage'::text CHECK (tracking = ANY (ARRAY['mileage'::text, 'date'::text, 'simple'::text])),
  default_interval_km integer,
  default_interval_days integer,
  color text NOT NULL DEFAULT 'slate'::text CHECK (color = ANY (ARRAY['red'::text, 'blue'::text, 'amber'::text, 'green'::text, 'purple'::text, 'teal'::text, 'orange'::text, 'indigo'::text, 'pink'::text, 'slate'::text])),
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_types_pkey PRIMARY KEY (id)
);