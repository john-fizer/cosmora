import { describe, it, expect } from "vitest";
import pg from "pg";
import "../src/db.js";

describe("DATE column type parsing", () => {
  it("keeps the Postgres DATE wire value as a raw string instead of coercing through a local-midnight JS Date", () => {
    // OID 1082 is Postgres's `date` type. pg's built-in parser decodes it
    // into a JS Date anchored to *local* midnight; re-serializing that via
    // .toISOString() shifts the calendar day on any host east of UTC. A
    // DATE has no time-of-day or timezone, so the only correct parse is
    // the identity function on the string Postgres already sent.
    const parser = pg.types.getTypeParser(1082);
    expect(parser("1991-04-23")).toBe("1991-04-23");
  });
});
