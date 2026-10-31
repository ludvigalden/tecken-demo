import type { ContrastPair } from "../tokens";

/**
 * Planted failing pair: proves the contrast suite can fail. A subtle border
 * colour used as text on white is about 1.5:1, far below 4.5:1, and the
 * negative-control test asserts exactly that.
 */
export const plantedBadPair: ContrastPair = {
    name: "planted: border-subtle as text on white (must fail)",
    foreground: "border-subtle",
    background: "surface-default",
    kind: "text",
};
