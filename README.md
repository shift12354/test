# Nordlys

En enkel landingsside for et fiktivt webstudio, i Apple-inspirert stil.
Bygget med Next.js 16, Tailwind CSS 4 og Motion.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # produksjonsbygg
npm run lint
```

## Designprinsipper

- **Typografi:** systemfonten (SF Pro på Apple-enheter, Inter ellers) med
  størrelsesavhengig sporing og linjeavstand — se `type-*` i `src/app/globals.css`.
- **Materialer:** gjennomskinnelig navigasjon (`material`) med en myk skygge
  som bare vises når innhold ligger under den.
- **Bevegelse:** kritisk dempede fjærer som standard, litt sprett bare etter
  et kast (`src/lib/motion.ts`). Alt kan avbrytes og starter fra posisjonen
  elementet faktisk har på skjermen.
- **Gester:**
  - Karusellen (`work-carousel.tsx`) følger fingeren 1:1, regner ut hvor
    kastet ender (Apples projeksjonsformel), stopper på nærmeste kort og
    gjør myk motstand i kantene. Den kan også styres med piltaster og knapper.
  - Kontaktarket (`contact-sheet.tsx`) glir opp fra bunnen, kan dras ned for
    å lukkes, demper bakgrunnen og gjør resten av siden inaktiv.
- **Tilgjengelighet:** `prefers-reduced-motion` gir toning i stedet for
  sklibevegelse, `prefers-reduced-transparency` gir ugjennomsiktige flater og
  `prefers-contrast: more` gir tydeligere kanter.

## Komponenter

- `src/components/site/` — sidens seksjoner og interaksjoner.
- `src/components/ui/` — `blur-fade` og `number-ticker` fra Magic UI.

## Agent-skills

Installert i `.claude/skills/` (se `skills-lock.json`): `magic-ui`,
`vercel-react-best-practices`, `vercel-composition-patterns`,
`web-design-guidelines` og `find-skills`.
