<template>
  <v-list density="compact">
    <v-list-item>
      <template #prepend>
        <v-icon color="secondary">mdi-identifier</v-icon>
      </template>
      <v-list-item-title>Id</v-list-item-title>
      <v-list-item-subtitle>
        {{ image.id }}
        <v-tooltip location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn
              icon
              size="x-small"
              variant="text"
              v-bind="props"
              @click="copyToClipboard('image id', image.id)"
            >
              <v-icon size="small" class="text-medium-emphasis"
                >mdi-clipboard</v-icon
              >
            </v-btn>
          </template>
          <span class="text-caption">Copy to clipboard</span>
        </v-tooltip>
      </v-list-item-subtitle>
    </v-list-item>
    <v-list-item>
      <template #prepend>
        <v-icon color="secondary">mdi-pencil</v-icon>
      </template>
      <v-list-item-title>Name</v-list-item-title>
      <v-list-item-subtitle>{{ image.name }}</v-list-item-subtitle>
    </v-list-item>
    <v-list-item>
      <template #prepend>
        <v-icon color="secondary">{{ registryIcon }}</v-icon>
      </template>
      <v-list-item-title>Registry</v-list-item-title>
      <v-list-item-subtitle>{{ image.registry.name }}</v-list-item-subtitle>
    </v-list-item>
    <v-list-item>
      <template #prepend>
        <v-icon color="secondary">mdi-tag</v-icon>
      </template>
      <v-list-item-title>
        Tag &nbsp;<v-chip
          v-if="image.tag.semver"
          size="x-small"
          label
          variant="outlined"
          >semver</v-chip
        >
      </v-list-item-title>
      <v-list-item-subtitle>
        {{ image.tag.value }}
      </v-list-item-subtitle>
    </v-list-item>
    <v-list-item v-if="image.digest.value">
      <template #prepend>
        <v-icon color="secondary">mdi-function-variant</v-icon>
      </template>
      <v-list-item-title>Digest</v-list-item-title>
      <v-list-item-subtitle>
        {{ image.digest.value }}
        <v-tooltip location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn
              icon
              size="x-small"
              variant="text"
              v-bind="props"
              @click="copyToClipboard('image digest', image.digest.value)"
            >
              <v-icon size="small" class="text-medium-emphasis"
                >mdi-clipboard</v-icon
              >
            </v-btn>
          </template>
          <span class="text-caption">Copy to clipboard</span>
        </v-tooltip>
      </v-list-item-subtitle>
    </v-list-item>
    <v-list-item>
      <template #prepend>
        <v-icon color="secondary">{{ osIcon }}</v-icon>
      </template>
      <v-list-item-title>OS / Architecture</v-list-item-title>
      <v-list-item-subtitle
        >{{ image.os }} / {{ image.architecture }}</v-list-item-subtitle
      >
    </v-list-item>
    <v-list-item v-if="image.created">
      <template #prepend>
        <v-icon color="secondary">mdi-calendar</v-icon>
      </template>
      <v-list-item-title>Created</v-list-item-title>
      <v-list-item-subtitle>{{ date(image.created) }}</v-list-item-subtitle>
    </v-list-item>
  </v-list>
</template>

<script>
import { getRegistryProviderIcon } from "@/services/registry";
import { date } from "@/filters";
import { copyTextToClipboard } from "@/utils/clipboard";

export default {
  props: {
    image: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {};
  },
  computed: {
    registryIcon() {
      return getRegistryProviderIcon(this.image.registry.name);
    },

    osIcon() {
      let icon = "mdi-help";
      switch (this.image.os) {
        case "linux":
          icon = "mdi-linux";
          break;
        case "windows":
          icon = "mdi-microsoft-windows";
          break;
      }
      return icon;
    },
  },

  methods: {
    date,
    async copyToClipboard(kind, value) {
      const copied = await copyTextToClipboard(value);
      this.$bus.emit(
        "notify",
        copied
          ? { message: `${kind} copied to clipboard` }
          : { message: `Unable to copy ${kind} to clipboard`, level: "error" },
      );
    },
  },
};
</script>
