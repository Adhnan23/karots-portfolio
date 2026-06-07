import { defineConfig } from "drizzle-kit";

// Bun auto-loads .env, so DATABASE_URL is available here.
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (see .env)");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
