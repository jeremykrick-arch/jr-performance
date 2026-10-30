# JR Performance v8.8 — Compact Workout Cards

## Install over v8.7
Replace **app.js**, **style.css**, and **sw.js** in the repository root. Keep the other files, including `videos/`, unchanged.

## Changes
- Compact movement header: name, sets/reps, suggested weight, progress.
- Tap movement title or chevron to expand/collapse; first incomplete movement opens by default.
- Completed movement collapses automatically after the last set.
- Expanded set table: set number, previous set, editable weight/reps, yellow completion checkmark.
- Demo, Swap, and More controls; More contains skip, remove, and details.
- Drag handle remains accessible in compact header.
- Coaching and progression details are hidden unless requested.
- No data migration or changes to existing localStorage key.

JavaScript syntax and ZIP integrity verified; physical iPhone interactions not tested.
