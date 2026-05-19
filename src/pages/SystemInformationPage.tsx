import { useEffect, useState } from 'react';
import { Cpu, RefreshCw } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface SystemInfo {
  username: string;
  hostname: string;
  os: string;
  windowsInstallDate: string;
  uptime: string;
  isVM: boolean;
  cpu: string;
  gpu: string;
  totalMemory: string;
  monitors: Array<{ width: number; height: number; primary: boolean }>;
}

export function SystemInformationPage() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const loadInfo = async () => {
    setLoading(true);
    try {
      const data = await window.checkerApi.getSystemInfo();
      setInfo(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { loadInfo(); }, []);

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Cpu className="h-7 w-7 text-violet" />
            <h1 className="text-3xl font-bold text-white">{t('sysInfoTitle')}</h1>
          </div>
          {info && (
            <p className="mt-2 text-sm text-textSecondary">
              {info.hostname} • {info.os}
            </p>
          )}
        </div>
        <button
          onClick={loadInfo}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-violet px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet/90 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </button>
      </div>

      {info && (
        <>
          {/* OS Section */}
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-textSecondary underline underline-offset-4">
              {t('osSection')}
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              <InfoCard label={t('userName')} value={info.username} />
              <InfoCard label={t('hostName')} value={info.hostname} />
              <InfoCard label={t('os')} value={info.os} />
              <InfoCard label={t('windowsInstalled')} value={info.windowsInstallDate} />
              <InfoCard label={t('uptime')} value={info.uptime} />
              <InfoCard label={t('virtualMachine')} value={info.isVM ? t('yes') : t('no')} />
            </div>
          </div>

          {/* Hardware Section */}
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-textSecondary underline underline-offset-4">
              {t('hardwareSection')}
            </p>
            <div className="space-y-4">
              <InfoCard label={t('processor')} value={info.cpu} />
              <InfoCard label={t('videoCard')} value={info.gpu} />
              <InfoCard label={t('memory')} value={info.totalMemory} />
            </div>
          </div>

          {/* Monitors */}
          {info.monitors.length > 0 && (
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-textSecondary underline underline-offset-4">
                {t('monitorsSection')} <span className="ml-2 rounded bg-violet/20 px-2 py-0.5 text-violet">{info.monitors.length}</span>
              </p>
              <div className="grid gap-4 lg:grid-cols-2">
                {info.monitors.map((mon, idx) => (
                  <div key={idx} className="rounded-2xl border border-white/10 bg-card p-5">
                    <p className="text-xs uppercase tracking-wider text-textSecondary">
                      {t('monitor')} {idx + 1}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <p className="text-lg font-bold text-white">
                        {mon.width}×{mon.height}
                      </p>
                      {mon.primary && (
                        <span className="rounded bg-danger/20 px-2 py-0.5 text-[11px] font-medium text-danger">
                          {t('primary')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-textSecondary">{label}</p>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
    </div>
  );
}
