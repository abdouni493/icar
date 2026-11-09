-- ============================================================================
-- 20261109 — Meta (Facebook) Pixel du site public
--   website_settings.meta_pixel_id : identifiant du Pixel Meta utilisé pour le
--   suivi des conversions dans Meta Ads Manager (PageView, ViewContent,
--   InitiateCheckout, Lead, Purchase). Saisi depuis « Gestion du site web ».
-- Réexécutable sans risque (IF NOT EXISTS).
-- ============================================================================

ALTER TABLE public.website_settings
  ADD COLUMN IF NOT EXISTS meta_pixel_id text;
