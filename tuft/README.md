# Tuft

Tegn huset i 2D – vegger, rom, dører, vinduer, møbler, elektro og rør – og se det i 3D med en gang.

```bash
cd tuft
npm install
npm run dev              # http://localhost:5173
npm run build            # vanlig produksjonsbygg i dist/
npm run build:artifact   # én selvstendig HTML-fil i dist-single/ (brukt på claude.ai)
```

Designet ligger i Figma-filen «Tuft – husplanlegger» (sidene Prinsipper, Designsystem og Skjermer).
Fargene og typografien i `src/styles.css` er de samme som variablene der.

## Hva du kan gjøre

- **Rom og vegger.** Dra et rom (R), eller klikk hjørne for hjørne. Veggene kommer automatisk:
  30 cm yttervegg og 12 cm innervegg. Vegg-verktøyet (W) tar lengde fra tastaturet: skriv `350` og trykk Enter.
- **Dører og vinduer** settes inn på en vegg og dras langs den. Slagretning og hengsel byttes i panelet til høyre.
- **Bibliotek** med rundt 70 ting i vanlige norske mål: møbler, kjøkken, bad, elektropunkt og VVS.
  Klikk for å plassere, eller dra rett inn i planen. Veggpunkt fester seg til veggen.
- **Rør og kabler** (P): kaldt, varmt, avløp, vannbåren varme, el og data. Låses til 45°.
- **Kurser**: hvert elektrisk punkt kan få en kurs. Listen viser punkter og belastning.
- **Sjekk** mot TEK17, brannforskriften og vanlig praksis etter NEK 400: røykvarsler i hver etasje,
  vindu i oppholdsrom, sluk i våtrom, stikkontakter for nær dusj, rør som mangler, overbelastede kurser.
- **Lister**: romareal, materialliste med grovt prisestimat (CSV) og kursliste.
- **3D**: bane-kamera, «Gå»-modus (WASD), snitt i brysthøyde, røntgen for rør og kabler,
  sol etter klokkeslett og lamper som lyser.
- **Etasjer**: legg til en etasje over. Ytterveggene kopieres opp, og etasjen under vises som skygge.
- **Tak og fasade**: saltak, valmtak, pulttak eller flatt tak med vinkel, utstikk og tekking
  (betong, tegl, shingel, stål, torv). Kledning stående, liggende, puss eller tegl, farge på
  listverk og synlig grunnmur.
- **Plantegning under**: legg inn et bilde eller en PDF per etasje, klikk to punkter med kjent
  avstand og skriv lengden, så får tegningen riktig målestokk. Tegn veggene oppå.
- **Produkter fra IKEA, Elkjøp og Byggmakker** kan velges for møbler, hvitevarer, gulv, tak,
  kledning, dører og vinduer. Materiallisten viser sum per butikk. Prisene er sjekket i
  november 2026 der vi fant en norsk kilde (se `src/model/products.ts`); ellers lenker
  produktet til butikken.
- **Prosjekter og deling** (når Tuft er åpnet på claude.ai): «Mine» lagres privat i skyen,
  «Delt med andre» kan åpnes og endres av alle Tuft er delt med som bidragsyter. Endringer
  vises hos de andre med en gang, og du ser hvem som er inne. Utenfor claude.ai lagres
  prosjektet i nettleseren.
- Prosjektet kan også lagres og åpnes som `.json`, eller kopieres og limes inn som tekst.

## Snarveier

| Tast | | Tast | |
| --- | --- | --- | --- |
| V | Velg og flytt | D | Dør |
| H / mellomrom | Panorer | N | Vindu |
| R | Rom | F | Møbler |
| W | Vegg | E | Elektro |
| P | Rør | M | Mål |
| Q / Shift+Q | Roter 90° / 15° | Ctrl+D | Dupliser |
| Delete | Slett | Ctrl+Z / Ctrl+Shift+Z | Angre / gjør om |
| 1 / 2 / 3 | 2D / delt / 3D | 0 | Tilpass visningen |

Shift mens du tegner skrur av festing og vinkellås.

## Kode

- `src/model/` – datamodell (alle mål i cm), katalog, geometri, eksempelhuset, sjekker og lister.
- `src/editor/Plan2D.tsx` – plantegningen i SVG: verktøy, festing, dra, håndtak, mål.
- `src/editor/symbols.tsx` – plansymboler for møbler, elektro og VVS.
- `src/view3d/` – 3D med React Three Fiber: vegger med åpninger, gulv med teksturer tegnet i kode,
  møbler bygd av enkle former, rør som tuber, sol og lamper.
- `src/store/store.ts` – tilstand med angre/gjør om og autolagring.
- `src/cloud/` – skylagring, deling og tilstedeværelse (claude.ai-funksjonene `db`, `user`,
  `room` og `downloads`), og lagring av filer.
- `src/view3d/roof.tsx` – tak og gavler. `src/ui/Underlay.tsx` – bilde/PDF under planen (pdf.js).
- `src/ui/` – toppfelt, verktøylinje, bibliotek, egenskapspanel, lister og sjekk.

Sjekkene er tommelfingerregler. Elektrisk anlegg skal prosjekteres og bygges av registrert
elektroinstallatør, og våtrom bør bygges etter Byggebransjens våtromsnorm.
