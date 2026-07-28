import { ApiRequest, ApiResponse } from "../middleware/handler";

/**
 * Route configuration mapping action names to handler functions.
 */
export type RouteConfig = Record<
  string,
  ((req: ApiRequest, res: ApiResponse) => Promise<void> | void) | undefined
>;

/**
 * Maps HTTP methods to default action names when no ?action= is present.
 */
const DEFAULT_BY_METHOD: Partial<Record<string, string>> = {
  GET: "list",
  POST: "create",
  PUT: "update",
  PATCH: "update",
  DELETE: "delete",
};

/**
 * Dispatches a request to a specific handler based on an 'action' query parameter,
 * or falls back to the default action for the HTTP method.
 *
 * @param req - The API Request object
 * @param res - The API Response object
 * @param routes - Mapping of actions to handlers
 * @param defaultAction - The action to use if none is specified (defaults to 'list')
 */
export async function dispatch(
  req: ApiRequest,
  res: ApiResponse,
  routes: RouteConfig,
  defaultAction = "list",
): Promise<void> {
  try {
    // Get action from query parameter, fallback to method default, then to defaultAction
    const method = typeof req.method === "string" ? req.method : "GET";
    const action =
      (req.query.action as string | undefined) ??
      DEFAULT_BY_METHOD[method] ??
      defaultAction;
    const handler = routes[action];

    if (!handler) {
      console.warn(
        `Dispatcher: Action '${action}' not found in registered routes.`,
      );
      res.status(404).json({ error: `Action '${action}' not found` });
      return;
    }

    // Execute the handler
    await handler(req, res);
  } catch (error) {
    console.error("Dispatcher error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal error" });
    }
  }
}
