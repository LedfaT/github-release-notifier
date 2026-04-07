import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { env } from "./env";
import { Database } from "../db/database.types";

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new pg.Pool({
      connectionString: env.DATABASE_URL,
    }),
  }),
});
