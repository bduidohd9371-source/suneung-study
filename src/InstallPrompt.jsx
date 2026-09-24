import { useEffect, useState } from 'react';
import { Download, ExternalLink, X } from 'lucide-react';

const DISMISSED_KEY = 'suneung-install-hint-dismissed';

function readDismissed() { try { return localStorage.getItem(DISMISSED_KEY) === '1'; } catch { return false; } }

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const beforeInstall = (event) => { event.preventDefault(); setInstallEvent(event); };
    const installedHandler = () => { setInstalled(true); setInstallEvent(null); };
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installedHandler);
    return () => { window.removeEventListener('beforeinstallprompt', beforeInstall); window.removeEventListener('appinstalled', installedHandler); };
  }, []);

  async function install() {
    if (!installEvent) { setHelpOpen((current) => !current); return; }
    installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice?.outcome === 'accepted') setInstalled(true);
    setInstallEvent(null);
  }

  function dismiss() { try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* dismiss for this session */ } setDismissed(true); }
  if (installed || dismissed) return null;

  return <aside className="install-prompt"><div className="install-prompt-icon"><Download size={17} /></div><div className="install-prompt-copy"><strong>앱처럼 편하게 공부하기</strong><span>홈 화면에 추가하면 전체 화면으로 열려요.</span>{helpOpen && <p>{/iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'Safari 공유 버튼을 누른 뒤 “홈 화면에 추가”를 선택해 주세요.' : '브라우저 메뉴(⋮)에서 “앱 설치” 또는 “홈 화면에 추가”를 선택해 주세요.'}</p>}</div><button className="install-prompt-action" onClick={install}>{installEvent ? '설치' : <><ExternalLink size={14} /> 방법 보기</>}</button><button className="install-prompt-dismiss" onClick={dismiss} aria-label="설치 안내 닫기"><X size={15} /></button></aside>;
}
