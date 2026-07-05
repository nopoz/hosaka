<template>
  <v-card flat color="transparent">
    <!-- Desktop: aligned grid row; column tracks come from ContainersView
         (--wud-grid-cols) so every card lines up down the list. -->
    <div
      v-if="$vuetify.display.mdAndUp"
      class="desktop-row"
      @click="collapseDetail()"
    >
      <div class="cell-container">
        <span class="watcher-tag">{{ container.watcher }}</span>
        <img
          :src="selfhstContainerIconUrl"
          class="row-icon"
          v-if="isSelfhstContainerIcon"
        />
        <v-icon color="info" size="small" v-else>{{ containerIcon }}</v-icon>
        <span class="row-name">{{ container.displayName }}</span>
      </div>

      <div class="cell-version">
        <div class="version-cmp">
          <v-chip label variant="outlined" color="info" disabled class="mono">
            {{ container.image.tag.value }}
          </v-chip>
          <template v-if="container.updateAvailable">
            <v-icon :color="newVersionClass" size="small">ri-arrow-right-line</v-icon>
            <v-tooltip location="bottom">
              <template v-slot:activator="{ props }">
                <v-chip
                  label
                  :variant="semverChipVariant"
                  :color="newVersionClass"
                  :class="severityClass"
                  class="mono"
                  v-bind="props"
                  @click.stop="copyToClipboard('container new version', newVersion)"
                >
                  {{ newVersion }}
                  <v-icon end size="small">ri-file-copy-line</v-icon>
                </v-chip>
              </template>
              <span class="text-caption">Copy to clipboard</span>
            </v-tooltip>
          </template>
          <span v-else-if="!container.error" class="up-to-date">up to date</span>
        </div>

        <div class="version-actions" v-if="hasActions">
          <v-chip
            v-if="aiEnabled && container.updateAvailable"
            label
            color="info"
            variant="outlined"
            @click.stop="showUpdateAnalysis = true"
          >
            <v-icon start>ri-search-eye-line</v-icon>
            Analyze
          </v-chip>
          <v-chip
            v-if="(container.install === true || container.install === 'multiple') && container.updateAvailable"
            label
            color="update"
            variant="outlined"
            @click.stop="installContainer"
          >
            <v-icon start>ri-arrow-up-circle-line</v-icon>
            Update
          </v-chip>
        </div>
      </div>

      <div class="cell-chevron">
        <v-icon>{{ showDetail ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line" }}</v-icon>
      </div>
    </div>

    <!-- Mobile: a purpose-built two-line row. Line 1 (name) toggles the detail;
         line 2 surfaces the target version and a finger-sized Update button kept
         clear of the expand chevron so it can't be mis-tapped. -->
    <div v-else class="mobile-header">
      <div
        class="d-flex align-center px-2 py-2"
        @click="collapseDetail()"
        style="cursor: pointer"
      >
        <img
          :src="selfhstContainerIconUrl"
          style="width: 20px; height: 20px"
          class="mr-2 flex-shrink-0"
          v-if="isSelfhstContainerIcon"
        />
        <v-icon v-else size="small" color="info" class="mr-2 flex-shrink-0">
          {{ containerIcon }}
        </v-icon>
        <span class="text-info text-truncate flex-grow-1">
          {{ container.displayName }}
        </span>
        <v-icon class="ml-2 flex-shrink-0">{{
          showDetail ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"
        }}</v-icon>
      </div>
      <div
        v-if="container.updateAvailable"
        class="d-flex align-center px-2 pb-2"
      >
        <span class="text-caption text-truncate">
          <span class="text-medium-emphasis">{{
            container.image.tag.value
          }}</span>
          <v-icon size="x-small" :color="newVersionClass" class="mx-1"
            >ri-arrow-right-line</v-icon
          >
          <span :class="'text-' + newVersionClass">{{ newVersion }}</span>
        </span>
        <v-spacer />
        <v-btn
          v-if="aiEnabled"
          color="info"
          variant="outlined"
          size="small"
          class="ml-2 flex-shrink-0"
          @click.stop="showUpdateAnalysis = true"
        >
          <v-icon start>ri-search-eye-line</v-icon>
          Analyze
        </v-btn>
        <v-btn
          v-if="(container.install === true || container.install === 'multiple')"
          color="update"
          variant="outlined"
          size="small"
          class="ml-2 flex-shrink-0"
          @click.stop="installContainer"
        >
          <v-icon start>ri-arrow-up-circle-line</v-icon>
          Update
        </v-btn>
      </div>
    </div>
    <v-expand-transition>
      <div v-if="showDetail" class="container-detail-panel">
        <v-tabs fixed-tabs v-model="tab" ref="tabs">
          <v-tab>
            <span v-if="$vuetify.display.mdAndUp" class="me-2">Container</span>
            <img
              :src="selfhstContainerIconUrl"
              style="width: 24px; height: 24px"
              class="v-icon v-icon--start"
              v-if="isSelfhstContainerIcon"
            />
            <v-icon start v-else>
              {{ containerIcon }}
            </v-icon>
          </v-tab>
          <v-tab>
            <span v-if="$vuetify.display.mdAndUp" class="me-2">Image</span>
            <v-icon>ri-archive-2-line</v-icon>
          </v-tab>
          <v-tab v-if="container.result">
            <span v-if="$vuetify.display.mdAndUp" class="me-2">Update</span>
            <v-icon>ri-arrow-up-circle-line</v-icon>
          </v-tab>
          <v-tab v-if="container.error">
            <span v-if="$vuetify.display.mdAndUp" class="me-2">Error</span>
            <v-icon>ri-alert-line</v-icon>
          </v-tab>
        </v-tabs>

        <v-window v-model="tab">
          <v-window-item>
            <container-detail :container="container" />
          </v-window-item>
          <v-window-item>
            <container-image :image="container.image" />
          </v-window-item>
          <v-window-item v-if="container.result">
            <container-update
              :result="container.result"
              :semver="container.image.tag.semver"
              :update-kind="container.updateKind"
              :update-available="container.updateAvailable"
            />
          </v-window-item>
          <v-window-item v-if="container.error">
            <container-error :error="container.error" />
          </v-window-item>
        </v-window>

        <v-card-actions>
          <v-row>
            <v-col class="text-center">
              <v-dialog v-model="dialogDelete" width="500" v-if="deleteEnabled">
                <template v-slot:activator="{ props }">
                  <v-btn
                    size="small"
                    color="error"
                    variant="outlined"
                    v-bind="props"
                  >
                    Delete
                    <v-icon end>ri-delete-bin-6-line</v-icon>
                  </v-btn>
                </template>

                <v-card class="text-center">
                  <v-toolbar color="error" theme="dark" flat density="compact">
                    <v-toolbar-title class="text-body-1">
                      Delete the container?
                    </v-toolbar-title>
                  </v-toolbar>
                  <v-card-subtitle class="text-body-2">
                    <v-row class="mt-2" no-gutters>
                      <v-col>
                        Delete
                        <span class="font-weight-bold text-error">{{
                          container.name
                        }}</span>
                        from the list?
                        <br />
                        <span class="font-italic"
                          >(The real container won't be deleted)</span
                        >
                      </v-col>
                    </v-row>
                    <v-row>
                      <v-col class="text-center">
                        <v-btn
                          variant="outlined"
                          @click="dialogDelete = false"
                          size="small"
                        >
                          Cancel
                        </v-btn>
                        &nbsp;
                        <v-btn
                          color="error"
                          size="small"
                          @click="
                            dialogDelete = false;
                            deleteContainer();
                          "
                        >
                          Delete
                        </v-btn>
                      </v-col>
                    </v-row>
                  </v-card-subtitle>
                </v-card>
              </v-dialog>
            </v-col>
          </v-row>
        </v-card-actions>
      </div>
    </v-expand-transition>
    <script-output-dialog
      ref="scriptOutput"
      v-model="showScriptOutput"
      :container-id="container.id"
      @update-complete="handleUpdateComplete"
      @dialog-closed="handleDialogClosed"
    />
    <update-analysis-dialog
      v-model="showUpdateAnalysis"
      :container="container"
      @install="handleAnalyzeInstall"
    />
  </v-card>
</template>

<script>
import axios from 'axios';
import ContainerDetail from "@/components/ContainerDetail";
import ContainerImage from "@/components/ContainerImage";
import ContainerUpdate from "@/components/ContainerUpdate";
import ContainerError from "@/components/ContainerError";
import { date, short } from "@/filters";
import { copyTextToClipboard } from "@/utils/clipboard";
import ScriptOutputDialog from './ScriptOutputDialog.vue';
import UpdateAnalysisDialog from './UpdateAnalysisDialog.vue';

export default {
  components: {
    ContainerDetail,
    ContainerImage,
    ContainerUpdate,
    ContainerError,
    ScriptOutputDialog,
    UpdateAnalysisDialog,
  },

  props: {
    container: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      showDetail: false,
      dialogDelete: false,
      tab: 0,
      showScriptOutput: false,
      updateInProgress: false,
      showUpdateAnalysis: false,
    };
  },
  computed: {
    // Reactive: $serverConfig is populated asynchronously by App.vue once
    // authenticated, which can happen after this row has already mounted (e.g.
    // a hard load of /containers). Reading it as a computed avoids the crash and
    // reveals the Delete control once the feature flag arrives.
    deleteEnabled() {
      return this.$serverConfig?.feature?.delete ?? false;
    },

    aiEnabled() {
      return this.$serverConfig?.ai?.enabled ?? false;
    },

    hasActions() {
      if (!this.container.updateAvailable) return false;
      const installable =
        this.container.install === true || this.container.install === "multiple";
      return installable || this.aiEnabled;
    },

    containerIcon() {
      let icon = this.container.displayIcon;
      icon = icon
        .replace("mdi:", "mdi-")
        .replace("ri:", "ri-")
        .replace("fa:", "fa-")
        .replace("fab:", "fab-")
        .replace("far:", "far-")
        .replace("fas:", "fas-")
        .replace("si:", "si-");
      if (icon.startsWith("fab-")) {
        icon = this.normalizeFontawesome(icon, "fab");
      }
      if (icon.startsWith("far-")) {
        icon = this.normalizeFontawesome(icon, "far");
      }
      if (icon.startsWith("fas-")) {
        icon = this.normalizeFontawesome(icon, "fas");
      }
      return icon;
    },

    isSelfhstContainerIcon() {
      return (
        this.container.displayIcon.startsWith("sh-") ||
        this.container.displayIcon.startsWith("sh:")
      );
    },

    selfhstContainerIconUrl() {
      const iconName = this.container.displayIcon
        .replace("sh-", "")
        .replace("sh:", "");
      return `https://cdn.jsdelivr.net/gh/selfhst/icons/png/${iconName}.png`;
    },

    osIcon() {
      let icon = "ri-question-line";
      switch (this.container.image.os) {
        case "linux":
          icon = "ri-ubuntu-line";
          break;
        case "windows":
          icon = "ri-windows-line";
          break;
      }
      return icon;
    },

    newVersion() {
      let newVersion = "unknown";
      if (
        this.container.result.created &&
        this.container.image.created !== this.container.result.created
      ) {
        newVersion = date(this.container.result.created);
      }
      if (this.container.updateKind) {
        newVersion = this.container.updateKind.remoteValue;
      }
      if (this.container.updateKind.kind === "digest") {
        newVersion = short(newVersion, 15);
      }
      return newVersion;
    },

    newVersionClass() {
      let color = "warning";
      if (
        this.container.updateKind &&
        this.container.updateKind.kind === "tag"
      ) {
        switch (this.container.updateKind.semverDiff) {
          case "major":
            color = "error";
            break;
          case "minor":
            color = "warning";
            break;
          case "patch":
            color = "success";
            break;
          case "prerelease":
            color = "prerelease";
            break;
        }
      }
      return color;
    },

    // Corpo (the only light theme) uses filled chips — thin coloured outlines
    // vanish on a light surface. Dark themes keep the outlined convention. Keyed
    // on the theme name: the Options-API `$vuetify.theme` adapter does not expose
    // the current theme's `dark` flag reliably, so a future light theme must be
    // added here too.
    semverChipVariant() {
      return this.$vuetify.theme.global.name === "corpo" ? "flat" : "outlined";
    },
    // Stable hook for theme-scoped CSS (Sprawl Terminal glyph/border treatment).
    severityClass() {
      const diff =
        (this.container.updateKind && this.container.updateKind.semverDiff) ||
        "unknown";
      return `sev-${diff}`;
    },
  },

  watch: {
    // Pin this row in the parent list while the install dialog is open so a
    // mid-script container recreation (new id over SSE) cannot remove/remount
    // the row and destroy the dialog. Released when the dialog closes.
    showScriptOutput(open) {
      this.$bus.emit(open ? "container-busy" : "container-idle", {
        name: this.container.name,
        watcher: this.container.watcher,
      });
    },
  },

  methods: {
    async handleUpdateComplete() {
        this.showScriptOutput = false;
        this.updateInProgress = false;

        try {
            // Clear the install notification, then re-watch the container so the
            // backend emits its new state. The live SSE stream delivers the
            // refreshed row to the list, so no poll or page reload is needed.
            if (this.container.notification) {
                await axios.post(`/api/containers/${this.container.id}/clear-notification`);
            }
            await axios.post('/api/containers/refresh', null, {
                params: {
                    name: this.container.name,
                    watcher: this.container.watcher,
                },
            });
        } catch (error) {
            console.error('Error during update completion:', error);
        }
    },

    handleDialogClosed({ success }) {
        if (!success) {
            this.updateInProgress = false;
            this.showScriptOutput = false;
        }
    },

    async deleteContainer() {
      this.$emit("delete-container");
    },

    async copyToClipboard(kind, value) {
      const copied = await copyTextToClipboard(value);
      this.$bus.emit(
        "notify",
        copied
          ? { message: `${kind} copied to clipboard` }
          : { message: `Unable to copy ${kind} to clipboard`, level: "error" },
      );
    },

    collapseDetail() {
      this.showDetail = !this.showDetail;

      // Hack because of a render bug on tabs inside a collapsible element
      this.$refs.tabs?.onResize?.();
    },

    normalizeFontawesome(iconString, prefix) {
      return `${prefix} fa-${iconString.replace(`${prefix}:`, "")}`;
    },

    handleAnalyzeInstall() {
      this.showUpdateAnalysis = false;
      this.installContainer();
    },

    async installContainer() {
      if (this.container.install === 'multiple') {
        this.$bus.emit('notify', {
          message: 'Multiple install triggers configured.',
          level: 'error',
          timeout: 5000,
        });
        return;
      }

      if (this.updateInProgress) {
        console.log('Update already in progress, returning');
        return;
      }

      console.log('Starting container update process');
      this.updateInProgress = true;

      try {
        this.showScriptOutput = true;

        await axios.post(`/api/containers/${this.container.id}/install`);

      } catch (error) {
        console.error('Install error:', error);
        // Once output is streaming the dialog renders the failure itself, so a
        // rejected request is a duplicate signal - leave the console in place.
        const dialog = this.$refs.scriptOutput;
        const scriptStarted = dialog
          && (dialog.logs.length > 0 || dialog.isComplete || dialog.scriptExitCode !== null);
        if (scriptStarted) {
          return;
        }

        // Pre-flight failure that never streamed: close the empty console and toast.
        this.updateInProgress = false;
        this.showScriptOutput = false;
        const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
        this.$bus.emit('notify', {
          message: `Failed to install ${this.container.displayName}: ${errorMessage}`,
          level: 'error',
          timeout: 5000,
        });
      }
    },

    async refreshContainer() {
      if (this.$refs.scriptOutput?.eventSource) {
        this.$refs.scriptOutput.disconnectEventStream();
      }

      try {
        // Trigger a watch; the resulting store updates arrive over the SSE stream.
        await axios.post('/api/containers/watch');
      } catch (error) {
        console.error('Error triggering watch:', error);
      }
    }
},
  mounted() {
    this.$bus.on('refresh-containers', this.refreshContainer);
  },
    beforeUnmount() {
        this.$bus.off('refresh-containers', this.refreshContainer);
    }
};
</script>

<style scoped>
.v-chip--disabled {
  opacity: 1;
  pointer-events: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

/* The row header toggles the detail on click; keep it non-selectable so rapid
   clicks can't catch a text selection. The expanded detail stays selectable. */
.desktop-row,
.mobile-header {
  -webkit-user-select: none;
  user-select: none;
}

/* Flat card; each column is its own inset tile. Tracks and gap come from
   --wud-grid-cols / --wud-grid-gap on the ContainersView wrapper so the header
   and every card share one geometry and align down the list. */
.desktop-row {
  display: grid;
  grid-template-columns: var(--wud-grid-cols, clamp(210px, 25vw, 320px) 1fr 40px);
  gap: var(--wud-grid-gap, 8px);
  align-items: stretch;
  cursor: pointer;
}
.desktop-row > * {
  display: flex;
  align-items: center;
  min-height: 46px;
  padding: 8px 14px;
  min-width: 0;
  background: rgb(var(--v-theme-surface-light));
  border-radius: 8px;
}

.mobile-header {
  background: rgb(var(--v-theme-surface-light));
  border-radius: 8px;
}

/* The card is transparent, so the detail drawer sets its own surface. */
.container-detail-panel {
  margin-top: 8px;
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
  overflow: hidden;
}

.cell-container {
  gap: 8px;
}
.watcher-tag {
  flex: 0 0 auto;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.5);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.18);
  border-radius: 4px;
  padding: 2px 6px;
}
.row-icon {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
}
.row-name {
  font-family: "JetBrains Mono", monospace;
  /* Match the version chips: JetBrains Mono runs larger than the UI font, so
     hold the name at the chip size rather than the 1rem body default. */
  font-size: 0.875rem;
  color: rgb(var(--v-theme-info));
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Actions sit at the right of the version tile (no separate actions column). */
.cell-version {
  gap: 12px;
}
.version-cmp {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.version-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex: 0 0 auto;
}
/* Keep action chips at their natural size so their labels are not squashed. */
.version-actions :deep(.v-chip) {
  flex: 0 0 auto;
}
.up-to-date {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-style: italic;
  font-size: 0.8rem;
}

.cell-chevron {
  justify-content: center;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.mono {
  font-family: "JetBrains Mono", monospace;
}
</style>
