// A-96 (2026-08-04): pairs with the .axxess-stagger-item keyframe animation in src/styles/theme.css.
// Capped so long lists (e.g. a 20-tile grid) don't push the last item's entrance out several
// seconds -- everything finishes animating in within `maxMs`.
export function staggerDelay(index: number, stepMs = 40, maxMs = 480): { animationDelay: string } {
  return { animationDelay: `${Math.min(index * stepMs, maxMs)}ms` };
}
