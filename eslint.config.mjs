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
        ],
    },
    ...fkConfig,
    vueConfig(),
    typescriptConfig(),
    vitestConfig(),
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
];
