import { createApp, reactive } from "vue";
import App from "./App.vue";
import vuetify from "./plugins/vuetify";
import router from "./router";
import bus from "./event-bus";

const app = createApp(App);

// Live, reactive $serverConfig accessible as `this.$serverConfig` in any
// component. App.vue assigns it once authenticated; the getter/setter keep all
// existing `this.$serverConfig` read/write sites working under Vue 3.
const state = reactive({ serverConfig: undefined });
Object.defineProperty(app.config.globalProperties, "$serverConfig", {
  get: () => state.serverConfig,
  set: (value) => {
    state.serverConfig = value;
  },
});

// Shared event bus (mitt) replacing the Vue 2 `$root` event bus.
app.config.globalProperties.$bus = bus;

app.use(router);
app.use(vuetify);
app.mount("#app");
