import { vi } from "vitest";
import type { RouteConfig } from "../dispatcher";
import type { ApiRequest, ApiResponse } from "../../middleware/handler";

// fallow-ignore-next-line
export const dispatch = vi.fn(
  (req: ApiRequest, res: ApiResponse, routes: RouteConfig, action: string) => {
    const handler = routes[action];
    if (handler) return handler(req, res);
    res.status(404).json({ error: "Action not found" });
  },
);
