import { nextTick } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import type { Router, RouterHistory } from "vue-router";

/** Lazy route views; the route meta names the i18n key of the page title. */
export const routes = [
    {
        path: "/",
        name: "home",
        component: () => import("./views/LookupView.vue"),
        meta: { title: "nav.home" },
    },
    {
        path: "/fingerstavning",
        name: "fingerspelling",
        component: () => import("./views/FingerspellingView.vue"),
        meta: { title: "nav.fingerspelling" },
    },
    {
        path: "/om",
        name: "about",
        component: () => import("./views/AboutView.vue"),
        meta: { title: "nav.about" },
    },
    {
        path: "/kallor",
        name: "sources",
        component: () => import("./views/SourcesView.vue"),
        meta: { title: "nav.sources" },
    },
    {
        path: "/tillganglighet",
        name: "accessibility",
        component: () => import("./views/AccessibilityView.vue"),
        meta: { title: "nav.accessibility" },
    },
    {
        path: "/:pathMatch(.*)*",
        name: "not-found",
        component: () => import("./views/NotFoundView.vue"),
        meta: { title: "notFound.heading" },
    },
];

/**
 * After every client-side navigation (not the first load), move focus to
 * the page's h1 so keyboard and screen-reader users start at the new page.
 */
export function makeRouter(
    history: RouterHistory = createWebHistory(),
    translate: (key: string) => string = (k) => k,
): Router {
    const router = createRouter({ history, routes });
    let first = true;
    router.afterEach(async (to) => {
        const title =
            typeof to.meta.title === "string" ? translate(to.meta.title) : "";
        document.title = title ? `${title} – Tecken` : "Tecken";
        if (first) {
            first = false;
            return;
        }
        await nextTick();
        const heading = document.querySelector<HTMLElement>("main h1");
        heading?.focus();
    });
    return router;
}
