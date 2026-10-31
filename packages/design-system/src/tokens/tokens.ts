/**
 * The token source of truth. `scripts/generate.mjs` compiles this into
 * `src/generated/tokens.css` (cascade layer `tecken`) and
 * `src/generated/fkui-theme.css` (every FKUI colour variable our components
 * render, mapped onto Tecken semantic tokens).
 *
 * Tier 1 is private primitives (--tecken-*). Tier 2 is the semantic layer
 * every component and page consumes. Raw colours and lengths exist only in
 * this file.
 */

export const fontStackBase =
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Private colour primitives. */
export const primitives = {
    "green-050": "#eef6f1",
    "green-700": "#1f6b4f",
    "green-800": "#17543e",
    "green-900": "#0f3d2c",
    "blue-050": "#eef2fc",
    "blue-700": "#1d4ed8",
    "blue-800": "#1e40af",
    "amber-050": "#fdf6ec",
    "amber-800": "#92400e",
    "red-050": "#fcf1f1",
    "red-700": "#b91c1c",
    "ink-900": "#1a1a1a",
    "ink-600": "#525252",
    "ink-500": "#737373",
    "paper-000": "#ffffff",
    "paper-100": "#f5f5f4",
    "paper-200": "#e7e5e4",
    "paper-300": "#d6d3d1",
} as const;

export type Primitive = keyof typeof primitives;

/**
 * Semantic colour roles, each resolving to exactly one primitive. Keeping
 * the map to primitives (not to other semantics) lets tests compute every
 * effective colour without a CSS engine.
 */
export const semanticColors = {
    "text-primary": "ink-900",
    "text-secondary": "ink-600",
    "text-inverted": "paper-000",
    "text-disabled": "ink-500",
    "surface-default": "paper-000",
    "surface-muted": "paper-100",
    "surface-interactive-hover": "paper-200",
    "border-default": "ink-500",
    "border-subtle": "paper-300",
    "focus-ring": "green-900",
    "focus-ring-gap": "paper-000",
    "action-bg": "green-700",
    "action-bg-hover": "green-800",
    "action-bg-active": "green-900",
    "action-text": "paper-000",
    "action-text-primary": "green-700",
    "action-text-primary-hover": "green-800",
    "action-text-primary-active": "green-900",
    "status-recorded": "green-700",
    "status-recorded-text": "paper-000",
    "status-recorded-subtle": "green-050",
    "status-link-out": "blue-700",
    "status-link-out-text": "paper-000",
    "status-link-out-subtle": "blue-050",
    "status-unsupported": "amber-800",
    "status-unsupported-text": "paper-000",
    "status-unsupported-subtle": "amber-050",
    "status-error": "red-700",
    "status-error-text": "paper-000",
    "status-error-subtle": "red-050",
    "status-neutral": "paper-200",
    "status-neutral-text": "ink-900",
} as const satisfies Record<string, Primitive>;

export type SemanticColor = keyof typeof semanticColors;

/** Spacing scale (rem). */
export const spacing = {
    "0": "0",
    "25": "0.25rem",
    "50": "0.5rem",
    "100": "1rem",
    "200": "1.5rem",
    "400": "2.5rem",
} as const;

/** Radius scale. */
export const radius = {
    small: "0.25rem",
    medium: "0.5rem",
} as const;

/** Focus ring geometry. */
export const focusRing = {
    width: "0.1875rem",
    offset: "0.125rem",
} as const;

/** Type scale (rem) and line heights. */
export const typeScale = {
    "font-size-xs": "0.75rem",
    "font-size-sm": "0.875rem",
    "font-size-md": "1rem",
    "font-size-lg": "1.25rem",
    "font-size-xl": "1.75rem",
    "line-height-tight": "1.25",
    "line-height-normal": "1.5",
    "font-weight-normal": "400",
    "font-weight-medium": "500",
    "font-weight-bold": "700",
} as const;

/**
 * Every FKUI colour variable that the FKUI components we ship render
 * (enumerated by compiling their SCSS; see fkui-coverage.test.ts), mapped
 * to a Tecken semantic role. The coverage test fails if FKUI renders a
 * colour variable that is missing here.
 */
