import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Next.js keeps local secrets in .env.local. Prisma CLI does not load that file
// automatically, so load it explicitly before reading DIRECT_URL.
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma CLI operations (introspection/migrations) should use session mode.
    url: env("DIRECT_URL"),
  },
});
