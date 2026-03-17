import test from "node:test";
import assert from "node:assert/strict";
import { formatFileSize, formatMediaDate, getMediaShortType } from "../utils/mediaFormat.js";

test("formatMediaDate handles invalid date", () => {
  assert.equal(formatMediaDate("invalid"), "Unknown");
});

test("formatFileSize formats bytes", () => {
  assert.equal(formatFileSize(1024), "1.00 KB (1,024 B)");
  assert.equal(formatFileSize(-1), "-");
});

test("getMediaShortType detects gif and video", () => {
  assert.equal(getMediaShortType({ name: "clip.mp4" }), "vid");
  assert.equal(getMediaShortType({ originalUrl: "https://x/a.gif" }), "gif");
  assert.equal(getMediaShortType({ name: "photo.jpg" }), "img");
});
