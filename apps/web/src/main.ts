import { createApp } from "vue";
import { createPinia } from "pinia";
import { createI18n } from "vue-i18n";
import { ValidationPlugin } from "@fkui/vue";
import "@fkui/theme-default/dist/fkui-css-variables.css";
import "@fkui/theme-default/dist/theme-light.css";
import "./styles/fkui.scss";
import "@ludvigalden-demo/tecken-design-system/tokens.css";
import "@ludvigalden-demo/tecken-design-system/fkui-theme.css";
import "@ludvigalden-demo/tecken-design-system/components.css";
import "./styles/app.scss";
import sv from "./locales/sv.json";
import App from "./App.vue";
import { injectSanitizedSprite } from "./icons/inject-sprite";
import { makeRouter } from "./router";

injectSanitizedSprite();

const i18n = createI18n({
    legacy: false,
    locale: "sv",
    fallbackLocale: "sv",
    messages: { sv },
});

const app = createApp(App);
app.use(createPinia());
app.use(i18n);
app.use(makeRouter(undefined, (key) => i18n.global.t(key)));
app.use(ValidationPlugin);
app.mount("#app");
