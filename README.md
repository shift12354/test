# Moen Trebåtbyggeri – 3D-konsept

Et uoffisielt konseptforslag til nettside for **Moen Trebåtbyggeri AS** (org.nr. 987 795 603). Verftet ligger ved båtbyggeriene på Moen i Risør. Bedriften er bare på Facebook og har ingen egen nettside.

Siden er en scrollfortelling i 3D, bygd med three.js:

| Seksjon | Hva skjer i 3D |
|---|---|
| Topp | En hvit, klinkbygd snekke står på slippen ved fjorden |
| Håndverket | Skroget tas fra hverandre og bygges opp igjen, én bordgang om gangen |
| Tjenester | Kameraet går over til naustet med vinteropplag |
| Historien | Oversiktsbilde over verftsområdet langs fjorden |
| Kontakt | Båten er sjøsatt og flyter på fjorden |

Siden har tema for dag og blåtime (lyst og mørkt). Den tar hensyn til `prefers-reduced-motion` og viser en enkel reserve hvis WebGL ikke er tilgjengelig.

## Kjøre lokalt

```sh
npx http-server . -p 8080
# åpne http://localhost:8080
```

ES-moduler krever en lokal server, så siden virker ikke fra `file://`.

## Struktur

- `index.html`: innhold og struktur
- `styles.css`: temaet "Kalk og tjære" (se `docs/tema-kalk-og-tjaere.md`)
- `src/scene.js`: 3D-scenen (prosedyrisk båt, slipp, naust, fjord)
- `src/main.js`: kobler scroll, tema og pekerbevegelser til scenen
- `vendor/three.module.min.js`: three.js r170 (MIT)
- `fonts/`: lokale fonter (SIL OFL)

## Merk

Opplysningene er hentet fra offentlige kilder (Enhetsregisteret, Proff, båtkataloger og lokalhistorie). De må kontrolleres med bedriften før siden eventuelt tas i bruk.
