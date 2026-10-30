JR Performance v7.2 — Settings & Interface Update

New: persistent settings gear in upper-right; dedicated settings landing page; athlete photo/profile shortcut; workout preferences, measurements, parent overview, and backup/data options organized under settings; five main tabs retained.

Installation: export a backup in the current app first, then upload the CONTENTS of this ZIP to the root of your GitHub Pages repository, retaining the videos/ directory. Refresh the installed PWA if necessary. Local browser data key remains unchanged.

Existing exercise videos and training data structures are unchanged.

# JR Performance 7.1 — Movements + Interface Refinement

This is a complete replacement package for GitHub Pages. Extract the ZIP and upload the **contents**, preserving the `videos/` folder and existing filenames.

## Changes
- Restored **Movements** as a permanent fifth bottom-navigation tab.
- Redesigned Movement Library with large dark cards, prominent play actions, searchable exercise list, category chips, and movement counts.
- Fixed search-field focus loss when typing by updating results without rebuilding the search input.
- Refined five-tab mobile layout and iPhone safe-area spacing.
- Updated service-worker cache version.
- Kept original videos, workout logging, progress, schedule, profile, and existing `jr-performance-v1` localStorage data schema.

## Important
Export a data backup before deploying. Replace all previous app files and keep the `videos` directory intact. Hard-refresh or reopen the installed app after GitHub Pages finishes deploying.

The exercise videos remain stylized illustrative renders, not photorealistic 3D.
