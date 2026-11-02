OFFSZN v8.46 — Athlete-first authentication foundation (development/testing)

1. Upload the app files to GitHub Pages.
2. In Supabase SQL Editor, run SUPABASE_SETUP.sql.
3. Authentication > Providers > Email: enable email sign-in and email confirmation.
4. Authentication > URL Configuration: Site URL https://jeremykrick-arch.github.io/jr-performance/
5. Add redirect URL https://jeremykrick-arch.github.io/jr-performance/**
6. In OFFSZN, Settings > Athlete account: register and verify email.
7. Settings > Cloud backup & data: manual upload/restore after sign-in.

NOT PRODUCTION READY: age is self-reported. Age 12 signup blocked pending verified guardian consent.
For 13–17, publish suitable privacy notices and obtain legal review before public signup.
Local training records are shared between accounts on the same browser profile. DO NOT switch
athletes in the same browser profile: data may mix. One athlete per device/browser profile only.
No automatic sync, guardian linking, or full per-user local storage isolation yet.
Existing JR data is retained. Exercise videos remain removed.
Never use service-role keys in frontend code.
