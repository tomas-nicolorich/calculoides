// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReloadButton } from "./ReloadButton";

/**
 * PR 4 (spec `ui-design-system`). DEVIATION (see tasks.md 4.12): the spec
 * wording says "click fires the passed onReload callback" — but `main`'s
 * actual `shared/ui/ReloadButton.tsx` has no `onReload` prop at all. Its
 * real API is `{ queryKey: QueryKey; className?: string }`; it calls
 * `useQueryClient().invalidateQueries({ queryKey })` internally and shows a
 * spinner while that invalidation is pending. Ported verbatim from `main`,
 * not the spec's paraphrase (same "confirm against real source" lesson PR 3
 * recorded for its own deviations).
 */
function renderWithClient(ui: React.ReactElement, client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe("ReloadButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("invalidates the given query key on click", async () => {
    const client = new QueryClient();
    const invalidateQueries = vi.spyOn(client, "invalidateQueries");

    renderWithClient(<ReloadButton queryKey={["summary"]} />, client);

    screen.getByRole("button", { name: "Reload data" }).click();

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["summary"],
      });
    });
  });

  it("shows a spinning icon while the invalidation is pending", async () => {
    const client = new QueryClient();
    let resolveInvalidate: (() => void) | undefined;
    vi.spyOn(client, "invalidateQueries").mockReturnValue(
      new Promise((resolve) => {
        resolveInvalidate = () => {
          resolve();
        };
      }),
    );

    renderWithClient(<ReloadButton queryKey={["summary"]} />, client);

    const button = screen.getByRole("button", { name: "Reload data" });
    button.click();

    await waitFor(() => expect(button).toBeDisabled());
    expect(button.querySelector("svg")).toHaveClass("animate-spin");

    resolveInvalidate?.();
    await waitFor(() => expect(button).not.toBeDisabled());
  });
});
