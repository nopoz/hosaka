<template>
  <v-list density="compact">
    <v-list-item>
      <template #prepend>
        <v-icon color="secondary">ri-hashtag</v-icon>
      </template>
      <v-list-item-title>Id</v-list-item-title>
      <v-list-item-subtitle>
        {{ container.id }}
        <v-tooltip location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn
              icon
              size="x-small"
              variant="text"
              v-bind="props"
              @click="copyToClipboard('container id', container.id)"
            >
              <v-icon size="small" class="text-medium-emphasis"
                >ri-clipboard-line</v-icon
              >
            </v-btn>
          </template>
          <span class="text-caption">Copy to clipboard</span>
        </v-tooltip>
      </v-list-item-subtitle>
    </v-list-item>
    <v-list-item>
      <template #prepend>
        <v-icon color="secondary">ri-pencil-line</v-icon>
      </template>
      <v-list-item-title>Name</v-list-item-title>
      <v-list-item-subtitle>{{ container.name }}</v-list-item-subtitle>
    </v-list-item>
    <v-list-item>
      <template #prepend>
        <v-icon color="secondary">ri-restart-line</v-icon>
      </template>
      <v-list-item-title>Status</v-list-item-title>
      <v-list-item-subtitle>{{ container.status }}</v-list-item-subtitle>
    </v-list-item>
    <v-list-item>
      <template #prepend>
        <v-icon color="secondary">ri-radar-line</v-icon>
      </template>
      <v-list-item-title>Watcher</v-list-item-title>
      <v-list-item-subtitle>
        <router-link to="/configuration/watchers">{{
          container.watcher
        }}</router-link>
      </v-list-item-subtitle>
    </v-list-item>
    <v-list-item v-if="container.includeTags">
      <template #prepend>
        <v-icon color="secondary">ri-price-tag-3-line</v-icon>
      </template>
      <v-list-item-title>
        Include tags
        <v-tooltip location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn
              size="x-small"
              icon
              variant="text"
              v-bind="props"
              href="https://regex101.com"
              target="_blank"
            >
              <v-icon>ri-asterisk</v-icon>
            </v-btn>
          </template>
          <span>Test on regex101.com</span>
        </v-tooltip>
      </v-list-item-title>
      <v-list-item-subtitle>{{ container.includeTags }}</v-list-item-subtitle>
    </v-list-item>
    <v-list-item v-if="container.excludeTags">
      <template #prepend>
        <v-icon color="secondary">ri-forbid-2-line</v-icon>
      </template>
      <v-list-item-title>
        Exclude tags
        <v-tooltip location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn
              size="x-small"
              icon
              variant="text"
              v-bind="props"
              href="https://regex101.com"
              target="_blank"
            >
              <v-icon>ri-asterisk</v-icon>
            </v-btn>
          </template>
          <span>Test on regex101.com</span>
        </v-tooltip>
      </v-list-item-title>
      <v-list-item-subtitle>{{ container.excludeTags }}</v-list-item-subtitle>
    </v-list-item>
    <v-list-item v-if="container.transformTags">
      <template #prepend>
        <v-icon color="secondary">ri-arrow-right-line</v-icon>
      </template>
      <v-list-item-title>Transform tags</v-list-item-title>
      <v-list-item-subtitle>{{
        container.transformTags
      }}</v-list-item-subtitle>
    </v-list-item>
    <v-list-item v-if="container.linkTemplate">
      <template #prepend>
        <v-icon color="secondary">ri-file-edit-line</v-icon>
      </template>
      <v-list-item-title>Link template</v-list-item-title>
      <v-list-item-subtitle>{{
        container.linkTemplate
      }}</v-list-item-subtitle>
    </v-list-item>
    <v-list-item v-if="container.link">
      <template #prepend>
        <v-icon color="secondary">ri-links-line</v-icon>
      </template>
      <v-list-item-title>Link</v-list-item-title>
      <v-list-item-subtitle
        ><a :href="container.link" target="_blank">{{ container.link }}</a>
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
</template>
<script>
import { copyTextToClipboard } from "@/utils/clipboard";
import { sourceReleasesUrl } from "@/filters";

export default {
  props: {
    container: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {};
  },
  computed: {
    autoDetectedLink() {
      return sourceReleasesUrl(this.container.image && this.container.image.source);
    },
  },

  methods: {
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
