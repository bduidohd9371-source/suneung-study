const DATABASE = 'suneung-pdf-exams-v1';
const STORE = 'exams';
const MARKS = 'page-marks';
const EXAM_DRAFT_PREFIX = 'suneung-pdf-exam-draft-v1:';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 2);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(MARKS)) database.createObjectStore(MARKS, { keyPath: ['examId', 'page'] });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(storeName, mode, action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

export const savePdfExam = (exam) => withStore(STORE, 'readwrite', (store) => store.put(exam));
export const getPdfExam = (id) => withStore(STORE, 'readonly', (store) => store.get(id));
export const deletePdfExam = async (id) => {
  await withStore(STORE, 'readwrite', (store) => store.delete(id));
  deletePdfExamDraft(id);
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(MARKS, 'readwrite');
    const store = transaction.objectStore(MARKS);
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (cursor.value.examId === id) cursor.delete();
      cursor.continue();
    };
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
};
export async function listPdfExams({ subjectId, kind = 'exam' } = {}) {
  const exams = await withStore(STORE, 'readonly', (store) => store.getAll());
  return exams.filter((exam) => (exam.kind || 'exam') === kind && (!subjectId || exam.subjectId === subjectId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export const getPageMarks = (examId, page) => withStore(MARKS, 'readonly', (store) => store.get([examId, page]));
export const savePageMarks = (examId, page, strokes) => withStore(MARKS, 'readwrite', (store) => store.put({ examId, page, strokes }));

export function getPdfExamDraft(examId) {
  try {
    const draft = JSON.parse(localStorage.getItem(`${EXAM_DRAFT_PREFIX}${examId}`) || 'null');
    return draft && typeof draft === 'object' ? draft : null;
  } catch { return null; }
}

export function savePdfExamDraft(examId, patch) {
  try {
    const key = `${EXAM_DRAFT_PREFIX}${examId}`;
    const previous = getPdfExamDraft(examId) || {};
    localStorage.setItem(key, JSON.stringify({ ...previous, ...patch, updatedAt: new Date().toISOString() }));
    return true;
  } catch { return false; }
}

export function deletePdfExamDraft(examId) {
  try { localStorage.removeItem(`${EXAM_DRAFT_PREFIX}${examId}`); return true; }
  catch { return false; }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error || new Error('PDF를 백업 파일로 읽지 못했어요.'));
    reader.readAsDataURL(blob);
  });
}

export async function exportPdfArchive() {
  const [exams, marks] = await Promise.all([
    withStore(STORE, 'readonly', (store) => store.getAll()),
    withStore(MARKS, 'readonly', (store) => store.getAll()),
  ]);
  const archivedExams = await Promise.all(exams.map(async (exam) => ({
    ...exam,
    blob: exam.blob ? { type: exam.blob.type || 'application/pdf', base64: await blobToBase64(exam.blob) } : null,
  })));
  return { exams: archivedExams, marks };
}

function fromBase64(value, type) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
}

export async function importPdfArchive(archive) {
  if (!archive || !Array.isArray(archive.exams) || !Array.isArray(archive.marks)) throw new Error('백업의 PDF 자료 형식이 올바르지 않아요.');
  const exams = archive.exams.map((exam) => {
    if (!exam || typeof exam.id !== 'string' || typeof exam.name !== 'string') throw new Error('백업에 올바르지 않은 자료가 있어요.');
    const blob = exam.blob && typeof exam.blob.base64 === 'string' ? fromBase64(exam.blob.base64, exam.blob.type || 'application/pdf') : null;
    return { ...exam, blob };
  });
  const database = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE, MARKS], 'readwrite');
      const examStore = transaction.objectStore(STORE);
      const marksStore = transaction.objectStore(MARKS);
      examStore.clear(); marksStore.clear();
      exams.forEach((exam) => examStore.put(exam));
      archive.marks.forEach((mark) => {
        if (typeof mark?.examId === 'string' && Number.isInteger(mark.page) && Array.isArray(mark.strokes)) marksStore.put(mark);
      });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('PDF 자료를 복원하지 못했어요.'));
      transaction.onabort = () => reject(transaction.error || new Error('PDF 자료 복원이 취소됐어요.'));
    });
  } finally { database.close(); }
}
