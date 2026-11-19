# Gjeldsbok

En privat logg over hvem som skylder deg penger, hvem du skylder, og
overføringer mellom dere. Siden publiseres som en Artifact på claude.ai, og
dataene ligger i Artifactens database, slik at samme logg vises på mobil og PC.

- Design i Figma: https://www.figma.com/design/Qj17TNPI6KFpSWHC0JxgDz
- Design i Framer: https://framer.com/projects/lCaZo5KidDVRkzbKua5e (siden «Gjeldsbok · iPhone»)
- Kode: `index.html` (én fil, ingen byggesteg)
- Stil: Apple-inspirert med Liquid Glass og egne farger («Lyng»-lilla aksent), Figma-siden «Glass · eget design». Glass brukes bare i
  navigasjonslaget (fanelinje, knapper, ark), etter skillene `apple-liquid-glass`,
  `apple-typography` og `apple-design-system` i `.claude/skills/`
  (fra rshankras/claude-code-apple-skills, MIT).

## To typer poster

| Type       | Retning | Betyr                         | Effekt på saldo |
| ---------- | ------- | ----------------------------- | --------------- |
| Skylder    | inn     | Personen skylder meg          | +               |
| Skylder    | ut      | Jeg skylder personen          | −               |
| Overføring | ut      | Jeg sendte penger til personen | +              |
| Overføring | inn     | Personen sendte penger til meg | −              |

Positiv saldo betyr at personen skylder deg. Et lån du sender med Vipps føres
bare som én overføring ut. Da skylder personen deg beløpet.

## Logging

- `loggedAt` settes til klokkeslettet i det posten lagres, og endres aldri.
  Det vises i norsk tid (Europe/Oslo).
- Ingenting slettes. Endringer legges til i `history` med tidspunkt og hva som
  ble endret (gammel og ny verdi). Annullerte poster blir stående, men teller
  ikke i saldoen, og kan gjenopprettes.

## Datamodell

```
people/{id}   { name, createdAt }
entries/{id}  { kind: "debt" | "transfer", dir: "in" | "out", personId,
                amountOre, reason, method: "vipps" | "bank" | "kontant" | "annet" | null,
                loggedAt, status: "active" | "void",
                history: [{ at, action: "created" | "edited" | "voided" | "restored",
                            snapshot?, changes? }] }
```

Beløp lagres som heltall i øre, for å unngå avrundingsfeil.

## Tilgang

Databasereglene gir bare eieren av Artifacten tilgang til å lese og skrive
(`{ path: "", read: "owner", write: "owner" }`). Deler du lenken, ser andre en
tom, låst side.
