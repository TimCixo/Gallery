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

export const formatSearchTagValue = (value) => {
  const normalizedValue = String(value ?? "");
  return /\s/.test(normalizedValue) ? `"${normalizedValue.replace(/"/g, "")}"` : normalizedValue;
};
