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

          <p v-if="result.overview" class="text-body-2 mb-4">
            <inline-markup :text="result.overview" />
          </p>

          <div v-if="sortedBreakingChanges.length" class="mb-4">
            <div class="text-subtitle-2 mb-2">Breaking changes</div>
            <div v-for="(bc, i) in sortedBreakingChanges" :key="i" class="mb-3">
              <div class="font-weight-medium">
                <inline-markup :text="bc.title" />
                <a
                  v-if="bc.version && versionUrl(bc.version)"
                  :href="versionUrl(bc.version)"
                  target="_blank"
                  rel="noopener"
                  class="version-ref ms-1"
                >{{ bc.version }}</a>
                <span v-else-if="bc.version" class="version-ref-plain ms-1">
                  {{ bc.version }}
                </span>
              </div>
              <div v-if="bc.detail" class="text-body-2">
                <inline-markup :text="bc.detail" />
              </div>
            </div>
          </div>

          <div v-if="sortedHighlights.length" class="mb-4">
            <div class="text-subtitle-2 mb-2">What changed</div>
            <ul class="highlight-list">
              <li v-for="(h, i) in sortedHighlights" :key="i" class="mb-1">
                <inline-markup :text="highlightText(h)" />
                <a
                  v-if="highlightVersion(h) && versionUrl(highlightVersion(h))"
                  :href="versionUrl(highlightVersion(h))"
                  target="_blank"
                  rel="noopener"
                  class="version-ref ms-1"
                >{{ highlightVersion(h) }}</a>
                <span v-else-if="highlightVersion(h)" class="version-ref-plain ms-1">
                  {{ highlightVersion(h) }}
                </span>
              </li>
            </ul>
          </div>

          <div v-if="sources.length" class="text-caption text-medium-emphasis">
            <span class="me-1">Sources:</span>
            <template v-for="(s, i) in sources" :key="s.tag + i">
              <a
                v-if="s.url"
                :href="s.url"
                target="_blank"
                rel="noopener"
                class="version-ref"
              >{{ s.tag }}</a>
              <span v-else>{{ s.tag }}</span
              ><span v-if="i < sources.length - 1">,&nbsp;</span>
            </template>
          </div>
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
import InlineMarkup from './InlineMarkup.vue';

export default {
  name: 'UpdateAnalysisDialog',

  components: {
    InlineMarkup,
  },

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

    // The gathered notes are the authoritative, linkable list of sources (each
    // carries the release/changelog URL). The model's versionsCovered is only
    // free text, so we link from these instead.
    sources() {
      return ((this.result && this.result.sourceNotes) || [])
        .filter((note) => note && note.tag)
        .map((note) => ({ tag: note.tag, url: note.url || null }));
    },

    // Key by both the raw tag and a v-stripped form: the model often emits
    // "2.10.0" while the release tag is "v2.10.0", and we still want those
    // inline refs to link.
    sourceUrlByTag() {
      const map = {};
      this.sources.forEach((s) => {
        if (s.url) {
          map[s.tag] = s.url;
          map[s.tag.replace(/^v/i, '')] = s.url;
        }
      });
      return map;
    },

    // Newest version first; entries without an identifiable version sink to the
    // bottom. Array.sort is stable, so same-version items keep the model's order.
    sortedBreakingChanges() {
      const list = (this.result && this.result.breakingChanges) || [];
      return [...list].sort((a, b) => this.compareVersionsDesc(a.version, b.version));
    },

    sortedHighlights() {
      const list = (this.result && this.result.highlights) || [];
      return [...list].sort(
        (a, b) => this.compareVersionsDesc(this.highlightVersion(a), this.highlightVersion(b)),
      );
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
    versionUrl(version) {
      if (!version) {
        return null;
      }
      return this.sourceUrlByTag[version]
        || this.sourceUrlByTag[String(version).replace(/^v/i, '')]
        || null;
    },

    // highlights may be {text, version} objects or plain strings (older output).
    highlightText(h) {
      return typeof h === 'string' ? h : (h && h.text) || '';
    },

    highlightVersion(h) {
      return typeof h === 'object' && h ? h.version : null;
    },

    parseVersion(version) {
      if (!version) {
        return null;
      }
      const parts = String(version).replace(/^v/i, '').match(/\d+/g);
      return parts ? parts.map(Number) : null;
    },

    // Descending comparator; null versions sort last.
    compareVersionsDesc(a, b) {
      const pa = this.parseVersion(a);
      const pb = this.parseVersion(b);
      if (!pa && !pb) {
        return 0;
      }
      if (!pa) {
        return 1;
      }
      if (!pb) {
        return -1;
      }
      for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
        const diff = (pb[i] || 0) - (pa[i] || 0);
        if (diff !== 0) {
          return diff;
        }
      }
      return 0;
    },

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
.highlight-list {
  padding-left: 1.25rem;
}

.version-ref {
  color: rgb(var(--v-theme-info));
  text-decoration: none;
  font-size: 0.85em;
  white-space: nowrap;
}

.version-ref:hover {
  text-decoration: underline;
}

.version-ref-plain {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.85em;
  white-space: nowrap;
}
</style>
