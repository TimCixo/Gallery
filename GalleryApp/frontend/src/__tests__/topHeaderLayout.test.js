import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appCssPath = path.resolve(__dirname, "../App.css");
const appCss = readFileSync(appCssPath, "utf8");

test("top input wrapper does not create a stacking context above upload controls", () => {
  const topInputWrapBlock = appCss.match(/\.top-input-wrap\s*\{[^}]*\}/);

  assert.ok(topInputWrapBlock, "Expected .top-input-wrap rule to exist");
  assert.doesNotMatch(topInputWrapBlock[0], /z-index\s*:/);
});

test("top upload group stays above adjacent header content", () => {
  const topUploadGroupBlock = appCss.match(/\.top-upload-group\s*\{[^}]*\}/);

  assert.ok(topUploadGroupBlock, "Expected .top-upload-group rule to exist");
  assert.match(topUploadGroupBlock[0], /position:\s*relative/);
  assert.match(topUploadGroupBlock[0], /z-index:\s*1/);
});
