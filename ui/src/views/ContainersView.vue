<template>
  <v-container fluid>
    <v-row dense>
      <v-col>
        <container-filter
          :registries="registries"
          :registry-selected-init="registrySelected"
          :watchers="watchers"
          :watcher-selected-init="watcherSelected"
          :update-kinds="updateKinds"
          :update-kind-selected-init="updateKindSelected"
          :updateAvailable="updateAvailableSelected"
          :sort-selected-init="sortSelected"
          @registry-changed="onRegistryChanged"
          @watcher-changed="onWatcherChanged"
          @update-available-changed="onUpdateAvailableChanged"
          @update-kind-changed="onUpdateKindChanged"
          @sort-changed="onSortChanged"
          @refresh-all-containers="onRefreshAllContainers"
        />
      </v-col>
    </v-row>

    <v-row
      v-for="container in containersSorted"
      :key="container.id"
      no-gutters
    >
      <v-col :class="$vuetify.display.smAndDown ? 'py-1' : 'pt-2 pb-2'">
        <container-item
          :container="container"
          @delete-container="deleteContainer(container)"
          @container-deleted="removeContainerFromList(container)"
        />
      </v-col>
    </v-row>
    <v-row v-if="containersSorted.length === 0">
      <v-card-subtitle class="text-h6">No containers found</v-card-subtitle>
    </v-row>
  </v-container>
</template>

<script>
import ContainerItem from "@/components/ContainerItem";
import ContainerFilter from "@/components/ContainerFilter";
import { deleteContainer, getAllContainers } from "@/services/container";
import bus from "@/event-bus";

