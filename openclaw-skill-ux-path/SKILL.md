---
name: ux_path_fam
description: Path (Fam) app UX testing — site URLs, test account, and flows to try.
---

# Path (Fam) UX testing

Use this when testing the Path / Fam app in the browser.

## Site and credentials

- **Production:** https://fam-production.up.railway.app/
- **Local:** http://localhost:3000 (when Path app is running on the Mac)

**Test account (use for automated testing):**
- Email: `user1@path.local`
- Password: `path123`

Use this account unless the user gives different credentials in the message.

## Flows to try

1. Open the site and sign in with the test account.
2. Scroll the timeline, open a contact card (tap a user avatar), tap avatar again for full-screen image, close back to contact card.
3. Add a moment (tap +, pick type, optional text).
4. Optionally: update profile (profile photo, cover, bio) if asked.

Note any bugs, freezes, confusing UX, or 429/errors. Prefer snapshot then act (click/type) using refs. Keep findings brief; write a short report to the workspace if useful.
