-- ============================================================================
-- 20261110 — TikTok Pixel du site public
--   website_settings.tiktok_pixel_id : identifiant du Pixel TikTok utilisé pour
--   le suivi des conversions dans TikTok Ads Manager (page, ViewContent,
--   InitiateCheckout, Contact, CompletePayment). Saisi depuis « Gestion du
--   site web ». Réexécutable sans risque (IF NOT EXISTS).
-- ============================================================================

ALTER TABLE public.website_settings
  ADD COLUMN IF NOT EXISTS tiktok_pixel_id text;
