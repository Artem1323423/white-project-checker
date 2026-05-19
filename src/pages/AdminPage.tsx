import { useState, useEffect, useRef } from 'react';
import { Shield, Send, UserPlus, CheckCircle, XCircle, Users, UserCheck, Trash2, Edit3, Eye, EyeOff, Key, ChevronDown } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';

const ALL_ROLES = ['Owner', 'Команда проекта', 'Главный Администратор', 'Заместитель Главного Администратора', 'Chief Cheat Hunter', 'Cheat Hunter'];
const CAN_MANAGE_ADMINS = ['Owner', 'Команда проекта', 'Главный Администратор', 'Заместитель Главного Администратора', 'Chief Cheat Hunter'];

const ROLE_COLORS: Record<string, string> = {
  'Owner': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Команда проекта': 'bg-red-500/20 text-red-400 border-red-500/30',
  'Главный Администратор': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Заместитель Главного Администратора': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Chief Cheat Hunter': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Cheat Hunter': 'bg-violet/20 text-violet border-violet/30',
};

// Custom Dropdown component
function RoleDropdown({ value, onChange, options, disabled }: { value: string; onChange: (v: string) => void; options: string[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-textPrimary outline-none hover:border-violet/40 transition disabled:opacity-50 ${open ? 'border-violet/50' : ''}`}
      >
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${ROLE_COLORS[value] || ROLE_COLORS['Cheat Hunter']}`}>{value}</span>
        <ChevronDown className={`h-3 w-3 text-textSecondary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-64 rounded-xl border border-white/10 bg-[#0d1b2a] shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {options.map((role) => (
            <button
              key={role}
              onClick={() => { onChange(role); setOpen(false); }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs transition hover:bg-white/5 ${value === role ? 'bg-violet/10' : ''}`}
            >
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${ROLE_COLORS[role] || ROLE_COLORS['Cheat Hunter']}`}>{role}</span>
              {value === role && <CheckCircle className="ml-auto h-3 w-3 text-violet" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminPage() {
  const { currentUser } = useAppStore();
  const { t } = useTranslation();
  const [targetNick, setTargetNick] = useState('');
  const [result, setResult] = useState<'passed' | 'failed'>('passed');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [newAdmin, setNewAdmin] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('Cheat Hunter');
  const [admins, setAdmins] = useState<Array<{ name: string; role: string }>>([{ name: 'never', role: 'Owner' }]);
  const [registeredUsers, setRegisteredUsers] = useState<Array<{ name: string; password?: string; status?: string }>>([]);
  const [editingAdmin, setEditingAdmin] = useState<string | null>(null);
  const [bans, setBans] = useState<Record<string, string>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [changingPassword, setChangingPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const myRole = admins.find(a => a.name === currentUser)?.role || '';
  const isOwner = myRole === 'Owner';
  const canManage = CAN_MANAGE_ADMINS.includes(myRole);

  useEffect(() => {
    window.launcherApi.fetchAdmins().then((data: any) => {
      const list = data.admins || ['never'];
      const formatted = list.map((a: any) => {
        if (typeof a === 'string') return { name: a, role: a === 'never' ? 'Owner' : 'Cheat Hunter' };
        return a;
      });
      setAdmins(formatted);
      localStorage.setItem('checker-admins', JSON.stringify(formatted.map((a: any) => a.name || a)));
      if (data.accounts && Array.isArray(data.accounts)) {
        setRegisteredUsers(data.accounts.map((a: any) => {
          if (typeof a === 'string') return { name: a };
          return a;
        }));
      }
      if (data.bans) {
        setBans(data.bans);
      }
    }).catch(() => {});
  }, []);

  const saveAdminsToServer = (updated: Array<{ name: string; role: string }>) => {
    setAdmins(updated);
    localStorage.setItem('checker-admins', JSON.stringify(updated.map(a => a.name)));
    window.launcherApi.updateAdmins(updated as any);
  };

  const handleSendResult = async () => {
    if (!targetNick.trim()) { setError(t('enterNickname') || 'Введите никнейм'); return; }
    setSending(true); setError(''); setSent(false);
    try {
      await window.checkerApi.sendWebhook({
        target: targetNick.trim(),
        result: result === 'passed' ? 'Прошёл ✅' : 'Не прошёл ❌',
        checker: currentUser || 'Unknown',
        comment: comment.trim(),
      });
      const record = { target: targetNick.trim(), result: result === 'passed' ? 'Прошёл ✅' : 'Не прошёл ❌', checker: currentUser || 'Unknown', comment: comment.trim(), date: new Date().toLocaleString('ru-RU') };
      const stored = localStorage.getItem('checker-check-history');
      const history = stored ? JSON.parse(stored) : [];
      history.unshift(record);
      localStorage.setItem('checker-check-history', JSON.stringify(history.slice(0, 100)));
      window.launcherApi.saveCheck(record);
      setSent(true); setTargetNick(''); setComment('');
    } catch (e: any) { setError(e?.message || 'Ошибка'); }
    setSending(false);
  };

  const addAdmin = () => {
    if (!newAdmin.trim() || admins.some(a => a.name === newAdmin.trim())) return;
    const updated = [...admins, { name: newAdmin.trim(), role: newAdminRole }];
    saveAdminsToServer(updated);
    setNewAdmin('');
  };

  const removeAdmin = (name: string) => {
    if (name === 'never') return;
    saveAdminsToServer(admins.filter(a => a.name !== name));
  };

  const changeRole = (name: string, newRole: string) => {
    if (name === 'never') return;
    if (name === currentUser) return;
    saveAdminsToServer(admins.map(a => a.name === name ? { ...a, role: newRole } : a));
    setEditingAdmin(null);
  };

  const togglePasswordVisibility = (name: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleChangePassword = async (username: string) => {
    if (!newPassword.trim()) return;
    try {
      await window.launcherApi.changePassword(username, newPassword.trim());
      setRegisteredUsers(prev => prev.map(u => u.name === username ? { ...u, password: newPassword.trim() } : u));
      setChangingPassword(null);
      setNewPassword('');
    } catch {}
  };

  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-violet" />
          <h1 className="text-3xl font-bold text-textPrimary">{t('admin')}</h1>
        </div>
        <p className="mt-2 text-sm text-textSecondary">{t('adminDesc') || 'Управление проверками и персоналом'}</p>
      </div>

      {/* Send check result */}
      <div className="rounded-2xl border border-white/10 bg-card p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet mb-4">{t('finishCheck') || 'Завершить проверку'}</p>
        <div className="space-y-4">
          <input value={targetNick} onChange={(e) => setTargetNick(e.target.value)} placeholder={t('nickPlaceholder') || 'Никнейм проверяемого...'} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-textPrimary outline-none focus:border-violet" />
          <div className="flex gap-3">
            <button onClick={() => setResult('passed')} className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium ${result === 'passed' ? 'border-success/50 bg-success/10 text-success' : 'border-white/10 bg-white/5 text-textSecondary'}`}><CheckCircle className="h-4 w-4" />{t('passed') || 'Прошёл'}</button>
            <button onClick={() => setResult('failed')} className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium ${result === 'failed' ? 'border-danger/50 bg-danger/10 text-danger' : 'border-white/10 bg-white/5 text-textSecondary'}`}><XCircle className="h-4 w-4" />{t('failed') || 'Не прошёл'}</button>
          </div>
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('commentPlaceholder') || 'Комментарий...'} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-textPrimary outline-none focus:border-violet" />
          {error && <p className="text-sm text-danger">{error}</p>}
          {sent && <p className="text-sm text-success">✅ {t('sent') || 'Отправлено'}</p>}
          <button onClick={handleSendResult} disabled={sending} className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet py-3 text-sm font-semibold text-white hover:bg-violet/90 disabled:opacity-50"><Send className="h-4 w-4" />{sending ? '...' : t('sendButton') || 'Отправить'}</button>
        </div>
      </div>

      {/* Admin management */}
      {canManage && (
      <div className="rounded-2xl border border-white/10 bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-5 w-5 text-violet" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet">{t('manageAdmins') || 'Управление админами'}</p>
        </div>
        <div className="flex gap-2 mb-4 items-center">
          <input value={newAdmin} onChange={(e) => setNewAdmin(e.target.value)} placeholder={t('nickPlaceholder') || 'Никнейм...'} className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-textPrimary outline-none focus:border-violet" />
          <RoleDropdown value={newAdminRole} onChange={setNewAdminRole} options={ALL_ROLES.filter(r => r !== 'Owner')} />
          <button onClick={addAdmin} className="flex items-center gap-1 rounded-xl bg-violet/20 border border-violet/30 px-3 py-2 text-xs text-violet hover:bg-violet/30"><UserPlus className="h-3 w-3" />+</button>
        </div>
        <div className="space-y-2">
          {admins.map((admin) => (
            <div key={admin.name} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Shield className="h-4 w-4 text-violet shrink-0" />
                <span className="text-sm text-textPrimary">{admin.name}</span>
                {editingAdmin === admin.name && admin.name !== 'never' ? (
                  <RoleDropdown
                    value={admin.role}
                    onChange={(newRole) => changeRole(admin.name, newRole)}
                    options={ALL_ROLES.filter(r => r !== 'Owner')}
                  />
                ) : (
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${ROLE_COLORS[admin.role] || ROLE_COLORS['Cheat Hunter']}`}>{admin.role}</span>
                )}
              </div>
              {admin.name !== 'never' && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditingAdmin(editingAdmin === admin.name ? null : admin.name)} className="text-xs text-textSecondary hover:text-violet"><Edit3 className="h-3 w-3" /></button>
                  <button onClick={() => removeAdmin(admin.name)} className="text-xs text-textSecondary hover:text-danger"><Trash2 className="h-3 w-3" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Read-only admin list for lower roles */}
      {!canManage && (
      <div className="rounded-2xl border border-white/10 bg-card p-6">
        <div className="flex items-center gap-3 mb-4"><Users className="h-5 w-5 text-violet" /><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet">{t('adminList') || 'Список админов'}</p></div>
        <div className="space-y-2">
          {admins.map((admin) => (
            <div key={admin.name} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
              <Shield className="h-4 w-4 text-violet" />
              <span className="text-sm text-textPrimary">{admin.name}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${ROLE_COLORS[admin.role] || ROLE_COLORS['Cheat Hunter']}`}>{admin.role}</span>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Registered users - Owner can see passwords */}
      <div className="rounded-2xl border border-white/10 bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3"><UserCheck className="h-5 w-5 text-violet" /><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet">{t('registeredUsers') || 'Зарегистрированные'}</p></div>
          <span className="rounded-lg bg-white/5 px-3 py-1 text-[11px] text-textSecondary">{registeredUsers.length}</span>
        </div>
        {registeredUsers.length > 0 ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {registeredUsers.map((user, idx) => (
              <div key={idx} className="rounded-xl bg-white/5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet/10 text-xs font-bold text-violet">{user.name[0]?.toUpperCase()}</div>
                    <div>
                      <span className="text-sm text-textPrimary">{user.name}</span>
                      {isOwner && user.password && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-textSecondary">
                            {visiblePasswords.has(user.name) ? user.password : '••••••••'}
                          </span>
                          <button onClick={() => togglePasswordVisibility(user.name)} className="text-textSecondary hover:text-violet">
                            {visiblePasswords.has(user.name) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOwner && (
                      <button onClick={() => { setChangingPassword(changingPassword === user.name ? null : user.name); setNewPassword(''); }} className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-textSecondary hover:text-violet hover:border-violet/30">
                        <Key className="h-3 w-3" />
                      </button>
                    )}
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${user.status === 'passed' ? 'bg-success/20 text-success border border-success/30' : user.status === 'failed' ? 'bg-danger/20 text-danger border border-danger/30' : 'bg-white/10 text-textSecondary border border-white/10'}`}>
                      {user.status === 'passed' ? (t('passed') || 'Прошёл') : user.status === 'failed' ? (t('failed') || 'Не прошёл') : (t('notChecked') || 'Не проверен')}
                    </span>
                  </div>
                </div>
                {/* Ban status */}
                {bans[user.name] && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                    <span className="text-[10px] text-orange-400">
                      ⛔ Репорты заблокированы {(() => {
                        try {
                          const parsed = JSON.parse(bans[user.name]);
                          const until = parsed.until;
                          const by = parsed.by || '';
                          if (until === 'permanent') return `навсегда${by ? ` (${by})` : ''}`;
                          return `до ${new Date(until).toLocaleString('ru-RU')}${by ? ` (${by})` : ''}`;
                        } catch {
                          if (bans[user.name] === 'permanent') return 'навсегда';
                          return `до ${new Date(bans[user.name]).toLocaleString('ru-RU')}`;
                        }
                      })()}
                    </span>
                    <button
                      onClick={async () => {
                        try {
                          const current = await window.launcherApi.fetchAdmins();
                          const updatedBans = { ...(current.bans || {}) };
                          delete updatedBans[user.name];
                          await window.launcherApi.updateAdmins({ ...current, bans: updatedBans });
                          setBans(updatedBans);
                        } catch {}
                      }}
                      className="rounded-lg border border-success/30 bg-success/5 px-2 py-0.5 text-[10px] text-success hover:bg-success/10 transition"
                    >
                      Разблокировать
                    </button>
                  </div>
                )}
                {/* Change password form */}
                {changingPassword === user.name && isOwner && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                    <input
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('newPassword') || 'Новый пароль...'}
                      type="text"
                      className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-textPrimary outline-none focus:border-violet"
                    />
                    <button onClick={() => handleChangePassword(user.name)} className="rounded-lg bg-violet/20 border border-violet/30 px-3 py-1.5 text-[10px] font-medium text-violet hover:bg-violet/30">
                      {t('save') || 'Сохранить'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-textSecondary">{t('noUsers') || 'Нет пользователей'}</p>}
      </div>
    </section>
  );
}
