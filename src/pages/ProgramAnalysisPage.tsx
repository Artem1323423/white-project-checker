import { useState } from 'react';
import { Clock, RefreshCw, AlertTriangle, Search, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../hooks/useTranslation';

interface ProgramEntry {
  name: string;
  path: string;
  type: string;
  lastLaunch: string;
  launchCount: number;
  isCheat: boolean;
  cheatName?: string;
  exists: boolean;
}

export function ProgramAnalysisPage() {
  const { t } = useTranslation();
  const [programs, setPrograms] = useState<ProgramEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCheats, setFilterCheats] = useState(false);

  const loadPrograms = async () => {
    setLoading(true);
    try {
      const data = await window.checkerApi.getProgramAnalysis();
      setPrograms(data);
      setLoaded(true);
    } catch (e) {
      console.error(e);
      setLoaded(true);
    }
    setLoading(false);
  };

  const cheatsCount = programs.filter((p) => p.isCheat).length;

  const filtered = programs.filter((p) => {
    const matchSearch = search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.path.toLowerCase().includes(search.toLowerCase());
    const matchCheat = !filterCheats || p.isCheat;
    return matchSearch && matchCheat;
  });

  const openProgram = (path: string) => {
    window.checkerApi.openFolder?.(path.replace(/\\[^\\]+$/, ''));
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Clock className="h-7 w-7 text-violet" />
            <h1 className="text-3xl font-bold text-white">{t('programAnalysisTitle')}</h1>
          </div>
          <p className="mt-2 text-sm text-textSecondary">{t('programAnalysisDesc')}</p>
        </div>
        <button
          onClick={loadPrograms}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-violet px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet/90 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </button>
      </div>

      {/* Cheats warning */}
      <AnimatePresence>
        {loaded && cheatsCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 px-5 py-3"
          >
            <AlertTriangle className="h-4 w-4 text-danger" />
            <span className="text-sm font-medium text-danger">
              {t('cheatsDetected')} {cheatsCount}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filter */}
      {loaded && programs.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-xl border border-white/10 bg-card py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-violet/40"
            />
          </div>
          <button
            onClick={() => setFilterCheats(!filterCheats)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition ${
              filterCheats
                ? 'border-danger/40 bg-danger/10 text-danger'
                : 'border-white/10 bg-card text-textSecondary hover:text-white'
            }`}
          >
            <Flame className="h-4 w-4" />
            {t('byCheatDb')}
          </button>
        </div>
      )}

      {/* Table */}
      {loaded && filtered.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5">
              <tr>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-textSecondary">{t('program')}</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-textSecondary">{t('type')}</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-textSecondary">{t('lastLaunch')}</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-textSecondary">{t('launchCount')}</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-textSecondary">{t('action')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((prog, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-white/5 transition ${
                    prog.isCheat ? 'bg-danger/5 border-danger/20' : 'hover:bg-white/5'
                  }`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {prog.isCheat && <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-400" />}
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${prog.isCheat ? 'text-white' : 'text-white'}`}>
                          {prog.name}
                          {prog.isCheat && prog.cheatName && (
                            <span className="ml-2 inline-flex items-center rounded bg-danger/20 px-2 py-0.5 text-[10px] font-bold text-danger">
                              ⚠ {prog.cheatName}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded bg-danger/20 px-2 py-0.5 text-[11px] font-medium text-danger">
                      .{prog.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-textSecondary">{prog.lastLaunch || 'N/A'}</td>
                  <td className="px-5 py-3 text-xs text-textSecondary">{prog.launchCount > 0 ? prog.launchCount : '-'}</td>
                  <td className="px-5 py-3">
                    {prog.exists ? (
                      <button
                        onClick={() => openProgram(prog.path)}
                        className="rounded-lg bg-danger/20 px-3 py-1 text-[11px] font-medium text-danger transition hover:bg-danger/30"
                      >
                        {t('open')}
                      </button>
                    ) : (
                      <span className="rounded-lg bg-white/5 px-3 py-1 text-[11px] text-textSecondary">
                        {t('deleted')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loaded && (
        <div className="rounded-2xl border border-white/10 bg-card p-8 text-center">
          <Clock className="mx-auto h-10 w-10 text-textSecondary" />
          <p className="mt-3 text-sm text-textSecondary">
            Нажмите "Обновить" для загрузки данных
          </p>
        </div>
      )}
    </section>
  );
}
