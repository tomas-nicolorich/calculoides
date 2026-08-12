// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { GroupsClient } from "./GroupsClient";

/**
 * groups-view spec (PR 11, ADR-0008 parity): the list card is built from
 * `app/_ui` `Card`, not the previous plain `<li>`/`<Link>` markup (3b.8's
 * "lean, not a full port" precedent). RED against that lean version —
 * `Card` renders no `<li>` and its own container classes, which the plain
 * markup never produced.
 */
describe("GroupsClient", () => {
  afterEach(() => {
    cleanup();
  });

  // Scenario: "Populated list shows role and member count"
  it("shows a group's name, role, and member count via app/_ui Card, not a plain list", () => {
    const { container } = render(
      <GroupsClient
        groups={[
          {
            id: "abc123",
            name: "Roomies",
            role: "MEMBER",
            members: [{ id: "m1" }, { id: "m2" }, { id: "m3" }],
          },
        ]}
      />,
    );

    expect(screen.getByText("Roomies")).toBeInTheDocument();
    expect(screen.getByText("member · 3 members")).toBeInTheDocument();
    // The card must not be built from the old plain `<li>` markup.
    expect(container.querySelectorAll("li")).toHaveLength(0);
  });

  // Scenario: "Selecting a group navigates to its dashboard" — already true
  // in the pre-rewrite implementation (`Link href={...dashboard/${id}}`);
  // this asserts it survives the Card rewrite, not that it's a new feature.
  it("links a group card to its dashboard via next/link", () => {
    render(
      <GroupsClient
        groups={[{ id: "abc123", name: "Roomies", role: "OWNER", members: [] }]}
      />,
    );

    expect(screen.getByRole("link", { name: /Roomies/ })).toHaveAttribute(
      "href",
      "/dashboard/abc123",
    );
  });

  // Scenario: "Empty state for a user with no groups"
  it("renders an empty state with a path to create a group when the user has none", () => {
    const { container } = render(<GroupsClient groups={[]} />);

    // A path to create a group, not just the old bare paragraph.
    expect(
      screen.getByRole("button", { name: "Create your first group" }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("li")).toHaveLength(0);
  });
});
