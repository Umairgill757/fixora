# Fixora — run it on your own computer

## 1. Install Node.js
Download and install Node.js **v20 or newer** (LTS recommended) from
https://nodejs.org — then restart your terminal.

Check: `node --version` should print v20+.

## 2. Install dependencies
In the unzipped `app` folder:

```
npm install --legacy-peer-deps
```

## 3. Set up the API
```
cd apps/api
copy .env.example .env        (Windows)
# cp .env.example .env        (Mac/Linux)
```
Open `.env` and fill in:
- `DATABASE_URL` — your Neon connection string (from neon.tech dashboard)
- `JWT_SECRET` — any long random string

Then create the tables and demo data:
```
npx prisma db push
npx tsx prisma/seed.ts
```

## 4. Start the API (keep this terminal open)
From the `app` folder:
```
npm run dev:api
```
It runs at http://localhost:3001

## 5. Start the website (new terminal)
From the `app` folder:
```
npm run dev:web
```
Open **http://localhost:3000** in your browser.

## Demo logins (password for all: `password123`)
- Business owner: `owner@fixora.test` → Business dashboard
- Technician: `ahmed.tech@fixora.test` → Technician portal
- Customer: click **Sign up** and create your own account

## Notes
- Payments: JazzCash fields in `apps/api/.env` are empty on purpose.
  The "pay" step works in test mode; add real merchant credentials later.
- Notifications: without API keys, emails/SMS are printed in the API
  terminal window instead of being sent.
