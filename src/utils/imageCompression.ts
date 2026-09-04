/**
 * Compression / redimensionnement des images AVANT envoi vers Supabase Storage.
 *
 * Les photos de téléphone font souvent 3–8 Mo : les téléverser telles quelles
 * rend chaque upload lent. On les redimensionne (bord le plus long borné) et on
 * les ré-encode en JPEG/WebP côté navigateur — une photo de 5 Mo tombe en
 * général à 150–400 Ko, soit un upload ~10× plus rapide, sans différence
 * visible à l'écran.
 *
 * L'opération est purement locale (canvas) : aucune dépendance, aucun réseau.
 * En cas d'échec (format vectoriel, navigateur exotique, image corrompue) on
 * renvoie le fichier d'origine — l'upload fonctionne comme avant.
 */

export interface CompressOptions {
  /** Borne du bord le plus long, en pixels (défaut 1600). */
  maxDimension?: number;
  /** Qualité JPEG/WebP entre 0 et 1 (défaut 0.82). */
  quality?: number;
  /** Ne compresse pas en-deçà de cette taille (défaut 200 Ko). */
  skipUnderBytes?: number;
}

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 1600,
  quality: 0.82,
  skipUnderBytes: 200 * 1024,
};

/** Formats matriciels que l'on sait redessiner sans perte de sens. */
function isCompressibleRaster(type: string): boolean {
  return type === 'image/jpeg' || type === 'image/png' || type === 'image/webp';
}

/** Charge un fichier image en ImageBitmap (respecte l'orientation EXIF). */
async function loadBitmap(file: File): Promise<ImageBitmap> {
  // createImageBitmap est le chemin rapide ; imageOrientation corrige l'EXIF.
  return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

/**
 * Retourne une version compressée du fichier, ou le fichier d'origine si la
 * compression n'apporte rien (ou n'est pas possible).
 */
export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const opts = { ...DEFAULTS, ...options };

  try {
    // Non-image ou format vectoriel/animé : on ne touche pas.
    if (!file.type.startsWith('image/') || !isCompressibleRaster(file.type)) return file;
    // Déjà léger : inutile de recompresser.
    if (file.size <= opts.skipUnderBytes) return file;

    const bitmap = await loadBitmap(file);
    const { width, height } = bitmap;
    const longEdge = Math.max(width, height);
    const scale = longEdge > opts.maxDimension ? opts.maxDimension / longEdge : 1;

    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close?.(); return file; }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close?.();

    // Un PNG peut porter de la transparence : on garde le PNG dans ce cas,
    // sinon JPEG (plus léger). Le WebP serait encore meilleur mais tous les
    // navigateurs ciblés ne l'exportent pas de façon fiable via toBlob.
    const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await canvasToBlob(canvas, outType, opts.quality);
    if (!blob || blob.size >= file.size) return file; // aucun gain → on garde l'original

    const ext = outType === 'image/png' ? 'png' : 'jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${baseName}.${ext}`, { type: outType, lastModified: Date.now() });
  } catch (err) {
    console.warn('[imageCompression] compression ignorée:', err);
    return file;
  }
}
