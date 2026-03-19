export const ICON_PATHS = Object.freeze({
  arrowLeft: "/icons/arrow_left.png",
  arrowRight: "/icons/arrow_right.png",
  cancel: "/icons/cancel.png",
  close: "/icons/close.png",
  collection: "/icons/collection.png",
  confirm: "/icons/confirm.png",
  create: "/icons/create.png",
  delete: "/icons/delete.png",
  edit: "/icons/edit.png",
  favoriteDisabled: "/icons/favorite_disable.png",
  favoriteEnabled: "/icons/favorite_enable.png",
  filter: "/icons/filter.png",
  height: "/icons/height.png",
  home: "/icons/home.png",
  menu: "/icons/menu.png",
  process: "/icons/process.png",
  resize: "/icons/resize.png",
  search: "/icons/search.png",
  tag: "/icons/tag.png",
  upload: "/icons/upload.png",
  width: "/icons/width.png"
});

export function getIconPath(name) {
  return ICON_PATHS[name] || null;
}
