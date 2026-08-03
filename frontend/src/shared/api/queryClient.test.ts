import { describe, it, expect } from "vitest";
import {
  createQueryClient,
  BASE_QUERY_DEFAULTS,
  GROUPS_STALE_TIME,
} from "./queryClient";
import { queryKeys } from "./queryKeys";

describe("createQueryClient", () => {
  it("applies the D2 base query defaults", () => {
    const client = createQueryClient();
    const defaults = client.defaultQueryOptions({ queryKey: ["anything"] });

    expect(defaults.staleTime).toBe(30_000);
    expect(defaults.gcTime).toBe(5 * 60_000);
    expect(defaults.retry).toBe(1);
    expect(defaults.refetchOnWindowFocus).toBe(true);
    expect(defaults.refetchOnReconnect).toBe(true);
    expect(defaults.refetchInterval).toBeUndefined();
  });

  it('overrides staleTime to 5 minutes for the ["groups"] query', () => {
    const client = createQueryClient();
    const defaults = client.defaultQueryOptions({
      queryKey: queryKeys.groups(),
    });

    expect(defaults.staleTime).toBe(GROUPS_STALE_TIME);
  });

  it("does not apply the groups staleTime override to other queries", () => {
    const client = createQueryClient();
    const defaults = client.defaultQueryOptions({
      queryKey: ["group", "g1", "summary"],
    });

    expect(defaults.staleTime).toBe(BASE_QUERY_DEFAULTS.staleTime);
  });

  it("preserves D2 defaults when o.queries partially overrides a field", () => {
    const client = createQueryClient({ queries: { retry: 3 } });
    const defaults = client.defaultQueryOptions({ queryKey: ["anything"] });

    expect(defaults.retry).toBe(3);
    expect(defaults.staleTime).toBe(BASE_QUERY_DEFAULTS.staleTime);
    expect(defaults.gcTime).toBe(BASE_QUERY_DEFAULTS.gcTime);
  });

  it("sets mutations retry to 0 by default", () => {
    const client = createQueryClient();
    const defaults = client.getDefaultOptions().mutations;

    expect(defaults?.retry).toBe(0);
  });
});
