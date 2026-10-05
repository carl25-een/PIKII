# Pikii

Pikii delivers parcels from Kariakoo shops to neighbourhood agent points across Dar es Salaam, the way Pickup Mtaani does in Kenya. A customer buys straight from a shop. The shop books the parcel in Pikii, a boda rider carries a whole route's parcels in one trip, and the customer collects from a nearby agent with a code sent by SMS.

This repository holds:

- **The app** (`src/`): one Expo app for Android (and web), with a screen set for each role.
- **The backend** (`supabase/`): Postgres tables, security rules and actions, plus the SMS sender.

## How a parcel moves

| Step | Who | In the app |
| --- | --- | --- |
| 1 | Shop | Books the parcel: customer name, phone, nearest agent, size, who pays. Gets a code and QR label. |
| 2 | Staff at the sorting point | Scans the parcel in when the runner drops it. |
| 3 | Staff | Sends a route's bag with its rider once it has 15 parcels (the `min_parcels_per_run` setting). Customers get an SMS. |
| 4 | Rider | Hands each stop's parcels to the agent. Customers get an SMS with their 4-digit pickup code. |
| 5 | Agent | Enters the customer's code to hand over, collecting the fee first if the customer pays. |
| 6 | Customer | Opens the tracking link from the SMS (`/t/<token>`). No app or sign-in needed. |

Every step writes a row to `parcel_events`, and the SMS messages (Swahili and English) are queued in `sms_outbox` by a database trigger.

## Set up the backend

1. Create a project at [supabase.com](https://supabase.com).
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then link and push the schema:
   ```sh
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
3. Run `supabase/seed.sql` once in the SQL editor. **The agent points in it are examples**: replace them with the real agents you sign up, and set `tracking_base_url` in the `settings` table to where the web build is hosted, ending in `/t/`.
4. Turn off public sign-ups (Authentication > Providers > Email > disable "Allow new users to sign up"). Accounts are created by Pikii staff only.

### Accounts

Everyone signs in with their phone number and a PIN of 6 digits or more. Create accounts from a trusted computer with the service role key (Project Settings > API):

```sh
export SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
node scripts/create-user.mjs --role staff --name "Carl" --phone 0712345678 --pin 123456
node scripts/create-user.mjs --role shop  --name "Juma" --phone 0754000001 --pin 482913 --shop "Juma Electronics" --location "Mtaa wa Congo, Kariakoo"
node scripts/create-user.mjs --role rider --name "Hamisi" --phone 0765000002 --pin 551204 --route north
node scripts/create-user.mjs --role agent --name "Mama Neema" --phone 0786000003 --pin 900311 --agent-place "Mbweni Mpakani"
```

### SMS

`supabase/functions/send-sms` sends queued messages through [Beem Africa](https://beem.africa). Check the request format against Beem's current API docs before going live.

```sh
supabase secrets set BEEM_API_KEY=... BEEM_SECRET_KEY=... BEEM_SENDER_ID=PIKII
supabase functions deploy send-sms --no-verify-jwt
```

Then schedule it every minute (Integrations > Cron in the Supabase dashboard, calling the function's URL). Without the Beem secrets it runs in dry-run mode and only logs the messages.

## Run the app

```sh
npm install
npx expo start
```

`.env` already points at the Pikii Supabase project with its publishable key, which is safe to ship in the app. To use a different project, put its values in `.env.local`, which overrides `.env`.

To install on Android phones, build an APK in the cloud (needs a free expo.dev account):

```sh
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

When it finishes, EAS gives a link and QR code; open it on the phone to download and install the APK. The camera scanner needs this build: Expo Go cannot scan.

The customer tracking page is part of the web build (`npx expo export --platform web`). Host the `dist/` folder on any static host that rewrites unknown paths to the matching route, or use EAS Hosting.

## Checks

```sh
npm run typecheck
npm run lint
npm run test:db    # applies the migration and seed to a throwaway local Postgres and runs a full parcel journey
```

`test:db` needs Postgres installed locally and must run as a non-root user.

## Not built yet

- **Mobile money payments.** The delivery fee is recorded on each parcel, and staff mark shop fees as collected at check-in. Connecting a gateway (Selcom, AzamPay or ClickPesa) is the next step.
- Pay on collection (the agent collects the item price for the shop).
- Door delivery from the agent point, and seller-to-buyer sending.
- Returns of parcels not collected within 3 days.
