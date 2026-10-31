import fkConfig from "@forsakringskassan/eslint-config";
import typescriptConfig from "@forsakringskassan/eslint-config-typescript";
import vitestConfig from "@forsakringskassan/eslint-config-vitest";
import vueConfig from "@forsakringskassan/eslint-config-vue";
import vueA11y from "eslint-plugin-vuejs-accessibility";

const bannedFkuiComponents = [
    "FPageLayout",
    "FResizePane",
    "FDetailsPanel",
    "FFixedPane",
    "FMinimizablePanel",
];

export default [
    {
        ignores: [
            "**/node_modules/**",
            "**/dist/**",
            "**/coverage/**",
            "**/storybook-static/**",
            "**/*.d.ts",
            ".nx/**",
            "apps/storybook/generated/**",
        ],
    },
    ...fkConfig,
    vueConfig(),
    typescriptConfig(),
    // The vitest preset claims *.spec.* files; the Playwright specs under
    // tests/ use @playwright/test, so they are excluded from it.
    vitestConfig({ ignores: ["cypress/**", "tests/**"] }),
    ...vueA11y.configs["flat/recommended"],
    {
        name: "tecken/banned-imports",
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    paths: [
                        {
                            name: "@fkui/vue",
                            importNames: bannedFkuiComponents,
                            message:
                                "FKUI custom-element components are banned (shadow-root styles break the CSP).",
                        },
                        {
                            name: "@fkui/icon-lib-default",
                            importNames: ["injectSpritesheet"],
                            message:
                                "Use injectSanitizedSprite() from apps/web instead.",
                        },
                        {
                            name: "@fkui/icon-lib-default/dist/f",
                            importNames: ["injectSpritesheet"],
                            message:
                                "Use injectSanitizedSprite() from apps/web instead.",
                        },
                    ],
                    patterns: [
                        {
                            group: [
                                "@fkui/font-default",
                                "@fkui/font-default/*",
                            ],
                            message:
                                "No FK web font: the token layer owns typography.",
                        },
                        {
                            group: [
                                "@fkui/logo-default",
                                "@fkui/logo-default/*",
                            ],
                            message: "The FK logo is not used in this demo.",
                        },
                    ],
                },
            ],
        },
    },
    {
        name: "tecken/no-v-html",
        files: ["**/*.vue"],
        rules: {
            "vue/no-v-html": "error",
            "vue/no-restricted-syntax": [
                "error",
                {
                    selector:
                        "VAttribute[directive=true][key.name.name='html']",
                    message: "v-html is banned: render text, never markup.",
                },
            ],
        },
    },
    {
        // The utterance record is a wire contract with snake_case field names
        // (content/utterances/*.json). These packages construct and read those
        // records, so snake_case identifiers are the honest spelling here.
        name: "tecken/wire-record-field-names",
        files: [
            "packages/contracts/src/**",
            "services/api/src/**",
            "apps/web/src/**",
            "tools/media-pipeline/src/**",
            "packages/design-system/src/**",
            "apps/storybook/stories/**",
        ],
        rules: {
            camelcase: "off",
        },
    },
];
