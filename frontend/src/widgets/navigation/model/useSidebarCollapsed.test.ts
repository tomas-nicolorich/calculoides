import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useSidebarCollapsed } from "./useSidebarCollapsed";

const STORAGE_KEY = "calculoides.sidebarCollapsed";

describe("useSidebarCollapsed", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to expanded when nothing is stored", () => {
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(result.current[0]).toBe(false);
  });

  it("persists the collapsed choice to localStorage and reflects it after reload", () => {
    const { result } = renderHook(() => useSidebarCollapsed());

    act(() => {
      result.current[1]();
    });

    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("true");

    const { result: reloaded } = renderHook(() => useSidebarCollapsed());
    expect(reloaded.current[0]).toBe(true);
  });

  it("toggles back to expanded and clears the persisted flag accordingly", () => {
    const { result } = renderHook(() => useSidebarCollapsed());

    act(() => {
      result.current[1]();
    });
    act(() => {
      result.current[1]();
    });

    expect(result.current[0]).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("false");
  });
});