export default {
  components: {
    ContainerItem,
    ContainerFilter,
  },

  data() {
    return {
      containers: [],
      registrySelected: "",
      watcherSelected: "",
      updateKindSelected: "",
      updateAvailableSelected: false,
      sortSelected: "name",
      eventSource: null,
      busyKeys: new Set(),
    };
  },

  computed: {
    registries() {
      return [
        ...new Set(
          this.containers
            .map((container) => container.image.registry.name)
            .sort(),
        ),
      ];
    },
    watchers() {
      return [
        ...new Set(
          this.containers.map((container) => container.watcher).sort(),
        ),
      ];
    },
    updateKinds() {
      return [
        ...new Set(
          this.containers
            .filter((container) => container.updateAvailable)
            .filter((container) => container.updateKind.kind === "tag")
            .filter((container) => container.updateKind.semverDiff)
            .map((container) => container.updateKind.semverDiff)
            .sort(),
        ),
      ];
    },
    containersFiltered() {
      return this.containers
        .filter((container) =>
          this.registrySelected
            ? this.registrySelected === container.image.registry.name
            : true,
        )
        .filter((container) =>
          this.watcherSelected
            ? this.watcherSelected === container.watcher
            : true,
        )
        .filter((container) =>
          this.updateKindSelected
            ? this.updateKindSelected ===
              (container.updateKind && container.updateKind.semverDiff)
            : true,
        )
        .filter((container) =>
          this.updateAvailableSelected ? container.updateAvailable : true,
        );
    },
    containersSorted() {
      const byName = (a, b) =>
        (a.displayName || a.name).localeCompare(b.displayName || b.name);
      const rank = (container) => {
        if (
          container.updateAvailable &&
          container.updateKind &&
          container.updateKind.kind === "tag"
        ) {
          switch (container.updateKind.semverDiff) {
            case "major":
              return 0;
            case "minor":
              return 1;
            case "patch":
              return 2;
          }
        }
        return 3;
      };
      // Sort a copy: the computed must not mutate the source array in place.
      const containers = [...this.containersFiltered];
      if (this.sortSelected === "update-type") {
        return containers.sort((a, b) => rank(a) - rank(b) || byName(a, b));
      }
      if (this.sortSelected === "watcher") {
        return containers.sort(
          (a, b) => a.watcher.localeCompare(b.watcher) || byName(a, b),
        );
      }
      return containers.sort(byName);
    },
  },

  methods: {
    onRegistryChanged(registrySelected) {
      this.registrySelected = registrySelected;
      this.updateQueryParams();
    },
    onWatcherChanged(watcherSelected) {
      this.watcherSelected = watcherSelected;
      this.updateQueryParams();
    },
    onUpdateAvailableChanged() {
      this.updateAvailableSelected = !this.updateAvailableSelected;
      this.updateQueryParams();
    },
    onUpdateKindChanged(updateKindSelected) {
      this.updateKindSelected = updateKindSelected;
      this.updateQueryParams();
    },
    onSortChanged(sortSelected) {
      this.sortSelected = sortSelected;
      this.updateQueryParams();
    },
    updateQueryParams() {
      const query = {};
      if (this.registrySelected) {
        query["registry"] = this.registrySelected;
      }
      if (this.watcherSelected) {
        query["watcher"] = this.watcherSelected;
      }
      if (this.updateKindSelected) {
        query["update-kind"] = this.updateKindSelected;
      }
      if (this.updateAvailableSelected) {
        query["update-available"] = this.updateAvailableSelected;
      }
      if (this.sortSelected && this.sortSelected !== "name") {
        query["sort"] = this.sortSelected;
      }
      this.$router.push({ query });
    },
    onRefreshAllContainers(containersRefreshed) {
      this.containers = containersRefreshed;
    },
    removeContainerFromList(container) {
      this.containers = this.containers.filter((c) => c.id !== container.id);
    },
    // Identity that survives a container recreation (id changes, name+watcher
    // does not). Used to pin a row while its install dialog is open.
    containerKey(container) {
      return `${container.watcher}::${container.name}`;
    },
    // Insert or replace a container pushed over the SSE stream. A recreated
    // container arrives with a new id, so fall back to name+watcher matching.
    // A watch cycle emits an `updated` event for every container it re-saves,
    // even when nothing changed; replacing the row with an equal-but-new object
    // would re-render that (heavy) row for nothing, so a burst of such events
    // blocks the main thread. Skip the splice when the payload is unchanged.
    upsertContainer(container) {
      const byId = this.containers.findIndex((c) => c.id === container.id);
      if (byId !== -1) {
        if (JSON.stringify(this.containers[byId]) !== JSON.stringify(container)) {
          this.containers.splice(byId, 1, container);
        }
        return;
      }
      const byName = this.containers.findIndex(
        (c) => c.name === container.name && c.watcher === container.watcher,
      );
      if (byName !== -1) {
        if (JSON.stringify(this.containers[byName]) !== JSON.stringify(container)) {
          this.containers.splice(byName, 1, container);
        }
        return;
      }
      this.containers.push(container);
    },
    // Resync the full list from the API while keeping the existing object
    // reference for any container whose data is unchanged. Replacing the whole
    // array with fresh objects forces every (heavy) row to re-render, which
    // blocks the main thread for seconds with a large list; reusing references
    // means only genuinely-changed rows re-render.
    async resyncContainers() {
      try {
        const fresh = await getAllContainers();
        const prevById = new Map(this.containers.map((c) => [c.id, c]));
        this.containers = fresh.map((f) => {
          const prev = prevById.get(f.id);
          return prev && JSON.stringify(prev) === JSON.stringify(f) ? prev : f;
        });
      } catch (e) {
        console.error("Error resyncing containers:", e);
      }
    },
    connectStream() {
      this.eventSource = new EventSource("/api/containers/stream");
      // On (re)connect, resync the full list to recover any missed events.
      this.eventSource.onopen = () => {
        this.resyncContainers();
      };
      // A row with an open install dialog is pinned: skip stream-driven churn
      // (the script recreates the container, which would otherwise remove/
      // remount the row and destroy the dialog mid-run). State is resynced when
      // the dialog closes (onContainerIdle).
      const onUpsert = (event) => {
        const container = JSON.parse(event.data);
        if (this.busyKeys.has(this.containerKey(container))) {
          return;
        }
        this.upsertContainer(container);
      };
      this.eventSource.addEventListener("added", onUpsert);
      this.eventSource.addEventListener("updated", onUpsert);
      this.eventSource.addEventListener("removed", (event) => {
        const container = JSON.parse(event.data);
        if (this.busyKeys.has(this.containerKey(container))) {
          return;
        }
        this.removeContainerFromList(container);
      });
    },
    disconnectStream() {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
    },
    onContainerBusy({ name, watcher }) {
      this.busyKeys.add(`${watcher}::${name}`);
    },
    async onContainerIdle({ name, watcher }) {
      this.busyKeys.delete(`${watcher}::${name}`);
      // Pull the latest state the row missed while it was pinned (the recreated
      // container has a new id and updated version).
      await this.resyncContainers();
    },
    async deleteContainer(container) {
      try {
        await deleteContainer(container.id);
        this.removeContainerFromList(container);
      } catch (e) {
        this.$bus.emit("notify", {
          message: `Error when trying to delete the container (${e.message})`,
          level: "error",
        });
      }
    },
  },

  mounted() {
    this.connectStream();
    this.$bus.on("container-busy", this.onContainerBusy);
    this.$bus.on("container-idle", this.onContainerIdle);
  },

  beforeUnmount() {
    this.disconnectStream();
    this.$bus.off("container-busy", this.onContainerBusy);
    this.$bus.off("container-idle", this.onContainerIdle);
  },

  async beforeRouteEnter(to, from, next) {
    const registrySelected = to.query["registry"];
    const watcherSelected = to.query["watcher"];
    const updateKindSelected = to.query["update-kind"];
    const updateAvailable = to.query["update-available"];
    const sortSelected = to.query["sort"];
    try {
      const containers = await getAllContainers();
      next((vm) => {
        if (registrySelected) {
          vm.registrySelected = registrySelected;
        }
        if (watcherSelected) {
          vm.watcherSelected = watcherSelected;
        }
        if (updateKindSelected) {
          vm.updateKindSelected = updateKindSelected;
        }
        if (updateAvailable) {
          vm.updateAvailableSelected = updateAvailable.toLowerCase() === "true";
        }
        if (sortSelected) {
          vm.sortSelected = sortSelected;
        }
        vm.containers = containers;
      });
    } catch (e) {
      bus.emit("notify", {
        message: `Error when trying to get the containers (${e.message})`,
        level: "error",
      });
    }
    next();
  },
};
</script>
