# OFFSZN v8.63 — Easy Parent Linking

## Required one-time database repair
In Supabase SQL Editor, run `SUPABASE_FAMILY_LINKING_FIX_v863.sql` after the original v8.57 family linking migration. It corrects the restricted-search-path calls to `pgcrypto` functions. No data is deleted.

## Easier flow
1. Athlete signs in → Settings → Parent & Athlete Linking → Create parent invite link → Share link or Copy link.
2. Parent opens the link, signs in or registers, and requests the link. The code is filled automatically.
3. Athlete signs in → Parent & Athlete Linking → Approve.

The link is a bearer token: share privately. It expires after 24 hours and can only be used once. This is **not** verified parental consent. The 8-character token has limited entropy; rate limiting and a longer token are recommended before public launch.

## Deployment
Upload all files to GitHub Pages. Run the SQL repair. Clear/reload the PWA if old cached scripts persist. No live database test has been performed.
