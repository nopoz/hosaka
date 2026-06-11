<template>
  <v-container fluid>
    <v-row>
      <v-col :cols="12" class="pt-2 pb-2">
        <configuration-item :item="configurationItem" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import ConfigurationItem from "@/components/ConfigurationItem";
import { getStore } from "@/services/store";
import bus from "@/event-bus";

export default {
  components: {
    ConfigurationItem,
  },
  data() {
    return {
      state: {},
    };
  },
  computed: {
    configurationItem() {
      return {
        name: "state",
        icon: "ri-save-3-line",
        configuration: this.state.configuration,
      };
    },
  },

  async beforeRouteEnter(to, from, next) {
    try {
      const state = await getStore();
      next((vm) => (vm.state = state));
    } catch (e) {
      bus.emit("notify", {
        message: `Error when trying to load the state configuration (${e.message})`,
        level: "error",
      });
    }
    next();
  },
};
</script>
