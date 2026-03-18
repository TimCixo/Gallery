import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyGroupDraftToUploadItems } from "../features/upload/utils/groupUploadDraft.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadManagerSource = readFileSync(path.resolve(__dirname, "../features/upload/UploadManagerContainer.jsx"), "utf8");
const uploadEditorStepSource = readFileSync(path.resolve(__dirname, "../features/upload/components/UploadEditorStep.jsx"), "utf8");

test("applyGroupDraftToUploadItems applies touched fields and tag edits without overwriting untouched values", () => {
  const items = applyGroupDraftToUploadItems(
    [
      {
        key: "one",
        draft: { title: "A", description: "First", source: "", parent: "5", child: "", tagIds: [1, 2] }
      },
      {
        key: "two",
        draft: { title: "B", description: "Second", source: "", parent: "", child: "9", tagIds: [2, 3] }
      }
    ],
    { title: "Shared", description: "", source: "", parent: "", child: "", tagIds: [7] },
    { title: true },
    { 2: "remove", 7: "add" }
  );

  assert.deepEqual(items.map((item) => item.draft), [
    { title: "Shared", description: "First", source: "", parent: "5", child: "", tagIds: [1, 7] },
    { title: "Shared", description: "Second", source: "", parent: "", child: "9", tagIds: [3, 7] }
  ]);
});

test("upload manager uses visible group draft and locks navigation in group mode", () => {
  assert.match(uploadManagerSource, /const \[groupDraft, setGroupDraft\] = useState\(createEmptyMediaDraft\)/);
  assert.match(uploadManagerSource, /const \[isGroupSelectionChainEnabled, setIsGroupSelectionChainEnabled\] = useState\(false\)/);
  assert.match(uploadManagerSource, /const uploadLinkGroupSequenceRef = useRef\(1\)/);
  assert.match(uploadManagerSource, /const linkOrderGroupStateRef = useRef\(new Map\(\)\)/);
  assert.match(uploadManagerSource, /const visibleDraft = settings\.isGroupUploadEnabled \? groupDraft : \(activeUploadItem\?\.draft \|\| null\)/);
  assert.match(uploadManagerSource, /activeDraft: visibleDraft/);
  assert.match(uploadManagerSource, /onDraftChange: handleUploadDraftChange/);
  assert.match(uploadManagerSource, /onToggleTag: handleToggleUploadTag/);
  assert.match(uploadManagerSource, /onPrev: queue\.step === "editor" && !settings\.isGroupUploadEnabled \?/);
  assert.match(uploadManagerSource, /onNext: queue\.step === "editor" && !settings\.isGroupUploadEnabled \?/);
  assert.match(uploadManagerSource, /if \(settings\.isGroupUploadEnabled\) \{\s*return <div className="media-bulk-preview">\{queue\.items\.length\}<\/div>;/);
  assert.match(uploadManagerSource, /disabled=\{settings\.isGroupUploadEnabled \|\| queue\.items\.length === 0 \|\| queue\.activeUploadIndex === 0 \|\| isUploading\}/);
  assert.match(uploadManagerSource, /disabled=\{settings\.isGroupUploadEnabled \|\| queue\.items\.length === 0 \|\| queue\.activeUploadIndex >= queue\.items\.length - 1 \|\| isUploading\}/);
  assert.match(uploadManagerSource, /applyGroupDraftToUploadItems\(queue\.items, groupDraft, groupTouchedFields, groupTagEdits\)/);
  assert.match(uploadManagerSource, /resolvedDraft = \{\s*\.\.\.task\.draft,\s*parent:/);
  assert.match(uploadManagerSource, /previousUploadedDraft: null/);
  assert.match(uploadManagerSource, /await uploadApi\.updateUploadedMedia\(previousUploadedMediaId, \{\s*\.\.\.\(groupState\.previousUploadedDraft \|\| \{\}\),\s*child: uploaded\.id/s);
  assert.match(uploadManagerSource, /await uploadApi\.updateUploadedMedia\(uploaded\.id, resolvedDraft\)/);
  assert.match(uploadManagerSource, /const linkOrderGroupId = isGroupSelectionChainEnabled \? uploadLinkGroupSequenceRef\.current\+\+ : null/);
});

test("upload editor step switches to shared draft and exposes link order in group mode", () => {
  assert.match(uploadEditorStepSource, /const activeDraft = visibleDraft \|\| \{\}/);
  assert.match(uploadEditorStepSource, /showRelations=\{!settings\.isGroupUploadEnabled\}/);
  assert.match(uploadEditorStepSource, /className="media-bulk-group-options"/);
  assert.match(uploadEditorStepSource, /link order/);
  assert.match(uploadEditorStepSource, /previewNode=\{previewNode\}/);
  assert.match(uploadEditorStepSource, /previewTitle=\{previewTitle\}/);
});
