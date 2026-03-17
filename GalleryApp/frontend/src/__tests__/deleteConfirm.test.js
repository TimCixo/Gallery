import test from "node:test";
import assert from "node:assert/strict";
import {
  createPendingMediaDelete,
  getCollectionDeleteConfirmMessage,
  getMediaDeleteConfirmMessage,
  getTagDeleteConfirmMessage
} from "../features/shared/utils/deleteConfirm.js";

test("getTagDeleteConfirmMessage formats tag type message", () => {
  assert.equal(
    getTagDeleteConfirmMessage({ kind: "tagType", name: "Genre" }),
    'Are you sure you want to delete TagType "Genre"?'
  );
});

test("getTagDeleteConfirmMessage formats tag message", () => {
  assert.equal(
    getTagDeleteConfirmMessage({ kind: "tag", name: "Portrait" }),
    'Are you sure you want to delete Tag "Portrait"?'
  );
});

test("getCollectionDeleteConfirmMessage formats collection message", () => {
  assert.equal(
    getCollectionDeleteConfirmMessage({ name: "Summer" }),
    'Are you sure you want to delete collection "Summer"?'
  );
});

test("createPendingMediaDelete prefers title over file name", () => {
  assert.deepEqual(
    createPendingMediaDelete({ id: 7, title: "Aurora", name: "aurora.jpg" }),
    { id: 7, name: "Aurora" }
  );
});

test("getMediaDeleteConfirmMessage falls back to generic text", () => {
  assert.equal(getMediaDeleteConfirmMessage({ id: 7, name: "" }), "Are you sure?");
});

test("getMediaDeleteConfirmMessage includes media name when available", () => {
  assert.equal(
    getMediaDeleteConfirmMessage({ id: 7, name: "Aurora" }),
    'Are you sure you want to delete "Aurora"?'
  );
});
