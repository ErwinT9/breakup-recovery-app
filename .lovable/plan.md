# Hamburger menu, Activity tab, and questionnaire → Home fix

## 1. Fix "Start" bouncing back to question 1

Confirmed cause: on finishing the questionnaire the profile is saved through the offline cache and queued for upload, then all queries are invalidated. Home re-reads the profile straight from the server, the queued write hasn't landed yet, so it still sees "questionnaire not completed" and sends the user back to the questionnaire, which remounts at step 1.

Fix:
- After saving, write the completed profile directly into the query cache instead of blanket-invalidating, so Home reads the true value immediately.
- Make Home's redirect defensive: only bounce to the questionnaire when the profile has actually loaded and no saved questionnaire answers exist, and never while a completion is in flight.
- Result: finishing the last question and pressing Start lands on Home/dashboard every time, online or offline.

## 2. Hamburger menu top-left

- Add a hamburger button to the left of the title in the app header (all tabbed screens).
- It opens the existing left drawer with everything that lives in the three-dot menu today: profile header, Settings, Reset No Contact Date, Invite Friends, Privacy Policy, Terms, About.
- The three-dot bottom tab is removed.

## 3. New Activity tab (5th tab)

Replaces the three-dot slot: icon + label "Activity", route `/activity`.

**Activity Overview** — a row of circular icon counters showing today's totals:
My Pictures · Journal Entries · Triggers logged · Rituals logged · Affirmations logged

**Quick Actions** — tappable cards, each opening its own screen/sheet, with a green check when done today:
- Make Today's Promise — one-tap daily "I promise to maintain No Contact today"
- Today's Picture — take/pick a photo of what inspires you (camera on Android, file picker on web)
- My Affirmations — write a statement of your strength
- No Contact Ritual — log your own ceremony
- My Triggers — list what makes you think of them
- Daily Journal — log thoughts & feelings

No "238 members did this today" social counts, per your choice — cards show only your own state.

Styling follows the app's existing calm light theme (soft cards, pastel icon chips, accent green checks), not the purple reference.

## Technical notes

- Database migration adding six user-scoped tables (`promises`, `pictures`, `affirmations`, `rituals`, `triggers`, `journal_entries`) with grants, RLS scoped to `auth.uid()`, and `updated_at` triggers; plus a public storage-backed bucket for activity photos with owner-only policies.
- Repository additions for each activity following the existing offline-first read-through / write-through + sync-queue pattern, so activities work offline and upload on reconnect.
- New routes under `src/routes/_authenticated/`: `activity.tsx` plus detail screens for picture, affirmations, ritual, triggers and journal.
- `AppShell` gains a header hamburger that controls `MoreDrawer`; `TABS` gets Activity and drops the three-dot button.
