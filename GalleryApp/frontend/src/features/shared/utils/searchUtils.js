export const parseSearchSegments = ({ value, baseSearchTagNames, searchTagTypeMap, searchTagOptions }) => {
  const text = String(value || "");
  if (!text) {
    return [];
  }

  const segments = [];
  let index = 0;
  while (index < text.length) {
    if (text[index] === " ") {
      const start = index;
      while (index < text.length && text[index] === " ") {
        index += 1;
      }

      segments.push({ text: text.slice(start, index), isTag: false });
      continue;
    }

    const tokenStart = index;
    let tokenEnd = tokenStart;
    while (tokenEnd < text.length && text[tokenEnd] !== " ") {
      tokenEnd += 1;
    }

    const token = text.slice(tokenStart, tokenEnd);
    const separatorIndex = token.indexOf(":");
    const tokenWithoutAtPrefix = token.startsWith("@") ? token.slice(1) : token;
    const normalizedToken = tokenWithoutAtPrefix.trim().toLowerCase();
    const tagName = separatorIndex > 0 ? tokenWithoutAtPrefix.slice(0, separatorIndex).trim().toLowerCase() : "";
    const normalizedTokenTagName = separatorIndex < 0 ? normalizedToken : tagName;
    const tagType = searchTagTypeMap.get(normalizedTokenTagName);
    const isKnownSearchTag = baseSearchTagNames.has(normalizedTokenTagName);
    const isTypedKnownPrefix = separatorIndex < 0 && searchTagOptions.some((option) => option.startsWith(normalizedTokenTagName));

    segments.push({
      text: text.slice(tokenStart, tokenEnd),
      isTag: Boolean(normalizedTokenTagName) && (isKnownSearchTag || tagType != null || isTypedKnownPrefix),
      color: tagType?.color || ""
    });

    index = tokenEnd;
  }

  return segments;
};

export const getSearchTokenRange = (text, caret) => {
  const normalizedText = String(text || "");
  const normalizedCaret = Math.max(0, Math.min(caret ?? normalizedText.length, normalizedText.length));
  let start = normalizedCaret;
  while (start > 0 && normalizedText[start - 1] !== " ") {
    start -= 1;
  }

  let end = normalizedCaret;
  while (end < normalizedText.length && normalizedText[end] !== " ") {
    end += 1;
  }

  return {
    start,
    end,
    token: normalizedText.slice(start, end),
    tokenBeforeCaret: normalizedText.slice(start, normalizedCaret)
  };
};

export const formatSearchTagValue = (value) => (/\s/.test(value) ? `"${value.replace(/"/g, "")}"` : value);

export const buildSearchSuggestions = ({
  searchTokenRange,
  searchTagOptions,
  searchTagTypeMap,
  baseSearchTagNames,
  mediaTagCatalog
}) => {
  const tokenBeforeCaret = searchTokenRange.tokenBeforeCaret;
  const token = searchTokenRange.token;
  const tokenBeforeCaretWithoutAtPrefix = tokenBeforeCaret.startsWith("@")
    ? tokenBeforeCaret.slice(1)
    : tokenBeforeCaret;
  const tokenWithoutAtPrefix = token.startsWith("@") ? token.slice(1) : token;
  const separatorIndex = tokenWithoutAtPrefix.indexOf(":");

  if (separatorIndex < 0) {
    if (tokenBeforeCaretWithoutAtPrefix.includes(":")) {
      return [];
    }

    const typedFragment = tokenBeforeCaretWithoutAtPrefix.trim().toLowerCase();
    const byTagNames = searchTagOptions
      .filter((tagName) => tagName.startsWith(typedFragment))
      .slice(0, 40)
      .map((tagName) => ({
        kind: "tagName",
        key: `tag-${tagName}`,
        tagName,
        label: `${tagName}:`,
        color: searchTagTypeMap.get(tagName)?.color || ""
      }));

    const byTagPairs = [];
    const seenPairs = new Set();
    mediaTagCatalog.forEach((tag) => {
      const candidateTypeName = String(tag?.tagTypeName || "").trim();
      const candidateType = candidateTypeName.toLowerCase();
      const candidateValueName = String(tag?.name || "").trim();
      const candidateValue = candidateValueName.toLowerCase();
      if (!candidateType || !candidateValueName) {
        return;
      }

      if (typedFragment && !candidateType.includes(typedFragment) && !candidateValue.includes(typedFragment)) {
        return;
      }

      const normalizedPair = `${candidateType}:${candidateValue}`;
      if (seenPairs.has(normalizedPair)) {
        return;
      }

      seenPairs.add(normalizedPair);
      byTagPairs.push({
        kind: "tagValue",
        key: `pair-${normalizedPair}`,
        tagName: candidateType,
        tagValue: candidateValueName,
        label: `${candidateType}:${candidateValueName}`,
        color: searchTagTypeMap.get(candidateType)?.color || ""
      });
    });

    byTagPairs.sort((left, right) => left.label.localeCompare(right.label));
    return [...byTagNames, ...byTagPairs].slice(0, 40);
  }

  if (!tokenBeforeCaretWithoutAtPrefix.includes(":") || separatorIndex <= 0) {
    return [];
  }

  const tagName = tokenWithoutAtPrefix.slice(0, separatorIndex).trim().toLowerCase();
  if (!tagName || baseSearchTagNames.has(tagName) || !searchTagTypeMap.has(tagName)) {
    return [];
  }

  const typedTagValuePrefix = tokenBeforeCaretWithoutAtPrefix
    .slice(tokenBeforeCaretWithoutAtPrefix.indexOf(":") + 1)
    .trimStart()
    .replace(/^"/, "")
    .toLowerCase();

  const candidates = [];
  const seen = new Set();
  mediaTagCatalog.forEach((tag) => {
    const candidateType = String(tag?.tagTypeName || "").trim().toLowerCase();
    const candidateName = String(tag?.name || "").trim();
    if (!candidateName || candidateType !== tagName) {
      return;
    }

    const normalizedCandidate = candidateName.toLowerCase();
    if (typedTagValuePrefix && !normalizedCandidate.includes(typedTagValuePrefix)) {
      return;
    }
    if (seen.has(normalizedCandidate)) {
      return;
    }

    seen.add(normalizedCandidate);
    candidates.push(candidateName);
  });

  candidates.sort((left, right) => left.localeCompare(right));
  return candidates.slice(0, 40).map((tagValue) => ({
    kind: "tagValue",
    key: `value-${tagName}-${tagValue.toLowerCase()}`,
    tagName,
    tagValue,
    label: tagValue,
    color: searchTagTypeMap.get(tagName)?.color || ""
  }));
};
