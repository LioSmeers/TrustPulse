# TrustPulse

Nederlandstalige webapp voor klantfeedback en Google-reviewverzoeken. Een zaak maakt een eigen werkruimte aan, bewaart klanten en uitnodigingen, verzamelt beoordelingen en volgt feedback op.

## Starten

Gebruik Node.js 22.6+.

```bash
npm install
npm run dev
```

Open http://localhost:3000. Met ingevulde Supabase-projectgegevens opent de app de loginpagina. Maak een **TrustPulse-account voor je zaak** aan; dit staat los van het account waarmee je het Supabase-dashboard beheert. Als e-mailbevestiging aanstaat, bevestig eerst de ontvangen e-mail.

```bash
npm test
npm run typecheck
npm run build
npm start
```

## Supabase

De publieke projectgegevens staan lokaal in `.env.local`, dat niet in Git wordt opgenomen. De publishable key is bedoeld voor gebruik in de browser. Inloggen en opslag werken zonder serversleutel. Voor de SMS-server is daarnaast een Supabase secret key of service-role key nodig.

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://jouw-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Voer **eenmalig** `supabase/schema.sql` uit in de SQL Editor van het nieuwe project. Het schema maakt de tabellen en vier databasefuncties aan:

- `ensure_workspace`: intern; maakt bij de eerste geauthenticeerde toegang een eigen zaak aan.
- `load_workspace`: geeft een ingelogde gebruiker uitsluitend gegevens uit de eigen werkruimte.
- `save_workspace`: bewaart instellingen, nieuwe klanten/uitnodigingen en feedbackstatus in één transactie.
- `public_invitation`: beperkt toegang via een persoonlijke token tot branding en het insturen van een beoordeling/feedback.

Directe tabeltoegang is gesloten voor anonieme en ingelogde API-gebruikers. Alle tabellen hebben RLS ingeschakeld. Databasefuncties controleren de geauthenticeerde identiteit en het bedrijf, of bij de klantflow een geldige token met verloopdatum. Klantlinks verlopen na 30 dagen. De publieke functie begrenst verzoeken per geldige token tot 60 per minuut. SQL-controles bewaken sterren, berichtlengte en relaties tussen klanten en zaken.

Stel bij Supabase Authentication de Site URL en toegestane redirect-URL in op het adres waarop de app draait. Voor lokaal testen is dat bijvoorbeeld `http://localhost:3000` en `http://localhost:3000/login`. Het gebruikte browseradres moet overeenkomen met de toegestane redirect. Bij publicatie moeten deze adressen worden bijgewerkt.

De bestaande voorbeelddata wordt niet naar Supabase overgezet. Nieuwe werkruimtes beginnen leeg. Na opslaan leest het dashboard de servergegevens opnieuw; actieve dashboards verversen daarnaast elke 15 seconden en bij terugkeer naar het browservenster.

## SMS via Twilio

De geauthenticeerde route `/api/sms` verstuurt echte SMS-berichten via de officiële Twilio-bibliotheek. De online app simuleert verzending niet: de knop blijft uitgeschakeld zolang de configuratie of databasemigratie ontbreekt. De lokale demo blijft simuleren.

Volg [docs/sms-setup.md](docs/sms-setup.md) voor Twilio-account, afzender, servergeheimen, de aanvullende SQL-migratie en een gecontroleerde test naar je eigen nummer. Het Twilio-trialaccount is aangemaakt en een console-test is ontvangen. Verzending vanuit de app is nog niet actief: een geschikte afzender, de serverconfiguratie, SMS-migratie en een publiek HTTPS-adres ontbreken nog.

De server controleert de Supabase-gebruiker en bewaart klant en uitnodiging voordat Twilio wordt aangeroepen. Een token kan slechts eenmaal verzending reserveren; herhaalde verzoeken versturen geen extra bericht. De limiet per zaak is 10 verzoeken per minuut en 100 per 24 uur, inclusief mislukte pogingen. Dit is een app-limiet, geen Twilio-bestedingsplafond. Bij een timeout blijft de verzending onzeker: controleer Twilio voordat je een nieuwe uitnodiging maakt. Er zijn geen automatische herverzendingen. Een procesuitval tijdens verzending kan dezelfde handmatige controle vereisen.

