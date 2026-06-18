<template>
  <v-app class="main-background">
    <snack-bar
      :message="snackbarMessage"
      :show="snackbarShow"
      :level="snackbarLevel"
      :timeout="snackbarTimeout"
    />

    <app-bar v-if="authenticated" :user="user" @toggle-drawer="drawer = !drawer" />

    <navigation-drawer v-if="authenticated" v-model="drawer" />

    <!-- Sizes your content based upon application components -->
    <v-main>
      <v-row no-gutters>
        <v-col class="pa-0">
          <router-view></router-view>
        </v-col>
      </v-row>
    </v-main>
  </v-app>
</template>

<script>
import NavigationDrawer from "@/components/NavigationDrawer";
import AppBar from "@/components/AppBar";
import SnackBar from "@/components/SnackBar";
import { getServer } from "@/services/server";

export default {
  components: {
    NavigationDrawer,
    AppBar,
    SnackBar,
  },
  data() {
    return {
      snackbarMessage: "",
      snackbarShow: false,
      snackbarLevel: "info",
      user: undefined,
      // Mobile nav drawer open state (ignored on desktop where it is permanent).
      drawer: false,
    };
  },
  computed: {
    items() {
      return this.$route.fullPath
        .replace("/", "")
        .split("/")
        .map((item) => ({
          text: item ? item : "Home",
          disabled: false,
          href: "",
        }));
    },

    /**
     * Is user authenticated?
     * @returns {boolean}
     */
    authenticated() {
      return this.user !== undefined;
    },
  },
  methods: {
    /**
     * Save current user when authenticated.
     * @param user
     */
    async onAuthenticated(user) {
      this.user = user;
      // Fetch the server config here, when auth is known, rather than in a
      // render hook: anonymous auth has no /login -> /containers bounce, so the
      // App re-render that beforeUpdate relied on never happened and the config
      // (feature flags, ai.enabled) stayed undefined. This fires on every nav,
      // so the guard keeps it to a single fetch.
      if (!this.$serverConfig) {
        const server = await getServer();
        this.$setServerConfig(server.configuration);
      }
    },

    /**
     * Display a notification.
     * @param {{message: string, level?: string, timeout?: number}} payload
     */
    notify({ message, level = "info", timeout = 5000 } = {}) {
      this.snackbarMessage = message;
      this.snackbarLevel = level;
      this.snackbarShow = true;

      if (timeout > 0) {
        setTimeout(() => {
          this.notifyClose();
        }, timeout);
      }
    },

    /**
     * Close the notification.
     */
    notifyClose() {
      this.snackbarMessage = "";
      this.snackbarShow = false;
    },
  },

  /**
   * Listen to application events.
   */
  mounted() {
    this.$bus.on("authenticated", this.onAuthenticated);
    this.$bus.on("notify", this.notify);
    this.$bus.on("notify:close", this.notifyClose);
  },

  /**
   * Stop listening to application events.
   */
  unmounted() {
    this.$bus.off("authenticated", this.onAuthenticated);
    this.$bus.off("notify", this.notify);
    this.$bus.off("notify:close", this.notifyClose);
  },
};
</script>

<style scoped>
.main-background {
  /* background-color: #f5f5f5; */
}
</style>

<style>
/* On mobile, pin the app shell to the dynamic viewport and scroll inside
   v-main instead of the document. A document (body) scroll makes the browser
   chrome (address bar) collapse/expand at the scroll extremes, and Vuetify's
   layout reacts to that viewport resize, which stalls the scroll. An inner
   scroll container keeps the chrome static, so scrolling stays smooth. */
@media (max-width: 959.98px) {
  html,
  body {
    height: 100%;
    overflow: hidden;
  }
  .v-main {
    height: 100dvh;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }
}
</style>