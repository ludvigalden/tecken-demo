import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

/**
 * Negative controls for the import bans in eslint.config.mjs. Each planted
 * snippet imports a banned name from the real package it is banned on, and
 * the repository's own ESLint configuration must reject it.
 */
const eslint = new ESLint({ cwd: `${import.meta.dirname}/../../../..` });

async function ruleIds(code: string): Promise<string[]> {
    const [result] = await eslint.lintText(code, {
        filePath: "packages/design-system/src/components/__planted.ts",
    });
    return (result?.messages ?? []).map((m) => m.ruleId ?? "");
}

describe("banned imports (negative controls)", () => {
    it.each([
        ['import { FPageLayout } from "@fkui/vue";', "FPageLayout"],
        ['import { FResizePane } from "@fkui/vue";', "FResizePane"],
        ['import { FDetailsPanel } from "@fkui/vue";', "FDetailsPanel"],
        ['import { FFixedPane } from "@fkui/vue";', "FFixedPane"],
        ['import { FMinimizablePanel } from "@fkui/vue";', "FMinimizablePanel"],
        [
            'import { injectSpritesheet } from "@fkui/icon-lib-default";',
            "injectSpritesheet",
        ],
        ['import "@fkui/font-default";', "@fkui/font-default"],
        ['import "@fkui/logo-default";', "@fkui/logo-default"],
    ])("rejects %s", { timeout: 60_000 }, async (code, name) => {
        expect.hasAssertions();
        const ids = await ruleIds(`${code}\nexport {};\n`);
        expect(ids, name).toContain("no-restricted-imports");
    });

    it(
        "accepts an allowed FKUI import (control)",
        { timeout: 60_000 },
        async () => {
            expect.hasAssertions();
            const ids = await ruleIds(
                'import { FButton } from "@fkui/vue";\nexport const b = FButton;\n',
            );
            expect(ids).not.toContain("no-restricted-imports");
        },
    );
});
