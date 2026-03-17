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
  home: "/icons/home.png",
  menu: "/icons/menu.png",
  process: "/icons/process.png",
  search: "/icons/search.png",
  tag: "/icons/tag.png",
  upload: "/icons/upload.png"
});

export function getIconPath(name) {
  return ICON_PATHS[name] || null;
}
