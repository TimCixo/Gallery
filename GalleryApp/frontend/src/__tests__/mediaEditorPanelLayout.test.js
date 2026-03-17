import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const editorPanelPath = path.resolve(__dirname, "../features/media/components/MediaEditorPanel.jsx");
const viewerModalPath = path.resolve(__dirname, "../features/media/components/MediaViewerModal.jsx");
const relationPickerPath = path.resolve(__dirname, "../features/media/components/MediaRelationPickerDialogContent.jsx");
const relationPickerModalPath = path.resolve(__dirname, "../features/media/components/MediaRelationPickerModal.jsx");
const appCssPath = path.resolve(__dirname, "../App.css");
const editorPanelSource = readFileSync(editorPanelPath, "utf8");
const viewerModalSource = readFileSync(viewerModalPath, "utf8");
const relationPickerSource = readFileSync(relationPickerPath, "utf8");
const relationPickerModalSource = readFileSync(relationPickerModalPath, "utf8");
const appCss = readFileSync(appCssPath, "utf8");

test("media editor relation picker uses thumbnail trigger and icon-only delete clear button", () => {
  assert.match(editorPanelSource, /className=\{`media-linked-editor-trigger/);
  assert.match(editorPanelSource, /<AppIcon name="create"/);
  assert.match(editorPanelSource, /<AppIcon name="delete"/);
  assert.match(editorPanelSource, /className="media-action-btn app-button-icon-only"/);
  assert.doesNotMatch(editorPanelSource, />\s*Clear\s*</);
  assert.doesNotMatch(editorPanelSource, /Select \{label\.toLowerCase\(\)\} media/);
});

test("media relation picker dialog is shared between editor panel and viewer modal", () => {
  assert.match(editorPanelSource, /MediaRelationPickerDialogContent/);
  assert.match(editorPanelSource, /MediaRelationPickerModal/);
  assert.match(viewerModalSource, /MediaRelationPickerDialogContent/);
  assert.match(viewerModalSource, /MediaRelationPickerModal/);
  assert.match(relationPickerSource, /PickerDialog/);
  assert.match(relationPickerSource, /SearchInput/);
  assert.match(relationPickerSource, /GalleryMediaTile/);
  assert.match(relationPickerSource, /className="media-grid media-relation-picker-grid"/);
  assert.match(relationPickerSource, /buildSearchSuggestions/);
  assert.match(relationPickerSource, /className="media-pagination"/);
  assert.match(relationPickerSource, /className="media-pagination-jump"/);
});

test("media relation picker modal supports usage outside media editor context", () => {
  assert.match(relationPickerModalSource, /useContext\(MediaEditorContext\)/);
  assert.match(relationPickerModalSource, /context\?\.isRelationPickerOpen \?\? isOpen/);
  assert.match(relationPickerModalSource, /context\?\.onCloseRelationPicker \?\? onClose/);
});

test("media editor relation picker defines empty thumbnail placeholder styles", () => {
  assert.match(appCss, /\.media-linked-editor-trigger\.is-empty/);
  assert.match(appCss, /\.media-linked-editor-placeholder/);
  assert.match(appCss, /\.media-relation-picker-list/);
  assert.match(appCss, /\.picker-grid-card/);
  assert.match(appCss, /\.media-relation-picker-dialog\s*\{[\s\S]*width: 1120px;/);
  assert.match(appCss, /\.media-relation-picker-dialog\s*\{[\s\S]*height: 760px;/);
});
