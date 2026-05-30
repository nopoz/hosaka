<template>
  <v-container
    fluid
    class="ma-0 mb-3"
    :class="$vuetify.display.mdAndUp ? 'pa-0' : ''"
  >
    <v-row dense>
      <v-col>
        <v-select
          :hide-details="true"
          v-model="watcherSelected"
          :items="watchers"
          @update:model-value="emitWatcherChanged"
          :clearable="true"
          label="Watcher"
          variant="outlined"
          density="compact"
        ></v-select>
      </v-col>
      <v-col>
        <v-select
          :hide-details="true"
          v-model="registrySelected"
          :items="registries"
          @update:model-value="emitRegistryChanged"
          :clearable="true"
          label="Registry"
          variant="outlined"
          density="compact"
        ></v-select>
      </v-col>
      <v-col>
        <v-select
          :hide-details="true"
          v-model="updateKindSelected"
          :items="updateKinds"
          @update:model-value="emitUpdateKindChanged"
          :clearable="true"
          label="Update kind"
          variant="outlined"
          density="compact"
        ></v-select>
      </v-col>
      <v-col>
        <v-switch
          class="switch-top"
          color="secondary"
          label="Update available"
          @update:model-value="emitUpdateAvailableChanged"
          :model-value="updateAvailable"
          :hide-details="true"
          density="compact"
        />
      </v-col>
      <v-col class="text-right">
        <v-btn
          color="secondary"
          @click.stop="refreshAllContainers"
          :loading="isRefreshing"
        >
          Watch now
          <v-icon> mdi-refresh</v-icon>
        </v-btn>
        <br />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { refreshAllContainers } from "@/services/container";

export default {
  props: {
    registries: {
      type: Array,
      required: true,
    },
    registrySelectedInit: {
      type: String,
      required: true,
    },
    watchers: {
      type: Array,
      required: true,
    },
    watcherSelectedInit: {
      type: String,
      required: true,
    },
    updateKinds: {
      type: Array,
      required: true,
    },
    updateKindSelectedInit: {
      type: String,
      required: true,
    },
    updateAvailable: {
      type: Boolean,
      required: true,
    },
  },

  data() {
    return {
      isRefreshing: false,
      registrySelected: "",
      watcherSelected: "",
      updateKindSelected: "",
    };
  },

  methods: {
    emitRegistryChanged() {
      this.$emit("registry-changed", this.registrySelected);
    },
    emitWatcherChanged() {
      this.$emit("watcher-changed", this.watcherSelected);
    },
    emitUpdateKindChanged() {
      this.$emit("update-kind-changed", this.updateKindSelected);
    },
    emitUpdateAvailableChanged() {
      this.$emit("update-available-changed");
    },
    async refreshAllContainers() {
      this.isRefreshing = true;
      try {
        const body = await refreshAllContainers();
        this.$bus.emit("notify", { message: `All containers refreshed` });
        this.$emit("refresh-all-containers", body);
      } catch (e) {
        this.$bus.emit("notify", {
          message: `Error when trying to refresh all containers (${e.message})`,
          level: "error",
        });
      } finally {
        this.isRefreshing = false;
      }
    },
  },

  async beforeUpdate() {
    this.registrySelected = this.registrySelectedInit;
    this.watcherSelected = this.watcherSelectedInit;
    this.updateKindSelected = this.updateKindSelectedInit;
  },
};
</script>

<style scoped>
.switch-top {
  margin-top: 4px;
}
</style>
