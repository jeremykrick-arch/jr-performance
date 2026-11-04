# OFFSZN v8.67 — Sport-neutral movement foundation

Adds stable movement IDs, performance pillar metadata, measurement types, and 22 movements. The original workout generator remains active. Time/distance/duration workouts store their numeric result in the existing `reps` field with `measurement` metadata on completed sets for backward compatibility; future schema migration should introduce a dedicated `result` field. For distance use yards (including broad jump); for time and holds use seconds. Historical logs remain unchanged.

This release does not include a baseball generator or validated performance programming. Requires no new Supabase SQL; cloud sync uses existing workout payload. Confirm the existing Supabase migration has been applied.

Safety: athlete-entered metrics, supervised advanced lifts, no automatic loading recommendations for timed/distance movements. Test on actual iPhone before broad beta.
