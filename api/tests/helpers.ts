import { vi } from "vitest";
import { ApiResponse } from "../src/middleware/handler";

export function createMockResponse(): ApiResponse {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    headersSent: false,
  } as unknown as ApiResponse;
}
