import test from "node:test";
import assert from "node:assert/strict";

import { ICON_PATHS, getIconPath } from "../features/shared/utils/iconPaths.js";

test("getIconPath returns a known icon path", () => {
  assert.equal(getIconPath("search"), "/icons/search.png");
  assert.equal(getIconPath("favoriteEnabled"), "/icons/favorite_enable.png");
  assert.equal(getIconPath("filter"), "/icons/filter.png");
  assert.equal(getIconPath("resize"), "/icons/resize.png");
  assert.equal(getIconPath("height"), "/icons/height.png");
  assert.equal(getIconPath("width"), "/icons/width.png");
});

test("getIconPath returns null for an unknown icon name", () => {
  assert.equal(getIconPath("missing"), null);
});

test("ICON_PATHS exposes the shared icon registry", () => {
  assert.ok(Object.keys(ICON_PATHS).length >= 10);
  assert.equal(ICON_PATHS.close, "/icons/close.png");
});
