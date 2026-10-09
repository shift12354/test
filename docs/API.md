# API

Alle ruter under `/api/v1/` krever autentisering:

- **Mobil / skript:** `Authorization: Bearer <DASHBOARD_TOKEN>`
- **Web:** `POST /api/v1/session` med `{ "token": "…" }` gir en httpOnly-cookie (`SameSite=Strict`, 30 dager)

Feil returneres alltid som `{ "error": { "code": "…", "message": "…" } }`.

| Metode | Rute | Beskrivelse |
|---|---|---|
| GET | `/health` | Åpen. `{ ok: true }` |
| POST / DELETE | `/api/v1/session` | Logg inn / ut (web). Maks 5 forsøk/min |
| GET | `/api/v1/dashboard[?refresh=1]` | Alt i ett: brief, glipp, mail, meldinger, kalender, oppdateringer, alarmer, agenter, kilder |
| GET | `/api/v1/briefing` · `/missed` · `/mail` · `/messages` · `/calendar` · `/updates` · `/sources` | Enkeltdeler |
| GET | `/api/v1/agents` | Status for agentene |
| POST | `/api/v1/agents/:id/run` | Kjør en agent (`innboks`, `glipp`, `morgenbrief`, `alarm`, `varsler`) |
| GET / POST | `/api/v1/alarms` | List / lag alarm `{ time: "07:00", days: [1,2,3,4,5], label, enabled, briefing }` |
| PUT / DELETE | `/api/v1/alarms/:id` | Endre / slett |
| POST | `/api/v1/push/register` · `/push/unregister` | `{ token: "ExponentPushToken[…]" }` |

Skjemaene ligger i `packages/shared/src/schemas.ts` og er kontrakten mellom API, web og mobil.

Data fra kildene caches i 90 sekunder. Hver kilde feiler for seg selv, så om Slack er nede virker resten.

## Koble på ekte kilder

Uten nøkler viser hver kilde demo-data (`DEMO_DATA=false` skrur det av). Legg nøklene i `.env`, aldri i koden. **Bruk alltid minst mulig tilgang (read-only).**

> Integrasjonene er skrevet etter tjenestenes offisielle API-er, men er ennå ikke testet mot ekte kontoer. Test én og én.

### Gmail og Google Kalender
1. [Google Cloud Console](https://console.cloud.google.com/) → nytt prosjekt → aktiver **Gmail API** og **Google Calendar API**.
2. OAuth consent screen → *External* → legg deg selv til som testbruker.
3. Credentials → OAuth client ID → *Web application*, med redirect `https://developers.google.com/oauthplayground`.
4. I [OAuth Playground](https://developers.google.com/oauthplayground): ⚙️ → «Use your own OAuth credentials». Velg scopes `https://www.googleapis.com/auth/gmail.readonly` og `https://www.googleapis.com/auth/calendar.readonly`, og bytt kode mot token.
5. Sett `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`.

> Refresh-tokens i «Testing»-modus utløper etter 7 dager. Publiser appen (bare for deg selv) for å unngå det.

### Outlook / Microsoft 365
1. [Entra admin center](https://entra.microsoft.com/) → App registrations → ny app. Redirect: `http://localhost`.
2. API permissions → Microsoft Graph → *Delegated*: `Mail.Read`, `Calendars.Read`, `offline_access`.
3. Hent en refresh-token via auth code-flyt (f.eks. med `@azure/msal-node` eller Postman).
4. Sett `MS_CLIENT_ID`, `MS_CLIENT_SECRET` (valgfri for public client), `MS_REFRESH_TOKEN`, `MS_TENANT`.

> Microsoft roterer refresh-tokens. API-et holder den nye i minnet, men ved omstart brukes den i `.env`. En kryptert token-lagring kommer i en senere versjon.

### Slack
Lag en app på [api.slack.com/apps](https://api.slack.com/apps) → *User Token Scopes*: `search:read`. Installer til workspace → `SLACK_USER_TOKEN=xoxp-…`.

### Discord
Bot på [discord.com/developers](https://discord.com/developers/applications). Slå på **Message Content Intent** og inviter boten med kun «Read Message History» og «View Channels». Sett `DISCORD_BOT_TOKEN` og `DISCORD_CHANNEL_IDS` (kommaseparert).
> Discord-boter kan ikke lese dine private DM-er. Det er en begrensning hos Discord.

### Telegram
Snakk med [@BotFather](https://t.me/BotFather) → `/newbot` → `TELEGRAM_BOT_TOKEN`. Boten viser meldinger sendt *til den* eller i grupper den er med i. (Tips: videresend ting du vil huske til boten.)

### GitHub
[Fine-grained token](https://github.com/settings/personal-access-tokens) med kun **Notifications: read** → `GITHUB_TOKEN`.

### Vær (yr / MET Norway)
Gratis. Sett `WEATHER_LAT`, `WEATHER_LON`, `WEATHER_PLACE` og `WEATHER_CONTACT` (e-post eller URL, som [MET krever](https://api.met.no/doc/TermsOfService)).

### Nyheter
`NEWS_FEEDS=https://www.nrk.no/toppsaker.rss` (kommaseparert, maks 5 feeds).

### Push-varsler
`PUSH_ENABLED=true`. Mobilappen må bygges med EAS (`eas init`) for å få et push-token. Varsler inneholder kun antall som standard. `PUSH_INCLUDE_CONTENT=true` sender emnelinjer via Expo/Apple/Google, så tenk deg om.

## Kilder som ikke støttes

SMS, iMessage, WhatsApp og Messenger har ingen API for å lese dine egne meldinger fra en server. Se `docs/IDEAS.md` for alternativer.
