# Idébank – Life Dashboard

> Eier: Idémakeren · Sist oppdatert: 2026-10-09 · Status: v1 er et skjelett med demodata. Ingen ekte integrasjoner ennå.

Life Dashboard er en personlig app for **én** bruker: native app (Expo), web (React/Vite) og et Fastify-API. Den henter fra Gmail, Google Kalender, Outlook/M365, Slack, Discord, Telegram, NRK RSS, MET/yr og GitHub. Agentene er foreløpig regelbaserte: **innboks**, **gått glipp av**, **morgenbrief** og **alarm**.

**Skala**
- **Verdi:** 1 (kjekt å ha) til 5 (endrer hverdagen)
- **Innsats:** S = dager, M = 1–2 uker, L = mer enn 2 uker eller avhengig av ekstern avtale
- **Personvern:** lav = offentlige data eller metadata · middels = innhold fra egne kontoer, lagret lokalt · høy = sensitive data (helse, økonomi, andre personer) eller data som forlater enheten/serveren
- ⚠️ = krever data som er vanskelig eller ulovlig å hente. Se [egen seksjon](#vanskelige-eller-ulovlige-datakilder).

---

## 1. Morgen: alarm og morgenbrief

| # | Idé | Hva den gjør | Verdi | Innsats | Personvern |
|---|-----|--------------|:-----:|:-------:|:----------:|
| 1 | **Smart vekking** | Alarmen flyttes innenfor et vindu brukeren velger (f.eks. 06:30–07:15), ut fra første møte, reisetid og vær. Eksempel: snø og møte kl. 08 gir vekking 15 min tidligere. | 5 | M | lav |
| 2 | **Morgenbrief på 30 sekunder** | Fast rekkefølge: vær → første avtale → 3 viktigste mail → det du gikk glipp av i går kveld → én nyhet. Kan skummes på låseskjermen. | 5 | S | middels |
| 3 | **Morgenbrief lest opp** | Talesyntese på enheten (iOS/Android TTS) som spilles av når alarmen skrus av. Ingen sky-TTS. | 4 | S | lav |
| 4 | **«Kle deg for været»** | Én linje: «Regn fra 15:00. Ta med paraply.» Bruker yr-nowcast og timesvarsel. | 3 | S | lav |
| 5 | **Pendlerstatus** | Avganger og forsinkelser for hjemmeruten via Entur (åpent API). Varsler bare ved avvik. | 4 | M | lav |
| 6 | **Slumre med betingelse** | Slumring tillates bare hvis første avtale er senere enn X. Ellers sier alarmen hvorfor den ikke gir deg mer tid. | 3 | S | lav |
| 7 | **Helgemodus** | Ingen alarm og ingen jobbkilder lørdag–søndag, og egne regler for helligdager (norsk helligdagskalender). | 4 | S | lav |
| 8 | **Farevarsel-vekking** | MET-farevarsel (gult/oransje/rødt) for hjemsted eller reisemål løftes øverst i briefen. | 3 | S | lav |

## 2. Dagtid: mail, meldinger og kalender

| # | Idé | Hva den gjør | Verdi | Innsats | Personvern |
|---|-----|--------------|:-----:|:-------:|:----------:|
| 9 | **Varslingsbudsjett / fokusvakt** | Maks N push-varsler per dag. Alt annet samles i bunter, f.eks. kl. 10, 13 og 16. Bare VIP-avsendere og «haster» slipper gjennom. | 5 | M | lav |
| 10 | **«Venter på svar»** | Mail og Slack-meldinger du har sendt uten å få svar på innen X dager, med knapp for å purre. | 5 | M | middels |
| 11 | **Møteforberedelse** | 10 min før et møte: deltakere, siste mail og Slack-tråder med dem, og lenker fra invitasjonen. Matcher regelbasert på e-postadresse. | 5 | M | middels |
| 12 | **Kalendervakt** | Varsler om dobbeltbooking, møter rygg-i-rygg uten pause, eller møter uten agenda. Viser også ledige fokusblokker. | 4 | S | lav |
| 13 | **Samlet innboks på tvers** | Én liste for Gmail, Outlook, Slack-DM, Discord-DM og Telegram, sortert etter innboks-agentens score. | 4 | M | middels |
| 14 | **VIP-liste** | Brukeren merker personer eller kanaler som alltid er viktige. Det gir rask og forklarbar prioritering i regelmotoren. | 4 | S | middels |
| 15 | **«Hvorfor ser jeg dette?»** | Hvert kort viser regelen som slo inn, f.eks. «VIP-avsender + nevnt deg + frist i dag». Bygger tillit til agentene. | 4 | S | lav |
| 16 | **Nyhetsbrev-rydder** | Finner avsendere du aldri åpner og foreslår å avslutte abonnementet. Brukeren klikker selv. | 3 | S | middels |
| 17 | **GitHub-kø** | PR-er som venter på din review, feilende CI på egne repoer og nevnte issues. Samles i én bunt. | 4 | S | lav |
| 18 | **Pakkesporing fra mail** | Finner sporingsnumre (Posten/Bring, PostNord, Helthjem) i mail og viser status og hentested. | 3 | M | middels |
| 19 | **Utendørs-plan + vær** | Kalenderhendelse med ord som «tur», «fotball» eller «grilling» kombinert med regnvarsel gir et varsel dagen før. | 3 | S | lav |
| 20 | **Fly og reise** | Fanger opp flybekreftelser i mail og viser gate og forsinkelser (Avinor flydata) samt været på destinasjonen. | 3 | M | middels |

## 3. Kveld og refleksjon

| # | Idé | Hva den gjør | Verdi | Innsats | Personvern |
|---|-----|--------------|:-----:|:-------:|:----------:|
| 21 | **Kveldsbrief «i morgen»** | Kl. 21: første avtale i morgen, hva som må forberedes, foreslått alarmtid og værvarsel. | 5 | S | lav |
| 22 | **Avslutt arbeidsdagen** | Knapp som demper jobbkilder (Slack, Outlook, GitHub) til neste morgen og viser hva som er utestående. | 4 | S | lav |
| 23 | **Ukesoppsummering søndag** | Antall møter, mail besvart, ting du gikk glipp av, og neste ukes travleste dag. | 3 | S | lav |
| 24 | **«Gått glipp av» med angre** | Kort kan sveipes som «sett», «utsett til i morgen» eller «ikke vis slike igjen». Det siste blir en ny regel. | 4 | S | lav |

## 4. Helse, familie, økonomi og hjem

| # | Idé | Hva den gjør | Verdi | Innsats | Personvern |
|---|-----|--------------|:-----:|:-------:|:----------:|
| 25 | **Søvn → alarm** | Leser søvndata fra Apple Health eller Health Connect **på enheten** og foreslår tidligere leggetid ved lite søvn. Ingenting sendes til API-et. | 4 | M | høy |
| 26 | **Familiekalender-lag** | Delt Google-kalender (henting, aktiviteter) vises som eget lag med egen farge, og kan gi egne alarmer. | 4 | S | middels |
| 27 | **Bursdager og relasjoner** | Bursdager fra kontakter og kalender. Eventuelt «du har ikke snakket med X på 60 dager» for personer brukeren velger selv. | 3 | S | middels |
| 28 | **Regninger fra mail** | Finner forfallsdato og beløp i e-faktura- og kvitteringsmail og varsler 3 dager før forfall. Ingen bankkobling. | 4 | M | høy |
| 29 | **Strømpris** | Timepris for eget prisområde (NO1–NO5) og beste tidspunkt for vaskemaskin eller lading. Offentlige data. | 3 | S | lav |
| 30 | **Søppeltømming** | Neste henting (rest, papir, plast) fra kommunens åpne data der det finnes, ellers manuelt oppsett. | 2 | S | lav |
| 31 | **Pollen- og luftkvalitet** | Luftkvalitet fra MET/NILU og pollenvarsel i morgenbriefen for allergikere. | 2 | S | lav |
| 32 | **Bank / forbruk** ⚠️ | Saldo og varsler om uvanlige trekk. Krever PSD2 via en lisensiert aggregator. | 3 | L | høy |
| 33 | **Helsenorge-påminnelser** ⚠️ | Timer hos lege eller tannlege. Det finnes ikke noe personlig API. | 3 | L | høy |

## 5. Plattform, tillit og personvern

| # | Idé | Hva den gjør | Verdi | Innsats | Personvern |
|---|-----|--------------|:-----:|:-------:|:----------:|
| 34 | **Personvernpanel «Hva vet appen?»** | Viser per kilde hva som er lagret, hvor lenge det lagres, og knapper for å slette eller koble fra. Inkluderer en «slett alt»-knapp. | 5 | M | lav (reduserer risiko) |
| 35 | **Kildehelse** | Status per integrasjon: OK, token utløper om 3 dager, rate-limit eller feil. Varsler før noe slutter å virke. | 4 | S | lav |
| 36 | **Kun metadata som standard** | Agentene jobber på avsender, emne og tidspunkt. Innhold i meldingen leses bare når brukeren slår det på per kilde. | 4 | M | lav (reduserer risiko) |
| 37 | **Widgets og klokke** | Låseskjerm- og hjemskjermwidget (iOS/Android) med neste avtale, antall viktige mail og vær. Senere også Wear OS/watchOS. | 4 | M | middels |
| 38 | **Offline-modus** | Siste brief og kalender caches kryptert på enheten, slik at alarmen og briefen virker uten nett. | 4 | M | middels |
| 39 | **Hurtig-fangst** | Del-meny (share sheet) og en Telegram-bot til ditt eget API for å legge inn notater eller oppgaver fra hvor som helst. | 3 | S | lav |
| 40 | **Globalt søk** | Ett søk på tvers av mail, Slack, Discord, Telegram og kalender, mot en lokal indeks. | 4 | L | middels |

## 6. Ville ideer

| # | Idé | Hva den gjør | Verdi | Innsats | Personvern |
|---|-----|--------------|:-----:|:-------:|:----------:|
| 41 | **Lysvekking** | Smartlys (Hue/Home Assistant) dimmes opp 15 min før smart vekking. | 3 | M | lav |
| 42 | **Stressbarometer** | Dagsscore ut fra antall møter, ubesvarte mail og varsler. Foreslår å avlyse eller flytte noe. | 3 | M | middels |
| 43 | **«Fremtids-meg»** | Skriv en melding til deg selv som dukker opp i en bestemt brief, f.eks. «før neste lønnssamtale». | 2 | S | lav |
| 44 | **Pendler-podcast** | Briefen blir en lydfil på 3 min som legges i køen før du går ut døra (TTS på enheten). | 3 | M | lav |
| 45 | **Reisemodus** | Oppdager automatisk at du er i en annen tidssone. Da justeres alarmen, jobbvarsler dempes og briefen viser lokalt vær. | 3 | M | middels |

---

## Nye agenter i appen

Forslagene passer inn i samme mønster som de fire eksisterende agentene: **trigger → regler → kort/varsel**. Alle kan lages regelbasert nå og få «AI-hjerne» senere uten at grensesnittet endres.

| Agent | Trigger | Input | Output | Verdi | Innsats | Personvern |
|-------|---------|-------|--------|:-----:|:-------:|:----------:|
| **Fokusvakt** (varslingsbudsjett) | Hver innkommende hendelse | Score fra innboks-agenten, VIP-liste, kalender (opptatt/fokus) | Slipper gjennom, legger i bunt eller demper. Daglig budsjett. | 5 | M | lav |
| **Oppfølgingsagent** («venter på svar») | Daglig kl. 09 | Sendt-mappe (Gmail/Outlook), Slack-DM | Liste over tråder uten svar etter X dager, med purreknapp | 5 | M | middels |
| **Møteforberedelsesagent** | 10 min før hver avtale | Kalender, mail/Slack filtrert på deltakere | Forberedelseskort med personer, siste tråder og lenker | 5 | M | middels |
| **Kveldsagent** | Kl. 21 (kan justeres) | Morgendagens kalender, vær, reisetid | «I morgen»-kort og forslag til alarmtid til alarm-agenten | 5 | S | lav |
| **Pendleragent** | 60 min før første avtale med sted | Kalender (sted), Entur, yr | «Gå om 12 min» eller avviksvarsel | 4 | M | lav |
| **Kalendervakt** | Ved kalenderendring | Kalender (Google + Outlook) | Konflikter, mangel på pause, forslag til fokusblokker | 4 | S | lav |
| **GitHub-agent** | Webhook / hver time | GitHub (PR-er, CI, mentions) | Samlet review-kø og CI-feil, bundet til fokusvakten | 4 | S | lav |
| **Kildehelseagent** | Hver time | Token-status og feillogg per integrasjon | Varsel før en kilde slutter å virke | 4 | S | lav |
| **Regningsagent** | Ny mail | Mail fra kjente fakturaavsendere (regex for forfall, KID, beløp) | Forfallsliste og varsel 3 dager før | 4 | M | høy |
| **Pakkeagent** | Ny mail | Sporingsnumre i mail, sporings-API | Pakkestatus og «klar til henting» | 3 | M | middels |
| **Ukesagent** | Søndag kl. 18 | Statistikk fra de andre agentene | Ukesoppsummering og neste ukes travleste dag | 3 | S | lav |
| **Ryddeagent** | Ukentlig | Mailmetadata (åpnet/ikke åpnet per avsender) | Forslag om å avslutte abonnement eller arkivere | 3 | S | middels |
| **Relasjonsagent** | Daglig | Kontakter (bursdag) og en liste brukeren lager selv | Bursdagspåminnelser og «ta kontakt med …» | 3 | S | middels |
| **Vær-for-planer-agent** | Kl. 18 dagen før | Kalender (nøkkelord, sted) og yr | «Regn i morgen kl. 17 – fotballtrening» | 3 | S | lav |

**Prinsipper for alle agenter**
- Hver agent har en av/på-bryter og en «hvorfor?»-forklaring på hvert kort.
- Agentene leser bare kildene de har bruk for (minste tilgang).
- Agentene kan *foreslå*, men aldri *sende*, *slette* eller *svare* på egen hånd.

---

## Vanskelige eller ulovlige datakilder

| Kilde | Problem | Alternativ |
|-------|---------|------------|
| **iMessage** ⚠️ | Apple har ikke noe API. Uthenting krever en Mac-relay eller reverse engineering, som er i strid med vilkårene og ustabilt. | Bruk iOS Snarveier/Automatisering til å sende «ny melding fra X» (bare metadata) til ditt eget API. Eller flytt viktige samtaler til Telegram. |
| **SMS** ⚠️ | Umulig på iOS. Android krever SMS-tillatelse, som Google Play i praksis avviser for slike apper. | Sideloadet Android-bygg med `NotificationListener` på enheten (bare for din egen enhet). Eller videresend SMS til mail med en operatørtjeneste eller Snarveier. |
| **WhatsApp** ⚠️ | Det finnes ikke noe personlig API. Business API er for bedrifter, og skraping eller uoffisielle klienter bryter vilkårene og kan gi utestengelse. | Varsellytter på Android (på enheten, bare metadata). Eller vis manuelt en «sjekk WhatsApp»-påminnelse når du har vært offline lenge. |
| **Messenger / Instagram DM** ⚠️ | API-et finnes bare for bedriftssider. | Som for WhatsApp: bare varsler, ikke innhold. |
| **Snapchat / LinkedIn-meldinger** ⚠️ | Ingen API for private meldinger. | E-postvarslene fra tjenesten kan fanges opp av innboks-agenten. |
| **Vipps** ⚠️ | Ingen API for privatpersoner. | Kvitteringer på mail kan leses av regningsagenten. |
| **Bank** ⚠️ | Lovlig via PSD2, men krever en lisensiert aggregator (avtale, kostnad, BankID-samtykke hver 180. dag). | Start med e-faktura- og kvitteringsmail. Vurder PSD2 senere. |
| **Helsenorge / Digipost / e-Boks** ⚠️ | Ingen personlige API-er. | De sender varsel på mail eller SMS («Du har fått ny melding»), som kan fanges opp som metadata. |
| **Spond / Vigilo / Skolearena** ⚠️ | Ingen offisielle åpne API-er. Uoffisielle klienter bryter ofte vilkårene. | Abonner på iCal-eksport der den finnes, eller bruk e-postvarslene. |

**Felles mønster:** mange tjenester sender **e-postvarsler**. En god «varsel-mail-parser» i innboks-agenten gir dekning for mange kilder uten skraping.

---

## Når vi legger til AI

**Grunnregler (gjelder før første AI-funksjon slås på)**
1. **Opt-in per kilde og per funksjon.** Ingen data sendes til en AI-tjeneste uten at brukeren har slått det på.
2. **Lokalt først.** Bruk modell på enheten eller selvhostet modell der det holder (klassifisering, embeddings). Sky bare for tunge oppgaver.
3. **Vis hva som sendes.** En logg i personvernpanelet over hvilke data som gikk til hvilken tjeneste, og når.
4. **Maskering** av e-postadresser, telefonnumre, kontonumre og fødselsnumre før noe sendes til skyen.
5. **Ingen lagring eller trening** hos leverandør (velg nullretensjon/EU-region der det tilbys).
6. **AI foreslår, du bestemmer.** Ingen automatisk sending, sletting eller svar.
7. **Samme agentkontrakt.** AI erstatter bare scoringen eller teksten i eksisterende agenter. Regelmotoren er alltid reserveløsningen.

| # | AI-idé | Bygger på | Verdi | Innsats | Personvern | Kan kjøres lokalt? |
|---|--------|-----------|:-----:|:-------:|:----------:|:------------------:|
| A1 | **Smartere prioritering** som lærer av hva du åpner, svarer på og avviser | Innboks-agent | 5 | M | middels | Ja (liten klassifikator) |
| A2 | **Trådsammendrag** av lange mail- og Slack-tråder («3 linjer + hva forventes av deg») | Innboks, gått glipp av | 5 | M | høy | Delvis |
| A3 | **Morgenbrief i naturlig språk**: én sammenhengende tekst eller lyd i stedet for kort | Morgenbrief-agent | 4 | S | høy | Delvis |
| A4 | **Løfte- og oppgavefangst**: «Jeg sender det fredag» i egne mail blir en påminnelse | Oppfølgingsagent | 5 | M | høy | Delvis |
| A5 | **Spør dashboardet**: «Hva sa Kari om budsjettet forrige uke?» (RAG over lokal indeks) | Globalt søk | 4 | L | høy | Embeddings lokalt |
| A6 | **Svarutkast** i din tone. Lagres som utkast og sendes aldri automatisk. | Innboks-agent | 4 | M | høy | Nei (sky) |
| A7 | **Møtebrief med kontekst**: «Sist dere snakket ble X avtalt, åpent spørsmål: Y» | Møteforberedelse | 4 | M | høy | Delvis |
| A8 | **Relevansfilter for «gått glipp av»**: skiller støy i Slack/Discord fra det som angår deg | Gått glipp av | 5 | M | middels | Ja |
| A9 | **Nyhetsfilter**: NRK-saker rangert etter dine interesser, med sammendrag på én linje | Morgenbrief | 3 | S | lav | Ja |
| A10 | **Tidsestimat på dagen**: «Du har 2 t fokustid og 14 ting. Disse 3 bør prioriteres.» | Kalendervakt | 4 | M | middels | Delvis |
| A11 | **Oversettelse** av mail og meldinger på fremmedspråk til norsk | Innboks | 2 | S | høy | Delvis |
| A12 | **Tonevarsel** før sending: «Dette kan oppfattes som skarpt» | Svarutkast | 2 | S | høy | Ja |

---

## Topp 5 for neste iterasjon

Valgt fordi de bygger direkte på de fire eksisterende agentene, kan lages regelbasert med demodata nå, og gir mest verdi per innsats.

| Prioritet | Idé | Hvorfor nå | Verdi | Innsats | Personvern |
|:---------:|-----|------------|:-----:|:-------:|:----------:|
| 1 | **Fokusvakt / varslingsbudsjett** (#9) | Alarm-agenten sender push gjennom dagen. Uten et budsjett blir appen en ny støykilde. Dette er kjernen i «rolig» design. | 5 | M | lav |
| 2 | **Smart vekking + kveldsbrief** (#1, #21) | Gjør vekkerklokken unik: kalender og vær finnes allerede. Kveldsbriefen foreslår alarmtid, og morgenbriefen følger opp. | 5 | M | lav |
| 3 | **Oppfølgingsagent «venter på svar»** (#10) | Ny agent med høy verdi som bare trenger metadata fra sendt-mappen. Passer i «gått glipp av»-mønsteret. | 5 | M | middels |
| 4 | **Møteforberedelse** (#11) | Kobler kalender, mail og Slack. Viser verdien av å samle alle kilder ett sted. | 5 | M | middels |
| 5 | **Personvernpanel + kildehelse + «hvorfor ser jeg dette?»** (#34, #35, #15) | Må på plass *før* ekte integrasjoner kobles på. Bygger tillit og gjør AI-steget trygt senere. | 5 | M | lav |

**Like utenfor topp 5:** pendlerstatus via Entur (#5), GitHub-kø (#17) og helgemodus (#7). Alle tre er små og gir rask glede.
