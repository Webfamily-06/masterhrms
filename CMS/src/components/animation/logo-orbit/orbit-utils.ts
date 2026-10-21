export const ORBIT_SIZE_DEFAULT = 400;
export const ORBIT_SIZE_MIN = 200;
export const ORBIT_SIZE_MAX = 1290;
export const ORBIT_SPEED_DEFAULT = 1;
export const ORBIT_SPEED_MIN = 0.01;
export const ORBIT_SPEED_MAX = 20;

export const clampOrbitSize = (px: number) => {
  if (!Number.isFinite(px)) return ORBIT_SIZE_DEFAULT;
  return Math.min(ORBIT_SIZE_MAX, Math.max(ORBIT_SIZE_MIN, Math.round(px)));
};

export const readOrbitSizePx = (el: HTMLElement, fallbackSize?: number) => {
  const rect = el.getBoundingClientRect();
  const fromBox = Math.max(rect.width, rect.height);
  if (fromBox >= ORBIT_SIZE_MIN) return clampOrbitSize(fromBox);
  if (fallbackSize !== undefined && Number.isFinite(fallbackSize)) {
    return clampOrbitSize(fallbackSize);
  }
  return ORBIT_SIZE_DEFAULT;
};

export const clampOrbitSpeed = (value: number) => {
  if (!Number.isFinite(value)) return ORBIT_SPEED_DEFAULT;
  return Math.min(ORBIT_SPEED_MAX, Math.max(ORBIT_SPEED_MIN, value));
};
