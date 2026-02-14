const isHexColor = (value) => /^#[0-9A-Fa-f]{6}$/.test(String(value || "").trim());

export const getTagTypeId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const parseTagNamesList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  return String(value || "")
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export const getTagTypeColor = (value) => (isHexColor(value) ? String(value).trim() : "#94a3b8");

export const hexToRgba = (hexColor, alpha, fallbackRgb = "148, 163, 184") => {
  const value = String(hexColor || "").trim();
  if (!isHexColor(value)) {
    return `rgba(${fallbackRgb}, ${alpha})`;
  }

  const red = Number.parseInt(value.slice(1, 3), 16);
  const green = Number.parseInt(value.slice(3, 5), 16);
  const blue = Number.parseInt(value.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export const buildSearchTagTypeOptions = (tagTypes, mediaTagCatalog) => {
  const map = new Map();

  tagTypes.forEach((tagType) => {
    const name = String(tagType?.name || "").trim();
    if (!name) {
      return;
    }

    const lowerName = name.toLowerCase();
    if (!map.has(lowerName)) {
      map.set(lowerName, {
        lowerName,
        label: name,
        color: getTagTypeColor(tagType?.color)
      });
    }
  });

  mediaTagCatalog.forEach((tag) => {
    const typeName = String(tag?.tagTypeName || "").trim();
    if (!typeName) {
      return;
    }

    const lowerName = typeName.toLowerCase();
    if (!map.has(lowerName)) {
      map.set(lowerName, {
        lowerName,
        label: typeName,
        color: getTagTypeColor(tag?.tagTypeColor)
      });
    }
  });

  return Array.from(map.values());
};

export const buildMediaTagCatalogByTypeId = (mediaTagCatalog) => {
  const map = new Map();
  mediaTagCatalog.forEach((tag) => {
    const tagTypeId = getTagTypeId(tag?.tagTypeId);
    if (tagTypeId === null) {
      return;
    }

    if (!map.has(tagTypeId)) {
      map.set(tagTypeId, []);
    }

    map.get(tagTypeId).push(tag);
  });
  return map;
};

export const createTagTypeRows = (file, tagTypes, getFileMediaTags, getMediaTagColor) => {
  const rows = [];
  const seen = new Set();

  tagTypes.forEach((tagType) => {
    const tagTypeId = getTagTypeId(tagType?.id);
    if (tagTypeId === null) {
      return;
    }

    seen.add(tagTypeId);
    rows.push({
      id: tagTypeId,
      name: String(tagType?.name || "").trim() || `TagType ${tagTypeId}`,
      color: getTagTypeColor(tagType?.color)
    });
  });

  getFileMediaTags(file).forEach((tag) => {
    const tagTypeId = getTagTypeId(tag?.tagTypeId);
    if (tagTypeId === null || seen.has(tagTypeId)) {
      return;
    }

    seen.add(tagTypeId);
    rows.push({
      id: tagTypeId,
      name: String(tag?.tagTypeName || "").trim() || `TagType ${tagTypeId}`,
      color: getMediaTagColor(tag)
    });
  });

  return rows;
};
