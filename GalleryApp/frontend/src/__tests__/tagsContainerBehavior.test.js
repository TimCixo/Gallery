import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tagsContainerPath = path.resolve(__dirname, "../features/tags/TagsContainer.jsx");

const tagsContainerSource = readFileSync(tagsContainerPath, "utf8");

test("tags container delays collapsing the active tag type until drag is underway", () => {
  assert.match(tagsContainerSource, /const handleTagDragStart = useCallback\(\(event, sourceTagTypeId, tagItem\) => \{/);
  assert.match(tagsContainerSource, /dragCollapseTimeoutRef\.current = window\.setTimeout\(\(\) => \{/);
  assert.match(tagsContainerSource, /setActiveTagTypeId\(null\);/);
  assert.match(tagsContainerSource, /}, 90\);/);
  assert.match(tagsContainerSource, /const clearPendingDragCollapse = useCallback\(\(\) => \{/);
  assert.match(tagsContainerSource, /tagItemsState\.handleTagDragStart\(event, sourceTagTypeId, tagItem\);/);
  assert.match(tagsContainerSource, /onTagDrop=\{handleTagDrop\}/);
  assert.match(tagsContainerSource, /onTagDragEnd=\{handleTagDragEnd\}/);
  assert.match(tagsContainerSource, /onTagDragStart=\{handleTagDragStart\}/);
});

test("tags container does not fetch API tags for the static base tag type", () => {
  assert.match(tagsContainerSource, /if \(activeTagTypeId === BASE_TAG_TYPE_ID\) \{/);
  assert.match(tagsContainerSource, /return;/);
  assert.match(tagsContainerSource, /void tagItemsState\.loadTagsForTagType\(activeTagTypeId\);/);
});

test("tags container keeps the static base tag type open even though it is not part of API tag types", () => {
  assert.match(tagsContainerSource, /if \(activeTagTypeId === BASE_TAG_TYPE_ID\) \{\s*return;\s*\}/);
  assert.match(tagsContainerSource, /if \(!tagTypesState\.tagTypes\.some\(\(item\) => item\.id === activeTagTypeId\)\) \{\s*setActiveTagTypeId\(null\);\s*\}/);
});
