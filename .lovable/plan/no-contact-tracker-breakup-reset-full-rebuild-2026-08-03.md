# No Contact Tracker: Breakup Reset — full rebuild

A complete refactor of the existing app into a calm, light-themed, offline-first Android app centred entirely on No Contact.

## 1. Cleanup
Remove Journal, Insights, Mood analytics, Habit challenges, and every component, type, repository and route that only served them. Drop unused dependencies after the sweep.

Kept: Supabase auth + RLS, the Capacitor layer, the offline sync queue, and the RevenueCat paywall with premium gating.

## 2. Design system (light, Material 3)
Rewrite the theme tokens to the supplied palette — white background, #FAFAFA secondary, #F8F9FC cards, pastel accents (green #DDF8E8, blue #EAF6FF, lavender #F3EDFF, coral #FFEAEA), accent green #6BCB77, text #222222 / #777777, error #FF6B6B. Rounded cards, soft shadows, generous whitespace, spring transitions and micro-interactions with haptics. No dark mode, no glassmorphism.

## 3. Database (Supabase migration)
The database is currently empty, so one migration creates everything:
- profiles — display name, bio, avatar, recovery start date, notification prefs, onboarding complete, premium flag
- questionnaire_answers — one row per user holding all 12 answers
- streaks — start date, best streak, relapse count
- flags — title, category, note
- wins — title, note, date
- badges — badge key, unlocked date
- letters — title, body, emotion, draft flag

All with row-level security scoped to the signed-in user, grants, timestamps and update triggers.

## 4. Splash + Auth
Splash: broken heart separates then morphs into a growing leaf, with app name and tagline. Auth: Google, email sign-up/sign-in, email verification, forgot/reset password, persistent sessions. The auth screen moves to client-only rendering, which also clears the current hydration warning.

## 5. Questionnaire (12 steps)
Progress bar, illustration, large rounded choice buttons, back/next, smooth page transitions. Answers autosave locally after every step and sync to Supabase when online. Includes the date picker for last contact, the 1–10 difficulty slider with emoji feedback, and a notification-permission request when daily reminders are accepted. The dashboard stays locked until the questionnaire is complete.

## 6. Dashboard + 5 tabs
Home: live days/hours/minutes/seconds no-contact timer, current milestone, longest streak, rotating motivational quote, daily encouragement, quick cards to Flags/Wins/Badges/Letters, and the emergency SOS entry.

Bottom navigation: Home, Flags, Wins, Badges, Profile. Unsent Letters is a full route reachable from Home and Profile.
- Flags — create, edit, delete, search, categories, offline
- Wins — timeline plus calendar view, offline
- Badges — auto-unlock on streak milestones and achievements, confetti and haptics on unlock
- Letters — write, draft, edit, delete, search, emotion tag, timestamps
- Profile — avatar via camera, name, bio, recovery start date, notification settings, sync status, legal pages, feedback, logout, delete account

## 7. Emergency SOS
Floating button on every signed-in screen. Toolkit: 60-second breathing animation, 5-4-3-2-1 grounding, read my Flags / Wins / Letters, quotes, affirmations, urge timer, and the "don't text your ex" reminder. Fully offline.

## 8. Offline-first
Every write lands in local storage first through the repository layer, then enters the sync queue, which drains automatically on reconnect with retries and conflict-safe upserts. Reads are cache-first with background refresh. Timer, badges and SOS work with zero network.

## 9. Notifications
Local notifications for morning and evening reminders, milestone celebrations and missed check-in nudges; Firebase push wiring with the device token stored on the profile. Fully toggleable in Profile.

## 10. Capacitor / Android
A complete capacitor.config.ts (app id, name, splash, status bar, deep links, plugin config) plus an ANDROID.md covering `npx cap add android`, google-services.json placement for Firebase messaging, manifest permissions (notifications, camera, storage, internet), deep-link intent filters, adaptive icon and splash asset generation, and release signing. The native android/ folder itself must be generated on your machine — it cannot be built here.

## Technical notes
- Stack stays TanStack Start + Supabase; server access via createServerFn or the browser client under RLS. No service keys client-side.
- Routes: `/` splash, `/auth`, `/reset-password`, `/questionnaire`, `/_authenticated/{home,flags,wins,badges,profile,letters}`, `/paywall`, `/privacy`, `/terms`.
- Repository pattern retained, with new repositories for flags, wins, badges, letters and questionnaire answers.
- Zod validation on every form; lazy-loaded heavy routes; memoised lists for smooth scrolling.