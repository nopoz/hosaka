// UI + mono fonts
import "@fontsource/rajdhani/400.css";
import "@fontsource/rajdhani/500.css";
import "@fontsource/rajdhani/600.css";
import "@fontsource/rajdhani/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";

// Material design icons
import "@mdi/font/css/materialdesignicons.css";

// Remix icon (app-chrome icon set)
import "remixicon/fonts/remixicon.css";

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
  // Synthwave Sunset severity ladder: hot magenta / sunset orange / mint /
  // electric violet, with a sky-blue for info/metadata. Each rung stays mutually
  // distinct and legible on the near-black base.
  error: "#FF2E97",
  warning: "#FF7B29",
  success: "#3DF5B0",
  info: "#36C5FF",
  // Prerelease is the least-severe update rung; electric violet keeps it distinct
  // from the major/minor/patch severity colors and from the cyan primary.
  prerelease: "#A35BFF",
  // Dedicated colour for the one-click Update control so it reads as its own
  // action, distinct from the (mint) patch rung.
  update: "#5CFF3D",
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
