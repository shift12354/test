# Nordlys

En enkel, moderne landingsside for et fiktivt webstudio. Bygget med
Next.js 16, Tailwind CSS 4, shadcn og [Magic UI](https://magicui.design).

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # produksjonsbygg
npm run lint
```

## Magic UI-komponenter i bruk

Ligger i `src/components/ui/` (registerkode, samme oppsett som `npx shadcn add @magicui/<navn>`):

| Seksjon      | Komponenter                                                                 |
| ------------ | --------------------------------------------------------------------------- |
| Globalt      | `scroll-progress`, `animated-theme-toggler`, `blur-fade`                    |
| Hero         | `aurora-text`, `word-rotate`, `animated-shiny-text`, `shimmer-button`, `particles` |
| Kunder       | `marquee`                                                                   |
| Funksjoner   | `bento-grid`, `animated-list`, `animated-beam`, `globe`, `marquee`          |
| Tall         | `number-ticker`                                                             |
| Prosess      | `terminal`, `border-beam`                                                   |
| Omtaler      | `marquee`, `dot-pattern`                                                    |
| Priser       | `magic-card`, `border-beam`                                                 |
| Kontakt      | `orbiting-circles`, `flickering-grid`, `interactive-hover-button`           |

Sidens egne seksjoner ligger i `src/components/site/`.

## Agent-skills

Installert i `.claude/skills/` (se `skills-lock.json`):

- `magic-ui` — fra `magicuidesign/magicui`
- `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines` — fra `vercel-labs/agent-skills`
- `find-skills` — fra `vercel-labs/skills`