Aflevermeldingen gaan naar `/api/sms/status?token=...`. De officiële SDK controleert de Twilio-handtekening met het vaste openbare app-adres; de account-ID wordt ook gecontroleerd. Provider-ID en afleverstatus worden apart van openen/beantwoorden opgeslagen. Vertraagde callbacks kunnen een eindstatus niet terugzetten. Alleen de serverrol kan deze SMS-databasefuncties uitvoeren.

## Wat nog moet worden gekoppeld

E-mailmeldingen zijn nog niet gekoppeld. De instellingen bewaren alleen de meldingsvoorkeur. Openbare Google-reviews kunnen via Places API (New) worden opgehaald zodra de serversleutel is ingesteld; zie docs/google-setup.md. De API levert een selectie van maximaal vijf reviews, naast de totale rating en het totale aantal beoordelingen. Een klik op de Google-link telt niet als gepubliceerde review.

Uitnodigingen kunnen online worden opgeslagen en als link gekopieerd. Om de link op een ander toestel te openen, moet de webapp ook op een bereikbaar publiek webadres staan. Echte SMS vereist een publiek HTTPS-adres in `NEXT_PUBLIC_APP_URL`. De SMS-preview en gekopieerde link gebruiken dat adres wanneer ingesteld, anders het browseradres.

Elke sterrenscore krijgt toegang tot dezelfde ingestelde Google-reviewlink. Bij lagere scores wordt private feedback aangemoedigd; de Google-optie blijft beschikbaar.

Voeg bij publicatie monitoring en aanvullende netwerk-rate-limiting toe. Bewaak ook de Twilio-bestedingen.

## Lokale demo

Laat beide Supabase-variabelen leeg om de demo met Bakkerij De Vos te gebruiken. Wijzigingen worden dan in `localStorage` bewaard onder `trustpulse-demo-v2`. Klantdemo: `/r/7x9q`. Demolinks werken alleen in dezelfde browser/origin.

## Klantenbeheer

Voeg klanten afzonderlijk toe of importeer maximaal 100 klanten uit een CSV UTF-8-bestand (maximaal 200 kB). Gebruik de kolommen `naam` en `telefoon`; een voorbeeld staat in `public/examples/klanten.csv`. De import toont vooraf de geldige, ongeldige en dubbele rijen. Belgische nummers worden genormaliseerd. Nummers die al in de geladen klantenlijst of hetzelfde bestand staan, worden overgeslagen. Er worden geen berichten verstuurd bij importeren.

Vanuit de klantenlijst opent **Reviewlink maken** een vooraf ingevuld verzoek. Klanten zonder telefoonnummer kunnen ook een link krijgen. Klantenbeheer en linkopslag gebruiken de bestaande Supabase-functies; daarvoor is geen SMS-migratie nodig.

De actuele automatische suite bevat 31 tests. De productiebuild en TypeScript-controle slagen. Handmatig toevoegen, navigeren en het bewaren van een reviewlink zijn in een geïsoleerde browserdemo getest. De volledige CSV-bestandskeuze is nog niet in de browser gecontroleerd: de gebruikte browserextensie blokkeerde het selecteren van een lokaal testbestand.

## Bestanden

- `src/app/`: dashboard, login/registratie en klantflow `/r/[token]`.
- `src/components/provider.tsx`: authenticatie, laden, bewaren en verversen.
- `src/lib/supabase/`: Supabase-client, datamapping en wijzigingen.
- `src/lib/services/supabase-repository.ts`: toegang tot de beperkte databasefuncties.
- `src/lib/insights.ts`: berekende dashboardcijfers en activiteit.
- `supabase/schema.sql`: database-inrichting en toegangscontrole.
- `tests/`: berekeningen, datamapping en PostgreSQL-tests voor werkruimtes, tokens en feedback.

De oude iCloud-afhankelijkheden en buildbestanden zijn herstelbaar bewaard in `node_modules-icloud-backup-20261004`, `.next-icloud-backup-20261004` en `package-lock.icloud-backup-20261004.json`. Deze mappen zijn uitgesloten van Git en TypeScript.
