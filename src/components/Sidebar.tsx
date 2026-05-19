import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import {
  Home, ShieldCheck, Monitor, Globe, Wrench,
  Gamepad2, Usb, Clock, Target, Cpu, Shield, ClipboardList, MessageSquare, X
} from 'lucide-react';

const navItems = [
  { path: '/', labelKey: 'dashboard', icon: Home },
  { path: '/scanner', labelKey: 'scanner', icon: ShieldCheck },
  { path: '/system-information', labelKey: 'systemInfo', icon: Monitor },
  { path: '/browser-history', labelKey: 'browserHistory', icon: Globe },
  { path: '/utilities', labelKey: 'utilities', icon: Wrench },
  { path: '/steam', labelKey: 'steamEpic', icon: Gamepad2 },
  { path: '/usb-history', labelKey: 'usbHistory', icon: Usb },
  { path: '/program-analysis', labelKey: 'programAnalysis', icon: Clock },
  { path: '/auto-check', labelKey: 'autoCheck', icon: Target },
  { path: '/check-history', labelKey: 'checkHistory', icon: ClipboardList },
  { path: '/reports', labelKey: 'reports', icon: MessageSquare },
  { path: '/settings', labelKey: 'settings', icon: Cpu },
];

export function Sidebar() {
  const location = useLocation();
  const { t } = useTranslation();
  const { currentUser } = useAppStore();
  const [admins, setAdmins] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('checker-admins');
      const list = stored ? JSON.parse(stored) : ['never'];
      if (!list.includes('never')) list.push('never');
      return list;
    } catch { return ['never']; }
  });

  useEffect(() => {
    // Refresh admins from server
    window.launcherApi?.fetchAdmins?.().then((data) => {
      if (data?.admins) {
        const names = data.admins.map((a: any) => typeof a === 'string' ? a : a.name);
        if (!names.includes('never')) names.push('never');
        setAdmins(names);
        localStorage.setItem('checker-admins', JSON.stringify(names));
      }
    }).catch(() => {});
  }, []);

  const isAdmin = currentUser ? admins.includes(currentUser) : false;

  const [openReportsCount, setOpenReportsCount] = useState(0);
  const [showCheckerInfo, setShowCheckerInfo] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    window.launcherApi?.fetchReports?.().then((reports: any[]) => {
      const open = (reports || []).filter((r: any) => r.status === 'open' || (r.status === 'claimed' && r.claimedBy === currentUser));
      setOpenReportsCount(open.length);
    }).catch(() => {});
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      window.launcherApi?.fetchReports?.().then((reports: any[]) => {
        const open = (reports || []).filter((r: any) => r.status === 'open' || (r.status === 'claimed' && r.claimedBy === currentUser));
        setOpenReportsCount(open.length);
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, currentUser]);

  const visibleItems = navItems;

  const openLink = (url: string) => {
    window.checkerApi.openExternal(url);
  };

  return (
    <aside className="flex w-[200px] flex-col border-r border-white/10 bg-card">
      {/* Logo */}
      <div className="flex flex-col items-center px-4 py-6">
        <p className="text-xs uppercase tracking-[0.35em] font-extrabold bg-gradient-to-r from-purple-300 via-violet to-purple-300 bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]">
          WHITE PROJECT
        </p>
        <div className="mt-3 flex h-[76px] w-[76px] items-center justify-center rounded-full border-2 border-violet/60 bg-violet/10 overflow-hidden shadow-lg shadow-violet/20">
          <img src="logo.png" alt="White Project" className="h-12 w-12 object-contain" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {visibleItems.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all ${
                active
                  ? 'border border-violet/40 bg-violet/10 text-violet font-medium'
                  : 'text-textSecondary hover:bg-white/5 hover:text-white'
              }`}
            >
              {active && <div className="absolute left-0 h-5 w-[3px] rounded-r bg-violet" />}
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t(item.labelKey)}</span>
              {item.path === '/reports' && isAdmin && openReportsCount > 0 && (
                <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger/20 px-1 text-[10px] font-bold text-danger">
                  {openReportsCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom links */}
      <div className="space-y-2 px-3 pb-4">
        {isAdmin && (
          <Link
            to="/admin"
            className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
              location.pathname === '/admin'
                ? 'border-violet/50 bg-violet/10 text-violet'
                : 'border-violet/30 bg-violet/5 text-violet hover:bg-violet/10'
            }`}
          >
            <Shield className="h-4 w-4" />
            {t('admin')}
          </Link>
        )}
        <button onClick={() => openLink('https://discord.gg/whitedm')} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#4752C4] hover:shadow-lg hover:shadow-[#5865F2]/30 active:scale-95">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.33.26.04.03.04.09-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.02.03.05.03.07.02 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z"/></svg>
          Discord
        </button>
        <button onClick={() => setShowCheckerInfo(true)} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-violet/20 bg-gradient-to-r from-violet/10 to-purple-500/10 px-3 py-2 text-[10px] font-medium text-violet/80 hover:text-violet hover:border-violet/40 hover:from-violet/20 hover:to-purple-500/20 transition">
          🛡️ Хочешь свой чекер?
        </button>
      </div>

      {/* Checker info modal */}
      {showCheckerInfo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCheckerInfo(false)} />
          <div className="relative w-full max-w-lg rounded-[24px] border border-white/10 bg-[#0a0f1f] p-8 shadow-2xl">
            <button onClick={() => setShowCheckerInfo(false)} className="absolute right-4 top-4 text-textSecondary hover:text-white">
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-6">Информация о чит-чекере</h2>

            {/* Game selection tabs */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-center transition hover:bg-emerald-500/20 hover:scale-[1.02]">
                <p className="text-2xl font-black italic text-emerald-400 mb-1 tracking-tight">GTA V</p>
                <p className="text-[10px] text-textSecondary">Чекер для GTA V</p>
              </button>
              <button className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-4 text-center transition hover:bg-orange-500/20 hover:scale-[1.02]">
                <p className="text-2xl font-black text-orange-400 mb-1 tracking-tight">CS2</p>
                <p className="text-[10px] text-textSecondary">Чекер для CS2</p>
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-violet/20 bg-violet/5 p-4">
                <p className="text-sm font-semibold text-violet mb-1">🛡️ White Project Checker</p>
                <p className="text-xs text-textSecondary">Полноценная система проверки игроков на читы. Сканер файлов, проверка браузера, анализ программ, автопроверка GTA V/CS2, система репортов и многое другое.</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white mb-1">⚡ Что входит</p>
                <ul className="text-xs text-textSecondary space-y-1">
                  <li>• Кастомизация под ваш проект</li>
                  <li>• Изменение названия приложения под ваш проект</li>
                  <li>• Система ролей и админ-панель</li>
                  <li>• Автообновления через GitHub</li>
                  <li>• Система репортов с уведомлениями</li>
                  <li>• Полная настройка дизайна</li>
                </ul>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-sm font-semibold text-emerald-400 mb-2">📩 Связаться</p>
                <div className="space-y-2">
                  <button
                    onClick={() => openLink('https://t.me/OOO_danil_kolbasenko')}
                    className="flex w-full items-center gap-3 rounded-lg border border-[#26A5E4]/30 bg-[#26A5E4]/10 px-4 py-2.5 text-xs text-[#26A5E4] hover:bg-[#26A5E4]/20 transition"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                    Telegram — @OOO_danil_kolbasenko
                  </button>
                  <button
                    onClick={() => openLink('https://discord.com/users/neverlosees')}
                    className="flex w-full items-center gap-3 rounded-lg border border-[#5865F2]/30 bg-[#5865F2]/10 px-4 py-2.5 text-xs text-[#5865F2] hover:bg-[#5865F2]/20 transition"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.33.26.04.03.04.09-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.02.03.05.03.07.02 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z"/></svg>
                    Discord — neverlosees
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
