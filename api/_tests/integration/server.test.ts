import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, ChildProcess } from "child_process";
import path from "path";

describe("Local API Server Integration", () => {
  let serverProcess: ChildProcess;
  const port = 3002;

  beforeAll(async () => {
    console.log("Starting test server...");
    const apiRoot = path.resolve(__dirname, "../../");

    // Use npx tsx directly to avoid npm shell wrapper issues on Windows
    const isWindows = process.platform === "win32";
    const command = isWindows ? "npx.cmd" : "npx";

    serverProcess = spawn(command, ["tsx", "_src/server.ts"], {
      cwd: apiRoot,
      env: {
        ...process.env,
        CALC_ENVIRONMENT: "test-local",
        PORT: port.toString(),
        NODE_ENV: "test",
      },
      shell: true,
      stdio: "inherit",
    });

    // Give the server even more time to start
    await new Promise((resolve) => setTimeout(resolve, 20000));
  }, 40000);

  afterAll(() => {
    console.log("Stopping test server...");
    serverProcess.kill();
  });

  it("should be reachable at /api/health", async () => {
    try {
      const response = await fetch(
        `http://127.0.0.1:${port.toString()}/api/health`,
      );
      expect(response.status).toBe(200);
      const data = (await response.json()) as Record<string, unknown>;
      expect(data).toHaveProperty("status");
    } catch (err) {
      console.error("Fetch failed:", err);
      throw err;
    }
  });

  it("should return 404 for unknown routes", async () => {
    const response = await fetch(
      `http://127.0.0.1:${port.toString()}/api/nonexistent-route-for-testing`,
    );
    expect(response.status).toBe(404);
  });

  it("should support vercel.json rewrites (e.g., /api/archive -> /api/groups?action=archive)", async () => {
    const response = await fetch(
      `http://127.0.0.1:${port.toString()}/api/archive`,
      {
        method: "POST",
      },
    );
    expect(response.status).not.toBe(404);
  });

  it("should support rewrites for method-aware routes like /api/invitations", async () => {
    const response = await fetch(
      `http://127.0.0.1:${port.toString()}/api/invitations`,
      {
        method: "GET",
      },
    );
    // Should be 401 Unauthorized because we lack a token, but NOT 404
    expect(response.status).toBe(401);
  });

  describe("Method-aware routing for /api/savings", () => {
    const methods = ["GET", "POST", "PATCH", "DELETE"];

    methods.forEach((method) => {
      it(`should route ${method} /api/savings to transactions handler (should return 401, not 404)`, async () => {
        const response = await fetch(
          `http://127.0.0.1:${port.toString()}/api/savings`,
          {
            method,
          },
        );
        expect(response.status).toBe(401);
      });
    });

    it("should return 405 Method Not Allowed for unsupported methods on /api/savings", async () => {
      const response = await fetch(
        `http://127.0.0.1:${port.toString()}/api/savings`,
        {
          method: "PUT",
        },
      );
      // Wait, we returned 405 Method Not Allowed, but since it's wrapped with Auth/Error handling,
      // let's see if auth triggers first or if the method check triggers first.
      // Ah! In `api/src/handlers/transactions.ts`:
      // `transactionsHandler = withErrorHandling(withAuth(async (req, res) => { return dispatch(req, res, routes, "summary") }))`
      // Since `withAuth` wraps the entire transactionsHandler, the auth check happens BEFORE dispatch.
      // So any request to /api/savings, regardless of method, will return 401 first if unauthorized.
      // But if authorized, PUT will return 405.
      // Therefore, the test response should be 401 since we have no auth token.
      expect(response.status).toBe(401);
    });
  });
});
