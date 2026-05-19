import { useState } from 'react';
import { Usb, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../hooks/useTranslation';

interface UsbDevice {
  name: string;
  deviceId: string;
  lastConnected: string;
  serial?: string;
}

export function UsbHistoryPage() {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<UsbDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.checkerApi.getUsbHistory();
      setDevices(data);
      setLoaded(true);
    } catch (e: any) {
      setError(e?.message || t('toolsFolderNotFound'));
      setLoaded(true);
    }
    setLoading(false);
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Usb className="h-7 w-7 text-violet" />
            <h1 className="text-3xl font-bold text-white">{t('usbHistory')}</h1>
          </div>
          <p className="mt-2 text-sm text-textSecondary">{t('usbDesc')}</p>
        </div>
        <button
          onClick={loadDevices}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-violet px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet/90 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 px-5 py-3">
          <AlertTriangle className="h-4 w-4 text-danger" />
          <span className="text-sm text-danger">{error}</span>
        </div>
      )}

      {/* Devices list */}
      <AnimatePresence>
        {devices.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {devices.map((device, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-2xl border border-white/10 bg-card p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{device.name}</p>
                    <p className="mt-1 text-xs text-textSecondary">{device.deviceId}</p>
                    {device.serial && (
                      <p className="mt-0.5 text-xs text-textSecondary">S/N: {device.serial}</p>
                    )}
                  </div>
                  <p className="text-xs text-textSecondary">{device.lastConnected}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {loaded && devices.length === 0 && !error && (
        <div className="rounded-2xl border border-white/10 bg-card p-8 text-center">
          <Usb className="mx-auto h-10 w-10 text-textSecondary" />
          <p className="mt-3 text-base font-semibold text-white">{t('noUsbHistory')}</p>
          <p className="mt-1 text-sm text-textSecondary">{t('noUsbHistoryDesc')}</p>
        </div>
      )}

      {!loaded && !loading && (
        <div className="rounded-2xl border border-white/10 bg-card p-8 text-center">
          <Usb className="mx-auto h-10 w-10 text-textSecondary" />
          <p className="mt-3 text-base font-semibold text-white">{t('noUsbHistory')}</p>
          <p className="mt-1 text-sm text-textSecondary">{t('noUsbHistoryDesc')}</p>
        </div>
      )}
    </section>
  );
}
