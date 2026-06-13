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

// Each theme is fully explicit (no shared base) so every palette is readable in
// one place. Tokens consumed by the app: primary/secondary/accent, the semver
// ladder (error=major, warning=minor, success=patch, prerelease, info) plus the
// dedicated `update` action color, and the surface pins (surface drives toolbar
// + container rows, surface-bright the off-state controls).
const themes = {
  "neon-noir": {
    dark: true,
    colors: {
      primary: "#19E3E3", secondary: "#D633FF", accent: "#06D6A0",
      error: "#FF2E97", warning: "#FF7B29", success: "#3DF5B0", info: "#36C5FF",
      prerelease: "#A35BFF", update: "#5CFF3D",
      background: "#0A0A0F", surface: "#101019",
      "surface-light": "#16161F", "surface-bright": "#3A3A52",
    },
  },
  "acid-matrix": {
    dark: true,
    colors: {
      primary: "#5CFF3D", secondary: "#00F0D0", accent: "#FFD60A",
      error: "#FF1F4B", warning: "#FFD60A", success: "#5CFF3D", info: "#4D9FFF",
      prerelease: "#4D9FFF", update: "#00F0D0",
      background: "#07090A", surface: "#0E1412",
      "surface-light": "#101714", "surface-bright": "#2E3A33",
    },
  },
  synthwave: {
    dark: true,
    colors: {
      primary: "#FF2E97", secondary: "#19E3E3", accent: "#A35BFF",
      error: "#FF2E97", warning: "#FF7B29", success: "#19E3E3", info: "#36C5FF",
      prerelease: "#A35BFF", update: "#5CFF3D",
      background: "#1A1033", surface: "#241544",
      "surface-light": "#2C1A52", "surface-bright": "#4A3A6E",
    },
  },
  "sprawl-terminal": {
    dark: true,
    colors: {
      primary: "#FFB000", secondary: "#FFB000", accent: "#C98A00",
      error: "#FFB000", warning: "#FFB000", success: "#C98A00", info: "#C98A00",
      prerelease: "#8A6A14", update: "#FFB000",
      background: "#0A0A06", surface: "#14110A",
      "surface-light": "#171206", "surface-bright": "#3A2F12",
      // Monochrome CRT: default text + icons render amber, not white, so the
      // whole chrome (chrome bar, filters, nav, row text) reads as one phosphor.
      "on-background": "#FFB000", "on-surface": "#FFB000",
    },
  },
  corpo: {
    dark: false,
    colors: {
      primary: "#1A1A1A", secondary: "#5E5E5E", accent: "#0D0D0D",
      error: "#0D0D0D", warning: "#595959", success: "#767676", info: "#595959",
      prerelease: "#D9D9D9", update: "#0D0D0D",
      background: "#FFFFFF", surface: "#FFFFFF",
      "surface-light": "#FAFAFA", "surface-bright": "#F2F2F2",
    },
  },
};

export default createVuetify({
  theme: {
    defaultTheme: "neon-noir",
    themes,
  },
  icons: {
    defaultSet: "mdi",
  },
});
