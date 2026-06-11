<template>
  <v-form @keyup.enter="login">
    <v-card-text>
      <v-text-field
        label="Username"
        v-model="username"
        append-inner-icon="ri-user-line"
        :rules="[rules.required]"
        variant="outlined"
        autofocus
      />
      <v-text-field
        label="Password"
        type="password"
        v-model="password"
        append-inner-icon="ri-lock-2-line"
        :rules="[rules.required]"
        variant="outlined"
      />
      <v-btn block color="primary" :disabled="!valid" @click="login">
        Login
      </v-btn>
    </v-card-text>
  </v-form>
</template>

<script>
import { loginBasic } from "@/services/auth";

export default {
  data() {
    return {
      username: "",
      password: "",
      rules: {
        required: (value) => !!value || "Required",
      },
    };
  },

  computed: {
    /**
     * Is form valid?
     * @returns {boolean}
     */
    valid() {
      return this.username !== "" && this.password !== "";
    },
  },

  methods: {
    /**
     * Perform login.
     * @returns {Promise<void>}
     */
    async login() {
      if (this.valid) {
        try {
          await loginBasic(this.username, this.password);
          this.$emit("authentication-success");
        } catch (e) {
          this.$bus.emit("notify", {
            message: "Username or password error",
            level: "error",
          });
        }
      }
    },
  },
};
</script>
