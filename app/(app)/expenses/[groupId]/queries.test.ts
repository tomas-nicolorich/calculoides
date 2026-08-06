// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../../frontend/src/shared/api/queryKeys";
import { invalidateGroupQueries } from "./queries";

const GROUP_X = "22222222-2222-4222-8222-222222222222";
const GROUP_Y = "33333333-3333-4333-8333-333333333333";

/**
 * client-data-cache: "Mutation for one group does not affect another"
 * (4b.8). Genuine RED before `invalidateGroupQueries` existed: module not
 * found, same pre-GREEN gate 4a's whole-file expense action tests used.
 */
describe("invalidateGroupQueries", () => {
  it("does not mark group Y's cached queries stale when group X mutates", async () => {
    const queryClient = new QueryClient();
    await queryClient.prefetchQuery({
      queryKey: queryKeys.summary(GROUP_X),
      queryFn: () => Promise.resolve({ groupName: "X" }),
    });
    await queryClient.prefetchQuery({
      queryKey: queryKeys.summary(GROUP_Y),
      queryFn: () => Promise.resolve({ groupName: "Y" }),
    });

    await invalidateGroupQueries(queryClient, GROUP_X);

    expect(
      queryClient.getQueryState(queryKeys.summary(GROUP_X))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.summary(GROUP_Y))?.isInvalidated,
    ).toBe(false);
  });

  it("invalidates every group-X query regardless of resource type", async () => {
    const queryClient = new QueryClient();
    await queryClient.prefetchQuery({
      queryKey: queryKeys.summary(GROUP_X),
      queryFn: () => Promise.resolve({ groupName: "X" }),
    });
    await queryClient.prefetchQuery({
      queryKey: queryKeys.categories(GROUP_X),
      queryFn: () => Promise.resolve([]),
    });
    await queryClient.prefetchQuery({
      queryKey: queryKeys.expenses(GROUP_X),
      queryFn: () => Promise.resolve({ expenses: [], pagination: {} }),
    });

    await invalidateGroupQueries(queryClient, GROUP_X);

    expect(
      queryClient.getQueryState(queryKeys.summary(GROUP_X))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.categories(GROUP_X))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.expenses(GROUP_X))?.isInvalidated,
    ).toBe(true);
  });
});
