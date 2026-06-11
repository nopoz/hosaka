<template>
  <v-card>
    <!-- Desktop: single dense toolbar row with full chip set. -->
    <v-toolbar
      v-if="$vuetify.display.mdAndUp"
      flat
      density="compact"
      @click="collapseDetail()"
      style="cursor: pointer"
    >
      <v-toolbar-title class="text-body-3">
        <v-chip label color="info" variant="outlined" disabled
          ><v-icon start>mdi-update</v-icon
          >{{ container.watcher }}
        </v-chip>
        /
        <span v-if="!selfhstContainerIconUrl">
          <v-chip label color="info" variant="outlined" disabled
            ><v-icon start>{{
              registryIcon
            }}</v-icon
            >{{ container.image.registry.name }}
          </v-chip>
          /
        </span>
        <v-chip label color="info" variant="outlined" disabled>
          <img
            :src="selfhstContainerIconUrl"
            style="width: 24px; height: 24px"
            class="v-icon v-icon--start"
            v-if="isSelfhstContainerIcon"
          />
          <v-icon start v-else>
            {{ containerIcon }}
          </v-icon>
          {{ container.displayName }}
        </v-chip>
        :
        <v-chip label variant="outlined" color="info" disabled>
          {{ container.image.tag.value }}
        </v-chip>
      </v-toolbar-title>
      <v-spacer />
      <v-chip
        v-if="(container.install === true || container.install === 'multiple') && container.updateAvailable"
        label
        color="update"
        variant="outlined"
        @click.stop="installContainer"
        class="mr-1"
      >
        Update
      </v-chip>
      <v-tooltip location="bottom">
        <template v-slot:activator="{ props }">
          <v-chip
            v-if="container.updateAvailable"
            label
            variant="outlined"
            :color="newVersionClass"
            v-bind="props"
            @click.stop="copyToClipboard('container new version', newVersion)"
          >
            {{ newVersion }}
            <v-icon end size="small">mdi-clipboard-outline</v-icon>
          </v-chip>
        </template>
        <span class="text-caption">Copy to clipboard</span>
      </v-tooltip>
      <v-icon>{{ showDetail ? "mdi-chevron-up" : "mdi-chevron-down" }}</v-icon>
    </v-toolbar>

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
          showDetail ? "mdi-chevron-up" : "mdi-chevron-down"
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
            >mdi-arrow-right</v-icon
          >
          <span :class="'text-' + newVersionClass">{{ newVersion }}</span>
        </span>
        <v-spacer />
        <v-btn
          v-if="(container.install === true || container.install === 'multiple')"
          color="update"
          variant="outlined"
          size="small"
          class="ml-2 flex-shrink-0"
          @click.stop="installContainer"
        >
          Update
        </v-btn>
      </div>
    </div>
    <v-expand-transition>
      <div v-show="showDetail">
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
            <v-icon>mdi-package-variant-closed</v-icon>
          </v-tab>
          <v-tab v-if="container.result">
            <span v-if="$vuetify.display.mdAndUp" class="me-2">Update</span>
            <v-icon>mdi-package-down</v-icon>
          </v-tab>
          <v-tab v-if="container.error">
            <span v-if="$vuetify.display.mdAndUp" class="me-2">Error</span>
            <v-icon>mdi-alert</v-icon>
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
                    <v-icon end>mdi-delete</v-icon>
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
  </v-card>
</template>

<script>
import axios from 'axios';
import ContainerDetail from "@/components/ContainerDetail";
import ContainerImage from "@/components/ContainerImage";
import ContainerUpdate from "@/components/ContainerUpdate";
import ContainerError from "@/components/ContainerError";
import { getRegistryProviderIcon } from "@/services/registry";
import { date, short } from "@/filters";
import ScriptOutputDialog from './ScriptOutputDialog.vue';

export default {
  components: {
    ContainerDetail,
    ContainerImage,
    ContainerUpdate,
    ContainerError,
    ScriptOutputDialog
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

    containerIcon() {
      let icon = this.container.displayIcon;
      icon = icon
        .replace("mdi:", "mdi-")
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

    registryIcon() {
      return getRegistryProviderIcon(this.container.image.registry.name);
    },

    osIcon() {
      let icon = "mdi-help";
      switch (this.container.image.os) {
        case "linux":
          icon = "mdi-linux";
          break;
        case "windows":
          icon = "mdi-microsoft-windows";
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

    copyToClipboard(kind, value) {
      const ok = () =>
        this.$bus.emit("notify", { message: `${kind} copied to clipboard` });
      const fail = () =>
        this.$bus.emit("notify", {
          message: `Unable to copy ${kind} to clipboard`,
          level: "error",
        });
      // Prefer the async Clipboard API; it is only available in secure contexts
      // (https / localhost), so fall back to a hidden-textarea execCommand copy
      // for plain-http LAN access.
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(value).then(ok, fail);
        return;
      }
      try {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (copied) {
          ok();
        } else {
          fail();
        }
      } catch (e) {
        fail();
      }
    },

    collapseDetail() {
      // Prevent collapse when selecting text only
      if (window.getSelection().type !== "Range") {
        this.showDetail = !this.showDetail;
      }

      // Hack because of a render bug on tabs inside a collapsible element
      this.$refs.tabs?.onResize?.();
    },

    normalizeFontawesome(iconString, prefix) {
      return `${prefix} fa-${iconString.replace(`${prefix}:`, "")}`;
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
        this.$bus.emit('notify', {
          message: `Update started for ${this.container.displayName}.`,
          level: 'info',
          timeout: 5000,
        });

        await axios.post(`/api/containers/${this.container.id}/install`);

      } catch (error) {
        console.error('Install error:', error);
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

/* Trim the desktop toolbar's default 16px side padding so the chips sit closer
   to the row edges and reclaim horizontal space. The toolbar title also adds a
   16px start margin by default; trim it too so the left chips align with the
   tightened row, keeping just a small gap from the edge. */
.v-toolbar :deep(.v-toolbar__content) {
  padding-inline: 8px;
}
.v-toolbar :deep(.v-toolbar-title) {
  margin-inline-start: 4px;
}
</style>
