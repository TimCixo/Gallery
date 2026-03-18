export const BASE_TAG_TYPE_ID = "base";

export const BASE_SEARCH_TAG_DEFINITIONS = [
  { name: "path", syntax: "path:value" },
  { name: "title", syntax: "title:value" },
  { name: "description", syntax: "description:value" },
  { name: "id", syntax: "id:value" },
  { name: "source", syntax: "source:value" },
  { name: "filetype", syntax: "filetype:image/video/gif" }
];

export const BASE_SEARCH_TAG_OPTIONS = BASE_SEARCH_TAG_DEFINITIONS.map((item) => item.name);
export const BASE_SEARCH_TAG_NAMES = new Set(BASE_SEARCH_TAG_OPTIONS);
