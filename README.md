JR Performance 8.18 - Mobile compatibility and Train navigation repair

Replace these files in the root of your GitHub repository:
- app.js
- index.html
- sw.js

The update provides a fallback for structuredClone on older iOS Safari versions and avoids Array.at(), which can also fail on older browsers. Cache version and script URLs are bumped.

Keep style.css, program.js, movement_catalog.js and videos/ unchanged. Do not uninstall the app or clear site data; workouts are stored in localStorage.

Testing: JavaScript syntax and offline simulated navigation tested; NOT tested on a physical iPhone.
