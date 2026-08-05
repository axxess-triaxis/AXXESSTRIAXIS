export const liteSurfaceId = "lite";

export type AxxessSurface = "lite" | "x0" | "demo";

export function getLiteSurface(): AxxessSurface {
  return liteSurfaceId;
}

export function isLiteSurface(surface: string | undefined): boolean {
  return surface === liteSurfaceId;
}

export function isForbiddenForLiteSurface(surface: string | undefined): boolean {
  return surface === "x0" || surface === "demo";
}
