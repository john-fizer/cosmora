import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const migrationsDir = fileURLToPath(new URL("./migrations", import.meta.url));

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const applied = await pool.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations",
    );
    const appliedSet = new Set(applied.rows.map((r) => r.filename));

    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`skip ${file} (already applied)`);
        continue;
      }
      const sql = readFileSync(path.join(migrationsDir, file), "utf-8");
      console.log(`applying ${file}`);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }
    console.log("migrations complete");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
