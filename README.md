# Life Dashboard

Et personlig dashboard for én person, med mobilapp (Expo) og web-app (React). Det samler alt du trenger å vite i løpet av dagen:

- ⏰ **Alarm og morgenbrief:** vekkerklokke som viser en oppsummering av dagen når den går
- ✉️ **Mail:** Gmail og Outlook, prioritert av innboks-agenten
- 💬 **Meldinger:** Slack, Discord og Telegram
- 📅 **Kalender:** Google og Outlook
- 🔔 **Gått glipp av:** ting du ikke har fått med deg, med forklaring på *hvorfor* de er viktige
- 📰 **Oppdateringer:** nyheter (RSS), vær (yr/MET) og GitHub
- 📲 **Push-varsler** gjennom dagen når noe haster (uten innhold, av personvernhensyn)

Versjon 0.1 kjører med **fiktive demo-data** til du legger inn nøkler. Hver kilde kobles på for seg.

## Kom i gang

```bash
npm install
npm run setup        # lager .env med en tilfeldig DASHBOARD_TOKEN
npm run dev          # API på :8787 og web på http://localhost:5173
```

Logg inn på web-appen med `DASHBOARD_TOKEN` fra `.env`.

**Mobil:**

```bash
npm run dev:mobile   # åpner Expo, og du skanner QR-koden med Expo Go
```

Skriv inn adressen til PC-en (f.eks. `http://192.168.1.10:8787`) og tokenet. For at telefonen skal nå API-et i utvikling, sett `HOST=0.0.0.0` i `.env`.

> **Alarmer på mobil** planlegges som lokale varsler og går selv om appen er lukket. På iOS kan ingen tredjepartsapp overstyre stillemodus helt. Bruk «Fokus»-unntak for appen. Android bruker en egen alarmkanal med høyeste prioritet.

## Struktur

```
apps/
  api/       Fastify-API: connectors (kilder) + agenter i appen
  web/       React + Vite
  mobile/    Expo / React Native
packages/
  shared/    Typer, zod-skjemaer og designtokens, delt av alle
docs/        IDEAS.md · DESIGN.md · API.md · SECURITY.md
.claude/agents/   De fem prosjektagentene
```

## Agentene

### Agenter i appen (`apps/api/src/agents/`)

Foreløpig er agentene regelbaserte, uten AI.

| Agent | Gjør |
|---|---|
| **Innboks** | Gir hver mail en prioritet (Haster/Viktig/Info) og forklarer hvorfor: VIP, «frist», merket viktig, nyhetsbrev … |
| **Gått glipp av** | Finner uleste viktige mail, @-nevninger, DM-er, reviews og møter som starter snart |
| **Morgenbrief** | Lager oppsummering av vær, avtaler, uleste og toppsak |
| **Alarm** | Holder styr på alarmer og når neste går |
| **Varsler** | Sjekker hvert 5. minutt og sender push når noe nytt haster |

### Prosjektagenter (`.claude/agents/`)

Disse jobber *på* prosjektet i Claude Code:

| Agent | Rolle |
|---|---|
| `idemaker` | Finner på nye funksjoner og prioriterer → `docs/IDEAS.md` |
| `designer` | Designsystem for mobil og web → `docs/DESIGN.md`, `packages/shared/src/theme.ts` |
| `koder` | Implementerer, tester og refaktorerer |
| `sikkerhet` | Erfaren sikkerhetsekspert. Sørger for at ingenting lekker → `docs/SECURITY.md` |
| `api-arkitekt` | API-design og integrasjoner → `docs/API.md` |

Bruk dem i Claude Code, f.eks.: *«Bruk sikkerhet-agenten til å gå gjennom endringene før jeg pusher.»*

## Kommandoer

| Kommando | |
|---|---|
| `npm run dev` | API og web i utviklingsmodus |
| `npm test` | Tester (vitest) |
| `npm run typecheck` | TypeScript for alle pakker |
| `npm run check:secrets` | Leter etter lekkede nøkler i filene git ser |
| `npm run build && npm start` | Produksjon: API-et serverer også web-appen |

## Sikkerhet

Se [docs/SECURITY.md](docs/SECURITY.md). Kort fortalt: `.env` committes aldri, alle API-ruter krever token, web bruker httpOnly-cookie (ikke localStorage), mobil bruker SecureStore, og alle integrasjoner er read-only.
