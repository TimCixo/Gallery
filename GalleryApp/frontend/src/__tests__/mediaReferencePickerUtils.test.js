import test from "node:test";
import assert from "node:assert/strict";
import {
  createMediaReferencePreviewState,
  getMediaReferenceModesSignature,
  getMediaReferenceValueSignature,
  getNormalizedMediaReferenceModes,
  normalizeMediaReferenceMode,
  normalizeMediaReferenceValue
} from "../features/media/utils/mediaReferencePicker.js";

test("createMediaReferencePreviewState builds normalized preview buckets for each mode", () => {
  assert.deepEqual(
    createMediaReferencePreviewState(["parent", "child", "cover"]),
    {
      parent: { item: null, isLoading: false, error: "" },
      child: { item: null, isLoading: false, error: "" },
      cover: { item: null, isLoading: false, error: "" }
    }
  );
});

test("normalizeMediaReferenceMode keeps allowed mode and falls back for unknown mode", () => {
  assert.equal(normalizeMediaReferenceMode("cover", ["parent", "child", "cover"]), "cover");
  assert.equal(normalizeMediaReferenceMode("unknown", ["parent", "child", "cover"]), "parent");
});

test("normalizeMediaReferenceValue distinguishes empty invalid and valid ids", () => {
  assert.equal(normalizeMediaReferenceValue(""), null);
  assert.equal(Number.isNaN(normalizeMediaReferenceValue("abc")), true);
  assert.equal(normalizeMediaReferenceValue("42"), 42);
});

test("media reference mode normalization and signatures ignore array identity", () => {
  assert.deepEqual(getNormalizedMediaReferenceModes([]), ["parent", "child"]);
  assert.equal(getMediaReferenceModesSignature(["parent", "child"]), "parent|child");
  assert.equal(
    getMediaReferenceValueSignature({ parent: "10", child: "25" }, ["parent", "child"]),
    "10|25"
  );
  assert.equal(
    getMediaReferenceValueSignature({ parent: "10", child: "25" }, ["parent", "child"]),
    getMediaReferenceValueSignature({ parent: "10", child: "25" }, ["parent", "child"])
  );
});
