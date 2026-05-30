// Google fonts
import "@fontsource/roboto";

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
  primary: "#00355E",
  secondary: "#0096C7",
  accent: "#06D6A0",
  error: "#E53935",
  // Prerelease is the least-severe update rung; cyan keeps it distinct from
  // the info-blue metadata chips and the major/minor/patch severity colors.
  prerelease: "#00BCD4",
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
          surface: "#1E1E1E",
          "surface-light": "#272727",
          "surface-bright": "#BDBDBD",
        },
      },
    },
  },
  icons: {
    defaultSet: "mdi",
  },
});
