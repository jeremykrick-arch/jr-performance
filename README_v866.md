# OFFSZN v8.66 — Persistent sign-in

- Remembers confirmed athlete and parent sign-in using Supabase access/refresh tokens in browser storage.
- Automatically refreshes sessions, restores them after reload, and reconnects athlete cloud synchronization.
- Sign Out clears stored session.
- Refresh failures due to lost internet retry; revoked/invalid refresh tokens require sign-in again.
- No SQL migration required.

Security note: browser localStorage persists tokens and is accessible to same-origin JavaScript. For production, apply strict CSP, audit XSS, and consider a more secure auth storage strategy. Shared devices should sign out when changing users.

Existing cloud sync may still prompt for cloud/local conflicts; this release does not resolve those conflicts automatically.
