// Writes src/generated/tokens.css and src/generated/fkui-theme.css from the
// token definitions in src/tokens/tokens.ts.
// Usage: node packages/design-system/scripts/generate.mjs (`npm run generate`)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
    fkuiColorOverrides,
    fkuiOtherOverrides,
    focusRing,
    fontStackBase,
    primitives,
    radius,
    semanticColors,
    spacing,
    typeScale,
} from "../src/tokens/tokens.ts";

const generatedDir = join(import.meta.dirname, "../src/generated");

function decl(entries, indent) {
    return entries.map(([k, v]) => `${indent}${k}: ${v};`).join("\n");
}

function tokensCss() {
    const i = "        ";
    const blocks = [
        [
            "Tier 1: private primitives.",
            decl(
                Object.entries(primitives).map(([k, v]) => [
                    `--tecken-${k}`,
                    v,
                ]),
                i,
            ),
        ],
        [
            "Tier 2: semantic roles.",
            decl(
                Object.entries(semanticColors).map(([k, v]) => [
                    `--tecken-${k}`,
                    `var(--tecken-${v})`,
                ]),
                i,
            ),
        ],
        [
            "Spacing.",
            decl(
                Object.entries(spacing).map(([k, v]) => [
                    `--tecken-space-${k}`,
                    v,
                ]),
                i,
            ),
        ],
        [
            "Radius.",
            decl(
                Object.entries(radius).map(([k, v]) => [
                    `--tecken-radius-${k}`,
                    v,
                ]),
                i,
            ),
        ],
        [
            "Focus ring.",
            decl(
                [
                    ["--tecken-focus-ring-width", focusRing.width],
                    ["--tecken-focus-ring-offset", focusRing.offset],
                ],
                i,
            ),
        ],
        [
            "Type scale.",
            decl(
                Object.entries(typeScale).map(([k, v]) => [`--tecken-${k}`, v]),
                i,
            ),
        ],
    ];
    const body = blocks
        .map(([title, d]) => `${i}/* ${title} */\n${d}`)
        .join("\n\n");
    return `/* Generated from src/tokens/tokens.ts — do not edit. */
@layer tecken {
    :root {
${body}

        --tecken-font-family-base: ${fontStackBase};
    }

    html {
        font-family: var(--tecken-font-family-base);
    }
}
`;
}

function fkuiThemeCss() {
    const colours = decl(
        Object.entries(fkuiColorOverrides).map(([k, v]) => [
            `--${k}`,
            `var(--tecken-${v})`,
        ]),
        "    ",
    );
    const other = decl(
        Object.entries(fkuiOtherOverrides).map(([k, v]) => [`--${k}`, v]),
        "    ",
    );
    return `/* Generated from src/tokens/tokens.ts — do not edit.
 * Every FKUI colour variable the shipped FKUI components render, mapped onto
 * Tecken semantic tokens (coverage enforced by fkui-coverage.test.ts).
 */
:root {
${colours}
${other}
}
`;
}

mkdirSync(generatedDir, { recursive: true });
writeFileSync(join(generatedDir, "tokens.css"), tokensCss());
writeFileSync(join(generatedDir, "fkui-theme.css"), fkuiThemeCss());
