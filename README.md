# Nowly

Nowly is a mobile-first spontaneous social coordination MVP. It helps friends signal lightweight availability, detects overlap between friends, and turns that overlap into fast hangout proposals, real-time threads, and post-hang recap loops.

## Stack

- Mobile: Expo, Expo Router, Zustand, NativeWind, Reanimated
- Backend: Node.js, Express, PostgreSQL, Prisma, Socket.io
- Auth: phone OTP with Twilio-ready fallback
- Notifications: Expo Push Notifications
- Growth hooks: deep-link invites, Discord linking, recap cards, streak loop

## Monorepo

```text
nowly/
  apps/
    mobile/
      app/
      components/
      features/
      lib/
      store/
    server/
      prisma/
      src/
  packages/
    shared/
```

## Product slices included

- Phone OTP onboarding with profile capture and optional Discord linking
- Contact invite flow with deep-link generation
- Lightweight availability signals with auto-expiry
- Minute-by-minute overlap matching job with notification throttling
- Ranked match surfacing and instant proposal flow
- Micro-group planning entry point
- Socket.io thread foundation for chat, reactions, ETA, location, and polls
- Post-hang recap loop with streak memory cards
- Analytics plumbing for the core growth and retention events

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start Postgres

```bash
docker compose up -d
```

### 3. Configure env files

```powershell
Copy-Item apps/server/.env.example apps/server/.env
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

Set `EXPO_PUBLIC_DEMO_MODE=false` in `apps/mobile/.env` when you want the mobile app to talk to the real server instead of seeded demo data.

### 4. Generate Prisma client and migrate

```bash
npm run db:generate
npm run db:migrate
```

### 5. Seed sample data

```bash
npm run db:seed
```

### 6. Run the backend

```bash
npm run dev:server
```

### 7. Run the mobile app

```bash
npm run dev:mobile
```

### Regenerate icon assets

```bash
npm --workspace @nowly/mobile run generate:icons
```

## Backend notes

- Health check: `GET /health`
- Auth: `/auth/request-otp`, `/auth/verify-otp`, `/auth/me`, `/auth/device-token`
- Profile: `/users/me/onboarding`, `/users/me/location`
- Availability: `/availability/signals`
- Friends: `/friends`, `/friends/suggestions`, `/friends/invite`, `/friends/request`
- Hangouts: `/hangouts`, `/hangouts/matches`, `/hangouts/group-candidates`, `/hangouts/:id/respond`, `/hangouts/:id/recap`
- Discord: `/discord/oauth-url`, `/discord/link`, `/discord/presence`, `/discord/invite-link`
- Analytics: `/analytics/events`

The matching engine runs every minute from [`apps/server/src/modules/matching/matching.job.ts`](/c:/Users/zyong/nowly/apps/server/src/modules/matching/matching.job.ts). Scoring combines time overlap, distance fit, responsiveness, and a low-weight Discord presence bonus.

## Mobile notes

- The animated splash/brand system lives in [`apps/mobile/app/index.tsx`](/c:/Users/zyong/nowly/apps/mobile/app/index.tsx) and [`apps/mobile/components/branding/NowlyMark.tsx`](/c:/Users/zyong/nowly/apps/mobile/components/branding/NowlyMark.tsx).
- Store and launcher icons are generated from [`generate-icon-assets.ps1`](/c:/Users/zyong/nowly/apps/mobile/scripts/generate-icon-assets.ps1) into [`apps/mobile/assets`](C:/Users/zyong/nowly/apps/mobile/assets).
- Global app state lives in [`apps/mobile/store/useAppStore.ts`](/c:/Users/zyong/nowly/apps/mobile/store/useAppStore.ts).
- API/demo switching lives in [`apps/mobile/lib/api.ts`](/c:/Users/zyong/nowly/apps/mobile/lib/api.ts).
- The availability UX lives in [`apps/mobile/features/availability/AvailabilityComposer.tsx`](/c:/Users/zyong/nowly/apps/mobile/features/availability/AvailabilityComposer.tsx).

## Production-minded assumptions

- Demo mode is enabled by default for faster first-run UX without blocking on backend bootstrapping.
- Twilio Verify is optional in development; OTP codes are logged locally when Twilio is not configured.
- Discord integration stores only identity metadata and shared server IDs, never message history.
- Push notifications are throttled with dedupe keys in the notification log table.
- Core monetization hooks are scaffolded in product/UI architecture, but premium billing is intentionally not implemented in the MVP.

## Deploying the backend on Railway

Nowly's backend is the part you deploy to Railway. The Expo app stays separate and should point to the Railway public URL.

### 1. Create two Railway services

- `Postgres`
- `nowly-api` from this GitHub repo

For the API service, deploy the repo root and use custom commands:

- Build command: `npm run build:server`
- Start command: `npm run start:server`
- Pre-deploy command: `npm run db:migrate:deploy`

The pre-deploy command is important in production because Railway should use `prisma migrate deploy`, not `prisma migrate dev`.

### 2. Set Railway variables on `nowly-api`

Required:

- `NODE_ENV=production`
- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `JWT_SECRET=<long-random-secret>`
- `MOBILE_DEEP_LINK_SCHEME=nowly`

Recommended:

- `CLIENT_ORIGIN=*`

Optional for real production flows:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`
- `EXPO_ACCESS_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI=nowly://discord/callback`

`PORT` is provided by Railway automatically, and the server already reads `process.env.PORT`.

### 3. Configure networking

- Generate a Railway public domain for the API service
- Set the healthcheck path to `/health`

Once deployed, verify:

```bash
curl https://your-nowly-api.up.railway.app/health
```

You should get a JSON response with `ok: true`.

### 4. Seed data

If you want demo users in production or staging, open a Railway shell for the API service and run:

```bash
npm run db:seed
```

Only do this on a non-production environment unless you intentionally want seeded users in production.

### 5. Point the mobile app to Railway

In `apps/mobile/.env`:

```env
EXPO_PUBLIC_DEMO_MODE=false
EXPO_PUBLIC_API_URL=https://your-nowly-api.up.railway.app
```

Then restart Expo so the app stops using local demo data.

### 6. What is optional vs required

Required to make the backend usable:

- Railway API service
- Railway Postgres
- `DATABASE_URL`
- `JWT_SECRET`

Required for real phone OTP login:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`

Optional at first:

- `TWILIO_MESSAGING_SERVICE_SID`
- `EXPO_ACCESS_TOKEN`
- Discord OAuth variables

Without Twilio configured, the backend can still run, but OTP behaves as a development fallback rather than a real production SMS flow.
