import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

// Production talks to Turso over the libSQL driver adapter (TURSO_DATABASE_URL
// + TURSO_AUTH_TOKEN); Prisma's migrate/db push don't support that connection
// directly, which is why schema changes are applied via the Turso CLI instead
// (see prisma/turso-init.sql). Local dev has neither var set, so it falls
// back to a plain file-based SQLite client where migrate/db push work as usual.
const tursoUrl = process.env.TURSO_DATABASE_URL;

export const prisma = tursoUrl
  ? new PrismaClient({
      adapter: new PrismaLibSQL(
        createClient({ url: tursoUrl, authToken: process.env.TURSO_AUTH_TOKEN })
      ),
    })
  : new PrismaClient();
