import { useCallback, useEffect, useState } from "react";

const DEFAULT_COLOR = "#2563EB";

const readResponsePayload = async (response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export function useTagTypesManager() {
  const [tagTypes, setTagTypes] = useState([]);
  const [isTagTypesLoading, setIsTagTypesLoading] = useState(false);
  const [tagTypeNameInput, setTagTypeNameInput] = useState("");
  const [tagTypeColorInput, setTagTypeColorInput] = useState(DEFAULT_COLOR);
  const [editingTagTypeId, setEditingTagTypeId] = useState(null);
  const [editingTagTypeName, setEditingTagTypeName] = useState("");
  const [editingTagTypeColor, setEditingTagTypeColor] = useState(DEFAULT_COLOR);
  const [isTagTypeSaving, setIsTagTypeSaving] = useState(false);
  const [isTagTypeUpdating, setIsTagTypeUpdating] = useState(false);
  const [tagTypesError, setTagTypesError] = useState("");

  const loadTagTypes = useCallback(async () => {
    setIsTagTypesLoading(true);
    setTagTypesError("");

    try {
      const response = await fetch("/api/tag-types");
      const result = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to fetch tag types.");
      }

      setTagTypes(Array.isArray(result?.items) ? result.items : []);
    } catch (error) {
      setTagTypes([]);
      setTagTypesError(error instanceof Error ? error.message : "Failed to fetch tag types.");
    } finally {
      setIsTagTypesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTagTypes();
  }, [loadTagTypes]);

  const handleClearTagTypeForm = () => {
    setTagTypeNameInput("");
    setTagTypeColorInput(DEFAULT_COLOR);
    setTagTypesError("");
  };

  const handleStartEditTagType = (item) => {
    setEditingTagTypeId(item.id);
    setEditingTagTypeName(String(item.name || ""));
    setEditingTagTypeColor(String(item.color || DEFAULT_COLOR).toUpperCase());
    setTagTypesError("");
  };

  const handleCancelEditTagType = () => {
    setEditingTagTypeId(null);
    setEditingTagTypeName("");
    setEditingTagTypeColor(DEFAULT_COLOR);
  };

  const handleCreateTagType = async (event) => {
    event.preventDefault();
    const normalizedName = tagTypeNameInput.trim();
    const normalizedColor = String(tagTypeColorInput || "").trim().toUpperCase();

    if (!normalizedName) {
      setTagTypesError("Name is required.");
      return;
    }

    if (!/^#[0-9A-F]{6}$/.test(normalizedColor)) {
      setTagTypesError("Color must be a valid hex code (#RRGGBB).");
      return;
    }

    setIsTagTypeSaving(true);
    setTagTypesError("");
    try {
      const response = await fetch("/api/tag-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: normalizedName, color: normalizedColor })
      });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to create tag type.");
      }

      setTagTypes((current) => [result, ...current]);
      setTagTypeNameInput("");
    } catch (error) {
      setTagTypesError(error instanceof Error ? error.message : "Failed to create tag type.");
    } finally {
      setIsTagTypeSaving(false);
    }
  };

  const handleSaveTagType = async (itemId) => {
    const normalizedName = editingTagTypeName.trim();
    const normalizedColor = String(editingTagTypeColor || "").trim().toUpperCase();

    if (!normalizedName) {
      setTagTypesError("Name is required.");
      return;
    }

    if (!/^#[0-9A-F]{6}$/.test(normalizedColor)) {
      setTagTypesError("Color must be a valid hex code (#RRGGBB).");
      return;
    }

    setIsTagTypeUpdating(true);
    setTagTypesError("");
    try {
      const response = await fetch(`/api/tag-types/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: normalizedName, color: normalizedColor })
      });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to update tag type.");
      }

      setTagTypes((current) => current.map((item) => (item.id === itemId ? result : item)));
      handleCancelEditTagType();
    } catch (error) {
      setTagTypesError(error instanceof Error ? error.message : "Failed to update tag type.");
    } finally {
      setIsTagTypeUpdating(false);
    }
  };

  const handleDeleteTagType = async (itemId) => {
    setIsTagTypeUpdating(true);
    setTagTypesError("");

    try {
      const response = await fetch(`/api/tag-types/${itemId}`, { method: "DELETE" });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to delete tag type.");
      }

      setTagTypes((current) => current.filter((item) => item.id !== itemId));
      if (editingTagTypeId === itemId) {
        handleCancelEditTagType();
      }
      return true;
    } catch (error) {
      setTagTypesError(error instanceof Error ? error.message : "Failed to delete tag type.");
      return false;
    } finally {
      setIsTagTypeUpdating(false);
    }
  };

  return {
    tagTypes,
    setTagTypes,
    isTagTypesLoading,
    tagTypeNameInput,
    setTagTypeNameInput,
    tagTypeColorInput,
    setTagTypeColorInput,
    editingTagTypeId,
    editingTagTypeName,
    setEditingTagTypeName,
    editingTagTypeColor,
    setEditingTagTypeColor,
    isTagTypeSaving,
    isTagTypeUpdating,
    tagTypesError,
    setTagTypesError,
    handleCreateTagType,
    handleSaveTagType,
    handleDeleteTagType,
    handleClearTagTypeForm,
    handleStartEditTagType,
    handleCancelEditTagType
  };
}
