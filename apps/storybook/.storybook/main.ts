import type { StorybookConfig } from "@storybook/vue3-vite";
import vue from "@vitejs/plugin-vue";

/**
 * Served under /designsystem/ with a path-scoped CSP that allows Storybook's
 * fixed inline blocks by sha256 hash only, never `unsafe-*`.
 *
 * The integrated addons that inject runtime <style> elements or style
 * attributes (highlight, measure, outline, backgrounds, viewport) are
 * disabled: their styles are generated at runtime and cannot be hashed at
 * build time. addon-a11y depends on highlight and is not used; the axe check
 * runs in Playwright over every built story instead (tests/design-system/).
 */
const config: StorybookConfig = {
    framework: { name: "@storybook/vue3-vite", options: {} },
    stories: ["../stories/**/*.stories.ts"],
    addons: [],
    features: {
        highlight: false,
        measure: false,
        outline: false,
        backgrounds: false,
        viewport: false,
    },
    core: { disableTelemetry: true },
    async viteFinal(viteConfig) {
        const hasVue = (viteConfig.plugins ?? [])
            .flat()
            .some(
                (p) =>
                    typeof p === "object" &&
                    p !== null &&
                    "name" in p &&
                    p.name === "vite:vue",
            );
        return {
            ...viteConfig,
            plugins: hasVue
                ? viteConfig.plugins
                : [...(viteConfig.plugins ?? []), vue()],
            build: {
                ...viteConfig.build,
                // Assets are referenced, never inlined as data: URIs.
                assetsInlineLimit: 0,
            },
        };
    },
};

export default config;
