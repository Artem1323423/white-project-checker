import { useState, useEffect } from 'react';
import { Gamepad2, RefreshCw, Copy, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../hooks/useTranslation';

interface SteamAccount {
  username: string;
  steamId: string;
  platform: string;
  gtaHours: number;
  vacBanned: boolean;
  avatarUrl?: string;
}

export function SteamPage() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<SteamAccount[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await window.checkerApi.getSteamAccounts();
      setAccounts(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { loadAccounts(); }, []);

  const copyAllIds = () => {
    const ids = accounts.map((a) => a.steamId).join('\n');
    navigator.clipboard.writeText(ids);
  };

  const openProfile = (steamId: string) => {
    window.checkerApi.openExternal?.(`https://steamcommunity.com/profiles/${steamId}`);
  };

  const copySteamId = (steamId: string) => {
    navigator.clipboard.writeText(steamId);
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gamepad2 className="h-7 w-7 text-violet" />
          <h1 className="text-3xl font-bold text-white">Steam / Epic Games</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={copyAllIds}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-textSecondary transition hover:bg-white/10 hover:text-white"
          >
            <Copy className="h-4 w-4" />
            {t('copyAllSteam')}
          </button>
          <button
            onClick={loadAccounts}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-violet px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet/90 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </button>
        </div>
      </div>

      {/* Accounts count */}
      {accounts.length > 0 && (
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-textSecondary">
          {t('accountsFound')} {accounts.length}
        </p>
      )}

      {/* Account cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AnimatePresence>
          {accounts.map((account, idx) => (
            <motion.div
              key={account.steamId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="rounded-2xl border border-white/10 bg-card p-5"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 overflow-hidden rounded-full bg-white/10">
                  {account.avatarUrl ? (
                    <img src={account.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-bold text-textSecondary">
                      {account.username[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{account.username}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-textSecondary">{account.steamId}</p>
                    <button onClick={() => copySteamId(account.steamId)} className="text-textSecondary hover:text-white">
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-textSecondary">{account.platform}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-6 text-xs">
                <div>
                  <span className="text-textSecondary">Платформа</span>
                  <span className="ml-2 font-semibold text-violet">{account.platform}</span>
                </div>
                <div>
                  <span className="text-textSecondary">GTA V Legacy</span>
                  <span className="ml-2 font-semibold text-white">{account.gtaHours > 0 ? `${account.gtaHours} ч` : '-'}</span>
                </div>
                {account.platform === 'Steam' && (
                  <div>
                    <span className="text-textSecondary">{t('vacStatus')}</span>
                    <span className={`ml-2 font-semibold ${account.vacBanned ? 'text-danger' : 'text-success'}`}>
                      {account.vacBanned ? 'VAC' : t('vacNo')}
                    </span>
                  </div>
                )}
              </div>

              {account.platform === 'Steam' && (
                <button
                  onClick={() => openProfile(account.steamId)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs text-textSecondary transition hover:bg-white/10 hover:text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('openProfile')}
                </button>
              )}
              {account.platform !== 'Steam' && (
                <div className="mt-4 flex w-full items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] py-2.5 text-xs text-textSecondary/50">
                  {account.platform}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {accounts.length === 0 && !loading && (
        <div className="rounded-2xl border border-white/10 bg-card p-8 text-center">
          <Gamepad2 className="mx-auto h-10 w-10 text-textSecondary" />
          <p className="mt-3 text-sm text-textSecondary">Steam аккаунты не найдены</p>
        </div>
      )}
    </section>
  );
}
