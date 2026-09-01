import pg from "pg";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required.");
}

const parsed = new URL(connectionString);
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  const settings = await client.query(
    "SELECT name, setting FROM pg_settings WHERE name LIKE 'neon.%' ORDER BY name",
  );
  const migrations = await client.query(
    'SELECT migration_name, finished_at FROM "_prisma_migrations" WHERE rolled_back_at IS NULL ORDER BY finished_at DESC NULLS LAST LIMIT 1',
  );
  const counts = await client.query(`
    SELECT
      (SELECT count(*)::int FROM "Organization") AS organizations,
      (SELECT count(*)::int FROM "Project") AS projects,
      (SELECT count(*)::int FROM "RepositoryImport") AS repository_imports
  `);

  console.log(
    JSON.stringify(
      {
        host: parsed.hostname,
        database: parsed.pathname.replace(/^\//, ""),
        neonSettingNames: settings.rows.map(({ name }) => name),
        neonIdentitySettings: settings.rows
          .filter(({ name }) => /(branch|endpoint|project)/i.test(name))
          .map(({ name, setting }) => ({
            name,
            setting: String(setting).slice(0, 200),
          })),
        latestMigration: migrations.rows[0] ?? null,
        recordCounts: counts.rows[0],
      },
      null,
      2,
    ),
  );
} finally {
  await client.end();
}
