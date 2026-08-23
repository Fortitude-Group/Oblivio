# Deploying The Observatory (roughly $0 until traffic)

Three free services, no always-on server:

- **Database:** Neon (serverless Postgres, free, scales to zero)
- **Web app:** Vercel (free Hobby tier) runs the Next.js site
- **Refresh:** an Azure DevOps scheduled pipeline scores packages into Neon

Costs only start when you outgrow Neon's free compute/storage or Vercel's Hobby
bandwidth, which is the point at which you have real traffic.

## 1. Neon (the database)

1. Sign up at neon.tech and create a project near your users.
2. Copy the **pooled** connection string (its host contains `-pooler`). That is
   your `DATABASE_URL`.
3. Apply the schema from your machine:

   ```powershell
   $env:DATABASE_URL = "<neon pooled url>"
   pnpm --filter @observatory/db db:migrate
   ```

   That creates the tables, the append-only guard, and the monthly partitions.

## 2. Vercel (the web app)

1. Sign up at vercel.com and import the Oblivio repo (or use the `vercel` CLI).
2. **Monorepo settings** (this is the fiddly bit):
   - Root Directory: `apps/web`, and turn on **Include source files outside of
     the Root Directory** so the workspace packages resolve.
   - Framework preset: Next.js (auto-detected). Install command: `pnpm install`.
3. **Environment variables:**
   - `DATABASE_URL` = the Neon pooled url
   - `DB_POOL_MAX` = `1` (one connection per serverless invocation)
   - `OBSERVATORY_BASE_URL` = `https://oblivio.fortitude-omnis.group` (or the
     `*.vercel.app` url until DNS is pointed)
   - `REVALIDATE_TOKEN` = a random secret (the pipeline uses the same value)
   - optional: `OBSERVATORY_ONRAMP_HREF`, `OBSERVATORY_POISONBOX_HREF`
4. Deploy. Point `oblivio.fortitude-omnis.group` at Vercel with a CNAME when you
   are ready to move off the landing page, or keep the landing page and host the
   app on the `*.vercel.app` url first.

## 3. Azure DevOps refresh pipeline (the cron)

1. Pipelines → New pipeline → existing YAML → `azure-pipelines-refresh.yml`.
2. Add pipeline variables (mark the secrets as secret):
   - `DATABASE_URL` (Neon pooled)
   - `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`
   - `GITHUB_APP_PRIVATE_KEY_BASE64` (base64 of the `.pem`:
     `[Convert]::ToBase64String([IO.File]::ReadAllBytes('key.pem'))`)
   - `WEB_BASE_URL` (the deployed site), `REVALIDATE_TOKEN` (same as Vercel)
3. Run it once by hand to seed data, then it fires every 6 hours. The first run
   defines up to `UNIVERSE_SIZE` packages per ecosystem and scores `BATCH_SIZE`
   of the stalest. Over a day of runs the universe fills in.

## Scaling the count

Raise the pipeline's `UNIVERSE_SIZE` variable (5000, 10000, more) to grow the
universe. The batch scorer always takes the stalest first, so it keeps pace on
the cadence. Raise `BATCH_SIZE` or shorten the cron to fill a larger universe
faster. The database is partitioned by month with a retention function
(`prune_snapshot_partitions`), so history stays fast and bounded no matter how
many packages or years accrue.
