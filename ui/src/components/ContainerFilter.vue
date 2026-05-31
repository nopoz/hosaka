<template>
  <v-container fluid class="ma-0 mb-3 pa-0">
    <!-- Mobile: collapse the filters behind a toggle so the bar is a single
         compact row by default; keep Watch now always reachable. -->
    <div v-if="$vuetify.display.smAndDown" class="d-flex align-center mb-2">
      <v-btn variant="tonal" size="small" @click.stop="showFilters = !showFilters">
        <v-icon start>mdi-filter-variant</v-icon>
        Filters
        <v-icon end>{{
          showFilters ? "mdi-chevron-up" : "mdi-chevron-down"
        }}</v-icon>
      </v-btn>
      <v-spacer />
      <v-btn
        color="secondary"
        size="small"
        @click.stop="refreshAllContainers"
        :loading="isRefreshing"
      >
        Watch now
        <v-icon end>mdi-refresh</v-icon>
      </v-btn>
    </div>

    <v-expand-transition>
      <v-row dense v-show="$vuetify.display.mdAndUp || showFilters">
      <v-col cols="6" sm="4" md="2">
        <v-select
          :hide-details="true"
          v-model="watcherSelected"
          :items="withEmptyOption(watchers)"
          @update:model-value="emitWatcherChanged"
          :clearable="$vuetify.display.mdAndUp"
          label="Watcher"
          variant="outlined"
          density="compact"
        ></v-select>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-select
          :hide-details="true"
          v-model="registrySelected"
          :items="withEmptyOption(registries)"
          @update:model-value="emitRegistryChanged"
          :clearable="$vuetify.display.mdAndUp"
          label="Registry"
          variant="outlined"
          density="compact"
        ></v-select>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-select
          :hide-details="true"
          v-model="updateKindSelected"
          :items="withEmptyOption(updateKinds)"
          @update:model-value="emitUpdateKindChanged"
          :clearable="$vuetify.display.mdAndUp"
          label="Update kind"
          variant="outlined"
          density="compact"
        ></v-select>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-select
          :hide-details="true"
          v-model="sortSelected"
          :items="sortOptions"
          @update:model-value="emitSortChanged"
          label="Sort"
          variant="outlined"
          density="compact"
        ></v-select>
      </v-col>
      <v-col cols="6" sm="4" md="2" class="d-flex align-center">
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
      <v-col
        v-if="$vuetify.display.mdAndUp"
        cols="6"
        sm="4"
        md="2"
        class="text-right d-flex align-center justify-end"
      >
        <v-btn
          color="secondary"
          @click.stop="refreshAllContainers"
          :loading="isRefreshing"
        >
          Watch now
          <v-icon> mdi-refresh</v-icon>
        </v-btn>
      </v-col>
      </v-row>
    </v-expand-transition>
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
    sortSelectedInit: {
      type: String,
      required: true,
    },
  },

  data() {
    return {
      isRefreshing: false,
      showFilters: false,
      registrySelected: "",
      watcherSelected: "",
      updateKindSelected: "",
      sortSelected: "name",
      sortOptions: [
        { title: "Name", value: "name" },
        { title: "Update type", value: "update-type" },
        { title: "Watcher", value: "watcher" },
      ],
    };
  },

  methods: {
    // Mobile has no clear (X) button on the selects; prepend an empty option so
    // the user can pick the blank row to reset a filter (matches the unselected
    // empty state). Desktop keeps the native clear button and the plain list.
    withEmptyOption(items) {
      return this.$vuetify.display.smAndDown ? ["", ...items] : items;
    },
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
    emitSortChanged() {
      this.$emit("sort-changed", this.sortSelected);
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
    this.sortSelected = this.sortSelectedInit;
  },
};
</script>

<style scoped>
.switch-top {
  margin-top: 4px;
}
</style>
