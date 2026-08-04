import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.nocontacttracker",
  appName: "No Contact Tracker",
  webDir: "dist/client",
  android: {
    backgroundColor: "#FFFFFF",
    // Stable https://localhost origin so Supabase auth storage survives restarts.
    androidScheme: "https",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#FFFFFF",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_leaf",
      iconColor: "#6BCB77",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
