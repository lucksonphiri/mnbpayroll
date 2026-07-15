import { neon } from "@neondatabase/serverless";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://invalid:invalid@localhost:5432/invalid";

export const sql = neon(databaseUrl);
