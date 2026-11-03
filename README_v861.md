# OFFSZN v8.61 — First workout beta feedback

Based on v8.60. Included: add sets to a movement; add movement from catalog to an individual workout; remove technique guide button from workout cards; consolidate swap/skip/remove/details into three-dot menu; copy first-set weight to remaining untouched sets; compact set-saved notice; 3-second audio countdown for rest; compact animated workout completion; seven new catalog movements.

Important: ISO mid-thigh pull, barbell split squat, thrusters, power clean, bear complex, wall balls and 10-yard sprint were added to catalog. Farmer carry, broad jump and sprint still use legacy reps/weight input fields; dedicated distance/time measurement UI is NOT yet implemented. Do not interpret reps as distances or times.

No admin dashboard is included. A safe administrator console requires server-side roles, audited access, and strict Supabase RLS; it must not expose all users through the public GitHub Pages client.

Data is saved using the existing v8.60 local/cloud sync model; live Supabase and iOS tests have not been performed. Test on a nonproduction account and export a backup first. No new SQL migration.
