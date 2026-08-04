import { describe, it, expect } from "vitest";
import { queryKeys } from "./queryKeys";

describe("queryKeys", () => {
  it("expenses key hashes identically whether filters are omitted or an empty object", () => {
    expect(queryKeys.expenses("g1")).toEqual(queryKeys.expenses("g1", {}));
  });

  it("expenses key hashes identically regardless of undefined filter fields", () => {
    expect(queryKeys.expenses("g1", { categoryId: undefined })).toEqual(
      queryKeys.expenses("g1"),
    );
  });

  it("transfers key hashes identically whether filters are omitted or an empty object", () => {
    expect(queryKeys.transfers("g1")).toEqual(queryKeys.transfers("g1", {}));
  });

  it("transfers key hashes identically regardless of undefined filter fields", () => {
    expect(queryKeys.transfers("g1", { memberId: undefined })).toEqual(
      queryKeys.transfers("g1"),
    );
  });

  it("group(g) is a prefix of summary(g)", () => {
    const group = queryKeys.group("g1");
    const summary = queryKeys.summary("g1");
    expect(summary.slice(0, group.length)).toEqual(group);
  });

  it("group(g) is a prefix of categories(g)", () => {
    const group = queryKeys.group("g1");
    const categories = queryKeys.categories("g1");
    expect(categories.slice(0, group.length)).toEqual(group);
  });

  it("group(g) is a prefix of savingsGoals(g)", () => {
    const group = queryKeys.group("g1");
    const savingsGoals = queryKeys.savingsGoals("g1");
    expect(savingsGoals.slice(0, group.length)).toEqual(group);
  });

  it("group(g) is a prefix of expenses(g)", () => {
    const group = queryKeys.group("g1");
    const expenses = queryKeys.expenses("g1");
    expect(expenses.slice(0, group.length)).toEqual(group);
  });

  it("group(g) is a prefix of transfers(g)", () => {
    const group = queryKeys.group("g1");
    const transfers = queryKeys.transfers("g1");
    expect(transfers.slice(0, group.length)).toEqual(group);
  });

  it("groups() has a stable shape", () => {
    expect(queryKeys.groups()).toEqual(["groups"]);
  });
});