export const fkuiColorOverrides = {
    // Text
    "fkds-color-text-primary": "text-primary",
    "fkds-color-text-secondary": "text-secondary",
    "fkds-color-text-inverted": "text-inverted",
    "fkds-color-text-disabled": "text-disabled",
    "f-text-color-heading-1": "text-primary",
    "f-text-color-heading-2": "text-primary",
    "f-text-color-heading-3": "text-primary",
    "f-text-color-heading-4": "text-primary",
    "f-text-color-heading-5": "text-primary",
    "f-text-color-heading-6": "text-primary",
    // Surfaces and borders
    "fkds-color-background-primary": "surface-default",
    "fkds-color-background-secondary": "surface-muted",
    "fkds-color-background-disabled": "surface-muted",
    "fkds-color-border-primary": "border-default",
    "fkds-color-border-disabled": "border-subtle",
    "fkds-color-interactive-surface-background-primary-default":
        "surface-muted",
    "fkds-color-interactive-surface-background-primary-hover":
        "surface-interactive-hover",
    // Actions (buttons, links, panel toggles)
    "fkds-color-action-background-primary-default": "action-bg",
    "fkds-color-action-background-primary-hover": "action-bg-hover",
    "fkds-color-action-background-primary-active": "action-bg-active",
    "fkds-color-action-background-primary-focus": "action-bg",
    "fkds-color-action-background-secondary-default": "surface-default",
    "fkds-color-action-background-secondary-hover": "surface-muted",
    "fkds-color-action-background-secondary-active":
        "surface-interactive-hover",
    "fkds-color-action-background-secondary-focus": "surface-default",
    "fkds-color-action-text-inverted-default": "action-text",
    "fkds-color-action-text-inverted-hover": "action-text",
    "fkds-color-action-text-inverted-active": "action-text",
    "fkds-color-action-text-inverted-focus": "action-text",
    "fkds-color-action-text-primary-default": "action-text-primary",
    "fkds-color-action-text-primary-hover": "action-text-primary-hover",
    "fkds-color-action-text-primary-active": "action-text-primary-active",
    "fkds-color-action-text-primary-focus": "action-text-primary",
    "fkds-color-action-text-secondary-default": "text-primary",
    "fkds-color-action-border-primary-default": "action-text-primary",
    "fkds-color-action-border-primary-hover": "action-text-primary-hover",
    "fkds-color-action-border-primary-active": "action-text-primary-active",
    // Feedback (FBadge, FMessageBox, validation). Badges use the strong
    // background with inverted text; the provenance statuses map here so the
    // badge renders the tested --tecken-status-* pairs.
    "fkds-color-feedback-background-positive-strong": "status-recorded",
    "fkds-color-feedback-background-positive": "status-recorded-subtle",
    "fkds-color-feedback-border-positive": "status-recorded",
    "fkds-color-feedback-background-info-strong": "status-link-out",
    "fkds-color-feedback-background-info": "status-link-out-subtle",
    "fkds-color-feedback-border-info": "status-link-out",
    "fkds-color-feedback-background-warning-strong": "status-unsupported",
    "fkds-color-feedback-background-warning": "status-unsupported-subtle",
    "fkds-color-feedback-border-warning": "status-unsupported",
    "fkds-color-feedback-text-on-warning": "status-unsupported-text",
    "fkds-color-feedback-background-negative-strong": "status-error",
    "fkds-color-feedback-background-negative": "status-error-subtle",
    "fkds-color-feedback-border-negative": "status-error",
    "fkds-color-feedback-text-negative": "status-error",
    "fkds-color-feedback-background-neutral-strong": "status-neutral",
    "fkds-color-feedback-background-neutral": "surface-muted",
    "fkds-color-feedback-border-neutral": "border-default",
    // Focus indicator (FKUI draws it as a box-shadow from these two)
    "fkds-focus-indicator-color": "focus-ring",
    "fkds-focus-indicator-color-background": "focus-ring-gap",
} as const satisfies Record<string, SemanticColor>;

/** Non-colour FKUI variables we own. */
export const fkuiOtherOverrides = {
    "f-font-family": "var(--tecken-font-family-base)",
} as const;

export type ContrastKind = "text" | "non-text";

