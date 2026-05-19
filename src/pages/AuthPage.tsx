import { useState } from 'react';
import { Eye, EyeOff, Send, CheckCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';

export function AuthPage() {
  const { login, register } = useAppStore();
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [showCheckStatus, setShowCheckStatus] = useState(false);
  const [statusUsername, setStatusUsername] = useState('');
  const [statusResult, setStatusResult] = useState<string | null>(null);
  const [statusChecking, setStatusChecking] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username || !password) {
      setError('Заполните все поля');
      return;
    }

    if (isLogin) {
      const logged = await login(username, password);
      if (!logged) {
        setError('Неверный логин или пароль');
      }
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (password.length < 4) {
      setError('Пароль должен быть минимум 4 символа');
      return;
    }

    // Check if username is already taken
    try {
      const data = await window.launcherApi.fetchAdmins();
      const accounts = data?.accounts || [];
      const exists = accounts.some((a: any) => {
        const name = typeof a === 'string' ? a : a.name;
        return name?.toLowerCase() === username.toLowerCase();
      });
      if (exists) {
        setError('Этот никнейм уже занят');
        return;
      }
    } catch {}

    register(username, password);
    setSuccess('Регистрация завершена!');
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-10 text-white">
      <div className="w-full max-w-2xl rounded-[40px] border border-white/10 bg-card/90 p-10 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="mb-8 flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.34em] text-violet/80">WHITE PROJECT CHECKER</p>
          <h1 className="text-4xl font-semibold">
            {isLogin ? 'Вход в аккаунт' : 'Регистрация'}
          </h1>
          <p className="max-w-2xl text-sm text-textSecondary">
            {isLogin
              ? 'Войдите чтобы продолжить работу с чекером.'
              : 'Создайте аккаунт для использования White Project Checker.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-white">{t('username')}</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-3 w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-violet"
              placeholder={t('username')}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white">{t('password')}</label>
            <div className="relative mt-3">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-3 pr-12 text-sm text-white outline-none transition focus:border-violet"
                placeholder={t('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-textSecondary hover:text-white transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-white">Подтвердите пароль</label>
              <div className="relative mt-3">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-3 pr-12 text-sm text-white outline-none transition focus:border-violet"
                  placeholder="Подтвердите пароль"
                />
              </div>
            </div>
          )}

          {error && <div className="rounded-3xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
          {success && <div className="rounded-3xl bg-success/10 px-4 py-3 text-sm text-success">{success}</div>}

          <button
            type="submit"
            className="w-full rounded-3xl bg-violet px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet/90"
          >
            {isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(null); setSuccess(null); setShowForgot(false); }}
            className="text-sm text-textSecondary hover:text-white transition"
          >
            {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войти'}
          </button>
          {isLogin && (
            <div>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-xs text-violet/70 hover:text-violet transition"
              >
                Забыли пароль?
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Forgot password modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowForgot(false)} />
          <div className="relative w-full max-w-md rounded-[24px] border border-white/10 bg-[#0a0f1f] p-8 shadow-2xl">
            {forgotSent ? (
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-success mx-auto" />
                <h3 className="text-lg font-semibold text-white">Запрос отправлен</h3>
                <p className="text-sm text-textSecondary">Администратор получил ваш запрос на восстановление пароля. Проверьте статус позже.</p>
                <button
                  onClick={() => { setShowForgot(false); setForgotSent(false); setForgotUsername(''); setForgotMessage(''); }}
                  className="w-full rounded-2xl bg-violet px-5 py-3 text-sm font-semibold text-white hover:bg-violet/90 transition"
                >
                  Закрыть
                </button>
              </div>
            ) : showCheckStatus ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Проверить статус</h3>
                <p className="text-xs text-textSecondary">Введите никнейм чтобы проверить ответ администратора</p>
                <input
                  value={statusUsername}
                  onChange={(e) => setStatusUsername(e.target.value)}
                  placeholder="Ваш никнейм..."
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-violet"
                />
                <button
                  onClick={async () => {
                    if (!statusUsername.trim()) return;
                    setStatusChecking(true);
                    setStatusResult(null);
                    try {
                      const reports = await window.launcherApi.fetchReports();
                      const myReports = (reports || []).filter((r: any) =>
                        r.author?.toLowerCase() === statusUsername.trim().toLowerCase() &&
                        r.message?.includes('🔑')
                      );
                      if (myReports.length === 0) {
                        setStatusResult('Запросов на восстановление не найдено');
                      } else {
                        const latest = myReports[0];
                        if (latest.replies && latest.replies.length > 0) {
                          const adminReply = latest.replies.find((r: any) => r.message.includes('Пароль изменён'));
                          if (adminReply) {
                            setStatusResult(`✅ ${adminReply.message}`);
                          } else {
                            const lastReply = latest.replies[latest.replies.length - 1];
                            setStatusResult(`💬 Ответ: ${lastReply.message}`);
                          }
                        } else if (latest.status === 'closed') {
                          setStatusResult('Запрос закрыт без ответа. Попробуйте создать новый.');
                        } else {
                          setStatusResult('⏳ Ожидание ответа администратора...');
                        }
                      }
                    } catch { setStatusResult('Ошибка проверки'); }
                    setStatusChecking(false);
                  }}
                  disabled={!statusUsername.trim() || statusChecking}
                  className="w-full rounded-2xl bg-violet px-5 py-3 text-sm font-semibold text-white hover:bg-violet/90 disabled:opacity-50 transition"
                >
                  {statusChecking ? 'Проверка...' : 'Проверить'}
                </button>
                {statusResult && (
                  <div className={`rounded-2xl px-4 py-3 text-sm ${statusResult.includes('✅') ? 'bg-success/10 text-success' : statusResult.includes('⏳') ? 'bg-violet/10 text-violet' : 'bg-white/5 text-textSecondary'}`}>
                    {statusResult}
                  </div>
                )}
                <button
                  onClick={() => { setShowCheckStatus(false); setStatusResult(null); }}
                  className="w-full text-center text-xs text-textSecondary hover:text-white transition"
                >
                  ← Назад
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-white mb-2">Восстановление пароля</h3>
                <p className="text-xs text-textSecondary mb-5">Укажите ваш никнейм и опишите проблему. Администратор изменит пароль.</p>
                <div className="space-y-4">
                  <input
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    placeholder="Ваш никнейм..."
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-violet"
                  />
                  <textarea
                    value={forgotMessage}
                    onChange={(e) => setForgotMessage(e.target.value)}
                    placeholder="Опишите проблему (например: забыл пароль, прошу сбросить)..."
                    rows={3}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-violet resize-none"
                  />
                  <button
                    onClick={async () => {
                      if (!forgotUsername.trim() || !forgotMessage.trim()) return;
                      setForgotSending(true);
                      try {
                        const report = {
                          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
                          author: forgotUsername.trim(),
                          message: `🔑 Восстановление пароля: ${forgotMessage.trim()}`,
                          date: new Date().toLocaleString('ru-RU'),
                          status: 'open',
                          replies: [],
                        };
                        await window.launcherApi.createReport(report);
                        setForgotSent(true);
                      } catch {}
                      setForgotSending(false);
                    }}
                    disabled={!forgotUsername.trim() || !forgotMessage.trim() || forgotSending}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-violet px-5 py-3 text-sm font-semibold text-white hover:bg-violet/90 disabled:opacity-50 transition"
                  >
                    <Send className="h-4 w-4" />
                    {forgotSending ? 'Отправка...' : 'Отправить запрос'}
                  </button>
                </div>
                <button
                  onClick={() => setShowForgot(false)}
                  className="mt-4 w-full text-center text-xs text-textSecondary hover:text-white transition"
                >
                  Отмена
                </button>
                <button
                  onClick={() => setShowCheckStatus(true)}
                  className="w-full text-center text-xs text-violet/70 hover:text-violet transition"
                >
                  Уже отправляли? Проверить статус
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
