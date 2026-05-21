import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateCategories } from "../../../scripts/generate-categories";
import fs from "fs";

vi.mock("../../../src/utils/prisma", () => ({
  prisma: {
    category: {
      findMany: vi
        .fn()
        .mockResolvedValue([{ id: "1", name: "Food", groupId: "group1" }]),
    },
  },
}));

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
  },
}));

describe("Generate Categories Script", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch categories and write them to a JSON file", async () => {
    await generateCategories();
    expect(fs.writeFileSync).toHaveBeenCalled();
    const [path, data] = vi.mocked(fs.writeFileSync).mock.calls[0] as [
      string,
      string,
    ];
    expect(path).toContain("categories.json");
    const parsedData = JSON.parse(data) as { name: string }[];
    expect(parsedData).toHaveLength(1);
    expect(parsedData[0].name).toBe("Food");
  });
});
