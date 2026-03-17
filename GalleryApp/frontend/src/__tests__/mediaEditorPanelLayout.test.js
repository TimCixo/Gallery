import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const editorPanelPath = path.resolve(__dirname, "../features/media/components/MediaEditorPanel.jsx");
const appCssPath = path.resolve(__dirname, "../App.css");
const editorPanelSource = readFileSync(editorPanelPath, "utf8");
const appCss = readFileSync(appCssPath, "utf8");

test("media editor relation picker uses thumbnail trigger and icon-only delete clear button", () => {
  assert.match(editorPanelSource, /className=\{`media-linked-editor-trigger/);
  assert.match(editorPanelSource, /<AppIcon name="create"/);
  assert.match(editorPanelSource, /<AppIcon name="delete"/);
  assert.match(editorPanelSource, /className="media-action-btn app-button-icon-only"/);
  assert.doesNotMatch(editorPanelSource, />\s*Clear\s*</);
  assert.doesNotMatch(editorPanelSource, /Select \{label\.toLowerCase\(\)\} media/);
});

test("media editor relation picker defines empty thumbnail placeholder styles", () => {
  assert.match(appCss, /\.media-linked-editor-trigger\.is-empty/);
  assert.match(appCss, /\.media-linked-editor-placeholder/);
});
