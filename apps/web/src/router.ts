import { nextTick } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import type {
    RouteComponent,
    RouteLocationNormalized,
    Router,
    RouterHistory,
} from "vue-router";
import { primeMatch } from "./api/client";
import { phraseFromQuery, wordFromQuery } from "./route-query";

type LazyView = () => Promise<RouteComponent>;
const lookupView: LazyView = async () =>
    (await import("./views/LookupView.vue")).default;
const fingerspellingView: LazyView = async () =>
    (await import("./views/FingerspellingView.vue")).default;

/*
 * Data before render: a route whose URL names a search (`/?q=`,
 * `/fingerstavning?ord=`) starts that match while the view's chunk loads,
 * and the route renders only when both are ready, so the page appears with
 * its result instead of shifting when the result arrives. This covers a
 * first load, a link, and history back from another page. A new search on
 * the same page shows a skeleton of the result instead (see the views).
 */
function primeLookup(to: RouteLocationNormalized): Promise<unknown> {
    const text = phraseFromQuery(to.query);
    return Promise.all([
        lookupView(),
        text ? primeMatch(text, "suggest") : undefined,
    ]);
}

function primeSpelling(to: RouteLocationNormalized): Promise<unknown> {
    const word = wordFromQuery(to.query);
    return Promise.all([
        fingerspellingView(),
        word ? primeMatch(word, "fingerspell") : undefined,
    ]);
}

/** Lazy route views; the route meta names the i18n key of the page title. */
export const routes = [
    {
        path: "/",
        name: "home",
        component: lookupView,
        beforeEnter: async (to: RouteLocationNormalized) => {
            await primeLookup(to);
        },
        meta: { title: "nav.home" },
    },
    {
        path: "/fingerstavning",
        name: "fingerspelling",
        component: fingerspellingView,
        beforeEnter: async (to: RouteLocationNormalized) => {
            await primeSpelling(to);
        },
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
        // The attribution list ships with the view (generated at build time
        // from content/), so the page renders complete, with no data wait,
        // on a load and on a client navigation alike.
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
