<template>
  <v-navigation-drawer v-model:rail="mini" permanent theme="dark" color="#363636">
    <v-toolbar flat class="ma-0 pa-0">
      <v-app-bar-nav-icon @click.stop="mini = !mini">
        <v-icon v-if="!mini">mdi-close</v-icon>
        <v-icon v-else>mdi-menu</v-icon>
      </v-app-bar-nav-icon>
      <v-toolbar-title v-if="!mini" class="text-body-1">WUD</v-toolbar-title>
    </v-toolbar>
    <v-list nav class="pt-0 pb-0">
      <v-list-item to="/" key="home" class="mb-0" prepend-icon="mdi-home">
        <v-list-item-title>Home</v-list-item-title>
      </v-list-item>
      <v-list-item
        to="/containers"
        key="containers"
        class="mb-0"
        :prepend-icon="containerIcon"
      >
        <v-list-item-title>Containers</v-list-item-title>
      </v-list-item>

      <v-divider key="divider" class="mb-0" />

      <v-list-group v-if="!mini" value="configuration">
        <template v-slot:activator="{ props }">
          <v-list-item
            v-bind="props"
            prepend-icon="mdi-cogs"
            title="Configuration"
          />
        </template>
        <v-list-item
          v-for="configurationItem in configurationItemsSorted"
          :key="configurationItem.to"
          :to="configurationItem.to"
          :prepend-icon="configurationItem.icon"
          class="mb-0 pl-8"
        >
          <v-list-item-title class="text-capitalize"
            >{{ configurationItem.name }}
          </v-list-item-title>
        </v-list-item>
      </v-list-group>
      <v-list-item
        v-else
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

    <template v-slot:append v-if="!mini">
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
import logo from "@/assets/wud_logo_white.png";

export default {
  data: () => ({
    logo,
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
  },

  methods: {
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
