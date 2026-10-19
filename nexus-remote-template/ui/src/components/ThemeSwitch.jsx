import { useRef } from 'react'
import { THEMES, THEME_LABEL, themeFromKey } from '../lib/theme'

/**
 * ThemeSwitch — compact two-way colour-mode control for the app header.
 *
 * A single-select `radiogroup` (not independent toggles): exactly one mode is
 * active, arrows/Home/End move between modes, and only the active segment is in
 * the tab order. Icons carry the meaning; the label is in aria-label/title.
 * Visuals live in `theme/themeSwitch.css`, which defines its own per-theme
 * variables so it never depends on the Tailwind→theme remapping.
 */

const SVG = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
}

const ICONS = {
  natural: (
    <svg {...SVG}>
      <path d="M5.5 18.5C4.6 11 9 5.5 19 5c.5 9-4 14-11.5 13.5Z" />
      <path d="M5 20l7-7" />
    </svg>
  ),
  dark: (
    <svg {...SVG}>
      <path d="M20 14.6A8.2 8.2 0 0 1 9.4 4 8.2 8.2 0 1 0 20 14.6Z" />
    </svg>
  ),
}

export default function ThemeSwitch({ theme, onChange }) {
  const refs = useRef({})

  const onKeyDown = (e) => {
    const next = themeFromKey(theme, e.key)
    if (!next) return
    e.preventDefault()
    onChange(next)
    refs.current[next]?.focus()
  }

  return (
    <div role="radiogroup" aria-label="Colour theme" className="nx-theme-switch">
      {THEMES.map((t) => (
        <button
          key={t}
          ref={(el) => {
            refs.current[t] = el
          }}
          type="button"
          role="radio"
          aria-checked={theme === t}
          aria-label={`${THEME_LABEL[t]} theme`}
          title={`${THEME_LABEL[t]} theme`}
          tabIndex={theme === t ? 0 : -1}
          data-theme-option={t}
          className="nx-theme-switch__btn"
          onClick={() => onChange(t)}
          onKeyDown={onKeyDown}
        >
          {ICONS[t]}
        </button>
      ))}
    </div>
  )
}
