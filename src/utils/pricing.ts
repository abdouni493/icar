/**
 * Tarification par paliers — TOUS les prix sont des prix PAR JOUR (DZD).
 *
 *  - priceDay   : prix / jour pour une location de 1 à 6 jours
 *  - priceWeek  : prix / jour appliqué si la location dure 7 jours ou plus
 *  - priceMonth : prix / jour appliqué si la location dure 30 jours ou plus
 *
 * Total de base = prix / jour du palier × nombre de jours.
 * Si un palier n'est pas renseigné (0), on retombe sur le palier inférieur.
 */

export const WEEK_THRESHOLD_DAYS = 7;
export const MONTH_THRESHOLD_DAYS = 30;

export type PriceTier = 'day' | 'week' | 'month';

interface PricedCar {
  priceDay?: number | null;
  priceWeek?: number | null;
  priceMonth?: number | null;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Normalise une valeur `price_week` / `price_month` venant de la base.
 * Les anciennes fiches stockaient le TOTAL de la semaine / du mois : une valeur
 * supérieure au prix journalier est donc convertie en prix par jour.
 */
export const normalizePerDayRate = (raw: unknown, priceDay: unknown, periodDays: number): number => {
  const value = num(raw);
  const day = num(priceDay);
  if (!value) return 0;
  if (day > 0 && value > day) return Math.round(value / periodDays);
  return Math.round(value);
};

/** Prix / jour hebdomadaire effectif (retombe sur le prix journalier). */
export const getWeekRate = (car?: PricedCar | null): number =>
  num(car?.priceWeek) || num(car?.priceDay);

/** Prix / jour mensuel effectif (retombe sur le prix hebdomadaire puis journalier). */
export const getMonthRate = (car?: PricedCar | null): number =>
  num(car?.priceMonth) || getWeekRate(car);

/** Palier applicable pour une durée donnée. */
export const getPriceTier = (days: number): PriceTier =>
  days >= MONTH_THRESHOLD_DAYS ? 'month' : days >= WEEK_THRESHOLD_DAYS ? 'week' : 'day';

/** Prix / jour applicable pour une durée donnée. */
export const getDailyRate = (car: PricedCar | null | undefined, days: number): number => {
  const tier = getPriceTier(days);
  if (tier === 'month') return getMonthRate(car);
  if (tier === 'week') return getWeekRate(car);
  return num(car?.priceDay);
};

/** Total de base de la location (prix / jour du palier × jours). */
export const calculateRentalBase = (car: PricedCar | null | undefined, days: number): number =>
  Math.round(getDailyRate(car, Math.max(0, days)) * Math.max(0, days));
