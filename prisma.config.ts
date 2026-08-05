import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";
import { defineConfig } from "prisma/config";

const localEnvPath = resolve(process.cwd(), ".env.local");
config({
  path: existsSync(localEnvPath)
    ? localEnvPath
    : resolve(process.cwd(), ".env"),
});

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.POSTGRES_PRISMA_URL,
  },
});
