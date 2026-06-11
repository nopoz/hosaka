<template>
  <v-dialog
    v-model="dialogVisible"
    width="70%"
    max-width="1000px"
    :fullscreen="$vuetify.display.smAndDown"
    @click:outside="close"
    persistent
  >
    <v-card theme="dark">
      <div style="background-color: #1E1E1E;">
        <div class="d-flex justify-end pa-2" style="background-color: #2D2D2D;">
          <v-btn
            icon
            size="x-small"
            variant="text"
            @click="close"
            v-if="!isComplete && !error"
          >
            <v-icon>ri-close-line</v-icon>
          </v-btn>
        </div>

        <v-card-text class="pa-2">
          <div ref="logContainer" class="log-output log-wrap" :style="logStyle">
            <template v-for="(line, index) in displayLines" :key="index">
              <hr v-if="line.kind === 'rule'" class="log-rule" />
              <div v-else-if="line.kind === 'title'" class="log-title">{{ line.text }}</div>
              <div v-else class="log-line" :class="line.cls">{{ line.text }}</div>
            </template>
            <div v-if="error" class="log-line error-text">Error: {{ error }}</div>
            <div v-if="isComplete && scriptExitCode === 0" class="log-line success-text">Script executed successfully</div>
          </div>
        </v-card-text>

        <v-card-actions v-if="isComplete || error || scriptExitCode !== null" class="pa-4" style="background-color: #2D2D2D;">
          <v-spacer></v-spacer>
          <v-btn
            variant="flat"
            :color="scriptExitCode === 0 ? 'secondary' : 'error'"
            @click="handleClose"
          >
            {{ scriptExitCode === 0 ? 'Close Script Output' : 'Close' }}
          </v-btn>
        </v-card-actions>
      </div>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'ScriptOutputDialog',
  
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    containerId: {
      type: String,
      required: true
    }
  },

  data() {
    return {
      logs: [],
      error: null,
      isComplete: false,
      eventSource: null,
      connectionAttempts: 0,
      maxRetries: 3,
      retryDelay: 500,
      connected: false,
      firstConnectionEstablished: false,
      scriptExitCode: null
    };
  },

  computed: {
    // Fill the screen when the dialog is fullscreen (mobile); on desktop scale
    // the log with the viewport instead of a fixed height. The reserved space
    // covers the top close bar plus the bottom actions bar when the script
    // finishes.
    logStyle() {
      if (this.$vuetify.display.smAndDown) {
        return {
          height: 'calc(100dvh - 130px)',
          fontSize: '10px',
          lineHeight: '1.3',
          padding: '8px',
        };
      }
      return { height: '75dvh' };
    },

    // Flatten the log messages into per-line items so the fixed-width ASCII
    // banner (solid #/- rows + centered title) renders as a CSS hairline +
    // heading instead of raw characters. Used for all viewport sizes.
    displayLines() {
      const out = [];
      this.logs.forEach((log) => {
        (log.message || '').split('\n').forEach((line) => {
          const stripped = line.trim();
          if (stripped === '') return;
          // Solid border rows -> hairline rule.
          if (/^#{3,}$/.test(stripped) || /^-{3,}$/.test(stripped)) {
            out.push({ kind: 'rule' });
            return;
          }
          // Centered banner title -> bold heading.
          if (stripped.includes('SCRIPT EXECUTION START')
            || stripped.includes('SCRIPT EXECUTION END')) {
            out.push({ kind: 'title', text: stripped.replace(/#/g, '').trim() });
            return;
          }
          // Classify on the raw line (patterns rely on the leading #), then
          // strip a single leading "# " decoration for display.
          const cls = this.getLogClass({ message: line });
          const text = line.replace(/^#\s?/, '');
          if (text.trim() === '') return;
          out.push({ kind: 'text', text, cls });
        });
      });
      return out;
    },

    dialogVisible: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit('update:modelValue', value);
      }
    }
  },

  watch: {
    modelValue(newVal) {
      if (newVal) {
        // Clear everything first
        this.resetState();
        this.connectionAttempts = 0;
        this.firstConnectionEstablished = false;
        // Add a small delay before first connection attempt
        setTimeout(() => {
          this.connectToEventStream();
        }, 500);
      } else {
        this.disconnectEventStream();
        // Also reset state when dialog closes
        this.resetState();
      }
    }
  },

  methods: {
    async handleClose() {
        console.log('[ScriptDialog] Handling dialog close');
        // Cache the state before we reset anything
        const currentState = {
            isComplete: this.isComplete,
            error: this.error,
            scriptExitCode: this.scriptExitCode
        };
        console.log('[ScriptDialog] Current state:', currentState);
        
        const success = currentState.isComplete && !currentState.error && currentState.scriptExitCode === 0;
        console.log('[ScriptDialog] Success evaluation:', success);

        if (success) {
            console.log('[ScriptDialog] Script successful, emitting update-complete');
            this.$emit('update-complete');
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log('[ScriptDialog] Finished waiting, closing dialog');
        }
        
        // Close the dialog
        this.dialogVisible = false;
        
        // Emit dialog-closed before we reset state
        console.log('[ScriptDialog] Emitting dialog-closed with success:', success);
        this.$emit('dialog-closed', { success });
        
        // Finally clean up
        this.disconnectEventStream();
        this.resetState();
    },

    close() {
      // Only allow closing via X button if not complete
      if (!this.isComplete && !this.error) {
        console.log('Closing dialog via X button');
        this.dialogVisible = false;
        this.disconnectEventStream();
        this.resetState();
        this.$emit('dialog-closed', { success: false });
      }
    },

    resetState() {
      console.log('Resetting state');
      this.logs = [];
      this.error = null;
      this.isComplete = false;
      this.scriptExitCode = null;
      this.connectionAttempts = 0;
      this.firstConnectionEstablished = false;
      this.disconnectEventStream();
    },

    handleComplete() {
      console.log('Script execution complete');
      this.isComplete = true;
      this.disconnectEventStream();
    },

    connectToEventStream() {
      // Clear any existing event source
      if (this.eventSource) {
        this.disconnectEventStream();
      }

      // Clear existing logs at the start of new connection
      this.logs = [];
      this.error = null;
      this.scriptExitCode = null;

      try {
        console.log('Connecting to event stream...');
        this.eventSource = new EventSource(`/api/containers/${this.containerId}/install/logs`);
        
        this.eventSource.onopen = () => {
          console.log('Event stream connected');
          this.error = null;
          this.firstConnectionEstablished = true;
          this.connectionAttempts = 0;
        };
        
        this.eventSource.onmessage = (event) => {
          try {
            const logData = JSON.parse(event.data);
            console.log('Received log data:', logData); // Debug log
            
            // Check for exit code in execution summary
            if (logData.message && logData.message.includes('Exit Code:')) {
              const exitCodeMatch = logData.message.match(/Exit Code:\s*(-?\d+)/);
              if (exitCodeMatch) {
                this.scriptExitCode = parseInt(exitCodeMatch[1], 10);
                console.log('Script exit code:', this.scriptExitCode);
              }
            }
            
            // Look for script completion or error
            if (logData.message && (
              logData.message.includes('SCRIPT EXECUTION END') ||
              logData.message.includes('Successfully executed script')
            )) {
              // Only mark as successful if exit code is 0
              if (this.scriptExitCode === 0) {
                this.handleComplete();
              } else {
                this.error = `Script failed with exit code ${this.scriptExitCode}`;
              }
            }
            
            // Only add the log if it's not a duplicate of the last log
            const lastLog = this.logs[this.logs.length - 1];
            if (!lastLog || lastLog.message !== logData.message) {
              this.logs.push(logData);
              this.scrollToBottom();
            }
          } catch (err) {
            console.error('Error parsing log data:', err);
          }
        };

        this.eventSource.addEventListener('complete', () => {
          if (this.scriptExitCode === 0) {
            this.handleComplete();
          }
        });

        this.eventSource.onerror = () => {
          if (!this.isComplete) {
            this.connectionAttempts++;
            
            if (this.connectionAttempts < this.maxRetries) {
              setTimeout(() => {
                this.disconnectEventStream();
                this.connectToEventStream();
              }, this.retryDelay);
              this.retryDelay *= 2;
            } else {
              this.error = 'Unable to connect to log stream. Script is still running in the background.';
              this.disconnectEventStream();
            }
          }
        };

      } catch (err) {
        console.error('Error setting up EventSource:', err);
        this.error = 'Failed to connect to log stream';
      }
    },

    disconnectEventStream() {
      console.log('Disconnecting event stream');
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
    },

    scrollToBottom() {
      this.$nextTick(() => {
        if (this.$refs.logContainer) {
          this.$refs.logContainer.scrollTop = this.$refs.logContainer.scrollHeight;
        }
      });
    },

    getLogClass(log) {
      const message = log.message || '';
      
      // Use pre tag's native formatting with custom classes
      if (message.match(/^#{3,}/) || message.includes('------------------------------------------------------------------------------')) {
        return 'divider-text';
      }
      
      if (message.includes('SCRIPT EXECUTION START') ||
          message.includes('Command Parameters:') ||
          message.includes('Script Output:') ||
          message.includes('Execution Summary:')) {
        return 'header-text';
      }
      
      if (message.includes('successfully') ||
          message.includes('Status: Success') ||
          message.includes('SCRIPT EXECUTION END')) {
        return 'success-text';
      }
      
      if (message.match(/^#\s+\[.*?\]/)) {
        return 'command-text';
      }
      
      if (message.includes('WARNING:') || message.includes('WARN:')) {
        return 'warning-text';
      }
      
      if (message.includes('ERROR:')) {
        return 'error-text';
      }
      
      return ''; // Default terminal white
    }
  },

  beforeUnmount() {
    this.disconnectEventStream();
  }
};
</script>

<style scoped>
.log-output {
  background-color: #1E1E1E;
  color: #FFFFFF;
  font-family: "JetBrains Mono", monospace;
  white-space: pre;
  height: 400px;
  overflow-y: auto;
  border: 1px solid #333333;
  border-radius: 4px;
  padding: 12px;
  margin: 0;
  line-height: 1.2;
}

/* Wrap long lines instead of forcing horizontal scroll. */
.log-wrap {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* Render the ASCII banner as a CSS hairline + heading. */
.log-rule {
  border: none;
  border-top: 1px solid #555555;
  margin: 6px 8px;
}

.log-title {
  text-align: center;
  font-weight: bold;
  color: #F5F5F5;
  padding: 2px 0;
}

/* Clean slate - remove Vuetify's color overrides */
.log-output :deep(.v-application) {
  color: inherit !important;
}

/* More vibrant ANSI-style colors */
.log-output .header-text {
  color: #F5F5F5 !important;  /* Much lighter grey for headers */
}

.log-output .command-text {
  color: #00FFFF !important;  /* Bright cyan for commands */
}

.log-output .success-text {
  color: #00FF00 !important;  /* Bright green for success */
}

.log-output .warning-text {
  color: #FFD700 !important;  /* Bright gold for warnings */
}

.log-output .error-text {
  color: #FF4444 !important;  /* Bright red for errors */
}

.log-output .divider-text {
  color: #BDBDBD !important;  /* Lighter grey for dividers */
}


/* Scrollbar styling */
.log-output::-webkit-scrollbar {
  width: 8px;
}

.log-output::-webkit-scrollbar-track {
  background: #2D2D2D;
}

.log-output::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.log-output::-webkit-scrollbar-thumb:hover {
  background: #666;
}

/* Override Vuetify's default card background */
:deep(.v-card) {
  background-color: #1E1E1E !important;
}

:deep(.v-card > .v-card-text) {
  padding: 8px;
}
</style>