/**
 * Brings a result into view after a search: its section starts at the top
 * of the viewport, so the whole clip fits on a laptop screen without
 * scrolling, and focus moves to the result heading without a second
 * scroll. The jump is instant (no smooth scrolling), so it never animates.
 */
export function revealResult(heading: HTMLElement | null | undefined): void {
    heading?.closest("section")?.scrollIntoView({ block: "start" });
    heading?.focus({ preventScroll: true });
}
