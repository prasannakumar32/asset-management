# Deployment Guide - Asset Tracker

## Local Development

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start local server:
   ```bash
   npm run dev
   ```

## Production Deployment (Render)

### Option 1: Using Render Dashboard (Recommended)

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up for free account

2. **Create PostgreSQL Database**
   - Click "New +" → "PostgreSQL"
   - Name: `asset-tracker-db`
   - Database Name: `asset_tracker`
   - User: `asset_tracker_user`
   - Plan: Free
   - Click "Create Database"

3. **Get Database Connection Details**
   - Go to your database dashboard
   - Copy the "External Database URL"
   - Format: `postgres://username:password@host:port/database`

4. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Add Environment Variables:
     - `NODE_ENV`: `production`
     - `SESSION_SECRET`: (generate random string)
     - `DATABASE_URL`: (paste from step 3)

5. **Deploy**
   - Render will automatically deploy on push to main branch

### Option 2: Using render.yaml (Automatic)

1. Push the `render.yaml` file to your repository
2. Connect your repository to Render
3. Render will automatically create both database and web service

## Environment Variables

### Production Required:
- `NODE_ENV=production`
- `DATABASE_URL=postgres://user:pass@host:port/db`
- `SESSION_SECRET=random-secret-string`

### Optional:
- `PORT=3000` (Render sets this automatically)

## Database Migration

The application automatically syncs database tables on startup. Your existing data structure will be preserved.

---

## Importing / Seeding data (local → production)

Two safe options are provided below. **Always backup production before overwriting or importing data.**

A) Mirror local DB → production (overwrite entire DB)

- Backup production first:

  ```powershell
  # Save your production DATABASE_URL to env (Render dashboard provides this)
  $env:DATABASE_URL = "postgresql://<prod_user>:<prod_pass>@<prod_host>:<prod_port>/<prod_db>?sslmode=require"
  # Dump production (custom format)
  pg_dump -F c -v -f prod_backup.dump $env:DATABASE_URL
  ```

- Dump your local DB and restore to production (PowerShell example):

  ```powershell
  # Dump local DB (replace local creds)
  $env:PGPASSWORD = 'local_password'
  pg_dump -h localhost -p 5432 -U postgres -F c -b -v -f local_dump.dump local_db_name
  Remove-Item Env:PGPASSWORD

  # Restore to production (you may set $env:DATABASE_URL with the Render DB URL)
  # Parse/replace host/user/db from your DATABASE_URL or use pg_restore with host/port/user
  pg_restore --verbose --clean --no-owner --no-acl -h <prod_host> -p <prod_port> -U <prod_user> -d <prod_db> local_dump.dump
  ```

Notes:
- Use `pg_dump -F c` (custom) + `pg_restore` for reliable restores.
- `--clean` drops objects before recreating them (destructive).
- Test the restore in a staging DB first when possible.

B) Safer — run idempotent seed scripts on production

- This repository now includes idempotent seed scripts. To run them in production **safely**, set these environment variables in your Render (or host) service _and redeploy_:

  - `RUN_SEEDS=true`
  - `RUN_SEEDS_CONFIRM=yes`  (required for production)

- On startup the app will execute `scripts/seed-admin.js`, `scripts/seed-sample-data.js` and `scripts/seed-assets-only.js` (they are idempotent: use `findOrCreate` / `findOrCreate` by unique keys).

- Example: add the two env vars in Render dashboard and redeploy — the app will seed without duplicating existing rows.

C) Export / import selected tables (CSV)

- Export:
  ```powershell
  psql -h localhost -U postgres -d local_db -c "\copy employees TO 'employees.csv' CSV HEADER"
  ```
- Import on prod:
  ```powershell
  psql "postgresql://user:pass@host:port/db?sslmode=require" -c "\copy employees FROM 'employees.csv' CSV HEADER"
  ```

---

If you want, I can:
- prepare a PowerShell helper `scripts/mirror-local-to-prod.ps1` to automate dump/restore, or
- run a PR that adds a non-destructive staging restore workflow and docs.



## Free Tier Limitations

- **Render PostgreSQL**: 1GB storage, 30-day limit
- **Render Web Service**: Spins down after 15 minutes inactivity
- **Database**: No automatic backups on free tier

## Testing Production

1. After deployment, visit your Render URL
2. Test login functionality
3. Verify database operations work correctly

## Troubleshooting

### Database Connection Issues
- Check DATABASE_URL format
- Ensure SSL is enabled for production
- Verify database user permissions

### Application Errors
- Check Render logs
- Verify all dependencies are in package.json
- Ensure PORT is correctly configured

### Performance Issues
- Free tier has limited resources
- Consider upgrading for production use
- Monitor database usage (1GB limit)
