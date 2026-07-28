#!/usr/bin/env node
/**
 * Screenshot utility — take page screenshots programmatically via Playwright.
 *
 * Usage:
 *   node scripts/screenshot.mjs <url> [output-path] [--viewport=1280,900]
 *
 * Examples:
 *   node scripts/screenshot.mjs http://localhost:5173
 *   node scripts/screenshot.mjs http://localhost:5173/docs snapshots/docs.png
 *   node scripts/screenshot.mjs http://localhost:5173/login --viewport=375,812
 *
 * Called without output path, saves to screenshots/<page-name>.png.
 */

import { chromium } from "@playwright/test";
import { resolve, dirname } from "path";
import { mkdir, writeFile } from "fs/promises";
import { URL } from "url";

const [urlArg, outputArg] = process.argv.slice(2);
const viewportArg = process.argv.find((a) => a.startsWith("--viewport="));

if (!urlArg) {
  console.error("Usage: node scripts/screenshot.mjs <url> [output] [--viewport=W,H]");
  process.exit(1);
}

const url = urlArg.startsWith("http") ? urlArg : `http://${urlArg}`;
const viewport =
  viewportArg
    ?.replace("--viewport=", "")
    .split(",")
    .map(Number)
    .filter((n) => !isNaN(n)) ?? [1280, 900];

const pageName = new URL(url).hostname === "localhost"
  ? new URL(url).pathname.replace(/[/]/g, "_").replace(/^_/, "") || "index"
  : new URL(url).hostname;

const outputPath = outputArg
  ? resolve(process.cwd(), outputArg)
  : resolve(process.cwd(), "screenshots", `${pageName || "page"}.png`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: viewport[0], height: viewport[1] } });
const page = await context.newPage();

try {
  await page.goto(url, { waitUntil: "networkidle" });
  await mkdir(dirname(outputPath), { recursive: true });
  await page.screenshot({ path: outputPath, fullPage: true });
  console.log(`Screenshot saved: ${outputPath}`);
} catch (err) {
  console.error(`Screenshot failed: ${err.message}`);
  process.exit(1);
} finally {
  await browser.close();
}
