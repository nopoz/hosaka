<template>
  <v-footer app theme="dark" height="30px" class="pa-0">
    <v-col cols="12" class="text-center text-caption pa-0">
      {{ new Date().getFullYear() }} — WUD (version {{ version }})
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
