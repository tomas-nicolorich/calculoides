import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AuthBrand } from "./AuthBrand";

describe("AuthBrand", () => {
  it("renders default logo mark and Calculoides wordmark", () => {
    render(<AuthBrand />);
    expect(screen.getByTestId("brand-mark")).toBeInTheDocument();
    expect(screen.getByText("Calculoides")).toBeInTheDocument();
  });

  it("renders custom mark prop in place of the default logo", () => {
    render(<AuthBrand mark={<span>Logo</span>} />);
    expect(screen.getByText("Logo")).toBeInTheDocument();
    expect(screen.queryByTestId("brand-mark")).toBeNull();
  });
});
