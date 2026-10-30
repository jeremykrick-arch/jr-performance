# JR Performance 7.4 — Responsive Design

Responsive update based on Version 7.3. Adapts the interface to compact phones (320px), standard phones, tablets, and desktop screens. Preserves the five-tab navigation, top-right Settings, original MP4 videos, and existing browser data schema.

## Deploy to GitHub Pages
1. Export a backup of JR’s data in the app before updating.
2. Extract the ZIP and upload its contents (not the outer folder) to the repository root.
3. Keep the `videos/` directory and filenames unchanged. If your repository already has the videos, you can upload just `index.html`, `style.css`, `sw.js` and leave the videos untouched.
4. Wait for Pages deployment, then fully close and reopen the installed app.

Responsive rules are appended at the end of `style.css`; the app’s data format and training logic are unchanged. Test on your own iPhone; automated browser and JavaScript checks cannot guarantee every device behaves identically.
