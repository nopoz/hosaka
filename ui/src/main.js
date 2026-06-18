import { createApp, reactive } from "vue";
import App from "./App.vue";
import vuetify from "./plugins/vuetify";
import router from "./router";
import bus from "./event-bus";
import "./styles/cyberpunk.css";

const app = createApp(App);

// Live, reactive $serverConfig readable as `this.$serverConfig` in any
// component. App.vue sets it once authenticated via $setServerConfig(): Vue 3's
// component proxy does not forward `this.$serverConfig = x` to a globalProperties
// setter (it shadows the value on the writing component's own ctx instead), so
// every other component would keep reading undefined. A setter method sidesteps
// that and writes the shared reactive state directly.
const state = reactive({ serverConfig: undefined });
Object.defineProperty(app.config.globalProperties, "$serverConfig", {
  get: () => state.serverConfig,
});
app.config.globalProperties.$setServerConfig = (value) => {
  state.serverConfig = value;
};

// Shared event bus (mitt) replacing the Vue 2 `$root` event bus.
app.config.globalProperties.$bus = bus;

app.use(router);
app.use(vuetify);
app.mount("#app");
