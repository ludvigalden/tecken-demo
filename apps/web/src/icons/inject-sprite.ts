/** Injects the sanitized FKUI sprite (no inline styles) for FIcon. */
import spriteSource from "../generated/fkui-sprite.svg?raw";

export function injectSanitizedSprite(
    source: string = spriteSource,
    target: ParentNode = document.body,
): Element {
    const doc = new DOMParser().parseFromString(source, "image/svg+xml");
    const svg = document.importNode(doc.documentElement, true);
    // `hidden` alone does not hide an <svg> (the UA rule targets HTML
    // elements), so the sprite also gets zero size and the
    // `.t-icon-sprite` rule (display: none) from app.scss. No inline style:
    // the CSP forbids style attributes.
    svg.setAttribute("hidden", "");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.classList.add("t-icon-sprite");
    target.prepend(svg);
    return svg;
}
