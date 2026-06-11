// UI + mono fonts
import "@fontsource/rajdhani/400.css";
import "@fontsource/rajdhani/500.css";
import "@fontsource/rajdhani/600.css";
import "@fontsource/rajdhani/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";

// Material design icons
import "@mdi/font/css/materialdesignicons.css";

// Font-awesome
import "@fortawesome/fontawesome-free/css/all.css";

// Simple icons
import "simple-icons-font/font/simple-icons.min.css";

// Vuetify
import "vuetify/styles";
import { createVuetify } from "vuetify";

const colors = {
  primary: "#19E3E3",
  secondary: "#D633FF",
  accent: "#06D6A0",
  error: "#FF2E5B",
  warning: "#FF9E2C",
  success: "#2BE88B",
  // Prerelease is the least-severe update rung; cyan keeps it distinct from
  // the major/minor/patch severity colors on the near-black base.
  prerelease: "#19E3E3",
};

export default createVuetify({
  theme: {
    defaultTheme: "dark",
    themes: {
      light: {
        dark: false,
        colors,
      },
      dark: {
        dark: true,
        colors: {
          ...colors,
          background: "#0A0A0F",
          surface: "#101019",
          "surface-light": "#16161F",
          "surface-bright": "#3A3A52",
        },
      },
    },
  },
  icons: {
    defaultSet: "mdi",
  },
});
