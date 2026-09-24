import { useRef, useState } from 'react';
import { Download, FileUp } from 'lucide-react';
import { downloadStudyBackup, restoreStudyBackup } from './backupStorage.js';

export default function DataBackup() {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function exportData() {
    setBusy(true); setError(''); setMessage('백업 파일을 만드는 중…');
    try {
      const bytes = await downloadStudyBackup();
      setMessage(`백업을 다운로드했어요 · ${(bytes / (1024 * 1024)).toFixed(1)}MB`);
    } catch (issue) { setError(issue.message || '백업을 만들지 못했어요.'); setMessage(''); }
    finally { setBusy(false); }
  }

  async function importData(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!window.confirm('복원하면 이 브라우저에 저장된 수능 루틴의 단어·점수·계획·PDF가 백업 내용으로 바뀝니다. 먼저 현재 데이터를 백업했나요?')) return;
    setBusy(true); setError(''); setMessage('백업을 복원하는 중…');
    try {
      const result = await restoreStudyBackup(file);
      setMessage(`복원 완료 · 저장 기록 ${result.savedItems}개, PDF ${result.pdfs}개`);
      window.setTimeout(() => window.location.reload(), 700);
    } catch (issue) { setError(issue.message || '백업을 복원하지 못했어요.'); setMessage(''); }
    finally { setBusy(false); }
  }

  return <section className="data-backup-card"><div><span className="eyebrow">YOUR DATA</span><h2>기록 백업</h2><p>단어장, 점수, 일정과 계획, PDF와 필기를 파일 하나로 보관해요. 이 기기 안에서만 저장되므로 가끔 백업해 두세요.</p></div><div className="data-backup-actions"><button className="button button-secondary" onClick={exportData} disabled={busy}><Download size={15} /> 백업 파일 저장</button><label className={`button button-secondary ${busy ? 'disabled' : ''}`}><input ref={inputRef} type="file" accept="application/json,.json" disabled={busy} onChange={importData} /><FileUp size={15} /> 백업 복원</label></div>{message && <p className="data-backup-message" role="status">{message}</p>}{error && <p className="import-error" role="alert">{error}</p>}</section>;
}
