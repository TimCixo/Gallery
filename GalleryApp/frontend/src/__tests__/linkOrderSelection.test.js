import test from "node:test";
import assert from "node:assert/strict";
import {
  disconnectSelectedLinkOrder,
  hasLinkedSelectionInOrder,
  hasLinkOrderOverwrite
} from "../features/media/utils/linkOrderSelection.js";

test("hasLinkedSelectionInOrder returns true when selected items already form a chain", () => {
  const items = [
    { id: 11, draft: { parent: "", child: "12" } },
    { id: 12, draft: { parent: "11", child: "13" } },
    { id: 13, draft: { parent: "12", child: "" } }
  ];

  assert.equal(hasLinkedSelectionInOrder(items), true);
});

test("hasLinkedSelectionInOrder ignores external relatives when selected items stay linked in order", () => {
  const items = [
    { id: 12, draft: { parent: "7", child: "13" } },
    { id: 13, draft: { parent: "12", child: "19" } }
  ];

  assert.equal(hasLinkedSelectionInOrder(items), true);
});

test("hasLinkedSelectionInOrder returns false when selected items are not linked to each other", () => {
  const items = [
    { id: 21, draft: { parent: "", child: "44" } },
    { id: 22, draft: { parent: "99", child: "" } }
  ];

  assert.equal(hasLinkedSelectionInOrder(items), false);
});

test("hasLinkOrderOverwrite returns true when applying selected order would rewrite relatives", () => {
  const items = [
    { id: 12, draft: { parent: "7", child: "99" } },
    { id: 13, draft: { parent: "88", child: "19" } }
  ];

  assert.equal(hasLinkOrderOverwrite(items), true);
});

test("hasLinkOrderOverwrite returns false when linking open ends while preserving outer relatives", () => {
  const items = [
    { id: 12, draft: { parent: "7", child: "" } },
    { id: 13, draft: { parent: "", child: "19" } }
  ];

  assert.equal(hasLinkOrderOverwrite(items), false);
});

test("hasLinkOrderOverwrite returns false when current relations already match selected order", () => {
  const items = [
    { id: 31, draft: { parent: "8", child: "32" } },
    { id: 32, draft: { parent: "31", child: "41" } }
  ];

  assert.equal(hasLinkOrderOverwrite(items), false);
});

test("disconnectSelectedLinkOrder breaks only the relation inside the selected head segment", () => {
  const items = [
    { id: 1, draft: { parent: "", child: "2" } },
    { id: 2, draft: { parent: "1", child: "3" } }
  ];

  assert.deepEqual(disconnectSelectedLinkOrder(items).map((item) => item.draft), [
    { parent: "", child: "" },
    { parent: "", child: "3" }
  ]);
});

test("disconnectSelectedLinkOrder breaks only the relation inside the selected middle segment", () => {
  const items = [
    { id: 3, draft: { parent: "2", child: "4" } },
    { id: 4, draft: { parent: "3", child: "5" } }
  ];

  assert.deepEqual(disconnectSelectedLinkOrder(items).map((item) => item.draft), [
    { parent: "2", child: "" },
    { parent: "", child: "5" }
  ]);
});
