import { getTagTypeColor } from "../../shared/utils/tagUtils.js";

export const getTagListTokenRange = (value, caret) => {
  const text = String(value || "");
  const normalizedCaret = Math.max(0, Math.min(caret ?? text.length, text.length));
  let start = normalizedCaret;
  while (start > 0 && !/\s/.test(text[start - 1])) {
    start -= 1;
  }

  let end = normalizedCaret;
  while (end < text.length && !/\s/.test(text[end])) {
    end += 1;
  }

  return {
    start,
    end,
    token: text.slice(start, end),
    tokenBeforeCaret: text.slice(start, normalizedCaret)
  };
};

export const buildTagListAutocompleteSuggestions = ({ value, caret, tagCatalog, selectedNames = [], limit = 8 }) => {
  const tokenRange = getTagListTokenRange(value, caret);
  const typedFragment = String(tokenRange.tokenBeforeCaret || "").trim().toLowerCase();
  const selected = new Set((Array.isArray(selectedNames) ? selectedNames : []).map((name) => String(name || "").trim().toLowerCase()).filter(Boolean));

  const suggestions = [];
  const seen = new Set();

  (Array.isArray(tagCatalog) ? tagCatalog : []).forEach((tag) => {
    const name = String(tag?.name || "").trim();
    const normalizedName = name.toLowerCase();
    const typeName = String(tag?.tagTypeName || "").trim();
    if (!name || seen.has(`${typeName.toLowerCase()}:${normalizedName}`)) {
      return;
    }

    if ((selected.has(normalizedName) && normalizedName !== typedFragment) || (typedFragment && !name.toLowerCase().startsWith(typedFragment))) {
      return;
    }

    seen.add(`${typeName.toLowerCase()}:${normalizedName}`);
    suggestions.push({
      key: `${typeName.toLowerCase()}:${normalizedName}`,
      value: typeName ? `${typeName}:${name}` : name,
      label: typeName ? `${typeName}:${name}` : name,
      color: getTagTypeColor(tag?.tagTypeColor)
    });
  });

  suggestions.sort((left, right) => left.label.localeCompare(right.label));
  return suggestions.slice(0, limit);
};

export const applyTagListAutocompleteSuggestion = ({ value, caret, suggestion }) => {
  const text = String(value || "");
  const tagName = typeof suggestion === "string"
    ? String(suggestion || "").trim()
    : String(suggestion?.value || "").trim();
  if (!tagName) {
    return { value: text, caret: Math.max(0, Math.min(caret ?? text.length, text.length)) };
  }

  const tokenRange = getTagListTokenRange(text, caret);
  const before = text.slice(0, tokenRange.start).trimEnd();
  const after = text.slice(tokenRange.end).trimStart();
  const nextValue = [before, tagName, after].filter(Boolean).join(" ");
  const nextCaret = (before ? `${before} `.length : 0) + tagName.length;

  return {
    value: nextValue,
    caret: nextCaret
  };
};
