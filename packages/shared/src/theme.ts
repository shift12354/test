/**
 * Designtokens for Life Dashboard, felles for web og mobil.
 * Eies av designer-agenten. Se docs/DESIGN.md.
 * Alle tekstfarger er sjekket mot WCAG AA (≥ 4.5:1) mot `bg` og `surface`.
 */

export const palette = {
  dark: {
    bg: '#0e1014',
    surface: '#161920',
    surfaceRaised: '#1d212a',
    border: '#272c37',
    text: '#e9ebf1',
    textMuted: '#9aa3b4',
    accent: '#8aa4ff',
    accentText: '#0e1014',
    high: '#ff8a80',
    medium: '#f6c26b',
    low: '#7fd1a8',
    focus: '#b9c8ff',
  },
  light: {
    bg: '#f4f5f8',
    surface: '#fbfbfd',
    surfaceRaised: '#eef0f4',
    border: '#dde1e8',
    text: '#14171d',
    textMuted: '#555e6e',
    accent: '#3b5bdb',
    accentText: '#fbfbfd',
    high: '#c0392b',
    medium: '#8a5a00',
    low: '#1e7a4c',
    focus: '#3b5bdb',
  },
} as const;

export type ThemeName = keyof typeof palette;
export type ThemeColors = { [K in keyof (typeof palette)['dark']]: string };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;
export const font = {
  family: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  size: { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, display: 44 },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
} as const;

export const sourceLabel: Record<string, string> = {
  gmail: 'Gmail',
  outlook: 'Outlook',
  google: 'Google Kalender',
  slack: 'Slack',
  discord: 'Discord',
  telegram: 'Telegram',
  github: 'GitHub',
  news: 'Nyheter',
  weather: 'Vær',
};

export const priorityLabel = { high: 'Haster', medium: 'Viktig', low: 'Info' } as const;
