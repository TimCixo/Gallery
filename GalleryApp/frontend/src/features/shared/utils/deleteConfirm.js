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

  if (Array.isArray(file)) {
    return {
      count: file.length
    };
  }

  const name = String(file.title || file.name || file.relativePath || "").trim();
  return {
    count: 1,
    id: file.id ?? null,
    name
  };
}

export function getMediaDeleteConfirmMessage(pendingMediaDelete) {
  if (!pendingMediaDelete) {
    return "";
  }

  if (Number(pendingMediaDelete.count) > 1) {
    return `Are you sure you want to delete ${pendingMediaDelete.count} media items?`;
  }

  return pendingMediaDelete.name
    ? `Are you sure you want to delete "${pendingMediaDelete.name}"?`
    : "Are you sure?";
}
