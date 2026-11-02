OFFSZN v8.57 — Parent Accounts & Athlete Linking (initial implementation)

WHAT'S INCLUDED
- Parent signup, login, password reset through Supabase Auth.
- Athlete-generated one-time invitation code, 24-hour expiration.
- Parent request to link using athlete code; athlete approval/decline.
- Linked account listing and unlink control.
- Supports multiple linked athletes per parent.
- Preserves classic navigation and existing app pages.

INSTALL
1. Upload extracted website files to your GitHub Pages repository.
2. In Supabase SQL Editor, run SUPABASE_SETUP.sql if not already done.
3. Run SUPABASE_FAMILY_LINKING_v857.sql (new migration).
4. Ensure Supabase Auth email confirmation and Site URL/redirect URLs are configured.
5. Test with separate parent and athlete accounts on separate browsers/devices.

IMPORTANT LIMITATIONS
- This is account linking, NOT verified parental consent. Age-12 signup stays blocked.
- No parent access to workout data yet. The existing Parent Overview remains a
  same-device local view, not a remote parent dashboard.
- Existing browser training data is NOT isolated by account; do not switch
  athlete logins in one browser profile.
- Login sessions are not persisted on refresh. Manual cloud backup only.
- Public launch needs security review, anti-abuse/rate limiting, role verification,
  privacy controls, audit logs, account deletion, and youth privacy compliance.
- SQL migration and live Supabase end-to-end testing have not been performed here.
