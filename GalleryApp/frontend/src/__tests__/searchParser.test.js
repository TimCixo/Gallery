import test from "node:test";
import assert from "node:assert/strict";
import { formatSearchTagValue, getSearchTokenRange, parseSearchSegments } from "../features/search/searchParser.js";

test("parseSearchSegments marks known and typed tags", () => {
  const segments = parseSearchSegments({
    value: "title:cat filetype:image tagtype:artist -artist dog",
    baseSearchTagNames: new Set(["title", "path", "filetype", "tagtype"]),
    searchTagTypeMap: new Map([["artist", { color: "#112233" }]]),
    searchTagOptions: ["title", "path", "filetype", "tagtype", "artist"]
  });

  assert.deepEqual(segments, [
    { text: "title:cat", isTag: true, color: "" },
    { text: " ", isTag: false },
    { text: "filetype:image", isTag: true, color: "" },
    { text: " ", isTag: false },
    { text: "tagtype:artist", isTag: true, color: "" },
    { text: " ", isTag: false },
    { text: "-artist", isTag: true, color: "#112233" },
    { text: " ", isTag: false },
    { text: "dog", isTag: false, color: "" }
  ]);
});

test("getSearchTokenRange returns token and prefix around caret", () => {
  const range = getSearchTokenRange("title:cat source:pixiv", 8);
  assert.deepEqual(range, {
    start: 0,
    end: 9,
    token: "title:cat",
    tokenBeforeCaret: "title:ca"
  });
});

test("formatSearchTagValue wraps values with spaces", () => {
  assert.equal(formatSearchTagValue("blue sky"), '"blue sky"');
  assert.equal(formatSearchTagValue('"quoted"'), '"quoted"');
});
