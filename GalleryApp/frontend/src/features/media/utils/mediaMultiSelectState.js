export function normalizeMediaId(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function syncSelectedMediaMap(currentMap, selectedMediaIds, items) {
  const nextMap = new Map();

  if (currentMap instanceof Map) {
    selectedMediaIds.forEach((id) => {
      if (currentMap.has(id)) {
        nextMap.set(id, currentMap.get(id));
      }
    });
  }

  (Array.isArray(items) ? items : []).forEach((item) => {
    const id = normalizeMediaId(item?.id);
    if (id !== null && nextMap.has(id)) {
      nextMap.set(id, item);
    }
  });

  return nextMap;
}
