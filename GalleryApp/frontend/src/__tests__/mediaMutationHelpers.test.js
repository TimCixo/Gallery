import test from "node:test";
import assert from "node:assert/strict";
import {
  addSelectedMediaToCollection,
  buildMediaUpdatePatch,
  buildMediaUpdatePayload,
  openMediaCollectionPicker,
  refreshMediaTagCatalog,
  toggleSelectedMediaFavorite
} from "../features/media/utils/mediaMutationHelpers.js";
import {
  deleteSelectedMedia,
  saveSelectedMediaDetails
} from "../features/media/utils/mediaBulkActions.js";

test("refreshMediaTagCatalog loads tags and tag types into state setters", async () => {
  const tagCatalogCalls = [];
  const tagTypeCalls = [];
  const loadingCalls = [];

  await refreshMediaTagCatalog({
    tagsApi: {
      listTags: async () => ({ items: [{ id: 1, name: "tag" }] }),
      listTagTypes: async () => ({ items: [{ id: 5, name: "type" }] })
    },
    setTagCatalog: (value) => tagCatalogCalls.push(value),
    setTagTypesCatalog: (value) => tagTypeCalls.push(value),
    setIsTagCatalogLoading: (value) => loadingCalls.push(value)
  });

  assert.deepEqual(loadingCalls, [true, false]);
  assert.deepEqual(tagCatalogCalls.at(-1), [{ id: 1, name: "tag" }]);
  assert.deepEqual(tagTypeCalls.at(-1), [{ id: 5, name: "type" }]);
});

test("openMediaCollectionPicker opens modal and populates collection items", async () => {
  const calls = { open: [], error: [], loading: [], items: [] };

  await openMediaCollectionPicker({
    selectedMedia: { id: 42 },
    isCollectionPickerLoading: false,
    isAddingMediaToCollection: false,
    collectionsApi: {
      listCollections: async ({ mediaId }) => ({ items: [{ id: mediaId, label: "A" }] })
    },
    setIsCollectionPickerOpen: (value) => calls.open.push(value),
    setCollectionPickerError: (value) => calls.error.push(value),
    setIsCollectionPickerLoading: (value) => calls.loading.push(value),
    setCollectionPickerItems: (value) => calls.items.push(value)
  });

  assert.deepEqual(calls.open, [true]);
  assert.deepEqual(calls.error, [""]);
  assert.deepEqual(calls.loading, [true, false]);
  assert.deepEqual(calls.items.at(-1), [{ id: 42, label: "A" }]);
});

test("addSelectedMediaToCollection marks selected collection as containing media", async () => {
  let pickerItems = [
    { id: 1, containsMedia: false },
    { id: 2, containsMedia: false }
  ];
  const busyCalls = [];
  const errorCalls = [];
  let successCount = 0;

  await addSelectedMediaToCollection({
    selectedMedia: { id: 7 },
    collectionId: 2,
    isAddingMediaToCollection: false,
    collectionsApi: {
      addMediaToCollection: async () => {}
    },
    setIsAddingMediaToCollection: (value) => busyCalls.push(value),
    setCollectionPickerError: (value) => errorCalls.push(value),
    setCollectionPickerItems: (updater) => {
      pickerItems = typeof updater === "function" ? updater(pickerItems) : updater;
    },
    onSuccess: () => {
      successCount += 1;
    }
  });

  assert.deepEqual(busyCalls, [true, false]);
  assert.deepEqual(errorCalls, [""]);
  assert.equal(successCount, 1);
  assert.deepEqual(pickerItems, [
    { id: 1, containsMedia: false },
    { id: 2, containsMedia: true }
  ]);
});

test("toggleSelectedMediaFavorite updates local state and runs success callback", async () => {
  const busyCalls = [];
  const errorCalls = [];
  const appliedStates = [];
  let successArgs = null;

  await toggleSelectedMediaFavorite({
    selectedMedia: { id: 9, isFavorite: false },
    isFavoriteUpdating: false,
    mediaApi: {
      setFavorite: async () => {}
    },
    setIsFavoriteUpdating: (value) => busyCalls.push(value),
    setMediaModalError: (value) => errorCalls.push(value),
    applyLocalFavoriteState: (nextIsFavorite, mediaId) => {
      appliedStates.push({ nextIsFavorite, mediaId });
    },
    onSuccess: async (nextIsFavorite, mediaId) => {
      successArgs = { nextIsFavorite, mediaId };
    }
  });

  assert.deepEqual(busyCalls, [true, false]);
  assert.deepEqual(errorCalls, [""]);
  assert.deepEqual(appliedStates, [{ nextIsFavorite: true, mediaId: 9 }]);
  assert.deepEqual(successArgs, { nextIsFavorite: true, mediaId: 9 });
});

