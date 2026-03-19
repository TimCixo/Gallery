import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appShellPath = path.resolve(__dirname, "../app/AppShell.jsx");
const popoverPath = path.resolve(__dirname, "../app/components/MediaFilterPopover.jsx");
const appShellSource = readFileSync(appShellPath, "utf8");
const popoverSource = readFileSync(popoverPath, "utf8");

test("AppShell renders a filter icon button next to the top search submit button", () => {
  assert.match(appShellSource, /AppIcon name="filter"/);
  assert.match(appShellSource, /top-filter-control/);
  assert.match(appShellSource, /groupRelatedMedia=\{groupRelatedMedia\}/);
});

test("MediaFilterPopover exposes the group related media checkbox", () => {
  assert.match(popoverSource, /type="checkbox"/);
  assert.match(popoverSource, /Групувати медіа/);
});
