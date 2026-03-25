import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadManagerPath = path.resolve(__dirname, "../features/upload/UploadManagerContainer.jsx");
const appCssPath = path.resolve(__dirname, "../App.css");
const uploadQueueStepPath = path.resolve(__dirname, "../features/upload/components/UploadQueueStep.jsx");
const uploadQueueGridItemPath = path.resolve(__dirname, "../features/upload/components/UploadQueueGridItem.jsx");
const uploadManagerSource = readFileSync(uploadManagerPath, "utf8");
const uploadQueueStepSource = readFileSync(uploadQueueStepPath, "utf8");
const uploadQueueGridItemSource = readFileSync(uploadQueueGridItemPath, "utf8");
const appCss = readFileSync(appCssPath, "utf8");

test("upload queue modal uses a dedicated single-column grid with preview cards and overlay remove action", () => {
  assert.match(uploadManagerSource, /queue\.step === "queue" \? " media-modal-upload-queue" : " media-modal-editing"/);
  assert.match(appCss, /\.media-modal\.media-modal-upload-queue\s*\{[\s\S]*width:\s*min\(760px,\s*100%\);/);
  assert.match(appCss, /\.media-modal\.media-modal-upload-queue\s*\{[\s\S]*max-height:\s*min\(860px,\s*calc\(100vh - 2rem\)\);/);
  assert.match(uploadQueueStepSource, /className="upload-queue-step"/);
  assert.match(appCss, /\.upload-queue-step\s*\{[\s\S]*gap:\s*0\.75rem;/);
  assert.match(uploadQueueStepSource, /<ul className="upload-queue-grid">/);
  assert.match(appCss, /\.upload-queue-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(160px,\s*1fr\)\);/);
  assert.match(appCss, /\.upload-queue-grid\s*\{[\s\S]*flex:\s*1 1 auto;/);
  assert.match(appCss, /\.upload-queue-card-preview\s*\{[\s\S]*aspect-ratio:\s*1 \/ 1;/);
  assert.match(uploadQueueGridItemSource, /className="upload-queue-remove-btn"/);
  assert.match(uploadQueueGridItemSource, /aria-label=\{`Remove \$\{item\.file\.name\} from queue`\}/);
  assert.match(uploadQueueGridItemSource, /draggable=\{!isUploading\}/);
  assert.match(uploadQueueStepSource, /onReorder\(nextDraggedKey,\s*item\.key\)/);
});
