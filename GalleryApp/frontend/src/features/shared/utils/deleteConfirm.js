export function getTagDeleteConfirmMessage(pendingTagDelete) {
  if (!pendingTagDelete) {
    return "";
  }

  const entityLabel = pendingTagDelete.kind === "tagType" ? "TagType" : "Tag";
  return `Are you sure you want to delete ${entityLabel} "${pendingTagDelete.name}"?`;
}

export function getCollectionDeleteConfirmMessage(pendingCollectionDelete) {
  if (!pendingCollectionDelete) {
    return "";
  }

  return `Are you sure you want to delete collection "${pendingCollectionDelete.name}"?`;
}

export function createPendingMediaDelete(file) {
  if (!file) {
    return null;
  }

  const name = String(file.title || file.name || file.relativePath || "").trim();
  return {
    id: file.id ?? null,
    name
  };
}

export function getMediaDeleteConfirmMessage(pendingMediaDelete) {
  if (!pendingMediaDelete) {
    return "";
  }

  return pendingMediaDelete.name
    ? `Are you sure you want to delete "${pendingMediaDelete.name}"?`
    : "Are you sure?";
}
