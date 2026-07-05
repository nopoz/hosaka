<template>
  <div>
    <v-list density="compact" v-if="updateAvailable">
      <v-list-item v-if="result.tag">
        <template #prepend>
          <v-icon color="secondary">ri-price-tag-3-line</v-icon>
        </template>
        <v-list-item-title>
          Tag
          <v-chip
            v-if="semver"
            size="x-small"
            label
            variant="outlined"
            color="success"
            >semver</v-chip
          >
        </v-list-item-title>
        <v-list-item-subtitle>
          {{ result.tag }}
        </v-list-item-subtitle>
      </v-list-item>
      <v-list-item v-if="result.digest">
        <template #prepend>
          <v-icon color="secondary">ri-fingerprint-line</v-icon>
        </template>
        <v-list-item-title>
          Digest
          <v-tooltip location="bottom">
            <template v-slot:activator="{ props }">
              <v-btn
                icon
                size="x-small"
                variant="text"
                v-bind="props"
                @click="copyToClipboard('result digest', result.digest)"
              >
                <v-icon>ri-clipboard-line</v-icon>
              </v-btn>
            </template>
            <span class="text-caption">Copy to clipboard</span>
          </v-tooltip>
        </v-list-item-title>
        <v-list-item-subtitle>
          {{ result.digest }}
        </v-list-item-subtitle>
      </v-list-item>
      <v-list-item>
        <template #prepend>
          <v-icon v-if="updateKind.semverDiff === 'patch'" color="success"
            >ri-information-line</v-icon
          >
          <v-icon v-else-if="updateKind.semverDiff === 'major'" color="error"
            >ri-error-warning-line</v-icon
          >
          <v-icon
            v-else-if="updateKind.semverDiff === 'prerelease'"
            color="prerelease"
            >ri-information-line</v-icon
          >
          <v-icon v-else color="warning">ri-alert-line</v-icon>
        </template>
        <v-list-item-title>Update kind</v-list-item-title>
        <v-list-item-subtitle>
          {{ updateKindFormatted }}
        </v-list-item-subtitle>
      </v-list-item>
      <v-list-item v-if="result.link">
        <template #prepend>
          <v-icon color="secondary">ri-links-line</v-icon>
        </template>
        <v-list-item-title>Link</v-list-item-title>
        <v-list-item-subtitle
          ><a :href="result.link" target="_blank">{{ result.link }}</a>
        </v-list-item-subtitle>
      </v-list-item>
      <v-list-item v-else-if="autoDetectedLink">
        <template #prepend>
          <v-icon color="secondary">ri-links-line</v-icon>
        </template>
        <v-list-item-title>Link (auto-detected)</v-list-item-title>
        <v-list-item-subtitle
          ><a :href="autoDetectedLink" target="_blank">{{ autoDetectedLink }}</a>
        </v-list-item-subtitle>
      </v-list-item>
    </v-list>
    <v-card-text v-else>No update available</v-card-text>
  </div>
</template>

<script>
import { sourceReleasesUrl } from "@/filters";

export default {
  props: {
    semver: {
      type: Boolean,
    },
    result: {
      type: Object,
    },
    updateKind: {
      type: Object,
    },
    updateAvailable: {
      type: Boolean,
    },
    source: {
      type: String,
      default: null,
    },
  },
  computed: {
    autoDetectedLink() {
      return sourceReleasesUrl(this.source);
    },
    updateKindFormatted() {
      let kind = "Unknown";
      if (this.updateKind) {
        kind = this.updateKind.kind;
      }
      if (this.updateKind.semverDiff) {
        kind = this.updateKind.semverDiff;
      }
      return kind;
    },
  },
  methods: {
    copyToClipboard(kind, value) {
      navigator.clipboard.writeText(value);
      this.$bus.emit("notify", { message: `${kind} copied to clipboard` });
    },
  },
};
</script>
