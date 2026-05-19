import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, CheckCircle, User, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';

interface Report {
  id: string;
  author: string;
  message: string;
  date: string;
  status: 'open' | 'claimed' | 'closed';
  claimedBy?: string;
  replies: Array<{ author: string; message: string; date: string }>;
}

export function ReportsPage() {
  const { currentUser } = useAppStore();
  const { t } = useTranslation();
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [banMessage, setBanMessage] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine if current user is admin
  const [admins, setAdmins] = useState<Array<{ name: string; role: string }>>([]);
  const isAdmin = admins.some(a => a.name === currentUser);
  const myRole = admins.find(a => a.name === currentUser)?.role || '';
  const isOwner = myRole === 'Owner';

  useEffect(() => {
    // Load admins
    try {
      const stored = localStorage.getItem('checker-admins');
      if (stored) {
        const list = JSON.parse(stored);
        const formatted = list.map((a: any) => {
          if (typeof a === 'string') return { name: a, role: a === 'never' ? 'Owner' : 'Cheat Hunter' };
          return a;
        });
        setAdmins(formatted);
      }
    } catch {}

    window.launcherApi?.fetchAdmins?.().then((data: any) => {
      if (data?.admins) {
        const formatted = data.admins.map((a: any) => {
          if (typeof a === 'string') return { name: a, role: a === 'never' ? 'Owner' : 'Cheat Hunter' };
          return a;
        });
        setAdmins(formatted);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchReports();
    // Check ban status on load
    if (!isAdmin && currentUser) {
      window.launcherApi?.fetchAdmins?.().then((data: any) => {
        const bans = data?.bans || {};
        const banRaw = bans[currentUser];
        if (banRaw) {
          let banUntil: string;
          let banBy = 'Администратор';
          try {
            const parsed = JSON.parse(banRaw);
            banUntil = parsed.until;
            banBy = parsed.by || 'Администратор';
          } catch { banUntil = banRaw; }

          if (banUntil === 'permanent') {
            setBanMessage(`⛔ Репорты заблокированы навсегда администратором ${banBy}`);
          } else {
            const banDate = new Date(banUntil);
            if (banDate > new Date()) {
              setBanMessage(`⛔ Репорты заблокированы администратором ${banBy} до ${banDate.toLocaleString('ru-RU')}`);
            }
          }
        }
      }).catch(() => {});
    }
  }, [isAdmin, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedReport]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await window.launcherApi.fetchReports();
      setReports(data || []);
    } catch {}
    setLoading(false);
  };

  const createReport = async () => {
    if (!newMessage.trim() || sending) return;

    // Check if user is banned from creating reports
    try {
      const data = await window.launcherApi.fetchAdmins();
      const bans = data.bans || {};
      const banRaw = bans[currentUser || ''];
      if (banRaw) {
        let banUntil: string;
        let banBy = 'Администратор';
        try {
          const parsed = JSON.parse(banRaw);
          banUntil = parsed.until;
          banBy = parsed.by || 'Администратор';
        } catch { banUntil = banRaw; }

        if (banUntil === 'permanent') {
          setBanMessage(`⛔ Репорты заблокированы навсегда администратором ${banBy}`);
          return;
        }
        const banDate = new Date(banUntil);
        if (banDate > new Date()) {
          setBanMessage(`⛔ Репорты заблокированы администратором ${banBy} до ${banDate.toLocaleString('ru-RU')}`);
          return;
        }
      }
    } catch {}

    setSending(true);
    const report: Report = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      author: currentUser || 'Unknown',
      message: newMessage.trim(),
      date: new Date().toLocaleString('ru-RU'),
      status: 'open',
      replies: [],
    };
    try {
      await window.launcherApi.createReport(report);
      setNewMessage('');
      // Refresh and select the new report
      const data = await window.launcherApi.fetchReports();
      setReports(data || []);
      const created = (data || []).find((r: Report) => r.id === report.id);
      setSelectedReport(created || report);
    } catch (e) {
      console.error('[Reports] Create failed:', e);
    }
    setSending(false);
  };

  const claimReport = async (report: Report) => {
    const updated: Report = { ...report, status: 'claimed', claimedBy: currentUser || '' };
    try {
      await window.launcherApi.updateReport(updated);
      setSelectedReport(updated);
      await fetchReports();
    } catch {}
  };

  const addReply = async (report: Report, message: string) => {
    if (!message.trim()) return;
    const reply = { author: currentUser || 'Unknown', message: message.trim(), date: new Date().toLocaleString('ru-RU') };
    const updated: Report = { ...report, replies: [...report.replies, reply] };
    // Auto-claim if admin replies to open report
    if (isAdmin && updated.status === 'open') {
      updated.status = 'claimed';
      updated.claimedBy = currentUser || '';
    }
    try {
      await window.launcherApi.updateReport(updated);
      setSelectedReport(updated);
      setReplyText('');
      await fetchReports();
    } catch {}
  };

  const closeReport = async (report: Report) => {
    const reply = { author: currentUser || 'System', message: 'Репорт закрыт', date: new Date().toLocaleString('ru-RU') };
    const updated: Report = { ...report, status: 'closed', replies: [...report.replies, reply] };
    try {
      await window.launcherApi.updateReport(updated);
      setSelectedReport(updated);
      await fetchReports();
    } catch {}
  };

  // Filter reports based on role
  const visibleReports = isAdmin
    ? reports.filter(r => {
        // Admin sees: all open reports not claimed by another admin, their own claimed, and all closed
        if (r.status === 'open') return true;
        if (r.status === 'claimed') return r.claimedBy === currentUser;
        return true; // closed
      })
    : reports.filter(r => r.author === currentUser);

  const openReports = visibleReports.filter(r => r.status === 'open' || r.status === 'claimed');
  const closedReports = visibleReports.filter(r => r.status === 'closed');

  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <MessageSquare className="h-7 w-7 text-violet" />
          <h1 className="text-3xl font-bold text-textPrimary">{t('reports') || 'Reports'}</h1>
        </div>
        <p className="mt-2 text-sm text-textSecondary">
          {isAdmin ? 'Управление репортами пользователей' : 'Отправьте репорт администрации'}
        </p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-240px)]">
        {/* Left panel - report list */}
        <div className="w-[340px] shrink-0 flex flex-col rounded-2xl border border-white/10 bg-card overflow-hidden">
          {/* Report list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <p className="text-center text-sm text-textSecondary py-8">{t('loading') || 'Loading...'}</p>
            ) : (
              <>
                {openReports.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet px-1">Открытые</p>
                    {openReports.map((report) => (
                      <button
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className={`w-full text-left rounded-xl border p-3 transition ${
                          selectedReport?.id === report.id
                            ? 'border-violet/60 bg-violet/10'
                            : 'border-violet/30 bg-violet/5 hover:bg-violet/10'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-3 w-3 text-violet" />
                          <span className="text-xs font-medium text-violet">{report.author}</span>
                          {report.status === 'claimed' && (
                            <span className="ml-auto text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-1.5 py-0.5">
                              {report.claimedBy}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-textPrimary truncate">{report.message}</p>
                        <p className="text-[10px] text-textSecondary mt-1">{report.date}</p>
                      </button>
                    ))}
                  </div>
                )}

                {closedReports.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textSecondary px-1">Закрытые</p>
                    {closedReports.map((report) => (
                      <button
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className={`w-full text-left rounded-xl border p-3 transition opacity-50 ${
                          selectedReport?.id === report.id
                            ? 'border-white/20 bg-white/5'
                            : 'border-white/10 bg-white/[0.02] hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-3 w-3 text-textSecondary" />
                          <span className="text-xs font-medium text-textSecondary">{report.author}</span>
                          <CheckCircle className="h-3 w-3 text-success ml-auto" />
                        </div>
                        <p className="text-sm text-textSecondary truncate">{report.message}</p>
                        <p className="text-[10px] text-textSecondary mt-1">{report.date}</p>
                      </button>
                    ))}
                  </div>
                )}

                {openReports.length === 0 && closedReports.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-textSecondary">
                    <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-sm">Нет репортов</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right panel - report details */}
        <div className="flex-1 flex flex-col rounded-2xl border border-white/10 bg-card overflow-hidden">
          {selectedReport ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet/10 text-xs font-bold text-violet">
                    {selectedReport.author[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-textPrimary">{selectedReport.author}</p>
                    <p className="text-[10px] text-textSecondary">{selectedReport.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${
                    selectedReport.status === 'open' ? 'bg-violet/20 text-violet border-violet/30' :
                    selectedReport.status === 'claimed' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                    'bg-success/20 text-success border-success/30'
                  }`}>
                    {selectedReport.status === 'open' ? 'Открыт' : selectedReport.status === 'claimed' ? 'В работе' : 'Закрыт'}
                  </span>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="rounded-lg p-1.5 text-textSecondary hover:text-white hover:bg-white/10 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Original message */}
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet/10 text-[10px] font-bold text-violet">
                    {selectedReport.author[0]?.toUpperCase()}
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 max-w-[80%]">
                    <p className="text-xs font-medium text-violet mb-1">{selectedReport.author}</p>
                    <p className="text-sm text-textPrimary">{selectedReport.message}</p>
                    <p className="text-[10px] text-textSecondary mt-1">{selectedReport.date}</p>
                  </div>
                </div>

                {/* Replies */}
                {selectedReport.replies.map((reply, idx) => {
                  const isAdminReply = admins.some(a => a.name === reply.author);
                  return (
                    <div key={idx} className={`flex gap-3 ${isAdminReply ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        isAdminReply ? 'bg-emerald-500/10 text-emerald-400' : 'bg-violet/10 text-violet'
                      }`}>
                        {reply.author[0]?.toUpperCase()}
                      </div>
                      <div className={`rounded-xl border px-4 py-2.5 max-w-[80%] ${
                        isAdminReply ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/10'
                      }`}>
                        <p className={`text-xs font-medium mb-1 ${isAdminReply ? 'text-emerald-400' : 'text-violet'}`}>{reply.author}</p>
                        <p className="text-sm text-textPrimary">{reply.message}</p>
                        <p className="text-[10px] text-textSecondary mt-1">{reply.date}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Actions */}
              {selectedReport.status !== 'closed' && (
                <div className="p-4 border-t border-white/10 space-y-3">
                  {/* Quick reply buttons for admins */}
                  {isAdmin && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => addReply(selectedReport, 'Здравствуйте!')}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-textSecondary hover:text-violet hover:border-violet/30 transition"
                      >
                        Здравствуйте!
                      </button>
                      <button
                        onClick={() => closeReport(selectedReport)}
                        className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-1.5 text-xs text-danger hover:bg-danger/10 transition"
                      >
                        Закрыть репорт
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => setShowPasswordModal(true)}
                          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10 transition"
                        >
                          Изменить пароль
                        </button>
                      )}
                      <button
                        onClick={() => setShowBanModal(true)}
                        className="rounded-lg border border-orange-500/30 bg-orange-500/5 px-3 py-1.5 text-xs text-orange-400 hover:bg-orange-500/10 transition"
                      >
                        Заблокировать
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const current = await window.launcherApi.fetchAdmins();
                            const bans = current.bans || {};
                            if (bans[selectedReport.author]) {
                              delete bans[selectedReport.author];
                              await window.launcherApi.updateAdmins({ ...current, bans });
                              await addReply(selectedReport, `✅ Блокировка репортов снята для ${selectedReport.author}`);
                            }
                          } catch {}
                        }}
                        className="rounded-lg border border-success/30 bg-success/5 px-3 py-1.5 text-xs text-success hover:bg-success/10 transition"
                      >
                        Снять блокировку
                      </button>
                    </div>
                  )}

                  {/* Close button for regular users */}
                  {!isAdmin && selectedReport.author === currentUser && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => closeReport(selectedReport)}
                        className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-1.5 text-xs text-danger hover:bg-danger/10 transition"
                      >
                        Закрыть репорт
                      </button>
                    </div>
                  )}

                  {/* Reply input for users */}
                  {!isAdmin && selectedReport.author === currentUser && (
                    <div className="flex gap-2">
                      <input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addReply(selectedReport, replyText)}
                        placeholder="Написать сообщение..."
                        className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-textPrimary outline-none focus:border-violet"
                      />
                      <button
                        onClick={() => addReply(selectedReport, replyText)}
                        disabled={!replyText.trim()}
                        className="flex items-center justify-center rounded-xl bg-violet px-4 py-2 text-white hover:bg-violet/90 disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Reply input */}
                  {isAdmin && (
                    <div className="flex gap-2">
                      <input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addReply(selectedReport, replyText)}
                        placeholder="Написать ответ..."
                        className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-textPrimary outline-none focus:border-violet"
                      />
                      <button
                        onClick={() => addReply(selectedReport, replyText)}
                        disabled={!replyText.trim()}
                        className="flex items-center justify-center rounded-xl bg-violet px-4 py-2 text-white hover:bg-violet/90 disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-textSecondary p-6">
              {!isAdmin ? (
                <div className="w-full max-w-md space-y-4">
                  <div className="text-center mb-6">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3 text-violet/40" />
                    <p className="text-base font-medium text-textPrimary">Написать обращение</p>
                    <p className="text-xs text-textSecondary mt-1">Опишите вашу проблему и администрация ответит</p>
                  </div>
                  {banMessage ? (
                    <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-4 text-center">
                      <p className="text-sm font-medium text-danger">{banMessage}</p>
                    </div>
                  ) : (
                    <>
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Опишите проблему подробно..."
                        rows={4}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-textPrimary outline-none focus:border-violet resize-none"
                      />
                      <button
                        onClick={createReport}
                        disabled={!newMessage.trim() || sending}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet py-3 text-sm font-semibold text-white hover:bg-violet/90 disabled:opacity-50 transition"
                      >
                        <Send className="h-4 w-4" />
                        {sending ? 'Отправка...' : 'Отправить обращение'}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <MessageSquare className="h-12 w-12 mb-3 opacity-20" />
                  <p className="text-sm">Выберите репорт для просмотра</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Password change modal */}
      {showPasswordModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPasswordModal(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a0f1f] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-textPrimary">Изменить пароль</p>
              <button onClick={() => setShowPasswordModal(false)} className="text-textSecondary hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-textSecondary mb-3">Пользователь: <span className="text-violet font-medium">{selectedReport.author}</span></p>
            <input
              value={newPasswordInput}
              onChange={(e) => setNewPasswordInput(e.target.value)}
              placeholder="Новый пароль..."
              type="text"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-textPrimary outline-none focus:border-violet mb-4"
            />
            <button
              onClick={async () => {
                if (!newPasswordInput.trim()) return;
                try {
                  await window.launcherApi.changePassword(selectedReport.author, newPasswordInput.trim());
                  await addReply(selectedReport, `Пароль изменён на: ${newPasswordInput.trim()}`);
                  setNewPasswordInput('');
                  setShowPasswordModal(false);
                } catch {}
              }}
              disabled={!newPasswordInput.trim()}
              className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50 transition"
            >
              Сохранить пароль
            </button>
          </div>
        </div>
      )}

      {/* Ban modal */}
      {showBanModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBanModal(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a0f1f] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-textPrimary">Заблокировать репорты</p>
              <button onClick={() => setShowBanModal(false)} className="text-textSecondary hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-textSecondary mb-4">Пользователь <span className="text-orange-400 font-medium">{selectedReport.author}</span> не сможет создавать репорты</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '30 минут', minutes: 30 },
                { label: '1 час', minutes: 60 },
                { label: '6 часов', minutes: 360 },
                { label: '24 часа', minutes: 1440 },
                { label: '7 дней', minutes: 10080 },
                { label: 'Навсегда', minutes: 999999 },
              ].map((opt) => (
                <button
                  key={opt.minutes}
                  onClick={async () => {
                    try {
                      const banUntil = opt.minutes === 999999 ? 'permanent' : new Date(Date.now() + opt.minutes * 60000).toISOString();
                      // Save ban info to gist (with admin name)
                      const current = await window.launcherApi.fetchAdmins();
                      const bans = current.bans || {};
                      bans[selectedReport.author] = JSON.stringify({ until: banUntil, by: currentUser || 'Admin' });
                      await window.launcherApi.updateAdmins({ ...current, bans });
                      // Close report with ban message
                      const reply = { author: currentUser || 'System', message: `⛔ Репорты заблокированы на ${opt.label}`, date: new Date().toLocaleString('ru-RU') };
                      const updated: Report = { ...selectedReport, status: 'closed' as const, replies: [...selectedReport.replies, reply] };
                      await window.launcherApi.updateReport(updated);
                      setSelectedReport(updated);
                      await fetchReports();
                      setShowBanModal(false);
                    } catch {}
                  }}
                  className="rounded-xl border border-orange-500/30 bg-orange-500/5 py-2.5 text-xs font-medium text-orange-400 hover:bg-orange-500/10 transition"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
