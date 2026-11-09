// ════════════════════════════════════════════════════════════════════════
//  Meta (Facebook) Pixel — suivi des conversions du site public
//  ────────────────────────────────────────────────────────────────────────
//  Le Pixel ID est configurable depuis « Gestion du site web » (champ
//  « Meta Pixel ID ») et stocké dans website_settings.meta_pixel_id. À défaut,
//  la variable d'environnement VITE_META_PIXEL_ID est utilisée.
//
//  Le pixel n'est chargé que sur le site public (/website) : l'application
//  d'administration ne déclenche jamais d'événement. Si aucun ID n'est
//  configuré, toutes les fonctions sont des no-op silencieux (aucune erreur).
//
//  Événements envoyés vers Meta Ads Manager :
//    • PageView         — au chargement et à chaque changement de page
//    • ViewContent      — consultation d'une fiche voiture
//    • InitiateCheckout — ouverture de l'assistant de réservation
//    • Lead             — demande envoyée via WhatsApp
//    • Purchase         — réservation enregistrée (avec montant + devise)
// ════════════════════════════════════════════════════════════════════════

declare global {
  interface Window {
    fbq?: ((...args: any[]) => void) & { callMethod?: (...args: any[]) => void; queue?: any[]; loaded?: boolean; version?: string; push?: any };
    _fbq?: any;
  }
}

let currentId: string | null = null;

/** Résout l'ID du pixel : réglage du site en priorité, puis variable d'env.
 *  NB : on écrit `import.meta.env.VITE_META_PIXEL_ID` tel quel (sans `?.` avant
 *  `.env`) pour que Vite remplace la valeur à la compilation, comme dans
 *  supabase.ts. */
const resolveId = (pixelId?: string | null): string => {
  let fromEnv = '';
  try { fromEnv = (import.meta.env && import.meta.env.VITE_META_PIXEL_ID) || ''; } catch { /* ignore */ }
  return String(pixelId || fromEnv || '').trim();
};

/**
 * Initialise le Meta Pixel (idempotent). Injecte le script officiel
 * `fbevents.js` une seule fois puis appelle `init` + un premier `PageView`.
 */
export function initMetaPixel(pixelId?: string | null): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const id = resolveId(pixelId);
  if (!id) return;
  // Déjà initialisé pour ce même pixel → rien à faire.
  if (currentId === id && window.fbq) return;

  // Amorçage officiel du pixel (snippet standard Meta).
  if (!window.fbq) {
    /* eslint-disable */
    (function (f: any, b: any, e: string, v: string) {
      if (f.fbq) return;
      const n: any = (f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      });
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      const t = b.createElement(e);
      t.async = true;
      t.src = v;
      const s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */

    // Repli <noscript> (clients sans JavaScript / aperçus).
    try {
      const ns = document.createElement('noscript');
      const img = document.createElement('img');
      img.height = 1;
      img.width = 1;
      img.style.display = 'none';
      img.src = `https://www.facebook.com/tr?id=${encodeURIComponent(id)}&ev=PageView&noscript=1`;
      ns.appendChild(img);
      document.body.appendChild(ns);
    } catch { /* ignore */ }
  }

  try {
    window.fbq!('init', id);
    window.fbq!('track', 'PageView');
    currentId = id;
  } catch { /* ignore */ }
}

/** Le pixel est-il prêt ? */
export const isMetaPixelReady = (): boolean =>
  typeof window !== 'undefined' && !!window.fbq && !!currentId;

/** Envoie un événement standard Meta (no-op si le pixel n'est pas initialisé). */
export function trackMetaPixel(event: string, params?: Record<string, any>): void {
  if (!isMetaPixelReady()) return;
  try { window.fbq!('track', event, params || {}); } catch { /* ignore */ }
}

/** Envoie un événement personnalisé (trackCustom). */
export function trackMetaPixelCustom(event: string, params?: Record<string, any>): void {
  if (!isMetaPixelReady()) return;
  try { window.fbq!('trackCustom', event, params || {}); } catch { /* ignore */ }
}

/** Raccourci PageView (navigation interne d'une SPA). */
export const trackMetaPageView = (): void => trackMetaPixel('PageView');
