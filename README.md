# Nordlys

Landingsside for et oppdiktet nettstudio i Tromsø. Bygget med Next.js 16,
Tailwind CSS 4 og Motion.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # produksjonsbygg
npm run lint
npm run build:preview   # én selvstendig HTML-fil i dist-preview/
```

`build:preview` lager en versjon av siden uten Next.js-server, med CSS og
JavaScript bygget inn i én fil. Den brukes til forhåndsvisningen på claude.ai.

Designvalgene står i [`DESIGN.md`](DESIGN.md).

## Hva som skjer på siden

Øverst vises soloppgang og solnedgang i Tromsø for en dato, og under det en
søyle per dag i året med høyde etter timer dagslys. Du kan dra i søylene, trykke
på en dag eller bruke piltastene. Himmelen bak søylene skifter farge med lyset.
Soltidene regnes ut i nettleseren med NOAAs formler (`src/lib/daylight.ts`), så
siden trenger ingen tjeneste utenfra.

Prosjektkortene kan dras og kastes. Kontaktskjemaet åpnes som et ark fra bunnen
og kan dras ned for å lukkes. Skjemaet sender ingenting; det er et eksempel.

## Filer

- `src/components/site/daylight-hero.tsx`: dagslyset og datovelgeren.
- `src/components/site/work-carousel.tsx`: prosjektkortene.
- `src/components/site/contact-sheet.tsx`: kontaktarket og skjemaet.
- `src/lib/motion.ts`: fjærinnstillinger og hjelpere for gester.

## Agent-skills

I `.claude/skills/` (se `skills-lock.json`): `frontend-design`, `magic-ui`,
`vercel-react-best-practices`, `vercel-composition-patterns`,
`web-design-guidelines` og `find-skills`. `humanizer` er installert globalt for
Claude Code og ble brukt på tekstene.
