# Sikkerhet i Life Dashboard

Sist gjennomgått: 2026-10-09 (før første push til GitHub). Repoet behandles som om det kan bli offentlig.

## Trusselmodell (kort)

Life Dashboard samler **mail, meldinger og kalender** for én person. Lekkasje av disse dataene, eller av nøklene som gir tilgang til dem, er det verste som kan skje.

| Hva vi beskytter | Mot hvem / hva |
| --- | --- |
| `DASHBOARD_TOKEN` og alle OAuth- og bot-tokens i `.env` | Lekkasje via git, logger, feilmeldinger eller klientkode |
| Innholdet i mail, meldinger og kalender | Uautoriserte kall mot API-et, CSRF fra andre nettsider, XSS via eksterne lenker |
| Sesjonen i nettleseren | Tyveri via JavaScript (XSS), CSRF |
| Tokenet på mobilen | Andre apper, backup, klartekst over nettverk |
| Tilgjengelighet | Brute force av token, misbruk av agent-kjøring (kall mot eksterne API-er) |

Utenfor scope: en angriper som allerede har skall-tilgang til serveren som eieren, eller en kompromittert leverandør (Google, Microsoft, Slack osv.).

## Hva som er på plass

- **Hemmeligheter:** `.env`, `.env.*` (unntatt `.env.example`), nøkkelfiler, `data/`, `apps/api/data/`, `dist/` og `.expo/` er i `.gitignore`. `.env.example` har bare tomme plassholdere. `npm run setup` lager `.env` med rettighet 600 og et tilfeldig token på 256 bit.
- **`npm run check:secrets`** skanner alle filer git ser etter kjente token-formater (AWS, Slack, GitHub, Google, Telegram, Discord, Microsoft, Expo push, private nøkler) og etter **de faktiske verdiene i din lokale `.env`** (skriver bare ut variabelnavnet, aldri verdien).
- **Autentisering:** alle `/api/*`-ruter krever `Authorization: Bearer <token>` eller sesjons-cookie, unntatt `POST /api/v1/session` (login). `/health` returnerer bare `{ ok: true }`. Token sammenlignes i konstant tid (SHA-256 før `timingSafeEqual`). API-et nekter å starte med token under 32 tegn.
- **Sesjon:** web bytter tokenet mot en tilstandsløs, HMAC-signert cookie (`HttpOnly`, `SameSite=Strict`, `Path=/api`, `Secure` i produksjon, 30 dager). Tokenet lagres aldri i localStorage.
- **CSRF:** cookie-forespørsler som ikke er GET må ha `Origin` lik egen host eller i `CORS_ORIGINS`. Ugyldig eller `null`-origin gir 403.
- **CORS:** streng allowlist med credentials, `*` er forbudt i produksjon.
- **Headers:** helmet med CSP (`default-src 'self'`, `script-src 'self'`, `connect-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`), `nosniff`, CORP same-origin, HSTS i produksjon. `Cache-Control: no-store` på alle API-svar. Web har `referrer: no-referrer` og `noindex`.
- **Rate limit:** 120/min globalt, 5/min på login, 10/min på agent-kjøring. `X-Forwarded-For` stoles bare på fra loopback i produksjon (`TRUST_PROXY`).
- **Input:** zod på alle body/params, body maks 64 KB, maks 50 alarmer og 10 push-tokens. Ingen `eval` eller dynamisk `require`.
- **Feil og logging:** 5xx gir bare «Noe gikk galt». pino redakterer `Authorization`, `Cookie` og `Set-Cookie`. Connector-feil logges bare med kilde-id og HTTP-status, aldri URL (Telegram-tokenet ligger i URL-en), respons eller token. Push logges bare med antall.
- **Connectors:** read-only scopes. Alle URL-er er faste `https://`-adresser; ID-er fra env/API kodes med `encodeURIComponent`, og koordinater tvinges til tall. Timeout 8 s. RSS-lenker filtreres til http(s).
- **XSS:** React escaper all tekst; ingen `dangerouslySetInnerHTML`. Eksterne lenker åpnes bare hvis de er `http(s)`, med `rel="noopener noreferrer"`. Mobil åpner bare `https://`-lenker.
- **Lagring:** `store.json` skrives atomisk med rettighet 600; mappen får 700 når den opprettes.
- **Mobil:** token i `expo-secure-store` (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`), aldri AsyncStorage. http tillates bare mot `localhost` og hele private IPv4-adresser. Push-varsler inneholder bare antall som standard (`PUSH_INCLUDE_CONTENT=false`), og varsel-kanalen skjuler innhold på låseskjermen. SMS og kontakter er eksplisitt blokkert.
- **Bygg:** web-bundelen inneholder ingen `VITE_`-variabler eller server-hemmeligheter (sjekket mot `.env`), og sourcemaps er av.
- **Demo-data:** bare fiktive navn og `@example.com`-adresser.

## Funn

Alvorlighetsgrad: Kritisk / Høy / Middels / Lav.

| # | Grad | Fil:linje | Beskrivelse | Fiks / forslag | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Middels | `apps/api/src/app.ts:40`, `apps/api/src/config.ts:41` | `trustProxy: true` i produksjon gjorde at hvem som helst kunne sette `X-Forwarded-For` og få ny IP per forespørsel. Det omgikk rate limit, også 5/min på login (verifisert: 7 feil-forsøk ga 7 × 401, ingen 429). | Ny `TRUST_PROXY` (standard `loopback` i produksjon, av i utvikling). Test i `apps/api/test/api.test.ts`. | Fikset |
| 2 | Middels | `apps/mobile/src/storage.ts` → `packages/shared/src/net.ts:5` | Prefiks-regex på vertsnavnet godtok `http://localhost.evil.com`, `http://10.evil.com` og `http://192.168.1.10.evil.com` som «lokale». Da kunne tokenet sendes i klartekst til en offentlig vert. | Streng sjekk av `localhost` og hele private IPv4-adresser i `isLocalHost`/`validateApiUrl` (delt, testet). Avviser også brukernavn/passord i URL. | Fikset |
| 3 | Lav | `apps/api/src/app.ts:19` | `new URL(origin)` kastet på `Origin: null` eller ugyldig origin og ga 500 i stedet for 403. Ikke en omgåelse, men feil kode og støy i loggen. | `sameHost()` med try/catch. Test lagt til. | Fikset |
| 4 | Middels | `scripts/check-secrets.mjs:16` | Skanneren kjente ikke Discord-, Microsoft- eller Expo-tokens, og fanget ikke ekte `.env`-verdier limt inn i f.eks. docs. | Nye mønstre, og sammenligning mot verdiene i lokal `.env` uten å skrive dem ut. | Fikset |
| 5 | Middels | `apps/api/src/lib/http.ts:50`, `.env` | Refresh-tokens (Google/Microsoft) ligger i klartekst i `.env`. Microsofts roterte refresh-token holdes bare i minnet, så ved omstart brukes en gammel token. | Kryptert token-lagring (f.eks. AES-GCM med nøkkel fra OS-keychain eller egen `TOKEN_ENC_KEY`), med rettighet 600. | Åpen |
| 6 | Lav | `apps/api/src/lib/auth.ts:11`, `apps/api/src/routes/api.ts:25` | Sesjonen er tilstandsløs: logout sletter bare cookien, en stjålet cookie virker i opptil 30 dager. | Bytt `DASHBOARD_TOKEN` for å ugyldiggjøre alle sesjoner. Vurder kortere TTL eller en sesjons-generasjon i `store.json`. | Akseptert |
| 7 | Lav | `apps/api/src/lib/http.ts:30` | `fetchText` leser hele svaret før størrelsesgrensen på 2 MB sjekkes. En ondsinnet RSS-feed kan bruke mye minne. | Sjekk `content-length` og les strømmen med grense. Feeds settes bare av eieren i `.env`. | Akseptert |
| 8 | Lav | `apps/api/src/config.ts:71`, `apps/api/src/connectors/updates.ts:61` | `NEWS_FEEDS` er ikke begrenset til `https://`, og fetch følger redirects (SSRF mot interne adresser er mulig, men bare satt av eieren). | Krev `https://` og `redirect: 'error'` eller sjekk mål-IP. | Åpen |
| 9 | Lav | `packages/shared/src/schemas.ts:22` (og 38, 50, 59, 88) | `url`-feltene valideres ikke som http(s) i kontrakten. Web og mobil filtrerer selv før de lager lenker. | Legg til `z.string().url()` med http(s)-sjekk som forsvar i dybden (husk at ugyldige elementer da droppes). | Åpen |
| 10 | Lav | `apps/api/src/app.ts:48` | CSP tillater `style-src 'unsafe-inline'` (React inline-stiler). | Akseptabelt så lenge `script-src` er streng. | Akseptert |
| 11 | Lav | `apps/api/src/agents/varsler.ts:38` | Expo push sendes uten access token. Den som får tak i et push-token kan sende varsler til telefonen. | Slå på «Enhanced push security» i Expo og send `Authorization: Bearer <EXPO_ACCESS_TOKEN>`. | Åpen |
| 12 | Lav | `apps/mobile/src/notifications.ts:23` | Alarm-kanalen viser varselet på låseskjermen (`PUBLIC`), inkludert alarmens etikett. | Bevisst valg for alarm. Ikke legg private ting i etiketten. | Akseptert |
| 13 | Lav | `README.md:31` | `HOST=0.0.0.0` i utvikling gjør API-et tilgjengelig for hele LAN-et over http, og mobilen sender tokenet i klartekst der. | Bare på hjemmenett i utvikling. Bruk https (reverse proxy eller tunnel) ellers. Release-bygg blokkerer klartekst-http som standard. | Akseptert |
| 14 | Lav | `apps/api/src/lib/store.ts:35`, `:59` | Korrupt `store.json` erstattes stille med standardverdier ved neste lagring. «For mange alarmer» gir 500 i stedet for 400. | Logg og ta vare på den korrupte filen. Sett `statusCode: 400` på feilen. | Åpen |
| 15 | Middels* | `package-lock.json` (Expo/React Native) | `npm audit`: 22 funn (15 høy, 7 middels), alle i Expo/Metro/React Native-verktøykjeden: `braces` ≤3.0.3 (ReDoS/stack-overflow via mønstre, GHSA-vfj7-8cjw-p6xm), `node-forge` ≤1.4.0 (RSA-signaturverifisering, GHSA-86w9-cpqp-85rv, brukes til Expo code signing i CLI) og `uuid` <11.1.1 (buffer-sjekk, GHSA-w5hq-g745-h8pq, via `xcode`). | Ingen rettet versjon; «fix» er en nedgradering til expo@44 og er feil. Dette er byggeverktøy som kjører lokalt på egne filer, og ingen av pakkene er med i API-et eller web-bundelen (`npm ls --omit=dev` i `@life/api` har ingen av dem). *Reell risiko vurdert som lav. Følg med på Expo-oppdateringer og kjør `npm audit` igjen. | Akseptert |

Ingen kritiske eller høye funn i egen kode. Ingen hemmeligheter, ekte personopplysninger eller lokale data blir med i git (sjekket med `git add -n .`, `git check-ignore` og skann mot `.env`). Repoet har ingen commits, så git-historikken er ren.

OAuth: appen har ingen innebygd OAuth-flyt ennå (refresh-tokens hentes manuelt med read-only scopes). Når en flyt legges til: PKCE, `state`, minst mulig scopes, og aldri tokens i localStorage.

## Sjekkliste før push

- [ ] `node scripts/check-secrets.mjs` er grønn.
- [ ] `git status --short` og `git add -n .` viser ingen `.env`, `data/`, `store.json`, `dist/`, `.expo/`, skjermbilder eller logger.
- [ ] `git diff --cached` er lest gjennom: ingen ekte navn, e-poster, meldinger eller tokens (heller ikke i docs, tester eller `.claude/`).
- [ ] Demo-data og tester bruker bare fiktive personer og `@example.com`.
- [ ] `npm run typecheck` og `npm test` er grønne.
- [ ] `npm audit`: ingen nye funn utenfor de aksepterte Expo-verktøyene.
- [ ] Hvis et token noen gang har vært committet: roter det hos leverandøren (en ny commit fjerner det ikke fra historikken).
- [ ] Vurder å slå på GitHub secret scanning og push protection i repoet.

## Sjekkliste før produksjon

- [ ] **HTTPS overalt.** Kjør API-et bak en reverse proxy (Caddy eller nginx) med gyldig sertifikat. `NODE_ENV=production` gir `Secure`-cookie og HSTS.
- [ ] **Reverse proxy:** API-et lytter på `127.0.0.1` (standard `HOST`). Proxyen setter `X-Forwarded-For`. Kjører proxyen på en annen maskin, sett `TRUST_PROXY` til proxyens IP/CIDR, aldri `true`.
- [ ] Proxyen begrenser body-størrelse, har timeouts og videresender ikke `/api` til noe annet.
- [ ] `CORS_ORIGINS` inneholder bare din egen web-origin (https).
- [ ] Ny `DASHBOARD_TOKEN` for produksjon (`npm run setup` eller `openssl rand -base64 32`), ikke den fra utvikling.
- [ ] `.env` og `DATA_DIR` har rettighet 600/700 og eies av en egen, ikke-privilegert bruker.
- [ ] Alle tokens er read-only og med minst mulig tilgang (GitHub: kun Notifications; Discord: bare lese-kanaler).
- [ ] `PUSH_INCLUDE_CONTENT` er `false` med mindre du godtar at emnelinjer går via Expo/Apple/Google.
- [ ] Logger: nivå `info`, roteres, og inneholder ingen tokens (sjekk et utvalg etter første døgn).
- [ ] **Backup:** `DATA_DIR/store.json` og `.env` tas med i kryptert backup. Test gjenoppretting. Backup lagres ikke i git eller i ukryptert sky.
- [ ] Brannmur: bare 443 (og 80 for redirect) er åpne. API-porten 8787 er ikke eksponert.
- [ ] Oppdateringer: Node LTS og `npm audit` jevnlig. Plan for å rotere tokens hvis serveren kompromitteres.
- [ ] Mobil: release-bygg peker på `https://`-adressen. Vurder Expo «Enhanced push security».
