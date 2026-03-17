import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const collectionsContainerPath = path.resolve(__dirname, "../features/collections/CollectionsContainer.jsx");
const appCssPath = path.resolve(__dirname, "../App.css");

const collectionsContainerSource = readFileSync(collectionsContainerPath, "utf8");
const appCss = readFileSync(appCssPath, "utf8");

test("collection view modal exposes cover summary and header actions", () => {
  assert.match(collectionsContainerSource, /className="collection-view-summary"/);
  assert.match(collectionsContainerSource, /className="collection-view-cover"/);
  assert.match(collectionsContainerSource, /className="collection-view-info"/);
  assert.match(collectionsContainerSource, /className="collection-view-info-header"/);
  assert.match(collectionsContainerSource, /className="media-icon-btn collection-view-action-edit"/);
  assert.match(collectionsContainerSource, /className="media-icon-btn collection-view-action-delete"/);
  assert.match(collectionsContainerSource, /className="media-icon-btn media-icon-btn-close"/);
  assert.match(collectionsContainerSource, /CollectionDeleteConfirmModal/);
});

test("collection view modal styles use fixed dimensions and summary grid", () => {
  assert.match(appCss, /\.collection-view-modal\s*\{/);
  assert.match(appCss, /width: min\(1120px, calc\(100vw - 2rem\)\)/);
  assert.match(appCss, /height: min\(860px, calc\(100vh - 2rem\)\)/);
  assert.match(appCss, /\.collection-view-summary\s*\{/);
  assert.match(appCss, /grid-template-columns: 160px minmax\(0, 1fr\)/);
  assert.match(appCss, /\.collection-view-info-header\s*\{/);
});

test("collection delete confirm modal uses icon-only actions", () => {
  const deleteModalPath = path.resolve(__dirname, "../features/collections/components/CollectionDeleteConfirmModal.jsx");
  const deleteModalSource = readFileSync(deleteModalPath, "utf8");

  assert.match(deleteModalSource, /AppIcon/);
  assert.match(deleteModalSource, /app-button-icon-only/);
  assert.match(deleteModalSource, /name="confirm"/);
  assert.match(deleteModalSource, /name="cancel"/);
});

test("collection editor reuses media relation picker for cover selection", () => {
  assert.match(collectionsContainerSource, /MediaRelationPickerDialogContent/);
  assert.match(collectionsContainerSource, /MediaRelationPickerModal/);
  assert.match(collectionsContainerSource, /openMediaRelationPicker\("cover"\)/);
  assert.match(collectionsContainerSource, /collectionCoverPreview/);
  assert.match(collectionsContainerSource, /refreshTagCatalog\(\)/);
  assert.match(collectionsContainerSource, /media-linked-editor/);
  assert.match(collectionsContainerSource, /name="confirm"/);
  assert.match(collectionsContainerSource, /name="cancel"/);
  assert.doesNotMatch(collectionsContainerSource, /No cover selected\./);
  assert.doesNotMatch(appCss, /\.collections-preview\s*\{/);
  assert.match(appCss, /\.collection-modal-actions\s*\{/);
});
