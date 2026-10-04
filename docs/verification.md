# Verificatie — 2 oktober 2026

- `npm run build`: geslaagd; alle routes gecompileerd en TypeScript gecontroleerd.
- Productieserver gestart op `http://127.0.0.1:3000`.
- Headless Chromium: alle 8 app-routes geven HTTP 200, zonder JavaScript-fouten.
- Responsive controle: geen horizontale overflow op 390 px voor dashboard, klanten, uitnodigingsformulier, reviews, feedback, instellingen en klantpagina; dashboard ook gecontroleerd op 320 px.
- Klanten zoeken: getest.
- Feedback oplossen en de opgeloste tab: getest.
- Instellingen opslaan en behouden na refresh: getest.
- Positieve flow: 5 sterren → Google-optie → bedankpagina.
- Negatieve flow: 2 sterren → feedback en contactvoorkeur → zichtbaar in dashboard.
- Dezelfde ingestelde Google-URL beschikbaar bij zowel lage als hoge ratings.
- SMS-simulatie: klant en uitnodiging opgeslagen, unieke klantpagina werkt.
- Onbekende token: duidelijke foutstatus.
- Screenshots van desktopdashboard, mobiel dashboard, sterrenselectie en Google-scherm visueel bekeken.

Geen echte SMS, e-mail of Google-review geplaatst. Browsercontroles gebruikten een tijdelijke geïsoleerde browsercontext. De screenshot van het positieve scherm gebruikte een test-URL; de normale demo begint zonder Google-URL.

## 4 oktober 2026 — verdere afwerking

- Acht tests geslaagd: lege overzichten, seed-totalen, periodegrenzen, feedbackstatus, beoordeling versus review, Google-filter, dubbele tokens en hergebruik van klanten.
- Typecontrole geslaagd in tijdelijke bronkopie met verse afhankelijkheden.
- Productiebuild geslaagd met Next.js 15.5.27 in die tijdelijke kopie; alle routes inclusief /dashboard/setup gecompileerd.
- De oorspronkelijke node_modules bevatten iCloud placeholders (`dataless`), waardoor de rechtstreekse build/typecheck niet afronden. De tijdelijke installatie is uit package.json samengesteld; het bestaande lockbestand kon niet worden gebruikt omdat het eveneens een placeholder is.
- Geen browsercontrole uitgevoerd voor deze wijzigingen. Een lokale serverstart binnen de sandbox gaf EPERM.
- Geen externe accounts aangemaakt, echte SMS verstuurd of gegevens online opgeslagen.

## Supabase-koppeling — 4 oktober 2026

- Supabase Auth-settings accepteert de opgegeven Project URL en publishable key: HTTP 200.
- 16 tests geslaagd, inclusief PostgreSQL-tests met PGlite voor aparte bedrijfswerkruimtes, afgesloten tabeltoegang, verboden toegang tot andere zaken, beoordelingen, idempotente feedback, verlopen tokens en verzoeklimiet.
- Typecontrole en productiebuild geslaagd met Supabase-configuratie en de nieuwe loginroute.
- Loginpagina geeft HTTP 200. Login- en registratieformulier in Chrome gecontroleerd; geen geregistreerde JavaScript-consolefouten.
- Lokale afhankelijkheden vervangen door een verse installatie. Oude iCloud-kopieën bewaard; dependency-lockbestand bijgewerkt.
- Schema na expliciete gebruikersbevestiging uitgevoerd in Supabase. SQL Editor meldt: Success. No rows returned.
- Er is nog geen echte app-account aangemaakt of aangemelde live flow getest. Geen SMS of e-mail verzonden door de agent.

### Live controles na activering

- `public_invitation` met ongeldige token: HTTP 200, null; geen gegevens onthuld.
- `load_workspace` zonder aangemelde gebruiker: HTTP 401, permission denied.
- Rechtstreeks klanten lezen zonder aanmelding: HTTP 401, permission denied.
- Registratieformulier geopend op http://localhost:3000/login. Gebruiker moet het eigen wachtwoord invoeren en het account aanmaken. Volledige aangemelde live flow nog niet gecontroleerd.

## SMS-voorbereiding — 4 oktober 2026

- 20 tests geslaagd: bestaande flows plus server-only SMS-reservering, dubbele tokens, bedrijfsgrenzen, limiet van 10/minuut, vertraagde callbacks, payloadvalidatie en Twilio-handtekeningen.
- Typecontrole en productiebuild geslaagd in een volledige lokale kopie met verse afhankelijkheden: /private/tmp/trustpulse-sms-check. Deze versie draait op 127.0.0.1:3000.
- iCloud/virtuele bestandsmetadata veroorzaakte vastgelopen reads en een tijdelijke kopie met nulbytes. Volledige reads buiten de beperkte weergave herstelden de verificatiekopie. Bronbestanden bleven behouden.
- supabase/sms.sql is lokaal getest maar nog niet online uitgevoerd. Geen Twilio-credentials, live providerverzoek of echte SMS-test. Aangemelde online SMS-interface nog niet in de browser getest.
