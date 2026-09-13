# One-time Turso setup

Prisma's `migrate`/`db push` don't support Turso's remote connection directly,
so the schema has to be created once by hand. Do this before the first deploy
(or after any schema change).

1. **Install the Turso CLI** (if you don't have it): see https://docs.turso.tech/cli/installation

2. **Create a database and log in:**
   ```bash
   turso auth login
   turso db create educentral
   ```

3. **Get the connection details:**
   ```bash
   turso db show educentral --url
   turso db tokens create educentral
   ```
   The first command gives you `TURSO_DATABASE_URL` (looks like `libsql://educentral-<org>.turso.io`), the second gives you `TURSO_AUTH_TOKEN`.

4. **Apply the schema** (this file lives at `backend/prisma/turso-init.sql`, generated from `schema.prisma`):
   ```bash
   turso db shell educentral < prisma/turso-init.sql
   ```
   (No Turso CLI? Paste the contents of `turso-init.sql` into the SQL console on your database's page at https://turso.tech instead.)

5. **Set the two env vars in Render** (`educentral` service → Environment tab):
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`

6. Redeploy. The seed script (which only creates the Master Admin from `MASTER_ADMIN_EMAIL`/`MASTER_ADMIN_PASSWORD`) runs automatically on every boot from here on — it's idempotent, so restarts won't duplicate it.

**If the schema ever changes** (a new field, a new table): regenerate the SQL and re-run step 4 —
```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/turso-init.sql
```
Note this only works for a *fresh* database (it diffs from empty). For an existing Turso database with data already in it, generate a diff from the *previous* schema version instead of `--from-empty`, or apply the specific `ALTER TABLE` statements by hand.
