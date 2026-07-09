/**
 * Bundled illustration for concrete vocabulary, resolved at render time by the
 * exercise's `answer` — the sibling rail to `emoji-map.ts`. Keys are normalized
 * (lowercase, accent-stripped, trimmed). Images live at
 * `static/img/vocab/<key>.svg` and are bundled so the PWA works offline.
 *
 * Fallback chain (handled by callers): image → emoji → nothing.
 * Emoji-first rollout: AVAILABLE_IMAGES is empty today, so every word falls
 * back to its emoji. To light up a word, drop `static/img/vocab/<key>.svg`
 * and add its normalized key to the set below. No DB/schema change.
 */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Normalized answer keys that have a bundled illustration.
// Keep in sync with the files in static/img/vocab/.
const AVAILABLE_IMAGES = new Set<string>([
  // Batch 1 — food, nature, house, animals (flat SVG, brand palette).
  'cafe', 'pao', 'queijo', 'ovo', 'banana', 'laranja', 'agua',
  'sol', 'flor', 'casa', 'gato', 'cachorro',
]);

const IMAGE_DIR = '/img/vocab';
const IMAGE_EXT = 'svg';

/** Path to the bundled illustration for `answer`, or null if none exists. */
export function lookupImage(answer: string): string | null {
  if (!answer) return null;
  const key = normalize(answer);
  return AVAILABLE_IMAGES.has(key) ? `${IMAGE_DIR}/${key}.${IMAGE_EXT}` : null;
}
