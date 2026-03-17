export function getSubmittedSearchText(inputValue) {
  return String(inputValue || "").trim();
}

export function createGalleryBrandNavigationState() {
  return {
    activePage: "gallery",
    submittedText: ""
  };
}
