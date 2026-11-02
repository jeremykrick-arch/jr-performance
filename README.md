# OFFSZN v8.59 — Athlete cloud synchronization (beta)

Deploy all website files to GitHub Pages. In Supabase SQL Editor run SUPABASE_SETUP.sql, SUPABASE_FAMILY_LINKING_v857.sql, then **SUPABASE_CLOUD_SYNC_v859.sql**.

Athletes must sign in and opt into uploading local data. A per-account local cache supports offline changes. The app debounces uploads and uses revision checks to prevent silent overwrite. On conflict it stops automatic uploading and requires reconnection; export local JSON first to preserve unsynced changes. Parent accounts do not yet have read-only access to workout data.

Important: authentication sessions are not persisted across page reloads; sign in again to reconnect. This beta is not validated for public release or for verified parental consent. Cloud snapshots are capped at 2MB. Automated integration testing against live Supabase has not been performed.
