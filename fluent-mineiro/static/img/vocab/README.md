# Vocab illustrations (dual-coding)

Bundled illustrations for concrete vocabulary, shown on teach cards and in the
"picture → type the word" exercise. Offline-friendly (bundled with the PWA).

## How to add one
1. Add `<key>.svg` here, where `<key>` is the exercise `answer`, normalized:
   lowercase, accents stripped, trimmed. E.g. `café` → `cafe.svg`,
   `pão de queijo` → `pao de queijo.svg`.
2. Add that same `<key>` to `AVAILABLE_IMAGES` in `src/lib/image-map.ts`.

Fallback chain: image → emoji (`emoji-map.ts`) → nothing. Until an image
exists for a word, its emoji shows automatically — nothing else to change.

Style: flat, on-brand (terracotta / serra green / ouro gold), ~square,
transparent background, readable at 96px.
