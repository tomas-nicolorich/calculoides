import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const resolvedDirname = __dirname;

const env = process.env.CALC_ENVIRONMENT ?? "local";
const rootDir = path.resolve(resolvedDirname, "../../");

if (env === "test-local") {
  const testEnvPath = path.resolve(rootDir, ".env.test");
  if (fs.existsSync(testEnvPath)) {
    dotenv.config({ path: testEnvPath });
    console.log(`Loaded test environment from ${testEnvPath}`);
  } else {
    dotenv.config({ path: path.resolve(rootDir, ".env") });
    console.warn(
      `Test environment file not found at ${testEnvPath}, falling back to .env`,
    );
  }
} else {
  dotenv.config({ path: path.resolve(rootDir, ".env") });
  console.log("Loaded local environment from .env");
}
