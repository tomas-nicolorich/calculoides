import { performance } from "perf_hooks";

const ENDPOINTS = [
  "/api/groups",
  "/api/expenses",
  "/api/transfers",
  "/api/summary",
  "/api/savings",
  "/api/categories",
  "/api/members",
];

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";

async function benchmark() {
  console.log(`Starting baseline benchmark against ${BASE_URL}...`);
  const results: Record<string, { latency: string; status: number }> = {};

  for (const endpoint of ENDPOINTS) {
    try {
      const start = performance.now();
      const response = await fetch(`${BASE_URL}${endpoint}`);
      const end = performance.now();

      results[endpoint] = {
        latency: `${(end - start).toFixed(2)}ms`,
        status: response.status,
      };
      console.log(
        `${endpoint}: ${(end - start).toFixed(2)}ms (${String(response.status)})`,
      );
    } catch (error) {
      console.error(
        `Failed to benchmark ${endpoint}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  console.log("\nFinal Baseline Results:");
  console.table(results);
}

benchmark().catch(console.error);
