import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { transactionsHandler } from "../../../src/handlers/transactions";
import { SavingsService } from "../../../src/services/savings";
import { RouteConfig } from "../../../src/utils/dispatcher";
import { ApiRequest, ApiResponse } from "../../../src/middleware/handler";

const mockedSavingsService = SavingsService as unknown as Record<string, Mock>;

// Mock dependencies
vi.mock("../../../src/services/savings");
vi.mock("../../../src/middleware/handler", () => ({
  withAuth: vi.fn(<T>(handler: T): T => handler),
  withErrorHandling: vi.fn(<T>(handler: T): T => handler),
}));
vi.mock("../../../src/utils/dispatcher", () => ({
  dispatch: vi.fn(
    async (
      req: ApiRequest,
      res: ApiResponse,
      routes: RouteConfig,
      defaultAction: string,
    ) => {
      const action = (req.query.action as string) || defaultAction;
      const handler = routes[action];
      if (handler) await handler(req, res);
    },
  ),
}));

describe("Savings Goal Handlers", () => {
  let req: Partial<ApiRequest>;
  let res: Partial<ApiResponse>;
  let jsonMock: Mock;
  let statusMock: Mock;
  let endMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonMock = vi.fn();
    endMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock, end: endMock });
    res = {
      status: statusMock,
      json: jsonMock,
    };
  });

  describe("savings-goals-list", () => {
    it("should return goals for a valid groupId", async () => {
      const groupId = "550e8400-e29b-41d4-a716-446655440000";
      req = { query: { action: "savings-goals-list", groupId } };
      const mockGoals = [{ id: "1", name: "Test Goal" }];
      mockedSavingsService.getGoalsForGroup.mockResolvedValue(mockGoals);

      await transactionsHandler(req as ApiRequest, res as ApiResponse);

      expect(mockedSavingsService.getGoalsForGroup).toHaveBeenCalledWith(
        groupId,
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockGoals);
    });

    it("should return 400 if groupId is missing", async () => {
      req = { query: { action: "savings-goals-list" } };

      await transactionsHandler(req as ApiRequest, res as ApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Missing groupId" });
    });
  });

  describe("savings-goal-update", () => {
    it("should update goal with valid data", async () => {
      const goalId = "550e8400-e29b-41d4-a716-446655440000";
      const targetDate = new Date().toISOString();
      req = {
        query: { action: "savings-goal-update", goalId },
        body: {
          name: "Updated Goal",
          targetAmount: 1000,
          targetDate,
          currentAmount: 100,
        },
      };
      const mockGoal = { id: goalId, name: "Updated Goal" };
      mockedSavingsService.updateGoal.mockResolvedValue(mockGoal);

      await transactionsHandler(req as ApiRequest, res as ApiResponse);

      expect(mockedSavingsService.updateGoal).toHaveBeenCalledWith(
        goalId,
        "Updated Goal",
        1000,
        expect.any(Date),
        100,
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockGoal);
    });

    it("should return 400 if goalId is missing", async () => {
      req = { query: { action: "savings-goal-update" }, body: {} };

      await transactionsHandler(req as ApiRequest, res as ApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Missing goalId" });
    });
  });

  describe("savings-goal-delete", () => {
    it("should delete goal with valid goalId", async () => {
      const goalId = "550e8400-e29b-41d4-a716-446655440000";
      req = { query: { action: "savings-goal-delete", goalId } };

      await transactionsHandler(req as ApiRequest, res as ApiResponse);

      expect(mockedSavingsService.deleteGoal).toHaveBeenCalledWith(goalId);
      expect(statusMock).toHaveBeenCalledWith(204);
    });
  });
});
