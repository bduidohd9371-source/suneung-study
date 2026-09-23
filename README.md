# 수능 루틴 — Phase 1

Mobile-first Vite + React + Tailwind CSS study app with a persistent dark-mode toggle, CSAT timers, mock exam practice, touch-friendly answer marking, and instant grading.

Phase 3 adds required mistake-reason and insight notes for missed questions, an optional touch handwriting canvas, and local score/weak-subject analytics. Study records stay in this browser's local storage.

PDF exams show the original PDF without reordering or scraping its text. The OMR answer sheet supports 1–5 responses and grades them against a supplied answer key (for example `1:④ 2:②`, or answers in question order). Exam PDFs are stored in this browser's IndexedDB; scores and study notes stay in local storage. They are not synced between browsers or devices. Older text-imported questions remain in the local question bank and can be removed there.

After PDF grading, wrong answers can be tagged and annotated. Entering a concept keyword searches this device's existing mock/imported question bank for related practice. Since PDF text is intentionally not extracted, targeted AI feedback also asks the student to type the relevant question excerpt and reflection before sending it.

Phase 5 adds a local spaced-review queue. Wrong answers appear the following day; after recalling the answer, mark the item as still difficult, remembered, or easy to schedule its next review. Review intervals and notes stay on this browser and are not synced.

Each subject now has a flexible study space with problem-solving, concept-PDF reading/handwriting, and vocabulary modes. Vocabulary PDFs are parsed locally for English or Korean terms paired with Korean definitions; review and edit candidates before saving. Scanned PDFs and OCR are not supported. Vocabulary cards use local spaced repetition.

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
