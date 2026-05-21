import { readdirSync, statSync } from "fs";
import { join, extname } from "path";

const API_DIR = join(__dirname, "..");
const MAX_FUNCTIONS = 12;
const EXCLUDED_DIRS = ["src", "scripts", "tests", "node_modules", ".turbo"];

function getTSFiles(dir: string): string[] {
  let results: string[] = [];
  const list = readdirSync(dir);

  for (const file of list) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(file)) {
        results = results.concat(getTSFiles(filePath));
      }
    } else {
      if (
        extname(file) === ".ts" &&
        !file.endsWith(".d.ts") &&
        !file.endsWith(".config.ts")
      ) {
        results.push(filePath);
      }
    }
  }
  return results;
}

function checkFunctionCount() {
  console.log(`Checking function count in ${API_DIR}...`);
  const functionFiles = getTSFiles(API_DIR);
  const relativePaths = functionFiles.map((f) =>
    f.replace(API_DIR + "\\", "").replace(API_DIR + "/", ""),
  );

  console.log(`Found ${String(functionFiles.length)} serverless functions:`);
  relativePaths.forEach((f) => {
    console.log(`- ${f}`);
  });

  if (functionFiles.length > MAX_FUNCTIONS) {
    console.error(
      `\n❌ ERROR: Function count (${String(functionFiles.length)}) exceeds Vercel Hobby plan limit of ${String(MAX_FUNCTIONS)}!`,
    );
    console.error("Please consolidate your API endpoints.");
    process.exit(1);
  }

  console.log(
    `\n✅ Success: Function count (${String(functionFiles.length)}) is within the ${String(MAX_FUNCTIONS)} limit.`,
  );
}

checkFunctionCount();
