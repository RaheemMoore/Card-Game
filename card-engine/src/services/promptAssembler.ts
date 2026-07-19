/**
 * DELETED in M4.9 — this module held the pre-Bible M3.7-era STYLE_ANCHOR
 * ("ERUPTING with elemental power", "glowing element-tinted energy on
 * hands arms chest skin and hair") that was leaking into tier-up
 * portraits whenever Claude dropped the portraitPrompt field.
 *
 * All prompt assembly now runs through claudeApi.ts using the four
 * canonical Bibles:
 *   - data/elementVisualLanguage.ts
 *   - data/bodySkinBible.ts
 *   - data/namingBible.ts
 *   - data/hairFashionBible.ts
 *
 * On Claude failure, generateCardTextWithRetry re-attempts with a
 * progressively compressed but still-Bible-adhering prompt (up to 3 tries)
 * — there is no more pre-Bible fallback.
 */
export {};
