# OFFSZN v8.60 — Athlete onboarding and blueprint activation

Deploy the entire folder to GitHub Pages. Run prior Supabase migrations through v8.59. No new SQL migration is required: profile and activeBlueprint are stored in the existing athlete snapshot.

Athletes: sign in, connect cloud sync, then go to Settings > Athlete Setup. Complete onboarding to save the athlete profile and activate a personalized **blueprint**. Review in Settings > Program Builder.

IMPORTANT: This release does not replace the original 12-week exercise tracker with dynamically generated sessions. The blueprint is a saved training plan preview; the original workout engine still runs below it. No verified parental consent is implemented, so under-13 onboarding is blocked. Cloud sync is opt-in, requires the v8.59 migration and signed-in session, and is not persisted automatically across reloads. Do not test with real athlete data until backend access policies are verified.

Testing: static syntax checks only, not live Supabase/browser testing.
