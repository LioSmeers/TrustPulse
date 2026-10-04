# TrustPulse op iPhone

De eerste iOS-projectversie staat in `mobile/ios/App/App.xcodeproj`.
Op deze Mac staat de gecontroleerde ontwikkelkopie in
`/Users/liosmeers/Developer/TrustPulse`, buiten Desktop/iCloud.
De beheerinterface wordt lokaal in de app gebundeld. Supabase bewaart de bestaande
werkruimte; de Netlify-server handelt Google en sms af. De klantpagina's blijven
publieke HTTPS-links op Netlify. Een app-installatie is voor klanten niet nodig.

## Klaargezet

- Login, dashboard, klanten, verzoeken, feedback, Google-score en instellingen.
- Gedeelde schermen met de webapp, eigen router voor de app.
- iOS-deelmenu en klembord voor eerst opgeslagen klantlinks.
- Google-score en werkruimte verversen als de app actief wordt.
- Internetstatus en externe links via de ingebouwde browser.
- Supabase-inlogsessie in de iOS Keychain, verwijderd bij uitloggen.
- TrustPulse-appicoon en Xcode-project met Swift Package Manager.

## Eerst testen op je Mac

Installeer **Xcode 26 of nieuwer** uit de Mac App Store. Open Xcode één keer en
rond de installatie en voorwaarden zelf af. Op deze Mac is momenteel alleen
Command Line Tools aanwezig; de Swift-code is nog niet gecompileerd.

Open een terminal in de projectmap:

```sh
cd mobile
npm ci
npm run ios:sync
npm run ios:open
```

Selecteer in Xcode een iPhone-simulator en klik Run. Voor je eigen iPhone: sluit
hem aan, schakel zo nodig Developer Mode in, voeg je Apple-account toe onder
Xcode Settings > Accounts en kies je Personal Team bij Signing & Capabilities.
De bundle identifier `be.trustpulse.app` is een voorlopige keuze; controleer de
beschikbaarheid en kies je eigen identifier voordat je publiceert.

Je kunt op je eigen toestel testen met een gratis Apple-account. Het betaalde
Developer Program is pas nodig voor TestFlight/App Store-distributie.

## Instellingen

De standaardbuild gebruikt de bestaande publieke Supabase-projectgegevens en
het bestaande Netlify-adres. Ze geven geen beheerdersrechten; RLS blijft gelden.
Voor andere omgevingen: kopieer `mobile/.env.example` naar `mobile/.env.local` en
pas alleen de drie publieke waarden aan. Bouw en synchroniseer opnieuw.

**Zet nooit Twilio Auth Token, Google API key of Supabase-serverkeys in mobile.**
Die blijven servervariabelen bij Netlify. Native HTTP stuurt het ingelogde
gebruikers-token naar de twee bestaande Netlify-API-routes. Google en sms behouden
hun servercontroles. Er wordt geen externe website als startscherm geladen.

`npm run build` bouwt alleen de bundel; `npm run ios:sync` kopieert die naar het
Xcode-project en werkt de lokale Swift Package Manager-verwijzingen bij.
Gegenereerde assets en dependencies worden niet in Git opgeslagen. Na een verse
checkout altijd eerst `npm ci` en `npm run ios:sync` uitvoeren.

## Verificatie die nog op een iPhone moet gebeuren

- Inloggen, app afsluiten/openen, sessie blijft behouden; uitloggen wist de sessie.
- Klant opslaan en terugzien in dezelfde werkruimte op de webapp.
- Klantlink opslaan, delen en op een ander toestel openen.
- Google-score ophalen via de native transportlaag en verversen bij terugkeer.
- Geen internet, herstel van verbinding, toetsenbord en veilige schermranden.
- Native Keychain-plugin, browser en deelmenu met simulator/toestel testen.

Beide JS-builds, beide TypeScript-controles, Capacitor-sync en de regressietests
zijn gecontroleerd. Dit bewijst nog geen werkende native Swift-build: Xcode
ontbreekt. Een browserscreenshot toont de interface, geen iPhone-simulator.

## Voor App Store-publicatie nog afwerken

1. Toesteltests en eventuele gevonden fouten oplossen.
2. Accountverwijdering vanuit de app, privacyverklaring, supportadres en correcte
   App Privacy-verklaring voor account- en klantgegevens. Controleer ook de
   privacy manifests van de gebundelde plugins in het uiteindelijke archief.
3. Screenshots, beschrijving, review-demoaccount en definitieve naam/identifier.
4. Apple Developer-inschrijving, signing, TestFlight en indienen voor review.

Goedkeuring door Apple is niet gegarandeerd. Sms-activering blijft een aparte
laatste stap zoals afgesproken; de iOS-build maakt de ontbrekende sms-afzender
of database-inrichting niet vanzelf beschikbaar.

Bronnen: [Capacitor iOS](https://capacitorjs.com/docs/ios),
[Swift Package Manager](https://capacitorjs.com/docs/ios/spm),
[Apple Developer](https://developer.apple.com/programs/enroll/),
[App Review](https://developer.apple.com/app-store/review/guidelines/).
