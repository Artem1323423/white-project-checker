import { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface CheckRecord {
  target: string;
  result: string;
  checker: string;
  comment: string;
  date: string;
}

const CAN_DELETE = ['Owner', 'Команда проекта', 'Главный Администратор', 'Заместитель Главного Администратора', 'Chief Cheat Hunter'];

export function CheckHistoryPage() {
  const { currentUser } = useAppStore();
  const [history, setHistory] = useState<CheckRecord[]>([]);
  const [myRole, setMyRole] = useState('');

  useEffect(() => {
    window.launcherApi.fetchAdmins().then((data: any) => {
      if (data.checks && Array.isArray(data.checks)) {
        setHistory(data.checks);
        localStorage.setItem('checker-check-history', JSON.stringify(data.checks));
      }
      // Get my role
      const admins = data.admins || [];
      const me = admins.find((a: any) => (typeof a === 'string' ? a : a.name) === currentUser);
      if (me) setMyRole(typeof me === 'string' ? (me === 'never' ? 'Owner' : 'Cheat Hunter') : me.role);
    }).catch(() => {
      try {
        const stored = localStorage.getItem('checker-check-history');
        if (stored) setHistory(JSON.parse(stored));
      } catch {}
    });
  }, [currentUser]);

  const canDelete = CAN_DELETE.includes(myRole);

  const deleteCheck = (idx: number) => {
    const updated = history.filter((_, i) => i !== idx);
    setHistory(updated);
    localStorage.setItem('checker-check-history', JSON.stringify(updated));
    // Also update on server - save updated checks
    window.launcherApi.fetchAdmins().then((data: any) => {
      const current = data || {};
      window.launcherApi.updateAdmins({ ...current, checks: updated } as any);
    });
  };

  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-violet" />
          <h1 className="text-3xl font-bold text-textPrimary">История проверок</h1>
        </div>
        <p className="mt-2 text-sm text-textSecondary">Все завершённые проверки</p>
      </div>

      {history.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5">
              <tr>
                <th className="px-4 py-3 text-xs uppercase text-textSecondary">Проверяемый</th>
                <th className="px-4 py-3 text-xs uppercase text-textSecondary">Результат</th>
                <th className="px-4 py-3 text-xs uppercase text-textSecondary">Проверяющий</th>
                <th className="px-4 py-3 text-xs uppercase text-textSecondary">Дата</th>
                {canDelete && <th className="px-4 py-3 text-xs uppercase text-textSecondary"></th>}
              </tr>
            </thead>
            <tbody>
              {history.map((record, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-textPrimary font-medium">{record.target}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${record.result.includes('✅') ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                      {record.result.includes('✅') ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {record.result.includes('✅') ? 'Прошёл' : 'Не прошёл'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-textSecondary">{record.checker}</td>
                  <td className="px-4 py-3 text-textSecondary text-xs">{record.date}</td>
                  {canDelete && (
                    <td className="px-4 py-3">
                      <button onClick={() => deleteCheck(idx)} className="text-textSecondary hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-card p-8 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-textSecondary" />
          <p className="mt-3 text-sm text-textSecondary">Проверок пока не было</p>
        </div>
      )}
    </section>
  );
}
