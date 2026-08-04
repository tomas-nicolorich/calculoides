import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { GroupListProvider, useGroupList } from "./GroupListContext";
import { createTestQueryClient, QueryWrapper } from "../../test/queryTestUtils";
import type { Group } from "../../entities/group";

const { mockList } = vi.hoisted(() => ({
  mockList: vi.fn<(signal?: AbortSignal) => Promise<Group[]>>(),
}));

vi.mock("../../entities/group", () => ({
  groupApi: { list: mockList },
}));

let mockUser: { id: string } | null = { id: "u1" };
vi.mock("./AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

/** A client with a real (non-zero) staleTime, for cache-hit-on-remount cases. */
function createCacheableTestClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });
}

function Harness() {
  const { groups, loading, error, refresh } = useGroupList();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span>{error ?? "no-error"}</span>
      <ul>
        {groups.map((group) => (
          <li key={group.id}>{group.name}</li>
        ))}
      </ul>
      <button onClick={refresh}>refresh</button>
    </div>
  );
}

function BareHarness() {
  useGroupList();
  return null;
}

const groupsFixture: Group[] = [
  { id: "g1", name: "Household", ownerId: "u1", members: [], role: "OWNER" },
];

beforeEach(() => {
  mockList.mockReset();
  mockUser = { id: "u1" };
});

describe("useGroupList", () => {
  it("throws when used outside a GroupListProvider", () => {
    expect(() => render(<BareHarness />)).toThrow(
      "useGroupList must be used within GroupListProvider",
    );
  });

  it("loads the group list and serves it from cache on remount (no second fetch)", async () => {
    mockList.mockResolvedValue(groupsFixture);
    const client = createCacheableTestClient();

    const first = render(
      <QueryWrapper client={client}>
        <GroupListProvider>
          <Harness />
        </GroupListProvider>
      </QueryWrapper>,
    );
    await screen.findByText("Household");
    first.unmount();

    render(
      <QueryWrapper client={client}>
        <GroupListProvider>
          <Harness />
        </GroupListProvider>
      </QueryWrapper>,
    );

    expect(await screen.findByText("Household")).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it("refresh() triggers a second fetch", async () => {
    mockList.mockResolvedValue(groupsFixture);

    render(
      <QueryWrapper client={createTestQueryClient()}>
        <GroupListProvider>
          <Harness />
        </GroupListProvider>
      </QueryWrapper>,
    );

    await screen.findByText("Household");
    expect(mockList).toHaveBeenCalledTimes(1);

    screen.getByRole("button", { name: "refresh" }).click();

    await vi.waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(2);
    });
  });

  it("surfaces a fetch failure as a string error", async () => {
    mockList.mockRejectedValue(new Error("groups down"));

    render(
      <QueryWrapper client={createTestQueryClient()}>
        <GroupListProvider>
          <Harness />
        </GroupListProvider>
      </QueryWrapper>,
    );

    await screen.findByText("groups down");
  });
});
