const normalizeMediaId = (value) => {
  const normalizedId = Number(value);
  return Number.isSafeInteger(normalizedId) && normalizedId > 0 ? normalizedId : null;
};

const getLinkedIds = (item) => {
  const parentId = normalizeMediaId(item?.parent);
  const childId = normalizeMediaId(item?.child);
  return [parentId, childId].filter((value) => value !== null);
};

export function groupRelatedMediaItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const itemsById = new Map();
  items.forEach((item, index) => {
    const id = normalizeMediaId(item?.id);
    if (id !== null) {
      itemsById.set(id, { item, index });
    }
  });

  const visitedIds = new Set();
  const groupedItems = [];

  items.forEach((item, index) => {
    const id = normalizeMediaId(item?.id);
    if (id === null) {
      groupedItems.push({ ...item, _groupItems: [item], _groupCount: 1 });
      return;
    }

    if (visitedIds.has(id)) {
      return;
    }

    const stack = [id];
    const component = [];

    while (stack.length > 0) {
      const currentId = stack.pop();
      if (visitedIds.has(currentId)) {
        continue;
      }

      const entry = itemsById.get(currentId);
      if (!entry) {
        continue;
      }

      visitedIds.add(currentId);
      component.push(entry);

      getLinkedIds(entry.item).forEach((linkedId) => {
        if (itemsById.has(linkedId) && !visitedIds.has(linkedId)) {
          stack.push(linkedId);
        }
      });

      items.forEach((candidate) => {
        const candidateId = normalizeMediaId(candidate?.id);
        if (candidateId === null || visitedIds.has(candidateId)) {
          return;
        }

        if (getLinkedIds(candidate).includes(currentId)) {
          stack.push(candidateId);
        }
      });
    }

    const orderedComponent = component.sort((left, right) => left.index - right.index);
    const representative = orderedComponent[0]?.item || item;
    groupedItems.push({
      ...representative,
      _groupItems: orderedComponent.map((entry) => entry.item),
      _groupCount: orderedComponent.length || 1,
      _groupRepresentativeIndex: index
    });
  });

  return groupedItems;
}
