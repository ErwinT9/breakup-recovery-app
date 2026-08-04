# Android build guide (documentation only)

> **This file is documentation.** It is *not* the Android project, and no
> Firebase file belongs inside it.
>
> | Thing | What it is | Where it lives |
> | --- | --- | --- |
> | `ANDROID.md` | This guide | repo root (committed) |
> | `android/` | The **generated** native Android Studio project | created locally by `bunx cap add android` — not in this repo |
> | `google-services.json` | Firebase Android config you download from Firebase | **`android/app/google-services.json`**, after `android/` exists |
>
> The `android/` directory does **not** exist in this repository. Capacitor
> generates it on your machine. Everything else (web app, plugins, config,
> notification service, Supabase migrations, Edge Function) is already here.

## 1. Prerequisites

- Node 20+ and [Bun](https://bun.sh) (this project uses Bun; keep it consistent)
- Android Studio (Ladybug or newer) with Android SDK 35 + JDK 17
- A Firebase project (see section 4)

## 2. Generate the native Android project

```bash
git clone <your repo> && cd <repo>
bun install
bun run build            # produces dist/client (Capacitor webDir)
bunx cap add android     # creates ./android — do this once
bunx cap sync android    # copies web assets + plugins into ./android
```

`capacitor.config.ts` is already set:

- `appId: "app.lovable.nocontacttracker"` (this is the Android application ID)
- `appName: "No Contact Tracker"`
- `webDir: "dist/client"`
- white splash background, `ic_stat_leaf` notification icon, accent `#6BCB77`

Re-run `bun run build && bunx cap sync android` after **every** web change.

## 3. Installed Capacitor plugins

`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`,
`@capacitor/push-notifications`, `@capacitor/local-notifications`,
`@capacitor/network`, `@capacitor/preferences`, `@capacitor/app`,
`@capacitor/camera`, `@capacitor/filesystem`, plus `haptics`, `share`,
`splash-screen`, `status-bar`, `device` — all on Capacitor 8.

## 4. Firebase Cloud Messaging setup (manual, by you)

1. Create a Firebase project at <https://console.firebase.google.com>.
2. **Add app → Android** and enter the package name **exactly**:

   ```
   app.lovable.nocontacttracker
   ```

   It must match `appId` in `capacitor.config.ts` or FCM will never deliver.
3. Download `google-services.json` and place it at:

   ```
   android/app/google-services.json
   ```

   (only possible after `bunx cap add android`). Do not commit it if your repo
   is public; never place service-account keys anywhere in `src/` or `public/`.
4. Wire up the Google Services Gradle plugin:

   `android/build.gradle` → inside `buildscript { dependencies { … } }`:

   ```gradle
   classpath 'com.google.gms:google-services:4.4.2'
   ```

   `android/app/build.gradle` → at the **bottom** of the file:

   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```

5. `bunx cap sync android`, then rebuild in Android Studio.

### Server credentials (for sending pushes)

In Firebase → Project settings → Service accounts → **Generate new private
key**. Store that JSON as a Supabase Edge Function secret named
`FIREBASE_SERVICE_ACCOUNT` (Supabase dashboard → Edge Functions → Secrets).
It must never appear in the app bundle or in Git.

## 5. Notification permissions

Android 13+ requires the runtime `POST_NOTIFICATIONS` permission. The app asks
for it **in context** — at the end of the onboarding questionnaire and from
Settings → Notifications — never on cold start. Denial is handled gracefully:
the app keeps working, reminders stay off, and the user can enable them later.

The `@capacitor/push-notifications` plugin adds the required manifest entries
during `cap sync`; no manual `AndroidManifest.xml` edit is needed.

## 6. Local vs remote notifications

- **Local** (`src/lib/notifications/index.ts`): daily motivation, morning,
  evening, streak, inactivity, milestone and SOS follow-ups. Scheduled on the
  device, work with **no internet**, no Firebase required.
- **Remote** (`src/lib/notifications/push.ts` + Supabase Edge Function
  `send-push-notification`): FCM tokens are stored in `public.push_tokens`,
  scoped per user by RLS, deactivated on logout, and pushes are only ever sent
  server-side.

## 7. Run and debug

```bash
bunx cap open android    # opens Android Studio
bunx cap run android     # build + install on a connected device
```

Test push on a **physical device** (emulators need Google Play services).

## 8. Versioning for releases

Edit `android/app/build.gradle`:

```gradle
versionCode 2          // must increase on every Play upload
versionName "1.0.1"
```

| Change | Version |
| --- | --- |
| Bug fix | `1.0.0 → 1.0.1` |
| New feature | `1.0.0 → 1.1.0` |
| Major/breaking | `1.x.x → 2.0.0` |

Every Play release that contains **app code** needs a new signed AAB with a
higher `versionCode`. Backend-only changes (Supabase schema, Edge Function,
content) ship without a new AAB.

## 9. Release checklist (AAB)

1. `bun run build && bunx cap sync android`
2. Bump `versionCode` / `versionName`.
3. Android Studio → **Build → Generate Signed Bundle / APK → Android App Bundle**.
4. Create/reuse an upload keystore; keep it and its passwords safe.
5. Upload the `.aab` to Play Console → Production (or Internal testing first).
6. Play Console: Privacy Policy URL (the app ships `/privacy` and `/terms`),
   Data Safety form (email, streak dates, journal text stored in Supabase,
   encrypted in transit), and declare the app is not medical advice.

## 10. Icons and splash

Replace the icons in `android/app/src/main/res/mipmap-*` (or run
`bunx @capacitor/assets generate --android`) with your 1024×1024 icon. Add a
white-on-transparent notification icon named `ic_stat_leaf` in
`res/drawable-*`; Android tints it with `#6BCB77`.

## 11. Testing checklist

- [ ] Fresh install, first launch, splash → questionnaire
- [ ] Notification permission **accepted**
- [ ] Notification permission **denied** (app still fully usable)
- [ ] Google login / Email login / Logout / Login again
- [ ] App restart keeps the session and streak
- [ ] Offline launch: Home, timer, Flags, Wins, Badges, Letters, SOS, Settings
- [ ] Online → offline (banner appears) and offline → online (queue syncs)
- [ ] FCM token appears in `push_tokens`; re-login updates instead of duplicating
- [ ] Logout marks the token `is_active = false`
- [ ] Multiple devices for the same account each get a row
- [ ] Local notification fires with airplane mode on
- [ ] Remote notification via the `send-push-notification` Edge Function
- [ ] Invalid/expired token is auto-deactivated by the Edge Function
- [ ] Notification categories toggled off in Settings stop scheduling
- [ ] System notification settings disabled → no crash
- [ ] Supabase unreachable → app still opens, queue retries
- [ ] Deleted account cleans local cache and signs out
- [ ] Signed AAB builds and installs
