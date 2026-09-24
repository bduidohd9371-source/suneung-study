import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
const CIRCLED = ['①', '②', '③', '④', '⑤'];

export function parseAnswerKey(text, total) {
  const normalized = String(text || '').replace(/[０-９]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0xfee0));
  const explicit = [...normalized.matchAll(/(?:^|[^\d])(\d{1,3})\s*(?:번|[:.)．·\-]|\s)\s*([1-5①②③④⑤])(?=$|[^\d])/gm)];
  if (explicit.length) {
    const answers = {};
    for (const [, numberText, mark] of explicit) {
      const number = Number(numberText);
      if (number >= 1 && number <= total) answers[number] = CIRCLED.includes(mark) ? CIRCLED.indexOf(mark) + 1 : Number(mark);
    }
    if (Array.from({ length: total }, (_, index) => answers[index + 1]).every(Boolean)) return answers;
  }

  const circled = [...normalized.matchAll(/[①②③④⑤]/g)].map(([mark]) => CIRCLED.indexOf(mark) + 1);
  if (circled.length === total) return Object.fromEntries(circled.map((answer, index) => [index + 1, answer]));

  const compact = normalized.trim();
  if (/^[1-5\s,;|/\-]+$/.test(compact)) {
    const values = compact.match(/[1-5]/g)?.map(Number) || [];
    if (values.length === total) return Object.fromEntries(values.map((answer, index) => [index + 1, answer]));
  }

  const lines = normalized.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = 0; index < lines.length - 1; index += 1) {
    const numbers = lines[index].match(/\d+/g)?.map(Number) || [];
    const values = lines[index + 1].match(/[1-5]/g)?.map(Number) || [];
    if (numbers.length === total && values.length === total && numbers.every((number, i) => number === i + 1)) {
      return Object.fromEntries(values.map((answer, i) => [i + 1, answer]));
    }
  }
  return null;
}

function getOrderedText(items) {
  const rows = new Map();
  for (const item of items) {
    if (!item.str?.trim()) continue;
    const y = Math.round((item.transform?.[5] || 0) / 2) * 2;
    const row = rows.get(y) || [];
    row.push({ x: item.transform?.[4] || 0, text: item.str.trim() });
    rows.set(y, row);
  }
  return [...rows.entries()].sort((a, b) => b[0] - a[0]).map(([, row]) => row.sort((a, b) => a.x - b.x).map((item) => item.text).join(' ')).join('\n');
}

export async function extractAnswerKey(file, total, onProgress = () => {}) {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
  let documentPdf;
  try {
    documentPdf = await loadingTask.promise;
    const pageTexts = [];
    for (let pageNumber = 1; pageNumber <= documentPdf.numPages; pageNumber += 1) {
      const page = await documentPdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pageTexts.push(getOrderedText(content.items));
      page.cleanup();
      onProgress({ stage: 'text', current: pageNumber, total: documentPdf.numPages });
    }
    const text = pageTexts.join('\n');
    const parsed = parseAnswerKey(text, total);
    if (parsed) return { answers: parsed, method: 'PDF 텍스트', pages: documentPdf.numPages };

    const pagesToOcr = Math.min(documentPdf.numPages, 8);
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1, { logger: (progress) => onProgress({ stage: 'ocr', progress: progress.progress || 0, total: pagesToOcr }) });
    try {
      await worker.setParameters({ tessedit_char_whitelist: '0123456789', preserve_interword_spaces: '1' });
      const ocrPages = [];
      for (let pageNumber = 1; pageNumber <= pagesToOcr; pageNumber += 1) {
        const page = await documentPdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2.5 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d', { alpha: false });
        await page.render({ canvasContext: context, viewport }).promise;
        const { data } = await worker.recognize(canvas);
        ocrPages.push(data.text || '');
        canvas.width = 0; canvas.height = 0;
        page.cleanup();
        onProgress({ stage: 'ocr-page', current: pageNumber, total: pagesToOcr });
      }
      const ocrText = ocrPages.join('\n');
      const ocrAnswers = parseAnswerKey(ocrText, total);
      if (ocrAnswers) return { answers: ocrAnswers, method: '스캔 PDF OCR', pages: pagesToOcr };
      return { answers: null, method: '수동 확인 필요', pages: pagesToOcr, detected: (ocrText.match(/[1-5]/g) || []).length };
    } finally { await worker.terminate(); }
  } finally { await loadingTask.destroy(); }
}
