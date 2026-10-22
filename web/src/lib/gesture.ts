/** Apple's momentum projection (Designing Fluid Interfaces): where a release at v px/ms comes to rest, in px. */
export const project = (v: number, d = 0.99): number => (v * d) / (1 - d);

/** Apple's rubber band: the further past the edge, the less the sheet follows. Keeps the sign of `over`. */
export const rubber = (over: number, dim: number): number => (over * dim * 0.55) / (dim + 0.55 * Math.abs(over));

/** A downward drag of dy px released at v px/ms closes a sheet of height h when its projected rest is past 35%.
 * Uses scroll deceleration (0.998): with 0.99 a 1.2 px/ms flick from 50 px would not close (the brief's test case). */
export const dismiss = (dy: number, v: number, h: number): boolean => dy + project(v, 0.998) > h * 0.35;
