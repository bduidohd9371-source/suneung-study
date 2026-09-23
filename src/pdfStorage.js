const DATABASE = 'suneung-pdf-exams-v1';
const STORE = 'exams';
const MARKS = 'page-marks';

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
