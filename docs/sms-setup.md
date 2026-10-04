# SMS activeren

De code is voorbereid; er worden geen bestaande uitnodigingen automatisch verstuurd. Er is nog geen Twilio-account gekoppeld.

1. Maak een account op https://www.twilio.com/try-twilio en voltooi de verificatie. Zorg dat je account SMS naar België mag versturen. Kies een SMS-afzender of een Messaging Service met een geschikte afzender. Controleer de beperkingen van je account in de Console; gebruik voor de eerste test je eigen geverifieerde mobiele nummer.
2. Zet TrustPulse op een publiek HTTPS-adres. Dat is nodig voor de klantlink én de Twilio-aflevermeldingen. Stel ook Supabase Authentication Site URL en redirect-URL in op dit adres.
3. Bewaar onderstaande waarden rechtstreeks in `.env.local` tijdens ontwikkeling en in de serveromgeving van de hosting bij publicatie. Deel Auth Token en Supabase secret key niet in de chat, browsercode, screenshots of Git. `NEXT_PUBLIC_APP_URL` is alleen de oorsprong, zonder pad of query.

```env
NEXT_PUBLIC_APP_URL=https://jouw-app.example.com
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+...
SUPABASE_SECRET_KEY=sb_secret_...
```

De Account SID en Auth Token vind je in de Twilio Console. De Supabase secret key staat bij je projectinstellingen onder API Keys. Een bestaande `SUPABASE_SERVICE_ROLE_KEY` kan als alternatief dienen. Geef die sleutel uitsluitend aan de server. Voor een Messaging Service vul je `TWILIO_MESSAGING_SERVICE_SID=MG...` in; die krijgt voorrang op het afzendernummer.

4. Voer `supabase/sms.sql` één keer uit na `supabase/schema.sql` in de Supabase SQL Editor. Dit voegt aflevervelden en drie serverfuncties toe. Alleen `service_role` krijgt toegang; normale gebruikers krijgen geen extra tabelrechten. Deze aanvullende migratie is voorbereid en lokaal getest, maar is nog niet in het online project uitgevoerd.
5. Herstart de app na het invullen van de omgeving. Log in met je TrustPulse-account en bekijk **Startklaar**. De app noemt ontbrekende onderdelen zonder geheimen te tonen. Een ingestelde configuratie bewijst nog niet dat de Twilio-accountrechten of afzender geldig zijn.
6. Maak één reviewverzoek met je eigen mobiele nummer. Controleer het bericht en de link voordat je op **Verstuur SMS-verzoek** klikt. Dit verstuurt een echt en mogelijk betaald bericht. Controleer ontvangst op je telefoon, de afleverstatus bij **Uitnodigingen**, en de logs in Twilio.

Bij `Verzending onzeker` of `Verzending controleren`: maak niet meteen een nieuw verzoek. Zoek eerst het bericht in Twilio. Het bestaande verzoek wordt nooit automatisch opnieuw verstuurd. De server kan na ontvangst door Twilio uitvallen voordat het provider-ID is opgeslagen; een latere geldige callback kan de status alsnog bevestigen.

Bij `Verzending mislukt` of `Niet afgeleverd`: controleer de getoonde foutcode in Twilio en corrigeer bijvoorbeeld accountrechten, afzender of ontvanger. Een nieuwe uitnodiging gebruikt een nieuwe token en kan opnieuw kosten maken.

Referenties: [Twilio Messages API](https://www.twilio.com/docs/messaging/api/message-resource), [webhookbeveiliging](https://www.twilio.com/docs/usage/webhooks/webhooks-security).

## Beperking van Limited trial

De huidige Limited trial accepteert alleen vaste Twilio-sjablonen, zoals `sms_feedback_surveys`. Een eigen bericht met een persoonlijke TrustPulse-link wordt niet ondersteund. De bestaande TrustPulse-verzendroute is bedoeld voor eigen berichten en vereist daarom een geschikt geüpgraded account en een eigen SMS-afzender. Een ontvangen Console-testbericht betekent nog niet dat deze volledige appflow werkt. Zie https://www.twilio.com/docs/usage/trials en https://www.twilio.com/docs/usage/trials/try-out-sms.
