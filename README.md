# 수능 루틴 — Phase 1

Mobile-first Vite + React + Tailwind CSS starter with a persistent dark-mode toggle, subject selection, CSAT D-day clock, and subject-length practice timer.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

```powershell
npm install
npm run dev
```

## Production build

```powershell
npm run build
npm run preview
```

## Deploy to Vercel

Import the GitHub repository in Vercel. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`. No environment variables are needed for Phase 1.

## Timer configuration

Edit `src/csat.js` to change the target exam date or subject durations. The exam clock uses the published 2027 CSAT date (2026-11-19 KST). Durations follow the current CSAT structure: Korean 80m, Math 100m, English 70m, and each selected inquiry subject 30m.
