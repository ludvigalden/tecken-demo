<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import { useI18n } from "vue-i18n";

/**
 * App shell: our own semantic header/main/footer on FKUI grid classes.
 * A skip link reaches the main region; route views move focus to their
 * heading on navigation (see router.ts).
 */

const { t } = useI18n();

const links = [
    { to: "/", label: "nav.home" },
    { to: "/fingerstavning", label: "nav.fingerspelling" },
    { to: "/om", label: "nav.about" },
    { to: "/kallor", label: "nav.sources" },
    { to: "/tillganglighet", label: "nav.accessibility" },
] as const;
</script>

<template>
    <a class="skip-link" href="#main">{{ t("app.skipLink") }}</a>
    <header class="site-header">
        <div class="container">
            <div class="row">
                <div class="col col--sm-12">
                    <p class="site-title">{{ t("app.name") }}</p>
                    <p class="site-tagline">{{ t("app.tagline") }}</p>
                    <nav class="site-nav" :aria-label="t('app.navLabel')">
                        <ul>
                            <li v-for="link in links" :key="link.to">
                                <router-link :to="link.to" :data-label="t(link.label)">{{ t(link.label) }}</router-link>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>
        </div>
    </header>
    <main id="main" class="site-main" tabindex="-1">
        <div class="container">
            <div class="row">
                <div class="col col--sm-12">
                    <router-view />
                </div>
            </div>
        </div>
    </main>
    <footer class="site-footer">
        <div class="container">
            <p>{{ t("app.footer") }}</p>
        </div>
    </footer>
</template>
