import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Clock, CheckCircle, ArrowUpCircle } from 'lucide-react';

export function UpdateModal() {
  const [show, setShow] = useState(false);
  const [version, setVersion] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    window.checkerApi.onUpdateAvailable((info) => {
      setVersion(info.version);
      setShow(true);
    });

    window.checkerApi.onUpdateProgress((percent) => {
      setProgress(percent);
    });

    window.checkerApi.onUpdateDownloaded(() => {
      setDownloaded(true);
      setDownloading(false);
    });
  }, []);

  const handleUpdate = async () => {
    if (downloaded) {
      window.checkerApi.installUpdate();
      return;
    }
    setDownloading(true);
    window.checkerApi.downloadUpdate();
  };

  const handleLater = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full max-w-[480px] rounded-[24px] border border-violet/30 bg-[#0a0f1f] p-8 shadow-2xl"
        >
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet/10 border border-violet/30">
              <ArrowUpCircle className="h-8 w-8 text-violet" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-center text-xl font-bold text-white">
            Доступно обновление
          </h2>
          <p className="mt-2 text-center text-sm text-textSecondary">
            Версия {version} готова к установке
          </p>

          {/* Dev Log */}
          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 max-h-[200px] overflow-y-auto">
            <p className="text-xs font-bold uppercase tracking-wider text-violet mb-2">Dev-log v1.0.15</p>
            <ul className="space-y-1.5 text-xs text-textSecondary">
              <li>• Глубокий анализ: 12 источников проверки</li>
              <li>• USN Journal + Amcache (ловит удалённые читы)</li>
              <li>• Проверка подписей системных файлов</li>
              <li>• Обнаружение подменённых DLL</li>
              <li>• Белый список безопасных программ</li>
            </ul>
          </div>

          {/* Progress */}
          {downloading && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-textSecondary mb-1">
                <span>Скачивание...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet to-purple-400 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {downloaded && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-success/10 border border-success/30 px-4 py-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm text-success">Обновление скачано. Нажмите "Установить"</span>
            </div>
          )}

          {/* Buttons */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleLater}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-textSecondary transition hover:bg-white/10 hover:text-white"
            >
              <Clock className="inline h-4 w-4 mr-1.5" />
              Напомнить позже
            </button>
            <button
              onClick={handleUpdate}
              disabled={downloading}
              className="flex-1 rounded-xl bg-violet py-3 text-sm font-semibold text-white transition hover:bg-violet/90 disabled:opacity-50"
            >
              <Download className="inline h-4 w-4 mr-1.5" />
              {downloaded ? 'Установить' : downloading ? 'Скачивание...' : 'Обновить'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
