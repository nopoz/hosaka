<template>
  <span
    ><template v-for="(seg, i) in segments" :key="i"
      ><code v-if="seg.code" class="inline-code">{{ seg.text }}</code
      ><template v-else>{{ seg.text }}</template></template
    ></span
  >
</template>

<script>
// Render the model's `backtick` spans as inline code. Deliberately not a full
// markdown renderer (kept dependency-free) and avoids v-html so model output
// can never inject markup.
export default {
  name: "InlineMarkup",

  props: {
    text: {
      type: String,
      default: "",
    },
  },

  computed: {
    segments() {
      const source = this.text || "";
      const out = [];
      let last = 0;
      [...source.matchAll(/`([^`]+)`/g)].forEach((match) => {
        if (match.index > last) {
          out.push({ text: source.slice(last, match.index), code: false });
        }
        out.push({ text: match[1], code: true });
        last = match.index + match[0].length;
      });
      if (last < source.length) {
        out.push({ text: source.slice(last), code: false });
      }
      return out;
    },
  },
};
</script>

<style scoped>
.inline-code {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.85em;
  background: rgba(var(--v-theme-on-surface), 0.1);
  padding: 0.1em 0.35em;
  border-radius: 4px;
  overflow-wrap: anywhere;
}
</style>
