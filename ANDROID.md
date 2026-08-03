# Android build guide

The web app in this repo is the Android app: Capacitor wraps the built client
bundle in a native shell.

## One-time setup (on your machine)

```bash
git clone <your repo> && cd <repo>
bun install
bun add -d @capacitor/cli
bunx cap add android
```

`capacitor.config.ts` is already configured:
- appId `app.lovable.nocontacttracker`, appName "No Contact Tracker"
- webDir `dist/client` (TanStack Start's static client output)
- white splash background and a green (#6BCB77) notification accent

## Build and run

```bash
bun run build          # produces dist/client
bunx cap sync android  # copies web assets + plugins into android/
bunx cap open android  # opens Android Studio
```

Run on a device from Android Studio, or `bunx cap run android`.

## Push notifications (FCM)

1. Create a Firebase project and add an Android app with the package name
   `app.lovable.nocontacttracker`.
2. Download `google-services.json` into `android/app/`.
3. In `android/build.gradle` add the classpath
   `com.google.gms:google-services:4.4.2`, and in `android/app/build.gradle`
   apply `com.google.gms.google-services`.
4. Rebuild. `registerPush()` in `src/lib/notifications/index.ts` requests the
   permission, registers the device, and stores the FCM token on the user's
   profile row (`profiles.push_token`).

Local reminders (morning, midday, evening) need no Firebase — they are
scheduled on-device via `@capacitor/local-notifications`.

## Icons and splash

Replace the generated icons in `android/app/src/main/res/mipmap-*` (or use
`@capacitor/assets`) with your own square 1024x1024 icon. Add a notification
icon named `ic_stat_leaf` in `res/drawable-*` — a white silhouette on
transparent, as Android tints it with the configured color.

## Release checklist

- Bump `versionCode`/`versionName` in `android/app/build.gradle`.
- Generate an upload keystore and configure signing in Android Studio.
- Build an AAB: Build > Generate Signed Bundle.
- Play Console: set a Privacy Policy URL (the app ships `/privacy` and
  `/terms`), complete the Data Safety form (email, streak dates, journal-style
  text stored in Supabase, encrypted in transit), and declare the app is not
  medical advice.
