import test from "node:test";
import assert from "node:assert/strict";
import { getExtensionFromPath, getMediaIdentity, isVideoFile, resolveTileUrl } from "../utils/mediaIdentity.js";

test("getExtensionFromPath normalizes extension", () => {
  assert.equal(getExtensionFromPath("photo.JPG?x=1"), ".jpg");
  assert.equal(getExtensionFromPath("photo"), "");
});

test("resolveTileUrl returns preview path for videos", () => {
  assert.equal(
    resolveTileUrl({ mediaType: "video", relativePath: "a/b/c.mp4" }),
    "/api/media/preview?path=a%2Fb%2Fc.mp4"
  );
});

test("media identity and video predicate", () => {
  assert.equal(getMediaIdentity({ id: 4 }), "id:4");
  assert.equal(getMediaIdentity({ relativePath: "x/y.jpg" }), "path:x/y.jpg");
  assert.equal(isVideoFile({ name: "clip.webm" }), true);
  assert.equal(isVideoFile({ name: "photo.jpg" }), false);
});
