# Wedding Planner

A small web app on top of our Google Sheet. The sheet is the single source of truth. The app reads and writes it directly, so edits in either place show up in both.

- **Live app:** https://garlicyeah.github.io/wedding-planner/
- **Demo with sample data (nothing saved):** https://garlicyeah.github.io/wedding-planner/?demo

## What's in it
- **Home:** countdown, at-a-glance stats, and the task list (status, owner, due date, notes, comment threads) with Claude's notes and a "Got it" button.
- **Notes:** a "Tell Claude" box and everything Claude knows you've decided.
- **Vendors / Budget / Guests:** editable tables that write straight to the matching tabs.

## How it fits together
- Plain HTML, CSS and JavaScript. No build step; GitHub Pages serves the files as-is.
- Sign-in uses Google Identity Services with a Google Cloud OAuth client (Testing mode, so only listed test users can sign in).
- `config.js` holds the OAuth client ID and the spreadsheet ID. Both are public identifiers, not secrets. The data is protected by Google sign-in and by sharing on the sheet.
- Sheet tabs the app uses: Overview, Timeline (columns I "Claude's take" and J "Task ID"), Budget, Guests, Vendors, Comments, Decisions.

## Claude's notes
Claude writes the "Claude's take" column when asked: "refresh my wedding notes". Before writing, it reads the Decisions tab ("Got it" answers and "Tell Claude" instructions), so settled points don't come back.

## Run locally
```
python3 -m http.server 5173
```
Then open http://localhost:5173 (or http://localhost:5173/?demo).
