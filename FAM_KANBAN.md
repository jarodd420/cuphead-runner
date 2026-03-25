# Fam product kanban

Tasks from Slack feedback (#bots-channel) and Cursor. Cursor: read this file when asked to "work the kanban" or "what's next"; move items to In progress when starting, to Done when finished.

---

## Backlog / To do

- [ ] *(Add items below from Slack feedback or manually)*

- [ ] (from J · QA (Phil)) Remaining Mar 2026 QA: (3) Feed reactions — consider one “React” control with picker, stronger labels, list virtualization for long feeds. (4) Screen readers — hide inactive screens/modals with `aria-hidden` / `inert` or mount one screen at a time.

## In progress

- *(Nothing)*

## Won't do

- (from jared rodriguez) rebrand back to famapp — product is FamApp
- (from jared rodriguez) Select multiple photos from library at once for upload — dropped per product decision
- *(Nonsensical, spam, or off-topic — move here when working the list)*

## Done

- [x] (from J · QA (Phil), prioritized Mar 2026) Text-only flow: “New text moment” title, “What’s on your mind?” placeholder, FAB “New text moment”, media caption placeholder “Add a caption (optional)”. Your fams: loading state with explanation + `aria-busy`; empty state with copy + “Start a fam” CTA; error state with “Try again”. Sign-in / forgot / reset: frosted `login-card` on hero + stronger underlined auth links (#115e59).
- [x] (from jrod assistant / QA backlog) Auth: stable `id`, `data-testid`, `aria-label` on login/signup/forgot/reset; feedback success uses `showToast`; timeline `content-visibility` + video `preload="none"` for lighter feeds; feedback button closes menu + `aria-expanded`; OpenClaw UX doc §5 snapshot refs + skill note on testids
- [x] (from jared rodriguez) expanded video: custom play/pause (no native controls overlay), video not darker
- [x] (from jared rodriguez) plus sign goes straight to photo or video upload; "Post text only" link in overlay
- [x] (from jared rodriguez) image Share: guard against double-open when clicking off
- [x] (from jared rodriguez) add smiley 😊 and party popper 🎉 to reaction emojis
- [x] (from jared rodriguez) video fills screen (expanded video uses object-fit: cover, no distortion)
- [x] (from jared rodriguez) videos when expanded: Share button and close X in top-right (like image lightbox)
- [x] (from jared rodriguez) videos in the feed should behave exactly like they do in the bluesky social app (Bluesky-style: autoplay muted in view, pause when scrolled away; single click opens fullscreen-style player with close, 10s skip, time, native controls)
- [x] (from Meg) Posting a photo should be a plus icon on the bottom left of the main page and then user can pick to post a photo, video, or only text.
- [x] (from Meg) Remove all moment types except photo, video, and text (comment)
- [x] (from jared rodriguez / jrod assistant) Top right icon: full height of header bar, preserve aspect ratio
- [x] (from jared rodriguez) the download button seems to have stopped working
- [x] (from jared rodriguez) Redesign bottom-left: two FABs — 📷 photo/video (video max 60s), 💬 post message
- [x] (from jared rodriguez) Contact card: tap user avatar to open full picture in lightbox
- [x] (from jared rodriguez) Lightbox: smoother pinch/pan — no transition during touch, will-change for compositing (fix freeze and flash)
- [x] (from jared rodriguez) Undo increase in current user's icon in the feed
- [x] (from jared rodriguez) Lightbox: smooth out zoom/pan interaction (transition on transform)
- [x] (from jared rodriguez) Lightbox: recenter to original center when zooming back out
- [x] (from jared rodriguez) In the feed, tap own icon shows contact card (not profile editor)
- [x] (from jared rodriguez) Logged-in user's profile icon 50% bigger on home screen
- [x] (from jared rodriguez) Contact card: larger profile picture (120px), tap own icon opens profile editor
- [x] (from jared rodriguez) Lightbox: min zoom 1 (no zoom out past original), pan/drag when zoomed
- [x] (from jared rodriguez) In lightbox view, tap the picture again to close (same as cancel)
- [x] (from jared rodriguez) Remove moment type icon from the feed
- [x] (from Meg) Tap on own profile picture to edit it
- [x] (from Meg) Tap someone else's profile picture → contact card (avatar, cover, name, bio)
- [x] (from jared rodriguez) Pinch to zoom in/out when viewing a picture in the lightbox
- [x] (from Meg) Crop and center profile photo — center square crop before upload
- [x] (from Meg) Grey dot on profile picture — removed list-style/pseudo-elements; avatar uses object-fit cover
- [x] (from Meg) Crop and edit cover photo — center 3:1 crop before upload
- [x] (from Meg) Tap on photos to make bigger + clearer download — lightbox with Download button
- [x] (from Meg) New color besides red — primary accent now teal (#0d9488)
- [x] (from jared rodriguez) Show who's in my fams — profile icon + name in fams overlay
- [x] Password instructions before password field (min 8 chars, letter + number)
- [x] Profile/cover: choose from album (file input for phone)
- [x] Invite emails (Resend; domain required for non-test)
- [x] User feedback to Slack
- [x] Feedback form in app (Suggest an update)
- [x] Image display (cover) preference
- [x] (from OpenClaw) Cluttered navigation bar: streamlined — "Suggest an update" moved into Edit profile overlay; header menu now Edit profile + Sign out only
