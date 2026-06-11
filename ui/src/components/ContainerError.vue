<template>
  <v-list density="compact">
    <v-list-item>
      <template #prepend>
        <v-icon color="secondary">ri-price-tag-3-line</v-icon>
      </template>
      <v-list-item-title>Error</v-list-item-title>
      <v-list-item-subtitle>
        {{ error.message }}
      </v-list-item-subtitle>
    </v-list-item>
  </v-list>
</template>

<script>
export default {
  props: {
    error: {
      type: Object,
    },
  },
};
</script>
