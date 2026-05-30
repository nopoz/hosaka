<template>
  <v-card>
    <v-toolbar
      flat
      density="compact"
      @click="collapseDetail()"
      style="cursor: pointer"
    >
      <v-toolbar-title class="text-body-3">
        <v-chip label color="info" variant="outlined" disabled
          ><v-icon start v-if="$vuetify.display.mdAndUp">mdi-update</v-icon
          >{{ container.watcher }}
        </v-chip>
        /
        <span v-if="$vuetify.display.mdAndUp && !selfhstContainerIconUrl">
          <v-chip label color="info" variant="outlined" disabled
            ><v-icon start v-if="$vuetify.display.mdAndUp">{{
              registryIcon
            }}</v-icon
            >{{ container.image.registry.name }}
          </v-chip>
          /
        </span>
        <v-chip label color="info" variant="outlined" disabled>
          <span v-if="$vuetify.display.mdAndUp">
            <img
              :src="selfhstContainerIconUrl"
              style="width: 24px; height: 24px"
              class="v-icon v-icon--start"
              v-if="isSelfhstContainerIcon"
            />
            <v-icon start v-else>
              {{ containerIcon }}
            </v-icon>
          </span>
          {{ container.displayName }}
        </v-chip>
        <span v-if="$vuetify.display.mdAndUp">
          :
          <v-chip label variant="outlined" color="info" disabled>
            {{ container.image.tag.value }}
          </v-chip>
        </span>
      </v-toolbar-title>
      <v-spacer />
      <v-chip
        v-if="(container.install === true || container.install === 'multiple') && container.updateAvailable"
        label
        color="success"
        variant="outlined"
        @click.stop="installContainer"
        class="mr-1"
      >
        Update
      </v-chip>
      <v-tooltip location="bottom" v-if="$vuetify.display.mdAndUp">
        <template v-slot:activator="{ props }">
          <v-chip
            v-if="container.updateAvailable"
            label
            variant="outlined"
            :color="newVersionClass"
            v-bind="props"
            @click="
              copyToClipboard('container new version', newVersion);
              $event.stopImmediatePropagation();
            "
          >
            {{ newVersion }}
            <v-icon end size="small">mdi-clipboard-outline</v-icon>
          </v-chip>
        </template>
        <span class="text-caption">Copy to clipboard</span>
      </v-tooltip>
      <v-icon>{{ showDetail ? "mdi-chevron-up" : "mdi-chevron-down" }}</v-icon>
    </v-toolbar>
    <v-expand-transition>
      <div v-show="showDetail">
        <v-tabs fixed-tabs v-model="tab" ref="tabs">
          <v-tab>
            <span v-if="$vuetify.display.mdAndUp">Container</span>
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
            <span v-if="$vuetify.display.mdAndUp">Image</span>
            <v-icon>mdi-package-variant-closed</v-icon>
          </v-tab>
          <v-tab v-if="container.result">
            <span v-if="$vuetify.display.mdAndUp">Update</span>
            <v-icon>mdi-package-down</v-icon>
          </v-tab>
          <v-tab v-if="container.error">
            <span v-if="$vuetify.display.mdAndUp">Error</span>
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
    <v-dialog
      v-if="showUpdateProgress"
      v-model="showUpdateProgress"
      persistent
      max-width="400px"
    >
      <v-card>
        <v-card-text class="pa-4">
          <div class="d-flex align-center mb-3">
            <v-progress-circular
              indeterminate
              color="primary"
              size="24"
              class="mr-3"
            ></v-progress-circular>
            <span class="text-body-1"
              >Waiting for container update to complete...</span
            >
          </div>
          <div class="text-caption text-grey">
            The script has completed successfully. Waiting for the container to
            finish updating before refreshing the view.
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
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
      showUpdateProgress: false,
      updateCheckInterval: null,
      pollInterval: null,
      pollAttempts: 0,
      maxPollAttempts: 30
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
      console.log(this.container.displayIcon);
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
        }
      }
      return color;
    },
  },

  methods: {
    async checkContainerUpdate() {
      try {
        const response = await axios.get(`/api/containers/${this.container.id}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (response.data && !response.data.updateAvailable) {
          // Container update detected
          this.showUpdateProgress = false;
          clearInterval(this.updateCheckInterval);

          // Show success message
          this.$bus.emit('notify', {
            message: 'Container update completed successfully. Refreshing view...',
            level: 'success',
            timeout: 3000,
          });

          // Brief delay then refresh
          setTimeout(() => {
            window.location.replace(window.location.href);
          }, 2000);
        }
      } catch (error) {
        console.error('Error checking container update:', error);
      }
    },

    async handleUpdateComplete() {
        console.log('[ContainerItem] Update completed');
        this.showScriptOutput = false;
        this.showUpdateProgress = true;

        try {
            // Wait a bit for the container to fully restart
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Clear any existing notifications
            if (this.container.notification) {
                await axios.post(`/api/containers/${this.container.id}/clear-notification`);
            }

            // Use the refresh endpoint to update container state from Docker
            // This now uses watchContainer with skipRegistryCheck=true (no rate limiting)
            console.log(`Triggering direct container refresh for ${this.container.name}`);
            const refreshResponse = await axios.post('/api/containers/refresh', null, {
                params: {
                    name: this.container.name,
                    watcher: this.container.watcher
                }
            });

            const refreshedContainer = refreshResponse.data;
            console.log('Refresh response:', refreshedContainer);

            // Check if the refresh detected the update
            const updateDetected =
                // Container was recreated with new ID
                (refreshedContainer.id !== this.container.id) ||
                // Container image changed
                (refreshedContainer.image?.id !== this.container.image?.id) ||
                // Update flag was reset to false
                (this.container.updateAvailable && !refreshedContainer.updateAvailable);

            if (updateDetected) {
                console.log('Update detected from refresh response, finishing update');
                this.finishUpdate(true);
            } else {
                // Refresh didn't detect the update yet - poll as fallback
                // This handles edge cases where Docker is still processing
                console.log('Update not detected from refresh, starting poll as fallback');
                this.pollForContainerUpdate();
            }
        } catch (error) {
            console.error('Error during update completion:', error);
            // On error, try polling as fallback
            console.log('Refresh failed, trying poll as fallback');
            this.pollForContainerUpdate();
        }
    },

    async pollForContainerUpdate() {
        this.pollAttempts = 0;
        this.maxPollAttempts = 10;

        // Clear any existing interval
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }

        this.pollInterval = setInterval(async () => {
            this.pollAttempts++;
            console.log(`Polling for container update (attempt ${this.pollAttempts}/${this.maxPollAttempts})`);

            try {
                // Instead of polling the old container directly,
                // first check if there's a container with the same name
                const allContainersResponse = await axios.get('/api/containers', {
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });

                // Find our container by name and watcher
                const updatedContainer = allContainersResponse.data.find(c =>
                    c.name === this.container.name &&
                    c.watcher === this.container.watcher
                );

                // If we found a container with the same name but different ID, it was updated
                if (updatedContainer && updatedContainer.id !== this.container.id) {
                    console.log('Container recreated with new ID, refreshing page');
                    this.finishUpdate(true);
                    return;
                }

                // If we're still looking at the same container ID, check if its image changed
                if (updatedContainer && updatedContainer.id === this.container.id) {
                    // Check if the image has changed
                    if (updatedContainer.image &&
                        this.container.image &&
                        updatedContainer.image.id !== this.container.image.id) {

                        console.log('Container image updated, refreshing page');
                        this.finishUpdate(true);
                        return;
                    }

                    // Check if the updateAvailable flag has been reset to false
                    if (this.container.updateAvailable && !updatedContainer.updateAvailable) {
                        console.log('Container update status reset, refreshing page');
                        this.finishUpdate(true);
                        return;
                    }
                }

                // After max attempts, give up and just refresh the page
                if (this.pollAttempts >= this.maxPollAttempts) {
                    console.log('Max poll attempts reached, forcing refresh');
                    this.finishUpdate(false);
                }
            } catch (error) {
                console.error('Error polling for container update:', error);
                // Don't give up on errors, keep trying until max attempts
                if (this.pollAttempts >= this.maxPollAttempts) {
                    this.finishUpdate(false);
                }
            }
        }, 3000);
    },

    finishUpdate(updateDetected) {
        // Clean up polling
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }

        // Hide progress indicator
        this.showUpdateProgress = false;

        // Show appropriate notification
        if (updateDetected) {
            this.$bus.emit('notify', {
                message: 'Container update detected! Refreshing view...',
                level: 'success',
                timeout: 3000,
            });
        } else {
            this.$bus.emit('notify', {
                message: 'Container update completed, refreshing view...',
                level: 'info',
                timeout: 3000,
            });
        }

        // Refresh the page to show updated state
        setTimeout(() => {
            window.location.replace(window.location.href);
        }, 1000);
    },

    handleDialogClosed({ success }) {
        console.log('[ContainerItem] Dialog closed with success:', success);
        if (!success) {
            this.stopPolling();
            this.updateInProgress = false;
            this.showScriptOutput = false;
            this.showUpdateProgress = false;
        }
    },

    async deleteContainer() {
      this.$emit("delete-container");
    },

    copyToClipboard(kind, value) {
      navigator.clipboard.writeText(value);
      this.$bus.emit("notify", { message: `${kind} copied to clipboard` });
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
        // Trigger a watch before refreshing
        await axios.post('/api/containers/watch');
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('Error triggering watch:', error);
      }

      // Force reload bypassing cache
      window.location.replace(window.location.href);
    }
},
  mounted() {
    this.$bus.on('refresh-containers', this.refreshContainer);
  },
    beforeUnmount() {
        this.$bus.off('refresh-containers', this.refreshContainer);
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
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
</style>
