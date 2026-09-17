import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL || process.env.NEXT_PUBLIC_APP_URL || undefined;

const config: CapacitorConfig = {
  appId: "com.gradus.app",
  appName: "拾级",
  webDir: "public",
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: true,
        androidScheme: "https",
      }
    : {
        androidScheme: "https",
      },
  android: {
    allowMixedContent: true,
    backgroundColor: "#FAFAF8",
  },
};

export default config;
