import { getIconPath } from "../utils/iconPaths";

export default function AppIcon({ name, className = "", alt = "", ...props }) {
  const src = getIconPath(name);
  if (!src) {
    return null;
  }

  return <img src={src} alt={alt} className={className ? `app-icon ${className}` : "app-icon"} {...props} />;
}
