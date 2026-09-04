/**
 * Thème clair / sombre de l'application ET du site public.
 *
 * Le basculement pose (ou retire) la classe `.dark` sur <html>. Toutes les
 * variables de couleur sont redéfinies sous `.dark` dans src/index.css, donc
 * un seul toggle suffit à basculer l'ensemble des écrans — y compris les
 * composants historiques qui utilisent `bg-white` / `text-slate-900`.
 *
 * Deux surfaces distinctes, chacune avec sa préférence mémorisée séparément :
 *   • 'app'  (interface admin) → CLAIR par défaut
 *   • 'site' (site public)     → SOMBRE par défaut
 * Chaque surface garde son propre choix : basculer le site en clair ne force
 * pas l'admin en clair, et inversement.
 */

export type ThemeMode = 'light' | 'dark';
export type ThemeSurface = 'app' | 'site';

const KEYS: Record<ThemeSurface, string> = {
  app: 'mhd-auto-theme',
  site: 'icar-website-theme',
};

const DEFAULTS: Record<ThemeSurface, ThemeMode> = {
  app: 'light',   // l'application démarre en clair
  site: 'dark',   // le site public démarre en sombre
};

/**
 * Thème enregistré pour une surface, sinon son défaut (clair pour l'app,
 * sombre pour le site). La préférence système n'est volontairement PAS
 * consultée : seul le choix explicite de l'utilisateur est mémorisé.
 */
export function getStoredTheme(surface: ThemeSurface = 'app'): ThemeMode {
  if (typeof window === 'undefined') return DEFAULTS[surface];
  const saved = window.localStorage.getItem(KEYS[surface]);
  if (saved === 'dark') return 'dark';
  if (saved === 'light') return 'light';
  return DEFAULTS[surface];
}

/** Applique le thème au document (sans l'enregistrer). */
export function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', mode === 'dark');
  root.style.colorScheme = mode;
}

/** Applique ET enregistre le thème pour la surface donnée. */
export function setTheme(mode: ThemeMode, surface: ThemeSurface = 'app'): void {
  applyTheme(mode);
  try {
    window.localStorage.setItem(KEYS[surface], mode);
  } catch {
    /* stockage indisponible (navigation privée) — le thème reste en session */
  }
}

/** Initialise le thème d'une surface au démarrage. Retourne le mode appliqué. */
export function initTheme(surface: ThemeSurface = 'app'): ThemeMode {
  const mode = getStoredTheme(surface);
  applyTheme(mode);
  return mode;
}
