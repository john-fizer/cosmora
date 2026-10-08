import pg from "pg";

// Postgres DATE (OID 1082) has no time-of-day or timezone component. pg's
// built-in parser decodes it into a JS Date anchored to the server process's
// local midnight; re-serializing that via .toISOString() shifts the
// calendar day on any host east of UTC. Keep the raw "YYYY-MM-DD" string
// Postgres already sent — there is nothing to parse.
pg.types.setTypeParser(1082, (value) => value);

let pool: pg.Pool | undefined;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
