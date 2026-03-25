import { useCallback, useEffect, useState } from "react";
import { tagsApi } from "../../../api/tagsApi";
import { useMediaReferencePicker } from "../../media/hooks/useMediaReferencePicker";

export function useUploadEditorData({ isEditorOpen, activeDraft, onDraftChange, onToggleTag }) {
  const [tagCatalog, setTagCatalog] = useState([]);
  const [tagTypesCatalog, setTagTypesCatalog] = useState([]);
  const [isTagCatalogLoading, setIsTagCatalogLoading] = useState(false);
  const [tagCatalogError, setTagCatalogError] = useState("");

  const refreshTagCatalog = useCallback(async () => {
    setIsTagCatalogLoading(true);
    setTagCatalogError("");
    try {
      const [tagsResponse, tagTypesResponse] = await Promise.all([
        tagsApi.listTags(),
        tagsApi.listTagTypes()
      ]);
      setTagCatalog(Array.isArray(tagsResponse?.items) ? tagsResponse.items : []);
      setTagTypesCatalog(Array.isArray(tagTypesResponse?.items) ? tagTypesResponse.items : []);
    } catch (error) {
      setTagCatalog([]);
      setTagTypesCatalog([]);
      setTagCatalogError(error instanceof Error ? error.message : "Failed to fetch tags.");
    } finally {
      setIsTagCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isEditorOpen) {
      return;
    }

    void refreshTagCatalog();
  }, [isEditorOpen, refreshTagCatalog]);
  const mediaReferencePicker = useMediaReferencePicker({
    valueByMode: {
      parent: activeDraft?.parent,
      child: activeDraft?.child
    },
    onSelectReference: (mode, item) => {
      const selectedId = Number(item?.id);
      if (!Number.isSafeInteger(selectedId) || selectedId <= 0) {
        return;
      }

      onDraftChange?.({ [mode === "child" ? "child" : "parent"]: String(selectedId) });
    },
    isEnabled: isEditorOpen
  });

  const toggleTag = useCallback((tagId) => {
    if (typeof onToggleTag === "function") {
      onToggleTag(tagId);
      return;
    }

    const normalizedTagId = Number(tagId);
    if (!Number.isInteger(normalizedTagId) || normalizedTagId <= 0) {
      return;
    }

    const currentIds = Array.isArray(activeDraft?.tagIds) ? activeDraft.tagIds : [];
    const hasTag = currentIds.includes(normalizedTagId);
    onDraftChange?.({ tagIds: hasTag ? currentIds.filter((id) => id !== normalizedTagId) : [...currentIds, normalizedTagId] });
  }, [activeDraft?.tagIds, onDraftChange, onToggleTag]);

  return {
    tagCatalog,
    tagTypesCatalog,
    isTagCatalogLoading,
    tagCatalogError,
    refreshTagCatalog,
    toggleTag,
    relationPreviewByMode: mediaReferencePicker.previewByMode,
    openMediaRelationPicker: mediaReferencePicker.openPicker,
    closeMediaRelationPicker: mediaReferencePicker.closePicker,
    isMediaRelationPickerOpen: mediaReferencePicker.isPickerOpen,
    mediaRelationPickerMode: mediaReferencePicker.pickerMode,
    mediaRelationPickerQuery: mediaReferencePicker.pickerQuery,
    setMediaRelationPickerQuery: mediaReferencePicker.setPickerQuery,
    mediaRelationPickerItems: mediaReferencePicker.pickerItems,
    mediaRelationPickerPage: mediaReferencePicker.pickerPage,
    setMediaRelationPickerPage: mediaReferencePicker.setPickerPage,
    mediaRelationPickerTotalPages: mediaReferencePicker.pickerTotalPages,
    mediaRelationPickerTotalCount: mediaReferencePicker.pickerTotalCount,
    isMediaRelationPickerLoading: mediaReferencePicker.isPickerLoading,
    mediaRelationPickerError: mediaReferencePicker.pickerError,
    handleSelectMediaRelationFromPicker: mediaReferencePicker.selectFromPicker
  };
}
