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

    <v-fade-transition group hide-on-leave mode="in-out">
      <v-row v-for="container in containersSorted" :key="container.id">
        <v-col class="pt-2 pb-2">
          <container-item
            :container="container"
            @delete-container="deleteContainer(container)"
            @container-deleted="removeContainerFromList(container)"
          />
        </v-col>
      </v-row>
    </v-fade-transition>
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
