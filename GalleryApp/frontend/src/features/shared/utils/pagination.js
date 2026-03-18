export function normalizePageJumpInput(value, currentPage, totalPages) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return {
      isValid: false,
      targetPage: currentPage
    };
  }

  return {
    isValid: true,
    targetPage: Math.min(Math.max(parsed, 1), Math.max(totalPages, 1))
  };
}

export function normalizePageJumpDisplayValue(value, currentPage, totalPages) {
  return String(normalizePageJumpInput(value, currentPage, totalPages).targetPage);
}
