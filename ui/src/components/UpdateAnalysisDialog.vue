<template>
  <v-dialog
    v-model="dialogVisible"
    width="70%"
    max-width="900px"
    :fullscreen="$vuetify.display.smAndDown"
    scrollable
  >
    <v-card>
      <v-toolbar flat density="compact" color="surface-light">
        <v-toolbar-title class="text-body-1">
          Update analysis: {{ container.displayName }}
        </v-toolbar-title>
        <v-chip label size="small" variant="outlined" class="mr-2">
          {{ container.image.tag.value }}
          <v-icon size="small" class="mx-1">ri-arrow-right-line</v-icon>
          {{ targetVersion }}
        </v-chip>
        <v-btn
          size="small"
          variant="text"
          :disabled="loading"
          @click="analyze(true)"
        >
          <v-icon start>ri-refresh-line</v-icon>
          Regenerate
        </v-btn>
        <v-btn icon size="small" variant="text" @click="dialogVisible = false">
          <v-icon>ri-close-line</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text style="min-height: 240px">
        <div v-if="loading" class="text-center py-8">
          <v-progress-circular indeterminate color="info" />
          <div class="mt-3 text-medium-emphasis">Analyzing release notes...</div>
        </div>

        <v-alert v-else-if="error" type="error" variant="tonal" class="mb-2">
          {{ error }}
          <template #append>
            <v-btn size="small" variant="text" @click="analyze(false)">Retry</v-btn>
          </template>
        </v-alert>

        <div v-else-if="result">
          <div class="d-flex align-center mb-4">
            <span class="text-overline mr-2">Risk</span>
            <v-chip :color="riskColor" label size="small" variant="flat">
              {{ (result.riskLevel || 'unknown').toUpperCase() }}
            </v-chip>
          </div>

          <div v-if="result.breakingChanges && result.breakingChanges.length" class="mb-4">
            <div class="text-subtitle-2 mb-1">Breaking changes</div>
            <v-list density="compact" class="bg-transparent">
              <v-list-item
                v-for="(bc, i) in result.breakingChanges"
                :key="i"
                class="px-0"
              >
                <v-list-item-title class="font-weight-medium text-wrap">
                  {{ bc.title }}
                </v-list-item-title>
                <v-list-item-subtitle v-if="bc.detail" class="text-wrap">
                  {{ bc.detail }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>

          <div v-if="result.highlights && result.highlights.length" class="mb-4">
            <div class="text-subtitle-2 mb-1">What changed</div>
            <ul class="ms-4">
              <li v-for="(h, i) in result.highlights" :key="i">{{ h }}</li>
            </ul>
          </div>

          <p v-if="result.overview" class="text-body-2 mb-4">{{ result.overview }}</p>

          <div
            v-if="result.versionsCovered && result.versionsCovered.length"
            class="text-caption text-medium-emphasis mb-2"
          >
            Covers {{ result.versionsCovered.join(', ') }}
          </div>

          <v-expansion-panels
            v-if="result.sourceNotes && result.sourceNotes.length"
            variant="accordion"
          >
            <v-expansion-panel title="Source release notes">
              <template #text>
                <div v-for="(note, i) in result.sourceNotes" :key="i" class="mb-3">
                  <div class="text-subtitle-2">{{ note.tag }}</div>
                  <pre class="source-note">{{ note.body }}</pre>
                </div>
              </template>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>

        <div v-else class="text-center text-medium-emphasis py-8">
          No analysis available.
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import axios from 'axios';

export default {
  name: 'UpdateAnalysisDialog',

  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    container: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      loading: false,
      error: null,
      result: null,
    };
  },

  computed: {
    dialogVisible: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit('update:modelValue', value);
      },
    },

    targetVersion() {
      return this.container.result ? this.container.result.tag : '';
    },

    riskColor() {
      switch (this.result && this.result.riskLevel) {
        case 'high':
          return 'error';
        case 'medium':
          return 'warning';
        case 'low':
          return 'info';
        case 'none':
          return 'success';
        default:
          return 'secondary';
      }
    },
  },

  watch: {
    modelValue(open) {
      if (open && !this.result) {
        this.analyze(false);
      }
    },
  },

  methods: {
    async analyze(force) {
      this.loading = true;
      this.error = null;
      if (force) {
        this.result = null;
      }
      try {
        const response = await axios.post(
          `/api/containers/${this.container.id}/analyze-update`,
          null,
          { params: force ? { force: true } : {} },
        );
        this.result = response.data;
      } catch (e) {
        this.error = e.response?.data?.error || e.message || 'Analysis failed';
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.source-note {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
  margin: 0;
}
</style>