test("buildMediaUpdatePayload and patch normalize editor draft values", () => {
  const payload = buildMediaUpdatePayload(
    { title: " Test ", description: "", source: " https://a ", parent: "11", child: "", tagIds: [2, 3] },
    (value) => {
      const parsed = Number.parseInt(String(value || "").trim(), 10);
      return Number.isSafeInteger(parsed) ? parsed : null;
    }
  );

  assert.deepEqual(payload, {
    title: "Test",
    description: null,
    source: "https://a",
    parent: 11,
    child: null,
    tagIds: [2, 3]
  });

  const patch = buildMediaUpdatePatch(payload, [
    { id: 1, name: "unused" },
    { id: 2, name: "one" },
    { id: 3, name: "two" }
  ]);
  assert.deepEqual(patch, {
    title: "Test",
    description: null,
    source: "https://a",
    parent: 11,
    child: null,
    tags: [
      { id: 2, name: "one" },
      { id: 3, name: "two" }
    ]
  });
});

test("saveSelectedMediaDetails updates item list and closes edit mode", async () => {
  let selectedMedia = { id: 5, title: "Old", tags: [{ id: 1, name: "old" }] };
  let mediaItems = [{ id: 5, title: "Old", tags: [{ id: 1, name: "old" }] }];
  const savingCalls = [];
  const errorCalls = [];
  const editingCalls = [];
  let successCount = 0;

  await saveSelectedMediaDetails({
    selectedMedia,
    mediaDraft: { title: " New ", description: "", source: "", parent: "", child: "", tagIds: [2] },
    isSavingMedia: false,
    isDeletingMedia: false,
    mediaApi: {
      updateMedia: async () => {}
    },
    tagCatalog: [{ id: 2, name: "fresh" }],
    toNullableId: () => null,
    setIsSavingMedia: (value) => savingCalls.push(value),
    setMediaModalError: (value) => errorCalls.push(value),
    setSelectedMedia: (updater) => {
      selectedMedia = typeof updater === "function" ? updater(selectedMedia) : updater;
    },
    setItems: (updater) => {
      mediaItems = typeof updater === "function" ? updater(mediaItems) : updater;
    },
    setIsEditingMedia: (value) => editingCalls.push(value),
    onSuccess: () => {
      successCount += 1;
    }
  });

  assert.deepEqual(savingCalls, [true, false]);
  assert.deepEqual(errorCalls, [""]);
  assert.deepEqual(editingCalls, [false]);
  assert.equal(successCount, 1);
  assert.equal(selectedMedia.title, "New");
  assert.deepEqual(mediaItems[0].tags, [{ id: 2, name: "fresh" }]);
});

test("deleteSelectedMedia removes item and clears selection", async () => {
  let selectedMedia = { id: 3 };
  let mediaItems = [{ id: 2 }, { id: 3 }];
  const deletingCalls = [];
  const errorCalls = [];
  let successCount = 0;

  await deleteSelectedMedia({
    selectedMedia,
    isDeletingMedia: false,
    isSavingMedia: false,
    mediaApi: {
      deleteMedia: async () => {}
    },
    setIsDeletingMedia: (value) => deletingCalls.push(value),
    setMediaModalError: (value) => errorCalls.push(value),
    setItems: (updater) => {
      mediaItems = typeof updater === "function" ? updater(mediaItems) : updater;
    },
    setSelectedMedia: (value) => {
      selectedMedia = typeof value === "function" ? value(selectedMedia) : value;
    },
    onSuccess: () => {
      successCount += 1;
    }
  });

  assert.deepEqual(deletingCalls, [true, false]);
  assert.deepEqual(errorCalls, [""]);
  assert.equal(successCount, 1);
  assert.equal(selectedMedia, null);
  assert.deepEqual(mediaItems, [{ id: 2 }]);
});
