import { useState, useEffect } from 'react';
import { Wrench, AlertCircle, Download, CheckCircle } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

const utilities = [
  { num: 1, titleKey: 'systemInformer', descKey: 'systemInformerDesc' },
  { num: 2, titleKey: 'everything', descKey: 'everythingDesc' },
  { num: 3, titleKey: 'usbDeview', descKey: 'usbDeviewDesc' },
  { num: 4, titleKey: 'dataUsage', descKey: 'dataUsageDesc' },
  { num: 5, titleKey: 'lastActivityView', descKey: 'lastActivityViewDesc' },
  { num: 6, titleKey: 'winPrefetchView', descKey: 'winPrefetchViewDesc' },
  { num: 7, titleKey: 'executedPrograms', descKey: 'executedProgramsDesc' },
  { num: 8, titleKey: 'cachedPrograms', descKey: 'cachedProgramsDesc' },
  { num: 9, titleKey: 'journalTrace', descKey: 'journalTraceDesc' },
  { num: 10, titleKey: 'previousFiles', descKey: 'previousFilesDesc' },
  { num: 11, titleKey: 'shellBagAnalyzer', descKey: 'shellBagAnalyzerDesc' },
  { num: 12, titleKey: 'browserDownloads', descKey: 'browserDownloadsDesc' },
];

export function UtilitiesPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<{ type: 'error' | 'downloading' | 'ready'; name: string } | null>(null);

  useEffect(() => {
    (window.checkerApi as any).onUtilityNotFound?.((name: string) => {
      setStatus({ type: 'error', name });
      setTimeout(() => setStatus(null), 5000);
    });
    (window.checkerApi as any).onUtilityDownloading?.((name: string) => {
      setStatus({ type: 'downloading', name });
    });
    (window.checkerApi as any).onUtilityReady?.((name: string) => {
      setStatus({ type: 'ready', name });
      setTimeout(() => setStatus(null), 3000);
    });
  }, []);

  const handleLaunch = (num: number) => {
    window.checkerApi.launchUtility?.(num);
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Wrench className="h-7 w-7 text-violet" />
          <h1 className="text-3xl font-bold text-white">{t('utilitiesTitle')}</h1>
        </div>
        <p className="mt-2 text-sm text-textSecondary">{t('utilitiesDesc')}</p>
      </div>

      {/* Status notification */}
      {status?.type === 'downloading' && (
        <div className="flex items-center gap-3 rounded-xl border border-violet/30 bg-violet/10 px-4 py-3 animate-pulse">
          <Download className="h-5 w-5 text-violet shrink-0" />
          <p className="text-sm text-violet">
            Скачивание <span className="font-medium">{status.name}</span>...
          </p>
        </div>
      )}
      {status?.type === 'ready' && (
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
          <CheckCircle className="h-5 w-5 text-success shrink-0" />
          <p className="text-sm text-success">
            <span className="font-medium">{status.name}</span> готов и запущен
          </p>
        </div>
      )}
      {status?.type === 'error' && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-yellow-400 shrink-0" />
          <p className="text-sm text-yellow-300">
            <span className="font-medium">{status.name}</span> — не удалось найти или скачать
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {utilities.map((util) => (
          <button
            key={util.num}
            onClick={() => handleLaunch(util.num)}
            className="group rounded-2xl border border-white/10 bg-card p-5 text-left transition hover:border-violet/30 hover:bg-white/5"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet/20 text-sm font-bold text-violet">
                {util.num}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {t(util.titleKey)}
                </p>
                <p className="mt-1 text-xs text-textSecondary line-clamp-2">
                  {t(util.descKey)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
