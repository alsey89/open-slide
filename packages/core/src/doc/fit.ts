/**
 * Scale factor to fit `content` px into `available` px. Returns 1 when it
 * already fits, otherwise shrinks proportionally but never below `min` —
 * below that the slot lets content overflow rather than become illegible.
 */
export function computeFitScale(content: number, available: number, min = 0.5): number {
  if (content <= 0 || available <= 0) return 1;
  if (content <= available) return 1;
  return Math.max(min, available / content);
}
