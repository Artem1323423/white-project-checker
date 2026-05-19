import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Bell, Minus, Square, X, User, LogOut } from 'lucide-react';

interface Notification {
  id: string;
  text: string;
  time: string;
  read: boolean;
}

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title }: TopbarProps) {
  const { currentUser, logout } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    // Load notifications from localStorage
    try {
      const stored = localStorage.getItem('checker-notifications');
      if (stored) setNotifications(JSON.parse(stored));
    } catch {}

    // Check for new notifications (admin role, updates)
    const checkNotifications = async () => {
      const newNotifs: Notification[] = [];
      const lastCheck = localStorage.getItem('checker-last-notif-check') || '0';
      const lastCheckTime = parseInt(lastCheck, 10);
      const now = Date.now();

      try {
        const data = await window.launcherApi.fetchAdmins();
        const admins = data.admins || [];

        // Check if current user was made admin
        if (currentUser && admins.includes(currentUser)) {
          const adminNotifKey = `notif-admin-${currentUser}`;
          if (!localStorage.getItem(adminNotifKey)) {
            newNotifs.push({
              id: `admin-${now}`,
              text: `Вам назначена роль Cheat Hunter`,
              time: new Date().toLocaleString('ru-RU'),
              read: false
            });
            localStorage.setItem(adminNotifKey, 'true');
          }
        }

        // Check if current user has a ban on reports
        if (currentUser && data.bans) {
          const banRaw = data.bans[currentUser];
          if (banRaw) {
            const banNotifKey = `notif-ban-${currentUser}-${banRaw}`;
            if (!localStorage.getItem(banNotifKey)) {
              let banText = '';
              try {
                const parsed = JSON.parse(banRaw);
                const by = parsed.by || 'Администратор';
                if (parsed.until === 'permanent') {
                  banText = `⛔ Репорты заблокированы навсегда администратором ${by}`;
                } else {
                  banText = `⛔ Репорты заблокированы администратором ${by} до ${new Date(parsed.until).toLocaleString('ru-RU')}`;
                }
              } catch {
                banText = '⛔ Репорты заблокированы администратором';
              }
              newNotifs.push({
                id: `ban-${now}`,
                text: banText,
                time: new Date().toLocaleString('ru-RU'),
                read: false
              });
              localStorage.setItem(banNotifKey, 'true');
            }
          } else {
            // No ban exists — check if user was previously banned (unban notification)
            const unbanNotifKey = `notif-unban-${currentUser}`;
            const wasBanned = localStorage.getItem(`notif-ban-${currentUser}-was-banned`);
            if (wasBanned && !localStorage.getItem(unbanNotifKey)) {
              newNotifs.push({
                id: `unban-${now}`,
                text: '✅ Репорты разблокированы. Вы снова можете создавать обращения.',
                time: new Date().toLocaleString('ru-RU'),
                read: false
              });
              localStorage.setItem(unbanNotifKey, 'true');
              localStorage.removeItem(`notif-ban-${currentUser}-was-banned`);
            }
          }
          // Track if user is currently banned (for unban detection)
          if (banRaw) {
            localStorage.setItem(`notif-ban-${currentUser}-was-banned`, 'true');
          }
        }
      } catch {}

      // Check for app updates notification
      const currentVersion = '1.0.8';
      const updateNotifKey = `notif-update-${currentVersion}`;
      if (!localStorage.getItem(updateNotifKey)) {
        newNotifs.push({
          id: `update-${currentVersion}`,
          text: `Обновление v${currentVersion} установлено`,
          time: new Date().toLocaleString('ru-RU'),
          read: false
        });
        localStorage.setItem(updateNotifKey, 'true');
      }

      if (newNotifs.length > 0) {
        setNotifications(prev => {
          const updated = [...newNotifs, ...prev].slice(0, 20);
          localStorage.setItem('checker-notifications', JSON.stringify(updated));
          return updated;
        });
      }

      localStorage.setItem('checker-last-notif-check', String(now));
    };

    checkNotifications();
  }, [currentUser]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem('checker-notifications', JSON.stringify(updated));
  };

  const togglePanel = () => {
    setShowPanel(!showPanel);
    if (!showPanel) markAllRead();
  };

  return (
    <header className="topbar-bg relative flex h-10 items-center justify-between border-b border-white/10 bg-[#060e1e] px-4 select-none" style={{ WebkitAppRegion: 'drag' } as any}>
      <div />
      <div className="absolute left-1/2 -translate-x-1/2">
        <span className="text-xs font-bold uppercase tracking-[0.3em] bg-gradient-to-r from-violet via-purple-400 to-indigo-400 bg-clip-text text-transparent">{title}</span>
      </div>
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {currentUser && (
          <div className="relative mr-2" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-1 hover:bg-white/10 transition"
            >
              <User className="h-3 w-3 text-violet" />
              <span className="text-[11px] font-medium text-white">{currentUser}</span>
              {(() => {
                let admins: string[] = [];
                try { const s = localStorage.getItem('checker-admins'); admins = s ? JSON.parse(s) : []; } catch {}
                if (admins.includes(currentUser)) {
                  return (
                    <span className="ml-1 rounded bg-gradient-to-r from-violet to-purple-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-lg shadow-violet/30 animate-pulse">
                      ADMIN
                    </span>
                  );
                }
                return null;
              })()}
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-8 z-50 w-40 rounded-xl border border-white/10 bg-[#0a0f1f] shadow-2xl overflow-hidden">
                <button
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-danger hover:bg-danger/10 transition"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Выйти из аккаунта
                </button>
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        <div className="relative" ref={panelRef}>
          <button onClick={togglePanel} className="relative rounded p-1.5 text-textSecondary transition hover:bg-white/10 hover:text-white">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-danger text-[8px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showPanel && (
            <div className="absolute right-0 top-8 z-50 w-72 rounded-xl border border-white/10 bg-[#0a0f1f] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <p className="text-xs font-semibold text-white">Уведомления</p>
                {notifications.length > 0 && (
                  <button onClick={markAllRead} className="text-[10px] text-violet hover:text-violet/80">
                    Прочитать все
                  </button>
                )}
              </div>
              <div className="max-h-[250px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-textSecondary">Нет уведомлений</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`border-b border-white/5 px-4 py-3 ${!n.read ? 'bg-violet/5' : ''}`}>
                      <p className="text-xs text-white">{n.text}</p>
                      <p className="mt-1 text-[10px] text-textSecondary">{n.time}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button onClick={() => window.checkerApi.windowMinimize()} className="rounded p-1.5 text-textSecondary transition hover:bg-white/10 hover:text-white">
          <Minus className="h-4 w-4" />
        </button>
        <button onClick={() => window.checkerApi.windowMaximize()} className="rounded p-1.5 text-textSecondary transition hover:bg-white/10 hover:text-white">
          <Square className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => window.checkerApi.windowClose()} className="rounded p-1.5 text-textSecondary transition hover:bg-white/10 hover:text-danger">
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
