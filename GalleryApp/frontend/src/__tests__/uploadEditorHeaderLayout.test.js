import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadManagerPath = path.resolve(__dirname, "../features/upload/UploadManagerContainer.jsx");
const appCssPath = path.resolve(__dirname, "../App.css");
const uploadManagerSource = readFileSync(uploadManagerPath, "utf8");
const appCss = readFileSync(appCssPath, "utf8");

test("upload editor header hides the old title and centers navigation buttons", () => {
  assert.match(uploadManagerSource, /className=\{`media-modal-header\$\{queue\.step !== "queue" \? " media-modal-header-upload-editor" : ""\}`\}/);
  assert.match(uploadManagerSource, /queue\.step === "queue" \? \(/);
  assert.match(uploadManagerSource, /<h2 className="upload-modal-title">Queue \(\{queue\.items\.length\}\)<\/h2>/);
  assert.match(uploadManagerSource, /className="media-icon-btn media-icon-btn-collections"/);
  assert.match(uploadManagerSource, /onClick=\{\(\) => void openUploadCollectionPicker\(\)\}/);
  assert.match(uploadManagerSource, /aria-label="Previous upload item"/);
  assert.match(uploadManagerSource, /aria-label="Next upload item"/);
  assert.match(appCss, /\.media-modal-header-upload-editor/);
  assert.match(appCss, /\.media-modal-header-upload-editor > \.media-icon-btn-collections/);
  assert.match(appCss, /margin-right:\s*auto/);
  assert.match(appCss, /\.media-modal-header-upload-editor \.media-upload-nav,/);
  assert.match(appCss, /left:\s*50%/);
  assert.match(appCss, /transform:\s*translateX\(-50%\)/);
});
