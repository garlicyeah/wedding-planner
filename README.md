# Wedding Planner

A small web app on top of our Google Sheet. The sheet is the single source of truth. The app reads and writes it directly, so edits in either place show up in both.

- **Live app:** https://garlicyeah.github.io/wedding-planner/
- **Demo with sample data (nothing saved):** https://garlicyeah.github.io/wedding-planner/?demo

## What's in it
- **This week:** countdown with your photo, progress meters (tasks, money committed, guests), the tasks to focus on now, upcoming payments, and a workload-by-month chart.
- **Tasks:** every task with filters; tap one for details, owner, comments and Claude's note.
- **Vendors:** booking progress, your vendors (tap to edit), and **Quotes**: compare quotes side by side, shortlist, pass, or book.
- **Money:** committed / paid meters, budget by category, payments by month, the payment list (mark paid, add a calendar reminder), and the editable budget table.
- **Guests:** headcount vs. target, A/B-list by side, and the guest list (tap to edit).
- **Notes:** "Tell Claude", what Claude knows you've decided, wedding details, photo.

## How it fits together
- Plain HTML, CSS and JavaScript. No build step; GitHub Pages serves the files as-is.
- Sign-in uses Google Identity Services with a Google Cloud OAuth client (Testing mode, so only listed test users can sign in).
- `config.js` holds the OAuth client ID and the spreadsheet ID. Both are public identifiers, not secrets. The data is protected by Google sign-in and by sharing on the sheet.
- Sheet tabs the app uses: Overview, Timeline (columns I "Claude's take" and J "Task ID"), Budget, Guests, Vendors, Comments, Decisions, Quotes, Payments, and a hidden Settings tab (the couple photo is stored there, so it never goes into this public repo).

## Claude's notes and quotes
Claude writes the "Claude's take" column when asked: "refresh my wedding notes". Before writing, it reads the Decisions tab ("Got it" answers and "Tell Claude" instructions), so settled points don't come back.

Quote files go in the Wedding Quotes folder in Drive. "process my quotes" makes Claude read new files and fill in the Quotes tab (and Payments rows linked by Quote ID, which show up once a quote is booked).

## Run locally
```
python3 -m http.server 5173
```
Then open http://localhost:5173 (or http://localhost:5173/?demo).
