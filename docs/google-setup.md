# Openbare Google-reviews

TrustPulse gebruikt Places API (New). Het toont de door Google geleverde gemiddelde rating en het totale aantal beoordelingen, plus maximaal vijf geselecteerde reviews. Dit is geen volledige reviewgeschiedenis, geen meting van nieuwe reviews en geen koppeling tussen een Google-review en een TrustPulse-klant. Voor volledige beheerfuncties is later een aparte Business Profile-koppeling met toestemming nodig.

## Activeren

1. Maak een Google Cloud-project aan. Activeer Places API (New) en de vereiste facturering. Laat de accounteigenaar eventuele voorwaarden en betaalgegevens zelf afhandelen.
2. Maak een serversleutel aan, beperkt tot Places API (New). Zet een expliciete API-quota voor betaalde aanvragen; budgetmeldingen zijn geen harde bestedingslimiet. Netlify-functies hebben zonder aanvullende infrastructuur geen vaste uitgaande IP-adressen; een browser-referrerbeperking is niet geschikt voor deze serveraanroepen.
3. Sla de sleutel in Netlify op als geheime omgevingsvariabele `GOOGLE_PLACES_API_KEY`. Zet die nooit in GitHub, chat of een variabele met `NEXT_PUBLIC_`. Bouw daarna opnieuw.
4. Bewaar in Instellingen een HTTPS Google-reviewlink met `placeid`. Een korte g.page-link blijft bruikbaar voor doorsturen, maar kan voor deze uitleesfunctie niet automatisch worden geïnterpreteerd.
5. Open Reviews en klik op Google-reviews ophalen. Controleer de bedrijfsnaam, bronlinks, rating en het totale aantal beoordelingen.

FLIPKA-testlink: `https://search.google.com/local/writereview?placeid=ChIJQU1shzrhwEcRu22D9cMTtSg`.

De app doet alleen op verzoek een Google-aanvraag. Opnieuw ophalen is één minuut geblokkeerd in de interface en per werkruimte in hetzelfde serverproces. Deze proceslimiet is geen globale bestedingslimiet: stel quota bij Google in voordat je activeert. De server valideert de Supabase-gebruiker en leest uitsluitend de opgeslagen reviewlink van diens werkruimte; de browser kan geen willekeurige bestemming of Place ID meesturen.

Reviewteksten en ratings worden niet opgeslagen in Supabase, localStorage of een servercache. De bron blijft zichtbaar als Google Maps; auteurs en individuele reviews krijgen bronlinks waar Google die levert. De originele tekst heeft voorkeur boven een vertaling. Publiceer vóór echt gebruik ook een privacyverklaring en gebruiksvoorwaarden die aan de Google Maps Platform-voorwaarden voldoen. De uitgaande aanvraag bevat de Place ID en de serversleutel, geen klantenlijst of TrustPulse-feedback.

Documentatie: [Place Details](https://developers.google.com/maps/documentation/places/web-service/place-details), [weergave en attributie](https://developers.google.com/maps/documentation/places/web-service/policies).

Zonder een geldige serversleutel blijft ophalen uitgeschakeld. Een geslaagde build betekent niet dat de live Google-koppeling al is getest.
