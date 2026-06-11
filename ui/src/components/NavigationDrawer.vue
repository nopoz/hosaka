<template>
  <v-navigation-drawer
    v-model="drawerOpen"
    :permanent="$vuetify.display.mdAndUp"
    :temporary="$vuetify.display.smAndDown"
    :rail="isRail"
    theme="dark"
    color="#363636"
  >
    <!-- Desktop only: the rail toggle. On mobile the drawer is a temporary
         overlay opened/closed by the AppBar hamburger, so an in-drawer toggle
         would be a duplicate of it. -->
    <v-toolbar v-if="$vuetify.display.mdAndUp" flat class="ma-0 pa-0">
      <v-app-bar-nav-icon class="menu-toggle" @click.stop="onNavIconClick">
        <v-icon>mdi-menu</v-icon>
      </v-app-bar-nav-icon>
    </v-toolbar>
    <v-list nav class="pt-0 pb-0">
      <v-list-item
        to="/containers"
        key="containers"
        class="mb-0"
        :prepend-icon="containerIcon"
      >
        <v-list-item-title>Containers</v-list-item-title>
      </v-list-item>

      <v-divider key="divider" class="mb-0" />

      <v-list-item
        v-for="configurationItem in configurationItemsSorted"
        :key="configurationItem.to"
        :to="configurationItem.to"
        :prepend-icon="configurationItem.icon"
        class="mb-0"
      >
        <v-list-item-title class="text-capitalize"
          >{{ configurationItem.name }}
        </v-list-item-title>
      </v-list-item>
    </v-list>

    <template v-slot:append v-if="!isRail">
      <v-list>
        <v-list-item class="ml-2 mb-2">
          <v-switch
            hide-details
            inset
            color="secondary"
            label="Dark mode"
            v-model="darkMode"
            @update:model-value="toggleDarkMode"
          >
            <template v-slot:label>
              <v-icon>mdi-weather-night</v-icon>
            </template>
          </v-switch>
        </v-list-item>
      </v-list>
    </template>
  </v-navigation-drawer>
</template>

<script>
import { getContainerIcon } from "@/services/container";
import { getRegistryIcon } from "@/services/registry";
import { getTriggerIcon } from "@/services/trigger";
import { getServerIcon } from "@/services/server";
import { getWatcherIcon } from "@/services/watcher";
import { getAuthenticationIcon } from "@/services/authentication";

export default {
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue"],
  data: () => ({
    mini: true,
    darkMode: localStorage.darkMode !== "false",
    containerIcon: getContainerIcon(),
    configurationItems: [
      {
        to: "/configuration/authentications",
        name: "auth",
        icon: getAuthenticationIcon(),
      },
      {
        to: "/configuration/registries",
        name: "registries",
        icon: getRegistryIcon(),
      },
      {
        to: "/configuration/triggers",
        name: "triggers",
        icon: getTriggerIcon(),
      },
      {
        to: "/configuration/watchers",
        name: "watchers",
        icon: getWatcherIcon(),
      },
      {
        to: "/configuration/server",
        name: "server",
        icon: getServerIcon(),
      },
    ],
  }),

  computed: {
    configurationItemsSorted() {
      return [...this.configurationItems].sort((item1, item2) =>
        item1.name.localeCompare(item2.name),
      );
    },
    // Open/close state, proxied to the parent v-model (only drives visibility on
    // mobile where the drawer is temporary; ignored while permanent on desktop).
    drawerOpen: {
      get() {
        // On desktop the drawer is permanent and always visible; only the mobile
        // overlay follows the parent model.
        return this.$vuetify.display.mdAndUp ? true : this.modelValue;
      },
      set(value) {
        this.$emit("update:modelValue", value);
      },
    },
    // Rail (icon-only) collapse applies on desktop only; on mobile the drawer is
    // a full overlay, never a rail.
    isRail() {
      return this.$vuetify.display.mdAndUp && this.mini;
    },
  },

  watch: {
    // Close the overlay after navigating on mobile.
    $route() {
      if (this.$vuetify.display.smAndDown) {
        this.drawerOpen = false;
      }
    },
  },

  methods: {
    onNavIconClick() {
      if (this.$vuetify.display.smAndDown) {
        this.drawerOpen = false;
      } else {
        this.mini = !this.mini;
      }
    },
    toggleDarkMode: function () {
      localStorage.darkMode = this.darkMode;
      this.setDarkMode(this.darkMode);
    },
    setDarkMode(darkMode) {
      this.$vuetify.theme.global.name = darkMode ? "dark" : "light";
    },
  },

  beforeMount() {
    this.setDarkMode(this.darkMode);
  },
};
</script>

<style scoped>
/* Suppress the toggle's hover/active overlay so it doesn't leave a lingering
   grey circle after a tap (matches the AppBar hamburger). */
.menu-toggle :deep(.v-btn__overlay) {
  opacity: 0 !important;
}
</style>
