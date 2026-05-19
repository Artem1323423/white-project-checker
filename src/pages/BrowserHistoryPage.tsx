import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, Database, AlertTriangle, Globe, X } from 'lucide-react';

interface SuspiciousEntry {
  browser: string;
  title: string;
  url: string;
  keyword: string;
  count: number;
  timestamp: string;
  severity: 'high' | 'medium' | 'low';
}

export function BrowserHistoryPage() {
  const [showModal, setShowModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [results, setResults] = useState<SuspiciousEntry[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');

  const handleCheckClick = () => {
    setShowModal(true);
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  const handleAccept = async () => {
    setShowModal(false);
    setScanning(true);
    setScanComplete(false);
    setResults([]);
    setScanProgress(0);

    setScanStatus('Инициализация сканирования...');
    await delay(400);
    setScanProgress(10);

    setScanStatus('Поиск профилей браузеров...');
    await delay(500);
    setScanProgress(25);

    setScanStatus('Чтение истории браузеров...');
    await delay(600);
    setScanProgress(50);

    setScanStatus('Анализ записей по базе читов...');
    setScanProgress(75);

    const response = await window.checkerApi.runBrowserHistoryCheck();

    const mapped: SuspiciousEntry[] = response.entries.map((entry) => ({
      browser: entry.browser,
      title: entry.title || entry.url,
      url: entry.url,
      keyword: entry.keyword,
      count: entry.count,
      timestamp: entry.timestamp,
      severity: entry.count >= 4 ? 'high' : entry.count >= 2 ? 'medium' : 'low',
    }));

    setScanProgress(100);
    setScanStatus('Сканирование завершено');
    setResults(mapped);
    setScanning(false);
    setScanComplete(true);
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Globe className="h-7 w-7 text-violet" />
            <h1 className="text-3xl font-bold text-white">Проверка браузеров</h1>
          </div>
          <p className="mt-2 text-sm text-textSecondary">
            Поиск сайтов читов в истории браузеров
          </p>
        </div>
        <button
          onClick={handleCheckClick}
          className="rounded-xl bg-violet px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-violet/90"
        >
          Проверить историю
        </button>
      </div>

      {/* Scanning Progress */}
      {scanning && (
        <div className="rounded-2xl border border-violet/20 bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet border-t-transparent" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{scanStatus}</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet to-purple-400 transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-semibold text-violet">{scanProgress}%</span>
          </div>
        </div>
      )}

      {/* Results */}
      {scanComplete && (
        <div className="space-y-4">
          {/* Count */}
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-medium">
              Найдено подозрительных записей: {results.length}
            </span>
          </div>

          {/* Result cards - simple list without heavy animations */}
          <div className="space-y-3">
            {results.map((entry, index) => (
              <div
                key={`${entry.url}-${index}`}
                className="rounded-2xl border border-violet/15 bg-card p-5 transition-colors hover:border-violet/30"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet/20 bg-violet/10">
                    <Globe className="h-5 w-5 text-violet" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{entry.title}</p>
                    <p className="mt-0.5 text-xs text-textSecondary truncate">{entry.url}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-textSecondary">
                        {entry.browser}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-violet/20 bg-violet/10 px-2.5 py-0.5 text-[11px] text-violet">
                        {entry.keyword}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-textSecondary">
                        {entry.count} посещений
                      </span>
                      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-textSecondary">
                        {entry.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {results.length === 0 && (
            <div className="rounded-2xl border border-success/20 bg-card p-8 text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-success" />
              <p className="mt-3 text-base font-semibold text-white">Подозрительных записей не найдено</p>
              <p className="mt-1 text-sm text-textSecondary">
                История браузеров не содержит ссылок на известные сайты читов.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Consent Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleCancel} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-[660px] rounded-[28px] border border-violet/30 bg-[#0a0f1f] shadow-2xl"
            >
              <button onClick={handleCancel} className="absolute right-5 top-5 rounded-full p-1.5 text-textSecondary hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>

              <div className="p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Информация о проверке браузера</h2>

                <div className="space-y-3">
                  <div className="flex items-start gap-4 rounded-2xl border border-violet/15 bg-violet/5 p-4">
                    <ShieldCheck className="h-5 w-5 shrink-0 text-violet mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">Конфиденциальность</h3>
                      <p className="mt-1 text-sm text-textSecondary">Ваша история браузера проверяется локально. Данные не покидают устройство.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 rounded-2xl border border-violet/15 bg-violet/5 p-4">
                    <Lock className="h-5 w-5 shrink-0 text-violet mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">Безопасность</h3>
                      <p className="mt-1 text-sm text-textSecondary">Информация не отправляется на сервер и не сохраняется.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 rounded-2xl border border-violet/15 bg-violet/5 p-4">
                    <Database className="h-5 w-5 shrink-0 text-violet mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">Верификация</h3>
                      <p className="mt-1 text-sm text-textSecondary">История сравнивается с базой известных сайтов читов.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-danger" />
                      <h3 className="text-sm font-semibold text-danger">Отказ от ответственности</h3>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-textSecondary">
                      <li>• Пользователь использует функцию на свой страх и риск</li>
                      <li>• Результаты носят информационный характер</li>
                      <li>• Разработчик не несет ответственности за последствия</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button onClick={handleCancel} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-textSecondary hover:bg-white/10 hover:text-white">
                    Отмена
                  </button>
                  <button onClick={handleAccept} className="rounded-2xl bg-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet/90">
                    Согласен, продолжить
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
