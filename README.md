# Guess the Frame

A multiplayer movie-frame trivia experience built with Next.js. Hosts spin up private rooms, collect stills, and challenge friends in real time while guests join from any device with a six-digit code.

## Highlights

- 🔐 **Host sessions** – Room creators receive an HTTP-only session cookie that unlocks match controls and frame management.
- ⚡ **Live lobby updates** – Server-sent events keep every client in sync as players join, statuses change, and frames are queued.
- 🗂️ **Persistent storage** – Prisma with SQLite stores rooms, players, and curated frames so matches survive restarts.
- 🎛️ **Custom game pacing** – Hosts pick difficulty and party length; timers and frame quotas auto-adjust to keep rounds tight.
- 🎨 **Tailored UI** – DaisyUI + Tailwind power a responsive lobby and landing page tuned for quick onboarding.

## Tech Stack

| Layer        | Details                                   |
| ------------ | ------------------------------------------ |
| Framework    | Next.js 15 (App Router, React 19)          |
| Styling      | Tailwind CSS 3 + DaisyUI                   |
| Database     | SQLite (via Prisma ORM)                    |
| Realtime     | Server-Sent Events (SSE)                   |
| Language     | TypeScript                                 |

## Prerequisites

- Node.js 18.18 or newer (recommended: the latest LTS release)
- npm 9+ (installed with modern Node versions)

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure the database**
   Create a `.env` file (if you do not already have one) and add:
   ```env
   DATABASE_URL="file:./prisma/dev.db"
   ```

3. **Sync the Prisma schema**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000) to use the app.

## Development Notes

- **Linting**: `npm run lint`
- **Database resets**: remove `prisma/dev.db` (and rerun `prisma db push`) if you need a clean slate.
- **Host controls**: the first browser to create a room receives a `gtf_host_session` cookie. Only that session can change match status or add frames until you clear cookies or create a new host session.
- **Realtime**: SSE endpoints live under `/api/rooms/[code]/events`; keep this in mind if you proxy requests.
- **Party mechanics**: Hosts capture a URL and answer for each frame, then a 5-second warm-up kicks off timed rounds that auto-advance via `/api/rooms/[code]/advance` and score guesses through `/api/rooms/[code]/guess`.

## Deployment Checklist

- Swap the SQLite connection string for your production database (e.g., Postgres) and run `prisma migrate deploy`.
- Ensure environment variables (like `DATABASE_URL`) are configured in your hosting platform.
- Use `npm run build` followed by `npm start` (or your platform’s equivalent) to serve the production bundle.

Happy hosting!
