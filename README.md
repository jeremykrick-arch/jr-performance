OFFSZN 8.47 — Date of birth registration update

Changes:
- Athlete registration now asks for date of birth instead of selecting age.
- Current age is calculated with month/day birthday handling and leap-year validation.
- Ages 13–18 can begin registration; age 12 is blocked until verified guardian consent exists.
- Birthdate is included in private Supabase Auth user metadata and synced to athlete_profiles.date_of_birth after successful sign-in.
- Existing OFFSZN program, local data and video-free build remain.

Deployment:
1. In Supabase SQL Editor, run SUPABASE_SETUP.sql (safe to rerun after v8.46).
2. Upload all app files to the existing GitHub Pages repository.
3. Verify email authentication and confirmation are enabled.
4. Test account registration, confirmation, sign-in, and profile sync with a TEST account.

LIMITATIONS: Not ready for public minor-facing launch. Age is self-reported; DOB is not identity verified.
12-year-olds need a verified guardian consent workflow. No parent account linking yet.
Local workout data is not isolated per account; DO NOT switch athletes on the same browser profile.
Cloud backups are manual, not automatic. A privacy notice, deletion process, legal review and
per-athlete data isolation are needed before public release.
