import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modalSource = readFileSync(
  path.resolve(__dirname, "../features/media/components/MediaViewerModal.jsx"),
  "utf8"
);
const recommendationsSource = readFileSync(
  path.resolve(__dirname, "../features/media/components/RecommendedMediaSection.jsx"),
  "utf8"
);
const appCss = readFileSync(
  path.resolve(__dirname, "../App.css"),
  "utf8"
);

test("media viewer renders recommended media section under action row", () => {
  assert.match(modalSource, /import RecommendedMediaSection from "\.\/RecommendedMediaSection";/);
  assert.match(modalSource, /<RecommendedMediaSection/);
  assert.match(recommendationsSource, /Recommended media/);
  assert.match(recommendationsSource, /className="media-similar-section"/);
  assert.match(appCss, /\.media-similar-section/);
  assert.match(appCss, /\.media-similar-card/);
});
