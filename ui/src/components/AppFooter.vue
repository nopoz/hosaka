<template>
  <v-footer app theme="dark" height="30px" class="pa-0">
    <v-col
      cols="12"
      class="text-center text-caption text-uppercase pa-0"
      style="letter-spacing: 0.1em"
    >
      {{ new Date().getFullYear() }} — Hosaka (version {{ version }})
    </v-col>
  </v-footer>
</template>

<script>
import { getAppInfos } from "@/services/app";

export default {
  data() {
    return {
      version: "unknown",
    };
  },

  async beforeMount() {
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
