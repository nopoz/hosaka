import mitt from "mitt";

// Application-wide event bus replacing the Vue 2 `$root.$on/$emit` pattern
// (Vue 3 removed instance $on/$off/$once). Exposed as `this.$bus` via
// app.config.globalProperties in main.js.
export default mitt();
