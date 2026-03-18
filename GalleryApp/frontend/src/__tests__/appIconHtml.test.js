import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexHtmlPath = path.resolve(__dirname, "../../index.html");

test("index.html configures the app icon", () => {
  const html = readFileSync(indexHtmlPath, "utf8");

  assert.match(html, /<link rel="icon" type="image\/png" href="\/icons\/icon\.png" \/>/);
  assert.match(html, /<link rel="apple-touch-icon" href="\/icons\/icon\.png" \/>/);
});
