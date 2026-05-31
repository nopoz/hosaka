<template>
  <v-app-bar flat tile density="compact" theme="dark" color="#272727">
    <v-app-bar-nav-icon
      v-if="$vuetify.display.smAndDown"
      class="menu-toggle"
      @click.stop="$emit('toggle-drawer')"
    >
      <v-icon>mdi-menu</v-icon>
    </v-app-bar-nav-icon>
    <v-app-bar-nav-icon>
      <v-img :src="logo" alt="logo" width="48" height="48" />
    </v-app-bar-nav-icon>

    <v-toolbar-title
      v-if="viewName && 'home'.toLowerCase() !== viewName.toLowerCase()"
      class="text-body-1 text-capitalize ma-0 pl-4"
      >{{ viewName }}</v-toolbar-title
    >
    <v-spacer />
    <v-menu location="bottom end" v-if="user && user.username !== 'anonymous'">
      <template v-slot:activator="{ props }">
        <v-btn v-bind="props" variant="text" size="small" class="text-lowercase">
          {{ user.username }}
          &nbsp;
          <v-icon size="small">mdi-account</v-icon>
        </v-btn>
      </template>
      <v-list density="compact">
        <v-list-item @click="logout" class="text-body-2" title="Log out" />
      </v-list>
    </v-menu>
  </v-app-bar>
</template>
<script>
import { logout } from "@/services/auth";
import logo from "@/assets/wud_logo_white.png";

export default {
  props: {
    user: {
      type: Object,
      required: true,
    },
  },
  emits: ["toggle-drawer"],
  data() {
    return {
      logo,
    };
  },
  computed: {
    viewName() {
      return this.$route.name;
    },
  },

  methods: {
    /**
     * Perform logout.
     * @returns {Promise<void>}
     */
    async logout() {
      try {
        const logoutResult = await logout();
        if (logoutResult.logoutUrl) {
          window.location = logoutResult.logoutUrl;
        } else {
          await this.$router.push({
            name: "login",
          });
        }
      } catch (e) {
        this.$bus.emit("notify", {
          message: `Error when trying to logout (${e.message})`,
          level: "error",
        });
      }
    },
  },
};
</script>

<style scoped>
/* The hamburger only renders on mobile (smAndDown). On touch devices :hover
   sticks after a tap, so Vuetify's hover/active overlay lingers as a faint grey
   circle after the drawer opens. The button needs no hover/active feedback, so
   suppress its overlay entirely (avoids relying on (hover:none) detection). */
.menu-toggle :deep(.v-btn__overlay) {
  opacity: 0 !important;
}
</style>
