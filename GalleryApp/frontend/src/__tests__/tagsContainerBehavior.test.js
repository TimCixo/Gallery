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
