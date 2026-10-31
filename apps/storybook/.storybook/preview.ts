import type { Preview } from "@storybook/vue3-vite";
import { setup } from "@storybook/vue3-vite";
import { ValidationPlugin } from "@fkui/vue";
import "@fkui/theme-default/dist/fkui-css-variables.css";
import "@fkui/theme-default/dist/theme-light.css";
import "./fkui.scss";
import "@ludvigalden-demo/tecken-design-system/tokens.css";
import "@ludvigalden-demo/tecken-design-system/fkui-theme.css";
import "@ludvigalden-demo/tecken-design-system/components.css";

setup((app) => {
    app.use(ValidationPlugin);
});

const preview: Preview = {
    parameters: {},
};

export default preview;
