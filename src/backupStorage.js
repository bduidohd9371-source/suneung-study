import { exportPdfArchive, importPdfArchive } from './pdfStorage.js';

const FORMAT = 'suneung-study-backup';
const VERSION = 1;
const MAX_BACKUP_BYTES = 200 * 1024 * 1024;

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function downloadStudyBackup() {
  const browserData = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith('suneung-')) browserData[key] = localStorage.getItem(key);
  }
  const payload = {
    format: FORMAT,
    version: VERSION,
    createdAt: new Date().toISOString(),
    localStorage: browserData,
    pdfArchive: await exportPdfArchive(),
  };
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  saveBlob(blob, `수능루틴-백업-${new Date().toISOString().slice(0, 10)}.json`);
  return blob.size;
}

export async function restoreStudyBackup(file) {
  if (!file || file.size === 0) throw new Error('파일이 비어 있어요.');
  if (file.size > MAX_BACKUP_BYTES) throw new Error('백업 파일은 200MB 이하를 지원해요.');
  let payload;
  try { payload = JSON.parse(await file.text()); }
  catch { throw new Error('JSON 백업 파일을 읽지 못했어요.'); }
  if (payload?.format !== FORMAT || payload?.version !== VERSION || !payload.localStorage || typeof payload.localStorage !== 'object' || !payload.pdfArchive) {
    throw new Error('수능 루틴 백업 파일이 아니거나 형식이 오래됐어요.');
  }
  const entries = Object.entries(payload.localStorage);
  if (entries.some(([key, value]) => !key.startsWith('suneung-') || typeof value !== 'string')) throw new Error('백업에 지원하지 않는 데이터가 포함되어 있어요.');

  const previous = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith('suneung-')) previous.push([key, localStorage.getItem(key)]);
  }
  try {
    for (const [key] of previous) localStorage.removeItem(key);
    entries.forEach(([key, value]) => localStorage.setItem(key, value));
    await importPdfArchive(payload.pdfArchive);
  } catch (error) {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith('suneung-')) localStorage.removeItem(key);
    }
    try { previous.forEach(([key, value]) => localStorage.setItem(key, value)); } catch { /* report the original restore failure */ }
    throw error;
  }
  return { savedItems: entries.length, pdfs: payload.pdfArchive.exams.length };
}
