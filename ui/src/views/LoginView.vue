<template>
  <v-container class="login-background">
    <v-dialog
      :model-value="true"
      width="400px"
      :persistent="true"
      :no-click-animation="true"
      scrim="primary"
    >
      <v-card>
        <v-container>
          <v-row justify="center" class="ma-1">
            <v-avatar color="primary" size="80">
              <v-icon size="x-large">ri-user-line</v-icon>
            </v-avatar>
          </v-row>
          <v-row>
            <v-container>
              <v-tabs v-model="strategySelected">
                <v-tab
                  v-for="(strategy, index) in strategies"
                  :key="strategy.name"
                  :value="index"
                  class="text-body-2"
                >
                  {{ strategy.name }}
                </v-tab>
              </v-tabs>
              <v-window v-model="strategySelected">
                <v-window-item
                  v-for="(strategy, index) in strategies"
                  :key="strategy.type + strategy.name"
                  :value="index"
                >
                  <login-basic
                    v-if="strategy.type === 'basic'"
                    @authentication-success="onAuthenticationSuccess"
                  />
                  <login-oidc
                    v-if="strategy.type === 'oidc'"
                    :name="strategy.name"
                    @authentication-success="onAuthenticationSuccess"
                  />
                </v-window-item>
              </v-window>
            </v-container>
          </v-row>
        </v-container>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { getOidcRedirection, getStrategies } from "@/services/auth";
import LoginBasic from "@/components/LoginBasic";
import LoginOidc from "@/components/LoginOidc";
import bus from "@/event-bus";

export default {
  components: {
    LoginBasic,
    LoginOidc,
  },
  data() {
    return {
      strategies: [],
      strategySelected: 0,
    };
  },

  methods: {
    /**
     * Is strategy supported for Web UI usage?
     * @param strategy
     * @returns {boolean}
     */
    isSupportedStrategy(strategy) {
      switch (strategy.type) {
        case "basic":
          return true;
        case "oidc":
          return true;
        default:
          false;
      }
    },

    /**
     * Handle authentication success.
     */
    onAuthenticationSuccess() {
      this.$router.push(this.$route.query.next || "/");
    },
  },

  /**
   * Collect available auth strategies.
   * @param to
   * @param from
   * @param next
   * @returns {Promise<void>}
   */
  async beforeRouteEnter(to, from, next) {
    try {
      const strategies = await getStrategies();

      // If anonymous auth is enabled then no need to login => go home
      if (strategies.find((strategy) => strategy.type === "anonymous")) {
        next("/");
      }

      // If oidc strategy supporting redirect
      const oidcWithRedirect = strategies.find(
        (strategy) => strategy.type === "oidc" && strategy.redirect,
      );
      if (oidcWithRedirect) {
        const redirection = await getOidcRedirection(oidcWithRedirect.name);
        window.location.href = redirection.url;
      } else {
        // Filter on supported auth for UI
        next(async (vm) => {
          vm.strategies = strategies.filter(vm.isSupportedStrategy);
        });
      }
    } catch (e) {
      bus.emit("notify", {
        message: `Error when trying to get the authentication strategies (${e.message})`,
        level: "error",
      });
    }
  },
};
</script>
