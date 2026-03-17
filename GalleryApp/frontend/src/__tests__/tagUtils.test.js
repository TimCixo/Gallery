import test from "node:test";
import assert from "node:assert/strict";
import { getMediaTagColor, getTagId, getTagTypeId, parseTagNamesList } from "../features/tags/tagUtils.js";

test("tag id helpers return null for invalid values", () => {
  assert.equal(getTagId({ id: 2 }), 2);
  assert.equal(getTagId({ id: 0 }), null);
  assert.equal(getTagTypeId("5"), 5);
  assert.equal(getTagTypeId("a"), null);
});

test("parseTagNamesList handles string and array", () => {
  assert.deepEqual(parseTagNamesList("cat, dog bird"), ["cat", "dog", "bird"]);
  assert.deepEqual(parseTagNamesList([" cat ", "", "dog"]), ["cat", "dog"]);
});

test("getMediaTagColor validates hex", () => {
  assert.equal(getMediaTagColor({ tagTypeColor: "#AABBCC" }), "#AABBCC");
  assert.equal(getMediaTagColor({ tagTypeColor: "bad" }), "#94a3b8");
});
