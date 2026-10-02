const fs = require("node:fs/promises");
const path = require("node:path");
const { Client } = require("pg");
const { resolveDatabaseUrl } = require("./database");

const migrationsDir = path.join(process.cwd(), "prisma", "migrations");

async function migrationFiles() {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      path: path.join(migrationsDir, entry.name, "migration.sql"),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function main() {
  const connectionString = await resolveDatabaseUrl();
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query("SELECT pg_advisory_lock(hashtext('inframorph-migrations'))");
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_inframorph_migrations" (
        "name" TEXT PRIMARY KEY,
        "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const migration of await migrationFiles()) {
      const applied = await client.query(
        'SELECT 1 FROM "_inframorph_migrations" WHERE "name" = $1',
        [migration.name],
      );
      if (applied.rowCount > 0) {
        continue;
      }

      const sql = await fs.readFile(migration.path, "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO "_inframorph_migrations" ("name") VALUES ($1)',
          [migration.name],
        );
        await client.query("COMMIT");
        console.log(`applied migration ${migration.name}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('inframorph-migrations'))").catch(() => {});
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
