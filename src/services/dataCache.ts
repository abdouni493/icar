/**
 * Cache mémoire « stale-while-revalidate » partagé par DatabaseService.
 *
 * Problème résolu : chaque navigation entre interfaces relançait des requêtes
 * réseau vers Supabase, avec un spinner à chaque fois — l'application donnait
 * l'impression d'être lente. Ce cache sert instantanément la dernière valeur
 * connue puis rafraîchit en arrière-plan, tout en dédupliquant les requêtes
 * simultanées. Les écritures (create/update/delete) invalident la clé
 * concernée pour garantir la cohérence après une modification.
 *
 * Le cache vit uniquement en mémoire (perdu au rechargement de l'onglet) et
 * est vidé à la déconnexion pour ne jamais laisser fuiter les données d'un
 * compte vers un autre.
 */

type Entry<T> = { value?: T; ts: number; inflight?: Promise<T> };

const store = new Map<string, Entry<unknown>>();

/** Fenêtre « frais » : en-deçà, aucune requête réseau n'est relancée. */
const FRESH_MS = 15_000;
/** Au-delà, la valeur est trop vieille : on attend le rafraîchissement. */
const STALE_MS = 5 * 60_000;

/**
 * Retourne la valeur en cache si possible, sinon exécute `fetcher`.
 * - frais  → valeur immédiate, aucune requête ;
 * - périmé mais présent → valeur immédiate + rafraîchissement en arrière-plan ;
 * - absent / trop vieux → requête attendue (dédupliquée).
 */
export async function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const e = store.get(key) as Entry<T> | undefined;

  if (e && e.value !== undefined && now - e.ts < FRESH_MS) {
    return e.value;
  }

  if (e && e.value !== undefined && now - e.ts < STALE_MS) {
    if (!e.inflight) {
      e.inflight = fetcher()
        .then((v) => { store.set(key, { value: v, ts: Date.now() }); return v; })
        .catch(() => { const cur = store.get(key) as Entry<T> | undefined; if (cur) cur.inflight = undefined; return e.value as T; });
    }
    return e.value;
  }

  if (e && e.inflight) return e.inflight;

  const p = fetcher().then((v) => { store.set(key, { value: v, ts: Date.now() }); return v; });
  store.set(key, { value: e?.value, ts: e?.ts ?? 0, inflight: p });
  try {
    return await p;
  } finally {
    const cur = store.get(key) as Entry<T> | undefined;
    if (cur && cur.inflight === p) cur.inflight = undefined;
  }
}

/** Invalide une ou plusieurs clés (à appeler après une écriture). */
export function invalidate(...keys: string[]): void {
  for (const k of keys) store.delete(k);
}

/** Vide entièrement le cache (déconnexion / changement de compte). */
export function invalidateAll(): void {
  store.clear();
}
