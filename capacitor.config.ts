import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pauliapp.app",
  appName: "PauliApp",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
