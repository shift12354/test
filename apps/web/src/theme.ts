import { font, palette, radius, space, type ThemeName } from '@life/shared';

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Skriver designtokens fra @life/shared som CSS-variabler. */
export function applyTheme(name: ThemeName) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(palette[name])) root.style.setProperty(`--${kebab(k)}`, v);
  for (const [k, v] of Object.entries(space)) root.style.setProperty(`--space-${k}`, `${v}px`);
  for (const [k, v] of Object.entries(radius)) root.style.setProperty(`--radius-${k}`, `${v}px`);
  root.style.setProperty('--font', font.family);
  root.dataset.theme = name;
  root.style.colorScheme = name;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette[name].bg);
}

export type ThemePref = ThemeName | 'system';

export function resolveTheme(pref: ThemePref): ThemeName {
  if (pref !== 'system') return pref;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function loadThemePref(): ThemePref {
  try {
    const v = localStorage.getItem('ld-theme');
    return v === 'light' || v === 'system' ? v : 'dark';
  } catch {
    return 'dark';
  }
}

export function saveThemePref(p: ThemePref) {
  try {
    localStorage.setItem('ld-theme', p);
  } catch {
    /* privat modus */
  }
}
