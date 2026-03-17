import test from "node:test";
import assert from "node:assert/strict";
import { loadPersistedShellState, persistShellState } from "../app/utils/persistedShellState.js";

const createStorage = () => {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };
};

test("persisted shell state round-trips active page and search values", () => {
  const storage = createStorage();
  persistShellState({
    activePage: "favorites",
    inputValue: "title:cat",
    submittedText: "title:cat",
    searchHistory: ["title:cat", "id:42"]
  }, storage);

  assert.deepEqual(loadPersistedShellState(storage), {
    activePage: "favorites",
    inputValue: "title:cat",
    submittedText: "title:cat",
    searchHistory: ["title:cat", "id:42"]
  });
});

test("persisted shell state falls back to defaults for invalid values", () => {
  const storage = createStorage();
  storage.setItem("gallery.app-shell-state", JSON.stringify({ activePage: "unknown", inputValue: 42 }));

  assert.deepEqual(loadPersistedShellState(storage), {
    activePage: "gallery",
    inputValue: "42",
    submittedText: "",
    searchHistory: []
  });
});
