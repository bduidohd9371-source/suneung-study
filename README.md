# 수능 루틴 — Phase 1

Mobile-first Vite + React + Tailwind CSS study app with a persistent dark-mode toggle, CSAT timers, mock exam practice, touch-friendly answer marking, and instant grading.

Phase 3 adds required mistake-reason and insight notes for missed questions, an optional touch handwriting canvas, and local score/weak-subject analytics. Study records stay in this browser's local storage.

Phase 4 can import searchable text from a PDF in the browser, lets the student review each extracted question and set its answer key, then adds the approved questions to that subject's local practice bank. Scanned/image-only PDFs and OCR are not supported yet. Imported questions and notes stay in the current browser profile.

## Optional AI feedback

The feedback endpoint is off by default. It only makes an OpenAI API request when `ENABLE_AI_FEEDBACK=true`, `OPENAI_API_KEY`, and `OPENAI_MODEL` are configured on the Vercel server, and the student explicitly clicks **AI 피드백 받기**. The key must stay in Vercel environment variables; never put it in frontend code. API use is billed separately from a ChatGPT plan, so keep the feature disabled if you do not want API charges. Local Vite development does not run the Vercel API function.

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
