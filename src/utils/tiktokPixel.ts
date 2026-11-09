// ════════════════════════════════════════════════════════════════════════
//  TikTok Pixel — suivi des conversions du site public dans TikTok Ads
//  ────────────────────────────────────────────────────────────────────────
//  Le Pixel ID se configure depuis « Gestion du site web » (champ
//  « TikTok Pixel ID ») et est stocké dans website_settings.tiktok_pixel_id.
//  À défaut, la variable d'environnement VITE_TIKTOK_PIXEL_ID est utilisée.
//
//  Le pixel n'est chargé que sur le site public (/website) : l'application
//  d'administration ne déclenche jamais d'événement. Si aucun ID n'est
//  configuré, toutes les fonctions sont des no-op silencieux (aucune erreur).
//
//  Où trouver l'ID : TikTok Ads Manager → Assets (Outils) → Events
//  (Événements) → Web Events → gérer/installer le pixel → Pixel ID.
//
//  Événements envoyés vers TikTok Ads Manager :
//    • page()           — au chargement et à chaque changement de page
//    • ViewContent      — consultation d'une fiche voiture
//    • InitiateCheckout — ouverture de l'assistant de réservation
//    • Contact          — demande envoyée via WhatsApp (prospect)
//    • CompletePayment  — réservation enregistrée (avec montant + devise)
// ════════════════════════════════════════════════════════════════════════

declare global {
  interface Window {
    ttq?: any;
    TiktokAnalyticsObject?: string;
  }
}

let currentId: string | null = null;

/**
 * Pixel TikTok par défaut de l'agence.
 * Permet au pixel de se charger immédiatement sur le site public, sans aucune
 * configuration en base ni variable d'environnement. Il reste remplaçable :
 * un ID saisi dans « Gestion du site web » ou la variable VITE_TIKTOK_PIXEL_ID
 * est prioritaire sur cette valeur par défaut.
 */
const DEFAULT_TIKTOK_PIXEL_ID = 'DBOV133C77U4J2JR5OM0';

/** Résout l'ID du pixel : réglage du site > variable d'env > valeur par défaut.
 *  NB : `import.meta.env.VITE_TIKTOK_PIXEL_ID` est écrit tel quel (sans `?.`
 *  avant `.env`) pour que Vite inline la valeur à la compilation. */
const resolveId = (pixelId?: string | null): string => {
  let fromEnv = '';
  try { fromEnv = (import.meta.env && import.meta.env.VITE_TIKTOK_PIXEL_ID) || ''; } catch { /* ignore */ }
  return String(pixelId || fromEnv || DEFAULT_TIKTOK_PIXEL_ID || '').trim();
};

/**
 * Initialise le TikTok Pixel (idempotent). Injecte le SDK officiel `events.js`
 * puis appelle `load(id)` + un premier `page()`.
 */
export function initTikTokPixel(pixelId?: string | null): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const id = resolveId(pixelId);
  if (!id) return;
  if (currentId === id && window.ttq) return;

  // Amorçage officiel du pixel TikTok (snippet standard).
  if (!window.ttq) {
    /* eslint-disable */
    (function (w: any, d: any, t: string) {
      w.TiktokAnalyticsObject = t;
      const ttq: any = (w[t] = w[t] || []);
      ttq.methods = [
        'page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once',
        'ready', 'alias', 'group', 'enableCookie', 'disableCookie', 'holdConsent',
        'revokeConsent', 'grantConsent',
      ];
      ttq.setAndDefer = function (tt: any, e: string) {
        tt[e] = function () {
          tt.push([e].concat(Array.prototype.slice.call(arguments, 0)));
        };
      };
      for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (tt: string) {
        const e = (ttq._i && ttq._i[tt]) || [];
        for (let n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
        return e;
      };
      ttq.load = function (e: string, n?: any) {
        const r = 'https://analytics.tiktok.com/i18n/pixel/events.js';
        const o = n && n.partner;
        ttq._i = ttq._i || {};
        ttq._i[e] = [];
        ttq._i[e]._u = r;
        ttq._t = ttq._t || {};
        ttq._t[e] = +new Date();
        ttq._o = ttq._o || {};
        ttq._o[e] = n || {};
        n = d.createElement('script');
        n.type = 'text/javascript';
        n.async = true;
        n.src = r + '?sdkid=' + e + '&lib=' + t;
        const s = d.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(n, s);
      };
    })(window, document, 'ttq');
    /* eslint-enable */
  }

  try {
    window.ttq.load(id);
    window.ttq.page();
    currentId = id;
  } catch { /* ignore */ }
}

/** Le pixel est-il prêt ? */
export const isTikTokPixelReady = (): boolean =>
  typeof window !== 'undefined' && !!window.ttq && !!currentId;

/** Envoie un événement standard TikTok (no-op si le pixel n'est pas initialisé). */
export function trackTikTokPixel(event: string, params?: Record<string, any>): void {
  if (!isTikTokPixelReady()) return;
  try { window.ttq.track(event, params || {}); } catch { /* ignore */ }
}

/** Raccourci PageView (navigation interne d'une SPA). */
export const trackTikTokPageView = (): void => {
  if (!isTikTokPixelReady()) return;
  try { window.ttq.page(); } catch { /* ignore */ }
};
