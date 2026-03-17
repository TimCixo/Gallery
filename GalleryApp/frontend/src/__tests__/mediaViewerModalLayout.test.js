import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modalPath = path.resolve(__dirname, "../features/media/components/MediaViewerModal.jsx");
const appCssPath = path.resolve(__dirname, "../App.css");
const modalSource = readFileSync(modalPath, "utf8");
const appCss = readFileSync(appCssPath, "utf8");

test("media viewer shows related media in thumbnail strip instead of metadata table", () => {
  assert.match(modalSource, /relatedMediaItems/);
  assert.match(modalSource, /relatedMediaStripRef/);
  assert.match(modalSource, /useLayoutEffect/);
  assert.match(modalSource, /innerFrameId/);
  assert.match(modalSource, /scrollLeft = Math\.max/);
  assert.match(modalSource, /className="media-related-strip"/);
  assert.doesNotMatch(modalSource, /media-related-card-label/);
  assert.doesNotMatch(modalSource, /<th scope="row">Parent<\/th>/);
  assert.doesNotMatch(modalSource, /<th scope="row">Child<\/th>/);
});

test("media viewer defines related media strip styles", () => {
  const mobileMediaViewerStyles = appCss.match(/@media \(max-width: 760px\) \{[\s\S]*?\.media-modal-content img,[\s\S]*?max-height: 100%;[\s\S]*?\}/);

  assert.ok(mobileMediaViewerStyles, "Expected mobile media viewer styles to exist");
  assert.match(appCss, /\.media-related-strip/);
  assert.match(appCss, /\.media-related-card-thumb-wrap/);
  assert.match(appCss, /background:\s*transparent/);
  assert.match(appCss, /--media-related-thumb-size:\s*clamp\(3rem, 8dvh, 5\.25rem\)/);
  assert.match(appCss, /padding:\s*0\.2rem calc\(50% - \(var\(--media-related-thumb-size\) \/ 2\) - 0\.4rem\)/);
  assert.match(appCss, /scrollbar-width:\s*none/);
  assert.match(appCss, /\.media-related-card\.is-current/);
  assert.match(appCss, /justify-content:\s*flex-start/);
  assert.match(appCss, /padding-top:\s*calc\(0\.75rem \+ env\(safe-area-inset-top, 0px\)\)/);
  assert.doesNotMatch(mobileMediaViewerStyles[0], /overflow-y:\s*auto/);
  assert.match(mobileMediaViewerStyles[0], /--media-related-thumb-size:\s*clamp\(2\.75rem, 6dvh, 4rem\)/);
  assert.match(mobileMediaViewerStyles[0], /width:\s*var\(--media-related-thumb-size\)/);
  assert.match(mobileMediaViewerStyles[0], /height:\s*var\(--media-related-thumb-size\)/);
});
