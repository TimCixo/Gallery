import test from "node:test";
import assert from "node:assert/strict";
import { MEDIA_FIT_MODES, getNextMediaFitMode } from "../features/media/utils/mediaFitMode.js";

test("media fit modes are defined in the expected order", () => {
  assert.deepEqual(MEDIA_FIT_MODES, ["resize", "height", "width"]);
});

test("media fit mode cycles through all display modes", () => {
  assert.equal(getNextMediaFitMode("resize"), "height");
  assert.equal(getNextMediaFitMode("height"), "width");
  assert.equal(getNextMediaFitMode("width"), "resize");
});

test("media fit mode falls back to default for unknown values", () => {
  assert.equal(getNextMediaFitMode("unknown"), "resize");
});
