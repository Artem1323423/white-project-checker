import { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, FolderOpen, Play, Search, Wifi, HardDrive } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';

interface ScanResult {
  path: string;
  reason: string;
}

export function ScannerPage() {
  const { isScanning, startScan } = useAppStore();
  const { t } = useTranslation();
  const [results, setResults] = useState<ScanResult[]>([]);
  const [scanned, setScanned] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'scan' | 'network' | 'files'>('scan');
  const [networkInfo, setNetworkInfo] = useState<Array<{ name: string; usage: string; bytes: number }>>([]);
  const [filesList, setFilesList] = useState<string[]>([]);

  const handleScan = async () => {
    setResults([]);
    setScanned(false);
    await startScan();
    try {
      const res = await window.checkerApi.runScan();
      setResults(res.suspicious);
      setScanned(true);
    } catch {
      setScanned(true);
    }
  };

  useEffect(() => {
    if (activeTab === 'network') {
      window.checkerApi.getNetworkUsage?.().then(setNetworkInfo).catch(() => {});
    }
    if (activeTab === 'files') {
      window.checkerApi.getRecentFiles?.().then(setFilesList).catch(() => {});
    }
  }, [activeTab]);

  const openFolder = (filePath: string) => {
    const folder = filePath.replace(/\\[^\\]+$/, '');
    window.checkerApi.openFolder?.(folder);
  };

  const getCheatName = (reason: string): string => {
    const match = reason.match(/Suspicious filename matched: (.+)/);
    return match ? match[1] : 'Unknown';
  };

  const filteredResults = results.filter(r =>
    searchQuery === '' || r.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-violet" />
          <h1 className="text-3xl font-bold text-textPrimary">{t('scanner')}</h1>
        </div>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="flex items-center gap-2 rounded-xl bg-violet px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet/90 disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          {isScanning ? t('scanning') : t('startScanning')}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('scan')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition ${
            activeTab === 'scan' ? 'bg-violet/10 text-violet border border-violet/30' : 'bg-white/5 text-textSecondary hover:text-textPrimary'
          }`}
        >
          <ShieldCheck className="h-4 w-4" /> {t('scanner')}
        </button>
        <button
          onClick={() => setActiveTab('network')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition ${
            activeTab === 'network' ? 'bg-violet/10 text-violet border border-violet/30' : 'bg-white/5 text-textSecondary hover:text-textPrimary'
          }`}
        >
          <Wifi className="h-4 w-4" /> {t('dataUsage')}
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition ${
            activeTab === 'files' ? 'bg-violet/10 text-violet border border-violet/30' : 'bg-white/5 text-textSecondary hover:text-textPrimary'
          }`}
        >
          <HardDrive className="h-4 w-4" /> {t('recentFiles') || 'Файлы'}
        </button>
      </div>

      {/* Scan Tab */}
      {activeTab === 'scan' && (
        <>
          {/* Search */}
          {scanned && results.length > 0 && (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full rounded-xl border border-white/10 bg-card py-3 pl-11 pr-4 text-sm text-textPrimary outline-none focus:border-violet/40"
              />
            </div>
          )}

          {/* Threats count */}
          {scanned && filteredResults.length > 0 && (
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-medium">{t('threatsFound')} {filteredResults.length}</span>
            </div>
          )}

          {/* Results */}
          {scanned && filteredResults.length > 0 && (
            <div className="space-y-3">
              {filteredResults.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-2xl border border-danger/30 bg-danger/5 p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/20">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-textPrimary">{item.path.split('\\').pop()}</p>
                      <p className="mt-0.5 text-xs text-textSecondary">{item.path}</p>
                      <span className="mt-1 inline-block rounded bg-danger/20 px-2 py-0.5 text-[11px] font-medium text-danger">
                        {t('cheat')}: {getCheatName(item.reason)}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => openFolder(item.path)} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-textSecondary hover:bg-white/10 hover:text-textPrimary">
                    <FolderOpen className="h-3.5 w-3.5" /> {t('openFolder')}
                  </button>
                </div>
              ))}
            </div>
          )}

          {scanned && results.length === 0 && (
            <div className="rounded-2xl border border-success/20 bg-card p-8 text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-success" />
              <p className="mt-3 text-base font-semibold text-textPrimary">{t('noThreats') || 'Угроз не обнаружено'}</p>
            </div>
          )}
        </>
      )}

      {/* Network Tab */}
      {activeTab === 'network' && (
        <div className="rounded-2xl border border-white/10 bg-card p-6">
          <h3 className="text-base font-semibold text-textPrimary mb-4">{t('dataUsage')}</h3>
          {networkInfo.length > 0 ? (
            <div className="space-y-3">
              {networkInfo.map((app, idx) => {
                const maxBytes = networkInfo[0]?.bytes || 1;
                const percent = Math.round((app.bytes / maxBytes) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-textPrimary">{app.name}</span>
                      <span className="text-sm font-medium text-textPrimary">{app.usage}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-cyan" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-textSecondary">{t('loading') || 'Загрузка данных...'}</p>
          )}
        </div>
      )}

      {/* Files Tab */}
      {activeTab === 'files' && (
        <div className="rounded-2xl border border-white/10 bg-card p-6">
          <h3 className="text-base font-semibold text-textPrimary mb-4">{t('recentFiles') || 'Недавние файлы'}</h3>
          {filesList.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filesList.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2.5">
                  <span className="text-xs text-textPrimary truncate">{file}</span>
                  <button onClick={() => openFolder(file)} className="text-[10px] text-violet hover:text-violet/80">{t('open')}</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-textSecondary">{t('loading') || 'Загрузка...'}</p>
          )}
        </div>
      )}
    </section>
  );
}
