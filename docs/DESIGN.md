# Designsystem

**Uttrykk:** mørkt, rolig og minimalistisk. Norsk tekst, kort og vennlig. Lyst tema er valgfritt.

Tokens ligger i [`packages/shared/src/theme.ts`](../packages/shared/src/theme.ts) og brukes av både web (som CSS-variabler) og mobil (via `ThemeContext`).

## Farger

| Token | Mørk | Lys | Bruk |
|---|---|---|---|
| `bg` | `#0e1014` | `#f4f5f8` | Bakgrunn |
| `surface` | `#161920` | `#fbfbfd` | Kort |
| `surfaceRaised` | `#1d212a` | `#eef0f4` | Tall-fliser, chips, knapper |
| `border` | `#272c37` | `#dde1e8` | Skillelinjer |
| `text` / `textMuted` | `#e9ebf1` / `#9aa3b4` | `#14171d` / `#555e6e` | Tekst (≥ 4.5:1) |
| `accent` | `#8aa4ff` | `#3b5bdb` | Primærknapp, aktiv fane, «nå» |
| `high` / `medium` / `low` | rød / gul / grønn | mørkere varianter | Prioritet: Haster / Viktig / Info |

Prioritet vises **alltid med både farge og tekst** («Haster»), aldri med farge alene.

## Layout

- **Web:** rutenett med 3 kolonner (≥ 1000 px), 2 kolonner (≥ 680 px) og 1 kolonne på mobil. Morgenbrief og «Gått glipp av» tar to kolonner.
- **Mobil:** én kolonne, fanelinje nederst (Hjem · Innboks · I dag · Alarmer · Agenter), og dra ned for å oppdatere.
- **Rekkefølge:** brief → gått glipp av → i dag → innboks → meldinger → oppdateringer → alarmer → agenter → kilder.
- **Avstander:** 4 / 8 / 12 / 16 / 24 / 32. Radius: 8 / 14 / 20.

## Komponenter

- **Kort:** tittel i små versaler (`textMuted`), antall i en pille, og en handling til høyre.
- **Rad:** innhold til venstre og metadata til høyre (merke + relativ tid). Prioritet vises som en 3 px stripe til venstre.
- **Alarm-overlay:** fullskjerm med stor klokke (88 px), morgenbrief og to store knapper (Slumre / Stopp, min 56 px).

## Tilgjengelighet

- Trykkflater på minst 44×44 (knapper 44 px, fanelinje 56 px)
- Synlig fokusring (`focus`-token), `aria-label` på ikon-knapper og `role="alertdialog"` på alarmen
- `prefers-reduced-motion` skrur av animasjoner
