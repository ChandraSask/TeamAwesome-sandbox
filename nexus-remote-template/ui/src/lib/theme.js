/**
 * theme.js — the two application colour modes and everything about them that
 * does not need React.
 *
 *   natural  a quiet, warm light mode: ONE accent colour, flat surfaces, small
 *            corners, no gradients/glass
 *   dark     the same palette rebuilt on warm graphite surfaces
 *
 * `natural` is deliberately layered ON TOP OF the base `nx-light` remap (see
 * `themeClassName`): every `.nx-light` rule in index.css keeps working and
 * `.nx-natural` only overrides colour, shape and type. That is why its class
 * list contains both.
 *
 * Kept free of React and of direct `window`/`document` access at import time
 * (storage and the document are injectable) so it is trivially unit-testable.
 */

export const THEMES = ['natural', 'dark']

export const THEME_STORAGE_KEY = 'nx-theme'

/** Dark is the default; anything that is not a known theme falls back to it. */
export const DEFAULT_THEME = 'dark'

export const THEME_LABEL = {
  natural: 'Natural',
  dark: 'Dark',
}

export function isTheme(value) {
  return value === 'natural' || value === 'dark'
}

export function parseTheme(raw) {
  return isTheme(raw) ? raw : DEFAULT_THEME
}

function defaultStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    // Reading `localStorage` itself can throw in a sandboxed/embedded host.
    return null
  }
}

export function readStoredTheme(storage) {
  try {
    const s = storage === undefined ? defaultStorage() : storage
    return s ? parseTheme(s.getItem(THEME_STORAGE_KEY)) : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

/** Best effort: storage may be blocked inside an embedded host, which must never break the UI. */
export function writeStoredTheme(theme, storage) {
  try {
    const s = storage === undefined ? defaultStorage() : storage
    if (s) s.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    /* ignore */
  }
}

/** Root class list for a theme. `natural` is `light` + `nx-natural` (see file header). */
export function themeClassName(theme) {
  return theme === 'natural' ? 'nx-theme nx-light nx-natural' : 'nx-theme nx-dark'
}

/**
 * Keyboard model for the radiogroup: arrows move (wrapping), Home/End jump.
 * Returns null for any other key so the caller can leave the event alone.
 */
export function themeFromKey(current, key) {
  const i = THEMES.indexOf(current)
  const n = THEMES.length
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return THEMES[(i + 1) % n]
    case 'ArrowLeft':
    case 'ArrowUp':
      return THEMES[(i - 1 + n) % n]
    case 'Home':
      return THEMES[0]
    case 'End':
      return THEMES[n - 1]
    default:
      return null
  }
}

/**
 * Both themes use Radio Canada (text) and Montserrat (headings) instead of Inter.
 * The app runs as a Module-Federation remote, so the host's index.html is not
 * ours to edit — the stylesheet is injected on demand. fonts.googleapis.com is
 * allowed by the host `style-src` and fonts.gstatic.com by `font-src` (see
 * ui/nexus-csp.json). The CSS font stack falls back to Helvetica/Arial, so a
 * blocked network degrades to a look that is still on-brand.
 */
export const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Radio+Canada:wght@400;500;600;700&display=swap'

export const FONTS_ID = 'nx-theme-fonts'

/** Idempotent. Returns true only when it actually added the stylesheet. */
export function ensureThemeFonts(doc) {
  try {
    const d = doc === undefined ? (typeof document === 'undefined' ? null : document) : doc
    if (!d || d.getElementById(FONTS_ID)) return false
    const link = d.createElement('link')
    link.id = FONTS_ID
    link.rel = 'stylesheet'
    link.href = FONTS_HREF
    d.head.appendChild(link)
    return true
  } catch {
    return false
  }
}
