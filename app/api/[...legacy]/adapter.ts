import { NextResponse, type NextRequest } from "next/server";
import type {
  ApiRequest,
  ApiResponse,
  Handler,
} from "../../../api/_src/middleware/handler";
import { createClient } from "../../../lib/supabase/server";
import { transactionsHandler } from "../../../api/_src/handlers/transactions";
import { matchLegacyRoute, type LegacyHandlerName } from "./routes-table";

/**
 * `ApiResponse` shim satisfying the `status()/json()/end()/setHeader()/
 * headersSent` surface the legacy handlers (`withErrorHandling`, `dispatch`,
 * and every `api/_src/handlers/*` route) actually touch. `ApiResponse`
 * extends Node's `ServerResponse`, which this object does NOT structurally
 * implement (no socket, no `writeHead`, etc.) — it is cast via
 * `as unknown as ApiResponse` at the call site, the same pattern already
 * used by `api/_tests/helpers.ts`'s `createMockResponse()`. 1b.2: proves
 * `res.status(x).json(y)` chaining and `res.status(204).end()` behave like
 * the real Express/Node response the handlers were written against.
 */
export class LegacyResponse {
  statusCode = 200;
  headersSent = false;

  private headers = new Headers();
  private settled = false;
  private resolveResult!: (response: NextResponse) => void;

  /** Resolves once a handler calls `.end()` or `.json()`. */
  readonly result: Promise<NextResponse>;

  constructor() {
    this.result = new Promise((resolve) => {
      this.resolveResult = resolve;
    });
  }

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  setHeader(name: string, value: string): void {
    this.headers.set(name, value);
  }

  json(data: unknown): void {
    this.setHeader("Content-Type", "application/json");
    this.end(JSON.stringify(data));
  }

  end(chunk?: string): void {
    if (this.settled) return;
    this.settled = true;
    this.headersSent = true;
    const body = chunk ?? null;
    this.resolveResult(
      new NextResponse(body, {
        status: this.statusCode,
        headers: this.headers,
      }),
    );
  }
}

/**
 * Reads and JSON-parses the request body, mirroring `express.json()`'s
 * graceful handling of an empty/absent body (GET/DELETE calls with no
 * payload resolve to `undefined`, matching what `req.body` was under the
 * Express shim for those methods).
 */
async function readBody(request: NextRequest): Promise<unknown> {
  const text = await request.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Builds the `ApiRequest`/`ApiResponse` shim pair for one legacy call.
 * `query` merges the caller's own query string with the matched route's
 * destination params (destination wins on key collision — 1b.3, mirrors
 * `vercel.json` rewrite precedence).
 */
export async function buildLegacyRequest(
  request: NextRequest,
  destinationQuery: Record<string, string>,
): Promise<{ req: ApiRequest; res: LegacyResponse }> {
  const url = new URL(request.url);
  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  Object.assign(query, destinationQuery);

  const body = await readBody(request);
  const authorization = request.headers.get("authorization") ?? undefined;

  const req = {
    method: request.method,
    headers: { authorization },
    query,
    cookies: {},
    body,
  } as unknown as ApiRequest;

  return { req, res: new LegacyResponse() };
}

/**
 * 1b.4 (Threat Matrix case 3; server-session-auth: "Both Auth Paths Derive
 * From the Same Supabase Session"): when the caller sends no `Authorization`
 * header, look up the `@supabase/ssr` cookie session and inject its
 * `access_token` as a synthetic bearer token. This does NOT trust the
 * cookie session directly — `withAuth`'s unchanged `getUserFromSession`
 * independently re-verifies the injected token against Supabase below, the
 * same as it would for a real client-sent bearer token. `getSession()` (not
 * `getUser()`) is used deliberately here to read the raw `access_token`;
 * the trust boundary is still `getUserFromSession`'s server-side check.
 */
async function injectBearerIfMissing(req: ApiRequest): Promise<void> {
  const headers = req.headers as unknown as {
    authorization?: string;
  };
  if (headers.authorization) return;

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    headers.authorization = `Bearer ${session.access_token}`;
  }
}

const LEGACY_HANDLERS: Record<LegacyHandlerName, Handler> = {
  transactions: transactionsHandler,
};

/**
 * 1b.7: adapts a `Request` to `ApiRequest`/`ApiResponse` and invokes the
 * unchanged `withErrorHandling(withAuth(dispatch(...)))` chain exported by
 * each `api/_src/handlers/*` module.
 */
export async function dispatchLegacyRequest(
  request: NextRequest,
  segments: string[],
): Promise<NextResponse> {
  const match = matchLegacyRoute(segments);
  if (!match) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const { req, res } = await buildLegacyRequest(request, match.query);
  await injectBearerIfMissing(req);

  const handler = LEGACY_HANDLERS[match.handlerName];
  await handler(req, res as unknown as ApiResponse);

  return res.result;
}
