import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Server-only: Prisma connects directly via `DATABASE_URL` (pg.Pool), never
// through PostgREST/RLS (design.md: "RLS stays non-load-bearing"). Import
// this only from Server Components, Server Actions, and Route Handlers —
// never from a "use client" module. Verbatim port of
// `api/_src/utils/prisma.ts`'s globalThis singleton pattern so hot reloads
// (dev) and serverless invocations (prod) reuse one PrismaClient/pg.Pool
// instead of exhausting connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

if (!globalForPrisma.prisma) {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);

  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
