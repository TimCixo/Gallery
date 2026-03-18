const getMediaKey = (item) => {
  if (!item || typeof item !== "object") {
    return "";
  }

  const normalizedId = Number(item.id);
  if (Number.isSafeInteger(normalizedId) && normalizedId > 0) {
    return `id:${normalizedId}`;
  }

  const relativePath = String(item.relativePath || "").trim();
  return relativePath ? `path:${relativePath}` : "";
};

const resolveLinkedMedia = async (mediaId, findMediaById, visited) => {
  const normalizedId = Number(mediaId);
  if (!Number.isSafeInteger(normalizedId) || normalizedId <= 0) {
    return null;
  }

  const candidate = await findMediaById(normalizedId);
  if (!candidate) {
    return null;
  }

  const candidateKey = getMediaKey(candidate);
  if (!candidateKey || visited.has(candidateKey)) {
    return null;
  }

  return candidate;
};

export async function buildRelatedMediaChain({ media, findMediaById, maxDepth = 50 }) {
  if (!media || typeof findMediaById !== "function") {
    return [];
  }

  const currentKey = getMediaKey(media);
  const visited = new Set(currentKey ? [currentKey] : []);

  const descendants = [];
  let childId = media.child;
  for (let depth = 0; depth < maxDepth; depth += 1) {
    const child = await resolveLinkedMedia(childId, findMediaById, visited);
    if (!child) {
      break;
    }

    visited.add(getMediaKey(child));
    descendants.push(child);
    childId = child.child;
  }

  const ancestors = [];
  let parentId = media.parent;
  for (let depth = 0; depth < maxDepth; depth += 1) {
    const parent = await resolveLinkedMedia(parentId, findMediaById, visited);
    if (!parent) {
      break;
    }

    visited.add(getMediaKey(parent));
    ancestors.push(parent);
    parentId = parent.parent;
  }

  return [
    ...ancestors.reverse().map((item) => ({ ...item, relationSide: "parent", isCurrent: false })),
    { ...media, relationSide: "current", isCurrent: true },
    ...descendants.map((item) => ({ ...item, relationSide: "child", isCurrent: false }))
  ];
}
