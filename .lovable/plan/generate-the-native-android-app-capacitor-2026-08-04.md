# Generate the native Android app (Capacitor)

Turn the current web project into a real Android app: create the `android/` native project, wire it to the built web bundle, configure it for release (signing, minification, FCM), and commit it so it lands in the GitHub repo and opens directly in Android Studio.

## Current state (verified)

- Capacitor 8 is already installed: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` and 12 plugins (push, local notifications, camera, filesystem, haptics, network, preferences, share, splash, status bar, device, app) plus RevenueCat.
- `capacitor.config.ts` exists with `appId: app.lovable.nocontacttracker`, `webDir: dist/client`, splash and notification settings.
- There is **no** `android/` folder yet — that is the whole gap.
- The app makes no server calls of its own (it talks to Supabase directly from the browser), so it can ship as a pure static bundle inside the app. Nothing needs a Node server on the phone.

## What will be done

**1. Make the web build packageable**
The project currently builds as a server-rendered site. Capacitor needs a self-contained folder of files. I will switch the build to emit a static single-page shell (`index.html` plus assets) and point `webDir` at it, so every screen works inside the app's WebView. The hosted web version keeps working as before.

**2. Create the native project**
Generate `android/` with the Capacitor CLI and sync it, so the native project contains the web bundle and all installed plugins registered.

**3. Configure it for release**
- App name, package `app.lovable.nocontacttracker`, `versionCode 1` / `versionName 1.0.0`.
- Release signing read from a local `keystore.properties` (never committed) with a safe fallback to debug signing so the project always opens and builds.
- Code shrinking plus ProGuard rules for release, keeping Capacitor and plugin classes.
- Permissions and FCM wiring for push and local notifications, including the `ic_stat_leaf` white notification icon and `#6BCB77` accent already referenced in the config.
- Firebase's `google-services.json` is yours to add; the Gradle files will apply Firebase only when that file is present, so the project still builds before you add it.

**4. Keep the repo clean and committed**
All generated native sources get committed with this change, which is what pushes them to GitHub through the existing sync. Build output — `android/build`, `android/app/build`, `.gradle`, `local.properties`, keystores, `google-services.json` — gets ignored.

**5. Verify**
This sandbox has no Java or Android SDK, so a Gradle build cannot run here. Verification will be structural: the Gradle and manifest files are present and coherent, the web bundle really landed in `android/app/src/main/assets/public`, and every installed plugin appears in the generated plugin list. Then `ANDROID.md` gets rewritten with the exact steps to open the project in Android Studio and produce a signed AAB/APK, plus how to generate a keystore.

## Technical notes

- `vite.config.ts`: enable `spa` in the `tanstackStart` options so the build emits a client shell; adjust `webDir` in `capacitor.config.ts` if the static output path differs.
- `capacitor.config.ts`: add `android.androidScheme: "https"` for a stable origin, which keeps Supabase auth storage persistent across launches.
- Files touched: `vite.config.ts`, `capacitor.config.ts`, `.gitignore`, `ANDROID.md`, plus generated `android/**` and edits to `android/app/build.gradle`, `android/app/proguard-rules.pro`, `AndroidManifest.xml`, `res/values/strings.xml`.
- Google OAuth on Android: the redirect must be added to Supabase's allowed URLs for the app's scheme. This will be documented rather than changed in auth code.

## Not included

- Running a real Gradle build or producing an APK/AAB (needs JDK and Android SDK on your machine).
- Creating the Firebase project or the upload keystore — both require your credentials; steps are documented.