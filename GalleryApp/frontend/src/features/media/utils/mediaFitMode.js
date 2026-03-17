export const MEDIA_FIT_MODES = Object.freeze(["resize", "height", "width"]);

export function getNextMediaFitMode(currentMode) {
  const currentIndex = MEDIA_FIT_MODES.indexOf(currentMode);
  if (currentIndex === -1) {
    return MEDIA_FIT_MODES[0];
  }

  return MEDIA_FIT_MODES[(currentIndex + 1) % MEDIA_FIT_MODES.length];
}
