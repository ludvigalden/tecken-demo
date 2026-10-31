export default {
    extends: ["@forsakringskassan/stylelint-config"],
    ignoreFiles: [
        "**/node_modules/**",
        "**/dist/**",
        "**/coverage/**",
        "**/storybook-static/**",
    ],
    overrides: [
        {
            // Design check: raw colours and lengths are only allowed inside the token sources.
            files: [
                "**/*.{css,scss,vue}",
                "!packages/design-system/src/tokens/**",
            ],
            rules: {
                "color-no-hex": true,
                "color-named": "never",
                "function-disallowed-list": [
                    "rgb",
                    "rgba",
                    "hsl",
                    "hsla",
                    "hwb",
                    "lab",
                    "lch",
                    "oklab",
                    "oklch",
                    "color",
                ],
                "declaration-property-unit-allowed-list": {
                    "/^(margin|padding|gap|row-gap|column-gap|width|height|min-width|min-height|max-width|max-height|top|right|bottom|left|inset|font-size|line-height|border-radius|border-width|outline-width|outline-offset)/":
                        ["%", "fr", "ch", "vw", "vh", "dvh", "svh"],
                },
            },
        },
    ],
};
