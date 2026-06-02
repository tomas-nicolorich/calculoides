import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { ensureCert } from "./cert";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

if (!globalForPrisma.prisma) {
  const connectionString = process.env.DATABASE_URL;
  const url = new URL(connectionString);
  url.searchParams.set("sslcert", ensureCert());
  url.searchParams.set("sslmode", "verify-full");

  const pool = new pg.Pool({
    connectionString: url.toString(),
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
