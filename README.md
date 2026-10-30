# JR Performance 7.0 — Dark Experience

A dark-mode interface update inspired by modern workout tracking patterns. All existing exercise videos, 12-week workouts, athlete records, backups, and schedule remain available.

## Changes
- Redesigned athlete Home dashboard with a prominent Start Workout action, weekly date strip, session cards, and progress snapshots.
- Four-tab bottom navigation: Home, Train, Progress, Schedule.
- Movement Library and Profile remain available from Home and Train (and header avatar).
- Refreshed workout cards, previous-session display, video buttons, and consistent dark-mode styling.
- Existing localStorage key `jr-performance-v1` retained to preserve data on the same origin and browser.
- Original videos only; no RepDB assets.

## Installation
1. In the existing app, export a JSON backup (Profile → Data & Backups).
2. Unzip and upload **all contents** to the root of the existing GitHub Pages repository, including the `videos/` folder.
3. Remove obsolete RepDB files from the repository if present; this package does not include them.
4. Allow the updated service worker to activate; if the old UI persists, close and reopen the app or clear site cache (do not clear site data without a backup).

## Notes
Workout videos are original stylized anatomical illustrations, not photorealistic or biomechanically validated. The new interface does not alter stored training data or add AI recommendations. Tested via static syntax and package checks; iPhone/browser interactive testing remains necessary.
