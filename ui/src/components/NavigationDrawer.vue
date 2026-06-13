<template>
  <v-navigation-drawer
    v-model="drawerOpen"
    :permanent="$vuetify.display.mdAndUp"
    :temporary="$vuetify.display.smAndDown"
    :rail="isRail"
    color="surface"
  >
    <!-- Desktop only: the rail toggle. On mobile the drawer is a temporary
         overlay opened/closed by the AppBar hamburger, so an in-drawer toggle
         would be a duplicate of it. -->
    <v-toolbar
      v-if="$vuetify.display.mdAndUp"
      flat
      color="transparent"
      class="ma-0 pa-0"
    >
      <v-app-bar-nav-icon class="menu-toggle" @click.stop="onNavIconClick">
        <v-icon>ri-menu-line</v-icon>
      </v-app-bar-nav-icon>
    </v-toolbar>
    <v-list nav class="pt-0 pb-0">
      <v-list-item
        to="/containers"
        key="containers"
        class="mb-0"
        :prepend-icon="containerIcon"
      >
        <v-list-item-title class="nav-title text-uppercase"
          >Containers</v-list-item-title
        >
      </v-list-item>

      <v-divider key="divider" class="mb-0" />

      <v-list-item
        v-for="configurationItem in configurationItemsSorted"
        :key="configurationItem.to"
        :to="configurationItem.to"
        :prepend-icon="configurationItem.icon"
        class="mb-0"
      >
        <v-list-item-title class="nav-title text-uppercase"
          >{{ configurationItem.name }}
        </v-list-item-title>
      </v-list-item>

      <v-divider key="info-divider" class="mb-0" />

      <v-list-item
        href="https://github.com/nopoz/hosaka"
        target="_blank"
        rel="noopener"
        prepend-icon="ri-github-line"
        class="mb-0"
      >
        <v-list-item-title class="nav-title text-uppercase"
          >GitHub</v-list-item-title
        >
      </v-list-item>

      <v-list-item
        href="https://nopoz.github.io/hosaka/"
        target="_blank"
        rel="noopener"
        prepend-icon="ri-book-open-line"
        class="mb-0"
      >
        <v-list-item-title class="nav-title text-uppercase"
          >Docs</v-list-item-title
        >
      </v-list-item>
    </v-list>

    <template v-slot:append>
      <v-list class="pb-2">
        <v-list-item v-if="!isRail" class="px-4 py-1">
          <span class="text-caption text-medium-emphasis font-mono"
            >Hosaka<template v-if="version && version !== 'unknown'">
              v{{ version }}</template
            ></span
          >
        </v-list-item>

        <v-menu location="top" :close-on-content-click="true">
          <template v-slot:activator="{ props }">
            <v-list-item
              v-bind="props"
              :prepend-icon="isRail ? 'ri-palette-line' : undefined"
              class="theme-trigger"
            >
              <template v-if="!isRail">
                <div class="d-flex align-center">
                  <span class="theme-swatch mr-2">
                    <i :style="{ background: activeTheme.swatch[0] }"></i>
                    <i :style="{ background: activeTheme.swatch[1] }"></i>
                  </span>
                  <span class="nav-title text-uppercase text-caption">{{
                    activeTheme.label
                  }}</span>
                  <v-spacer />
                  <v-icon size="small">ri-arrow-up-s-line</v-icon>
                </div>
              </template>
            </v-list-item>
          </template>

          <v-list density="compact" nav>
            <v-list-item
              v-for="t in themes"
              :key="t.id"
              :active="t.id === theme"
              @click="selectTheme(t.id)"
            >
              <template v-slot:prepend>
                <span class="theme-swatch mr-2">
                  <i :style="{ background: t.swatch[0] }"></i>
                  <i :style="{ background: t.swatch[1] }"></i>
                </span>
              </template>
              <v-list-item-title class="text-body-2">{{
                t.label
              }}</v-list-item-title>
              <template v-slot:append>
                <v-icon v-if="t.id === theme" size="small">ri-check-line</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
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
import { getAppInfos } from "@/services/app";

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
    theme: "neon-noir",
    themes: [
      { id: "neon-noir", label: "Neon Noir", swatch: ["#19E3E3", "#D633FF"] },
      { id: "acid-matrix", label: "Acid Matrix", swatch: ["#5CFF3D", "#FF1F4B"] },
      { id: "synthwave", label: "Synthwave", swatch: ["#FF2E97", "#19E3E3"] },
      { id: "sprawl-terminal", label: "Sprawl Terminal", swatch: ["#FFB000", "#C98A00"] },
      { id: "corpo", label: "Corpo", swatch: ["#0D0D0D", "#767676"] },
    ],
    version: "unknown",
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
    activeTheme() {
      return this.themes.find((t) => t.id === this.theme) || this.themes[0];
    },
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
    selectTheme(id) {
      this.theme = id;
      localStorage.theme = id;
      this.$vuetify.theme.global.name = id;
    },
  },

  async beforeMount() {
    const valid = this.themes.map((t) => t.id);
    let name = localStorage.theme;
    if (!valid.includes(name)) {
      // Migrate the old boolean dark-mode pref: an explicit light choice maps to
      // the only light theme (Corpo); everything else defaults to Neon Noir.
      name = localStorage.darkMode === "false" ? "corpo" : "neon-noir";
      localStorage.theme = name;
    }
    this.theme = name;
    this.$vuetify.theme.global.name = name;
    try {
      const appInfos = await getAppInfos();
      this.version = appInfos.version || "unknown";
    } catch (e) {
      this.$bus.emit("notify", {
        message: `Error when trying to get app version (${e.message})`,
        level: "error",
      });
    }
  },
};
</script>

<style scoped>
/* Suppress the toggle's hover/active overlay so it doesn't leave a lingering
   grey circle after a tap (matches the AppBar hamburger). */
.menu-toggle :deep(.v-btn__overlay) {
  opacity: 0 !important;
}

/* All-caps nav labels get a touch of tracking so condensed Rajdhani reads
   cleanly in uppercase (matches the app-bar title + footer). */
.nav-title {
  letter-spacing: 0.1em;
  font-weight: 600;
}

/* Two-color theme swatch used in the picker trigger + menu rows. */
.theme-swatch {
  display: inline-flex;
  gap: 2px;
  vertical-align: middle;
}
.theme-swatch i {
  width: 8px;
  height: 16px;
  border-radius: 2px;
  display: inline-block;
}
</style>
