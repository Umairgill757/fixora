# Marketplace — AI-powered home-services platform

Web app + iOS/Android apps + AI agents (quote → dispatch → invoice) for home-service
trades (electricians, plumbers, carpenters, painters, AC techs, cleaners…).

## Structure

```
app/
  apps/
    web/        # Next.js 14 — customer/business web app (Phase 1)
    api/        # NestJS — REST API + Prisma (Phase 1)
    mobile/     # Expo React Native — Phase 3
  packages/
    shared/     # Shared TypeScript types (roles, booking states)
```

## Quick start (local dev)

```bash
pnpm install
# terminal 1 — API (http://localhost:3001)
pnpm dev:api
# terminal 2 — Web (http://localhost:3000)
pnpm dev:web
```

Local DB is SQLite (`apps/api/prisma/dev.db`, git-ignored). Production uses
PostgreSQL — same Prisma schema, only the datasource URL changes.

## Standards

- Inter font, 15px border radius, mobile-first responsive
- Security-first: validate inputs (zod), JWT + rotating refresh, RBAC, secrets in env only
- Commit after every meaningful change
