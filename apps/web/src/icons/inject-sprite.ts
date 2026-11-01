/** Injects the sanitized FKUI sprite (no inline styles) for FIcon. */
import spriteSource from "../generated/fkui-sprite.svg?raw";

export function injectSanitizedSprite(
    source: string = spriteSource,
    target: ParentNode = document.body,
): Element {
    const doc = new DOMParser().parseFromString(source, "image/svg+xml");
    const svg = document.importNode(doc.documentElement, true);
    svg.setAttribute("hidden", "");
    svg.setAttribute("aria-hidden", "true");
    target.prepend(svg);
    return svg;
}
