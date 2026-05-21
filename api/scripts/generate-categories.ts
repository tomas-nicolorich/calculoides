import { prisma } from "../src/utils/prisma";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates a static JSON file of all categories.
 * Used for SSG optimization in the frontend.
 */
export async function generateCategories() {
  console.log("🚀 Generating categories SSG data...");

  try {
    const categories = await prisma.category
      .findMany({
        select: {
          id: true,
          name: true,
          icon: true,
          groupId: true,
        },
      })
      .catch((err: unknown) => {
        console.warn(
          "⚠️ Warning: Could not connect to database to fetch categories. Using fallback data.",
        );
        const message = err instanceof Error ? err.message : String(err);
        console.error(message);
        return []; // Fallback to empty array to allow build to continue
      });

    const outPath = path.resolve(
      __dirname,
      "../../frontend/public/data/categories.json",
    );
    const outDir = path.dirname(outPath);

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Only write if we have data or if the file doesn't exist
    if (categories.length > 0 || !fs.existsSync(outPath)) {
      fs.writeFileSync(outPath, JSON.stringify(categories, null, 2));
      console.log(
        `✅ Saved ${String(categories.length)} categories to ${outPath}`,
      );
    } else {
      console.log(
        "ℹ️ Skipping categories update due to empty results and existing file.",
      );
    }
  } catch (error) {
    console.error("❌ Unexpected error during categories generation:", error);
    // In build environments, we might want to fail, but if it's just a connection issue,
    // we already handled it in the .catch() above.
  }
}

// Run if called directly
if (process.argv[1] === __filename) {
  generateCategories()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
