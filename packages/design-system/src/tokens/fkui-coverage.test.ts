import { describe, expect, it } from "vitest";
import * as sass from "sass";
import { fkuiColorOverrides } from "./tokens";

/**
 * Completeness of the FKUI theme override: compiles the FKUI SCSS for every
 * component we ship (and FKUI core) and collects each colour variable the
 * output references. Every one must be mapped in fkuiColorOverrides, so the
 * FK palette can never leak through unmapped.
 */
const SHIPPED_FKUI_COMPONENTS = [
    "badge",
    "button",
    "close-button",
    "definition-list",
    "expandable-panel",
    "icon",
    "label",
    "message-box",
    "modal",
    "text-field",
];

function renderedColorVariables(): Set<string> {
    const found = new Set<string>();
    for (const component of [null, ...SHIPPED_FKUI_COMPONENTS]) {
        const source = component
            ? `@use "@fkui/design/src/core";\n@use "@fkui/design/src/components/${component}";`
            : '@use "@fkui/design/src/core";';
        const { css } = sass.compileString(source, {
            loadPaths: ["node_modules", "../../node_modules"],
        });
        for (const m of css.matchAll(
            /var\(--(fkds-color-[a-z0-9-]+|f-text-color-[a-z0-9-]+|fkds-focus-indicator-[a-z-]+)/g,
        )) {
            found.add(m[1] ?? "");
        }
    }
    // The focus indicator is drawn from these two via --f-focus-box-shadow.
    found.add("fkds-focus-indicator-color");
    found.add("fkds-focus-indicator-color-background");
    return found;
}

describe("FKUI theme override coverage", () => {
    it(
        "maps every colour variable the shipped FKUI components render",
        { timeout: 60_000 },
        () => {
            const rendered = renderedColorVariables();
            expect(rendered.size).toBeGreaterThan(40);
            const mapped = new Set(Object.keys(fkuiColorOverrides));
            const unmapped = [...rendered]
                .filter((v) => !mapped.has(v))
                .toSorted();
            expect(unmapped).toEqual([]);
        },
    );
});
