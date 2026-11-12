-- Tarification par paliers : price_week et price_month sont désormais des
-- PRIX PAR JOUR (appliqués dès 7 jours / 30 jours de location).
-- Les anciennes fiches stockaient le total semaine / mois : toute valeur
-- supérieure au prix journalier est convertie en prix par jour.
UPDATE public.cars
   SET price_week = ROUND(price_week / 7)
 WHERE price_week IS NOT NULL AND price_per_day > 0 AND price_week > price_per_day;

UPDATE public.cars
   SET price_month = ROUND(price_month / 30)
 WHERE price_month IS NOT NULL AND price_per_day > 0 AND price_month > price_per_day;

COMMENT ON COLUMN public.cars.price_week  IS 'Prix par jour (DZD) appliqué pour une location de 7 jours ou plus';
COMMENT ON COLUMN public.cars.price_month IS 'Prix par jour (DZD) appliqué pour une location de 30 jours ou plus';
