<template>
  <v-snackbar
    :model-value="show"
    :timeout="computedTimeout"
    :color="computedColor"
    @update:model-value="closeSnackbar"
    variant="outlined"
  >
    {{ message }}
    <template v-slot:actions>
      <v-btn variant="text" @click="closeSnackbar">Close</v-btn>
    </template>
  </v-snackbar>
</template>

<script>
export default {
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    timeout: {
      type: Number,
      default: 5000, // Default timeout if none is provided
    },
    message: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      default: "info",
    },
  },
  computed: {
    computedColor() {
      switch (this.level) {
        case "success":
          return "green";
        case "warning":
          return "orange";
        case "error":
          return "red";
        default:
          return "primary";
      }
    },
    computedTimeout() {
      return this.level === "error" ? 0 : this.timeout;
    },
  },
  methods: {
    closeSnackbar() {
      this.$bus.emit("notify:close");
    },
  },
};
</script>
