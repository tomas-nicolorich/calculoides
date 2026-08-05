import { NextResponse, type NextRequest } from "next/server";
import { dispatchLegacyRequest } from "./adapter";

/**
 * Compatibility Route Handler for every `/api/*` path not yet ported to a
 * Server Action or its own Route Handler (design.md: "a compatibility Route
 * Handler ... adapts a `Request` to the existing `ApiRequest`/`ApiResponse`
 * shape and invokes the unchanged exported handlers"). Replaces
 * `vercel.json`'s API `rewrites` (1b.9) and the Express dev shim (1b.10).
 *
 * `middleware.ts` never intercepts `/api/*` with its redirect branch
 * (server-session-auth: "Legacy API paths are excluded from the matcher"),
 * so every method handler here is reached even for an unauthenticated
 * caller — the legacy `withAuth` chain (invoked unchanged inside the
 * matched handler) is what returns 401 JSON in that case, never a redirect.
 */
async function handleLegacyRequest(
  request: NextRequest,
  context: { params: Promise<{ legacy?: string[] }> },
): Promise<NextResponse> {
  const { legacy } = await context.params;
  return dispatchLegacyRequest(request, legacy ?? []);
}

export const GET = handleLegacyRequest;
export const POST = handleLegacyRequest;
export const PUT = handleLegacyRequest;
export const PATCH = handleLegacyRequest;
export const DELETE = handleLegacyRequest;
