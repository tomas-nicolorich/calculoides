import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { transactionsHandler } from "../../../_src/handlers/transactions";
import { ExpenseService } from "../../../../lib/server/services/expense";
import { RouteConfig } from "../../../_src/utils/dispatcher";
import { ApiRequest, ApiResponse } from "../../../_src/middleware/handler";

const mockedExpenseService = ExpenseService as unknown as Record<string, Mock>;

vi.mock("../../../../lib/server/services/expense", () => ({
  ExpenseService: {
    updateExpense: vi.fn(),
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

const UUID = "550e8400-e29b-41d4-a716-446655440001";
const PAYER = "550e8400-e29b-41d4-a716-446655440002";
const CAT = "550e8400-e29b-41d4-a716-446655440003";
const USER_UUID = "550e8400-e29b-41d4-a716-446655440004";

describe("expense-update handler (PUT /transactions/:id)", () => {
  let mockResponse: Partial<ApiResponse>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
    };
  });

  it("calls updateExpense with correct args and returns 200", async () => {
    const updated = { id: UUID, description: "New", amount: 55 };
    mockedExpenseService.updateExpense.mockResolvedValue(updated);

    const mockRequest: Partial<ApiRequest> = {
      query: { action: "expense-update", id: UUID },
      body: {
        description: "New",
        amount: 55,
        date: "2024-06-15",
        categoryId: CAT,
        payerId: PAYER,
      },
      headers: {},
      // Simulate authenticated user
      user: { id: USER_UUID },
    } as unknown as ApiRequest;

    await transactionsHandler(
      mockRequest as ApiRequest,
      mockResponse as ApiResponse,
    );

    expect(mockedExpenseService.updateExpense).toHaveBeenCalledWith(
      UUID,
      {
        description: "New",
        amount: 55,
        date: "2024-06-15",
        categoryId: CAT,
        payerId: PAYER,
      },
      USER_UUID,
    );
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(updated);
  });

  it("returns 404 when service throws 'Expense not found'", async () => {
    mockedExpenseService.updateExpense.mockRejectedValue(
      new Error("Expense not found"),
    );

    const mockRequest: Partial<ApiRequest> = {
      query: { action: "expense-update", id: UUID },
      body: {
        description: "X",
        amount: 1,
        date: "2024-01-01",
        categoryId: CAT,
        payerId: PAYER,
      },
      headers: {},
      user: { id: USER_UUID },
    } as unknown as ApiRequest;

    await transactionsHandler(
      mockRequest as ApiRequest,
      mockResponse as ApiResponse,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(404);
  });

  it("returns 403 when service throws 'Not a member'", async () => {
    mockedExpenseService.updateExpense.mockRejectedValue(
      new Error("Not a member of this group"),
    );

    const mockRequest: Partial<ApiRequest> = {
      query: { action: "expense-update", id: UUID },
      body: {
        description: "X",
        amount: 1,
        date: "2024-01-01",
        categoryId: CAT,
        payerId: PAYER,
      },
      headers: {},
      user: { id: USER_UUID },
    } as unknown as ApiRequest;

    await transactionsHandler(
      mockRequest as ApiRequest,
      mockResponse as ApiResponse,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(403);
  });
});
