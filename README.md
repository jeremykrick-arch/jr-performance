# JR Performance v5 — Wow Factor Stoppers

An offline-capable, mobile-first workout app for JR. Includes all 36 Monday/Thursday/Saturday workouts, 12-week training phases, set logging, conservative progression suggestions, pre-workout readiness, baseball schedule and workload logs, performance scorecard, achievements, parent overview, exercise library, rest timers, JSON backups and CSV exports.

## Install / update on GitHub Pages

1. **Export a JSON backup from the old app first.**
2. Extract this ZIP and upload all web files to the **root** of your existing `jr-performance` repository, replacing older files. `README.md` and `supabase_setup.sql` may also be uploaded; the SQL file contains no secrets.
3. Commit. Keep GitHub Pages configured to deploy from `main` / `(root)`.
4. After deployment, open `https://jeremykrick-arch.github.io/jr-performance/` in Safari. Refresh the page; if the older version persists, close/reopen the installed app or clear the site's cached data **only after exporting a backup**.
5. Safari Share → Add to Home Screen.

## Data preservation

This app continues using the same `localStorage` key (`jr-performance-v1`) and retains previous session and performance-test records. All new fields are additive. Data remains local to the browser and device unless cloud backup is explicitly configured. Clearing browser storage may erase records. Do not store private medical details in the public repository.

## Optional parent-managed Supabase cloud backup

**Cloud sync is not active until you set it up.** A parent must create and manage a Supabase project and login account. In Supabase's SQL editor, run `supabase_setup.sql` to enable a per-user, row-level-security-protected backup table. Enable Supabase email/password authentication, create/confirm a parent account, then in JR Performance → Profile → Data & cloud backup enter the project's HTTPS URL and **public anon/publishable key**, sign in, and upload a backup. On another device, sign in and **restore** before enabling auto-backup. Do not put service-role keys in the app. Cloud backups are a last-write-wins snapshot, **not real-time conflict-free multi-device sync**. Avoid using both devices simultaneously. For sensitive data, review Supabase privacy settings and child data policies before enabling.

## Features and safeguards

- Smart progression suggestions are **optional**, based on prior completed sets, technique and readiness; they never overwrite recorded weights.
- Recovery weeks 4, 8, 12 have reduced sets; pain flags suspend progression suggestions.
- Thursday workout is intentionally moderate before Dan Kennon's 7 PM hitting lesson.
- Workout modification and rest are legitimate; this is not medical advice or a replacement for coaching.
- Exercise videos open uncurated YouTube search results (requires internet).
- Parent overview is a **local view** of the same data, not separate secure parent login.
- Schedule edits are stored locally. Changing the recurring schedule does not change the program's Monday/Thursday/Saturday exercise allocation.

## Testing

Serve locally (`python -m http.server 8000`) and test on iPhone Safari after publishing. Service workers require HTTPS or localhost. Verify old backup restore, set logging, timers, calendar, charts, offline mode, and cloud login before relying on the app.