export interface ContrastPair {
    name: string;
    foreground: SemanticColor;
    background: SemanticColor;
    kind: ContrastKind;
}

/**
 * Pairs as rendered: each FKUI foreground/background pairing a shipped
 * component draws, expressed through the semantic roles the override maps
 * them to, plus the Tecken-only pairs. Text needs ≥ 4.5:1, non-text ≥ 3:1.
 */
export const contrastPairs: ContrastPair[] = [
    // Body text
    {
        name: "text-primary on surface-default",
        foreground: "text-primary",
        background: "surface-default",
        kind: "text",
    },
    {
        name: "text-primary on surface-muted",
        foreground: "text-primary",
        background: "surface-muted",
        kind: "text",
    },
    {
        name: "text-secondary on surface-default",
        foreground: "text-secondary",
        background: "surface-default",
        kind: "text",
    },
    {
        name: "text-secondary on surface-muted",
        foreground: "text-secondary",
        background: "surface-muted",
        kind: "text",
    },
    // Buttons
    {
        name: "FButton primary: action-text on action-bg",
        foreground: "action-text",
        background: "action-bg",
        kind: "text",
    },
    {
        name: "FButton primary hover",
        foreground: "action-text",
        background: "action-bg-hover",
        kind: "text",
    },
    {
        name: "FButton primary active",
        foreground: "action-text",
        background: "action-bg-active",
        kind: "text",
    },
    {
        name: "FButton secondary/link: action-text-primary on surface-default",
        foreground: "action-text-primary",
        background: "surface-default",
        kind: "text",
    },
    {
        name: "FButton secondary hover",
        foreground: "action-text-primary-hover",
        background: "surface-muted",
        kind: "text",
    },
    {
        name: "FButton secondary active",
        foreground: "action-text-primary-active",
        background: "surface-interactive-hover",
        kind: "text",
    },
    // FBadge (TProvenanceBadge): strong background, inverted text
    {
        name: "FBadge success (recorded)",
        foreground: "text-inverted",
        background: "status-recorded",
        kind: "text",
    },
    {
        name: "FBadge info (link-out)",
        foreground: "text-inverted",
        background: "status-link-out",
        kind: "text",
    },
    {
        name: "FBadge warning (unsupported)",
        foreground: "status-unsupported-text",
        background: "status-unsupported",
        kind: "text",
    },
    {
        name: "FBadge error",
        foreground: "text-inverted",
        background: "status-error",
        kind: "text",
    },
    {
        name: "FBadge default (neutral)",
        foreground: "text-primary",
        background: "status-neutral",
        kind: "text",
    },
    // Messages and validation
    {
        name: "FMessageBox / inverted badge text on subtle positive",
        foreground: "text-primary",
        background: "status-recorded-subtle",
        kind: "text",
    },
    {
        name: "inverted badge text on subtle info",
        foreground: "text-primary",
        background: "status-link-out-subtle",
        kind: "text",
    },
    {
        name: "inverted badge text on subtle warning",
        foreground: "text-primary",
        background: "status-unsupported-subtle",
        kind: "text",
    },
    {
        name: "inverted badge text on subtle error",
        foreground: "text-primary",
        background: "status-error-subtle",
        kind: "text",
    },
    {
        name: "validation error text on surface-default",
        foreground: "status-error",
        background: "surface-default",
        kind: "text",
    },
    // Non-text: control borders and the focus indicator
    {
        name: "input border on surface-default",
        foreground: "border-default",
        background: "surface-default",
        kind: "non-text",
    },
    {
        name: "focus-ring on surface-default",
        foreground: "focus-ring",
        background: "surface-default",
        kind: "non-text",
    },
    {
        name: "focus-ring on surface-muted",
        foreground: "focus-ring",
        background: "surface-muted",
        kind: "non-text",
    },
    {
        name: "focus-ring against its gap",
        foreground: "focus-ring",
        background: "focus-ring-gap",
        kind: "non-text",
    },
    {
        name: "focus-ring on action-bg (focused primary button)",
        foreground: "focus-ring-gap",
        background: "action-bg",
        kind: "non-text",
    },
];

/** Resolves a semantic role to its effective hex value. */
export function effectiveColor(role: SemanticColor): string {
    return primitives[semanticColors[role]];
}
