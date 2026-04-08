# AssemblyMES

Lightweight MES-style app for **small assembly shops**: item/BOM/routing master data, work orders, and floor execution helpers. **Free to use, not a commercial product**—no billing, subscriptions, or public signup; access is via configured operator accounts only.

## Local development

```bash
npm install
cp .env.example .env.local
# Set DATABASE_URL, AUTH_SECRET, SUPER_ADMINS_JSON, then:
npx prisma db push
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

1. Create a **PostgreSQL** database (e.g. Vercel Postgres, Neon, Supabase) and copy its connection string.
2. In the Vercel project → **Settings → Environment Variables**, add:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `SUPER_ADMINS_JSON`
   for Production (and Preview if needed).
3. Connect the Git repository and deploy; the build runs `npm run build`, which executes `scripts/ensure-db-schema.mjs` to `prisma db push` when `DATABASE_URL` is Postgres, then `next build`.

Ensure the database allows SSL if your provider requires it (often `?sslmode=require` in the URL).

## Scripts

| Script        | Purpose                                      |
|---------------|----------------------------------------------|
| `npm run dev` | Next.js dev server                           |
| `npm run build` | Production build + schema sync (on Vercel) |
| `npm run start` | Start production server locally          |
| `npm run lint`  | ESLint                                   |

## Tech stack

Next.js (App Router), React, Prisma, PostgreSQL, next-intl.
