# Path

A mobile-first web app inspired by the original Path: share moments with a close circle. Timeline of moments (wake, eat, music, movie, thought, sleep, etc.) with a minimal, warm UI.

## Setup

```bash
cd path-app
npm install
npm run seed
npm start
```

- **Seed**: Creates 100 users and sample moments. All seeded users have password **`path123`**.
- **Logins**: `user1@path.local` … `user100@path.local` (or sign up with a new account).

## Run

Open **http://localhost:3000** in your browser. Use a mobile viewport or a real device for the best experience.

## Features

- **Modern login**: Sign in / Sign up with email and password (session-based).
- **Timeline**: Moments from you and your friends, ordered by time.
- **Moment types**: Wake up, Eat, Music, Movie, Thought, Sleep, Exercise, Travel, Photo, Book (with icons).
- **Add moment**: Tap + and pick a type + optional text.
- **100 pre-seeded users** with sample moments and friend links.

## Stack

- **Backend**: Node.js, Express, express-session, bcryptjs, SQLite (better-sqlite3).
- **Frontend**: Vanilla JS, mobile-first CSS, no build step.
