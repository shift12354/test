# Nordlys: designnotater

## Oppdraget

Nordlys er et lite nettstudio i Tromsø (oppdiktet). Kundene er små bedrifter i
Nord-Norge: guider, sjømatprodusenter, ferjeselskap, kulturhus. Mange av dem
lever av lyset: nordlysturer i mørketida, fjellturer i midnattssola. Sidens jobb
er å få dem til å booke en prat, ved å vise at studioet kjenner hverdagen deres.

## Det ene minneverdige

Hero-en er dagslyset i Tromsø gjennom året: 365 søyler, én per dag, med høyde
etter antall timer dagslys. Du drar i året og ser når sola står opp og går ned.
Himmelen bak skifter farge med lyset. Ved lasting starter markøren på
21. desember (ingen sol) og glir fram til i dag. Det er sidens eneste
bevegelse som ikke kommer fra brukeren.

Alt annet er stille: venstrejustert tekst, ingen inngangsanimasjoner per seksjon,
ingen dekor.

## Farger

| Navn     | Hex       | Bruk                                            |
| -------- | --------- | ----------------------------------------------- |
| Mørketid | `#172038` | Tekst på lys side, bakgrunn i mørk modus        |
| Blåtime  | `#3E5683` | Lenker, sekundærflater                          |
| Snø      | `#EEF1F4` | Bakgrunn i lys modus, tekst i mørk modus        |
| Rim      | `#DCE2E9` | Flater og skillelinjer på lys side              |
| Lavsol   | `#F2B84B` | Sola i hero-en og hovedknappen, ingenting annet |

Himmelen i hero-en blandes fra mørketid (blå skumring) via lav sol til lys
sommernatt, styrt av hvor mange timer dagslys datoen har.

## Typografi

Schibsted Grotesk, én familie. Den er tegnet i Norge for Schibsteds aviser og
har æ, ø og å som ser ut som de hører hjemme. Skala etter Bringhurst:
14, 18, 24, 36, 48 og 72+ px. Tallene i hero-en (klokkeslett) bruker
tabellsifre. Brødtekst holdes under 65 tegn per linje.

## Layout

```
| Nordlys            Arbeid  Priser  Om oss    ☾  [Book en prat] |
|                                                              |
| Tromsø, 10. oktober.                                         |
| Sola står opp kl. 07.53                                      |
| og går ned kl. 17.31.                                        |
|                                                              |
| ▁▁▂▃▄▅▆▇██████████▇▆▅▄▃▂▁▁   ← dra                           |
| jan feb mar apr mai jun jul aug sep okt nov des   [I dag]    |
|                                                              |
| Mange av kundene våre lever av lyset …   [Book en prat]      |
|--------------------------------------------------------------|
| Noe av det vi har laget          [kort][kort][kort] →        |
| Slik jobber vi                   Uke 1 / Uke 2 til 4 / …     |
| Hva det koster                   liste med fastpriser        |
| Om oss                           kort avsnitt                |
| Ta kontakt                                                   |
```

Alt er venstrejustert. Seksjonene har overskrift i venstre kolonne og innhold
til høyre på brede skjermer, og stables på mobil.

## Prinsipper

- Lyset er innholdet. Farge og bevegelse brukes bare der de forteller noe om
  dagslys eller svarer på det brukeren gjør.
- Struktur skal bety noe. Ukenummer i prosessen fordi det er en tidslinje,
  priser som en liste fordi de sammenlignes.
- Tekst skal være konkret og sagt rett ut: hva vi lager, for hvem, hva det
  koster.

## Gjennomgang av planen mot oppdraget

Det jeg ville laget for et hvilket som helst studio, og som er endret:

- Gradienttekst på logoen og stor tittel midt på siden. Erstattet av en
  venstrejustert setning med dagens soltider, som bare passer i Tromsø.
- Grå fliser med store tall («38 ms», «112 byer»). Fjernet. Tallene var
  generiske og sa ingenting om kundene.
- Månedspriser i tre kort med «Mest valgt». Det er en SaaS-mal, og et studio
  selger prosjekter. Nå er det fastpriser i en liste.
- Små etiketter over hver overskrift, store bokstaver i kortene, piler og
  midtprikker i lenker og bunntekst. Fjernet.
- Inntoning av hver seksjon. Fjernet. Den eneste automatiske bevegelsen er
  markøren i hero-en ved lasting.
- Nordlysgrønt som aksent var det åpenbare valget for et studio som heter
  Nordlys. Aksenten er i stedet den lave vintersola, fordi det er den
  kundene venter på.

## Ting jeg har prøvd

- Versjon 1: Magic UI med aurora-tekst, partikler og bento-rutenett.
- Versjon 2: Apple-stil med systemfont, grå fliser og fjærbevegelse.
- Versjon 3 (denne): dagslyset som konsept. Fjærene, karusellen og kontaktarket
  fra versjon 2 er beholdt fordi de svarer på brukerens handlinger.
