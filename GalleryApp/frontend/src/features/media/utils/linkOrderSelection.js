const normalizeRelationId = (value) => {
  const normalized = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
};

const getExpectedRelationAtIndex = (items, index) => {
  const previousId = Number(items[index - 1]?.id);
  const nextId = Number(items[index + 1]?.id);

  return {
    parent: Number.isSafeInteger(previousId) && previousId > 0
      ? previousId
      : normalizeRelationId(items[index]?.draft?.parent),
    child: Number.isSafeInteger(nextId) && nextId > 0
      ? nextId
      : normalizeRelationId(items[index]?.draft?.child)
  };
};

export function hasLinkedSelectionInOrder(items) {
  const normalizedItems = Array.isArray(items) ? items : [];
  if (normalizedItems.length < 2) {
    return false;
  }

  return normalizedItems.every((item, index) => {
    if (index === 0) {
      return normalizeRelationId(item?.draft?.child) === Number(normalizedItems[index + 1]?.id);
    }

    if (index === normalizedItems.length - 1) {
      return normalizeRelationId(item?.draft?.parent) === Number(normalizedItems[index - 1]?.id);
    }

    return (
      normalizeRelationId(item?.draft?.parent) === Number(normalizedItems[index - 1]?.id)
      && normalizeRelationId(item?.draft?.child) === Number(normalizedItems[index + 1]?.id)
    );
  });
}

export function hasLinkOrderOverwrite(items) {
  const normalizedItems = Array.isArray(items) ? items : [];
  if (normalizedItems.length < 2) {
    return false;
  }

  return normalizedItems.some((item, index) => {
    const expected = getExpectedRelationAtIndex(normalizedItems, index);
    const currentParent = normalizeRelationId(item?.draft?.parent);
    const currentChild = normalizeRelationId(item?.draft?.child);

    return (
      (currentParent !== expected.parent && currentParent !== null)
      || (currentChild !== expected.child && currentChild !== null)
    );
  });
}

export function disconnectSelectedLinkOrder(items) {
  const normalizedItems = Array.isArray(items) ? items : [];
  if (normalizedItems.length < 2) {
    return normalizedItems;
  }

  return normalizedItems.map((item, index) => {
    const nextDraft = { ...(item?.draft || {}) };

    if (index > 0) {
      nextDraft.parent = "";
    }

    if (index < normalizedItems.length - 1) {
      nextDraft.child = "";
    }

    return {
      ...item,
      draft: nextDraft
    };
  });
}
