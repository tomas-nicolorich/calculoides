import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { transactionsHandler } from "../../../_src/handlers/transactions";
import { TransferService } from "../../../_src/services/transfer";
import { RouteConfig } from "../../../_src/utils/dispatcher";
import { ApiRequest, ApiResponse } from "../../../_src/middleware/handler";

const mockedTransferService = TransferService as unknown as Record<
  string,
  Mock
>;

vi.mock("../../../_src/services/transfer", () => ({
  TransferService: {
    deleteTransfer: vi.fn(),
  },
}));

vi.mock("../../../_src/utils/dispatcher", () => ({
  dispatch: vi.fn(
    (
      req: ApiRequest,
      res: ApiResponse,
      routes: RouteConfig,
      defaultAction: string,
    ) => {
      const action = (req.query.action as string) || defaultAction;
      const handler = routes[action];
      if (handler) return handler(req, res);
      res.status(404).json({ error: "Action not found" });
    },
  ),
}));

vi.mock("../../../_src/middleware/handler", () => ({
  withAuth: <T>(handler: T): T => handler,
  withErrorHandling: <T>(handler: T): T => handler,
}));

describe("transfer-delete handler", () => {
  let mockRequest: Partial<ApiRequest>;
  let mockResponse: Partial<ApiResponse>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
    };
  });

  const uuid = "00000000-0000-0000-0000-000000000000";
  const callerUserId = "11111111-1111-1111-1111-111111111111";

  it("should extract id from query", async () => {
    mockRequest = {
      query: { action: "transfer-delete", id: uuid },
      headers: {},
      user: { id: callerUserId },
    } as unknown as Partial<ApiRequest>;

    await transactionsHandler(
      mockRequest as ApiRequest,
      mockResponse as ApiResponse,
    );

    expect(mockedTransferService.deleteTransfer).toHaveBeenCalledWith(
      uuid,
      callerUserId,
    );
    expect(mockResponse.status).toHaveBeenCalledWith(204);
  });

  it("should extract id from params (rewritten path)", async () => {
    mockRequest = {
      query: { action: "transfer-delete" },
      headers: {},
      user: { id: callerUserId },
    } as unknown as Partial<ApiRequest>;
    (mockRequest as ApiRequest & { params?: Record<string, string> }).params = {
      id: uuid,
    };

    await transactionsHandler(
      mockRequest as ApiRequest,
      mockResponse as ApiResponse,
    );

    expect(mockedTransferService.deleteTransfer).toHaveBeenCalledWith(
      uuid,
      callerUserId,
    );
    expect(mockResponse.status).toHaveBeenCalledWith(204);
  });

  it("should fail with invalid UUID", async () => {
    mockRequest = {
      query: { action: "transfer-delete", id: "invalid-uuid" },
      headers: {},
    };

    await expect(
      transactionsHandler(
        mockRequest as ApiRequest,
        mockResponse as ApiResponse,
      ),
    ).rejects.toThrow();
  });

  it("should route DELETE /transactions/:id?type=transfer to transfer-delete", async () => {
    mockRequest = {
      method: "DELETE",
      query: { action: "transaction", id: uuid, type: "transfer" },
      headers: {},
      user: { id: callerUserId },
    } as unknown as Partial<ApiRequest>;

    await transactionsHandler(
      mockRequest as ApiRequest,
      mockResponse as ApiResponse,
    );

    expect(mockedTransferService.deleteTransfer).toHaveBeenCalledWith(
      uuid,
      callerUserId,
    );
    expect(mockResponse.status).toHaveBeenCalledWith(204);
  });
});
