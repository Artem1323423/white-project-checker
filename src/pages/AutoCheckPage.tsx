import { useState, useEffect } from 'react';
import { Target, Search, Zap, Shield, AlertTriangle, XCircle, Keyboard, ScanSearch } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

const CHEAT_HOTKEYS = [
  { keys: 'F5', code: 'F5', desc: 'Kiddions / Stand menu' },
  { keys: 'F6', code: 'F6', desc: 'Mod menu toggle' },
  { keys: 'F7', code: 'F7', desc: 'Trainer menu' },
  { keys: 'F8', code: 'F8', desc: 'FiveM / Script menu' },
  { keys: 'F9', code: 'F9', desc: 'Cheat overlay' },
  { keys: 'F10', code: 'F10', desc: 'Mod menu alt' },
  { keys: 'F11', code: 'F11', desc: 'Fullscreen / Overlay' },
  { keys: 'Insert', code: 'Insert', desc: 'ImGui menu (большинство читов)' },
  { keys: 'Home', code: 'Home', desc: 'Stand / 2Take1 menu' },
  { keys: 'Delete', code: 'Delete', desc: 'Cheat toggle' },
  { keys: 'Numpad0', code: 'Numpad0', desc: 'Trainer select' },
  { keys: 'Numpad5', code: 'Numpad5', desc: 'Trainer confirm' },
  { keys: 'PageUp', code: 'PageUp', desc: 'Menu scroll' },
  { keys: 'PageDown', code: 'PageDown', desc: 'Menu scroll' },
  { keys: '~', code: 'Backquote', desc: 'Console / Script hook' },
];

export function AutoCheckPage() {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(false);
  const [checkingKeys, setCheckingKeys] = useState(false);
  const [deepScanning, setDeepScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const [keyResults, setKeyResults] = useState<string[]>([]);
  const [deepResults, setDeepResults] = useState<string[]>([]);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [keyListening, setKeyListening] = useState(false);

  // Listen for global key presses (works even when GTA is in focus)
  useEffect(() => {
    if (!keyListening) return;

    // Start global listener
    window.checkerApi.startKeyListener?.();

    // Map from PowerShell key names to our codes
    const keyMap: Record<string, string> = {
      'F5': 'F5', 'F6': 'F6', 'F7': 'F7', 'F8': 'F8', 'F9': 'F9',
      'F10': 'F10', 'F11': 'F11', 'Insert': 'Insert', 'Home': 'Home',
      'Delete': 'Delete', 'Numpad0': 'Numpad0', 'Numpad5': 'Numpad5',
      'PageUp': 'PageUp', 'PageDown': 'PageDown', 'Backquote': 'Backquote',
    };

    window.checkerApi.onKeyPressed?.((key: string) => {
      const code = keyMap[key] || key;
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.add(code);
        return next;
      });
    });

    return () => {
      window.checkerApi.stopKeyListener?.();
    };
  }, [keyListening]);

  const startCheck = async () => {
    setChecking(true);
    setError(null);
    setResults([]);
    try {
      const res = await window.checkerApi.autoCheckGTA();
      if (!res.running) {
        setError(t('gtaNotRunning'));
      } else {
        const lines = (res.message || '').split('\n').filter((l: string) => l.trim());
        setResults(lines);
      }
    } catch (e: any) {
      setError(e?.message || 'Error');
    }
    setChecking(false);
  };

  const startKeyCheck = async () => {
    setCheckingKeys(true);
    setKeyResults([]);
    setPressedKeys(new Set());
    setKeyListening(true);
    try {
      const res = await window.checkerApi.autoCheckKeys();
      if (res && res.results) {
        setKeyResults(res.results);
      } else {
        setKeyResults(['✅ Проверка завершена']);
      }
    } catch (e: any) {
      console.error('[KeyCheck]', e);
      setKeyResults([`❌ Ошибка: ${e?.message || 'Неизвестная ошибка'}`]);
    }
    setCheckingKeys(false);
  };

  const startDeepScan = async () => {
    setDeepScanning(true);
    setDeepResults([]);
    try {
      const res = await window.checkerApi.deepScan();
      if (res && res.results) {
        setDeepResults(res.results);
      }
    } catch (e: any) {
      setDeepResults([`❌ Ошибка: ${e?.message || 'Неизвестная ошибка'}`]);
    }
    setDeepScanning(false);
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Target className="h-7 w-7 text-violet" />
          <h1 className="text-3xl font-bold text-white">{t('autoCheckTitle')}</h1>
        </div>
        <p className="mt-2 text-sm text-textSecondary">{t('autoCheckDesc')}</p>
      </div>

      {/* Features */}
      <div className="rounded-2xl border border-white/10 bg-card p-6 space-y-5">
        <div className="flex items-center gap-4">
          <Search className="h-5 w-5 text-textSecondary" />
          <p className="text-sm text-white">{t('checkAllKeys')}</p>
        </div>
        <div className="flex items-center gap-4">
          <Zap className="h-5 w-5 text-textSecondary" />
          <p className="text-sm text-white">{t('fastDetection')}</p>
        </div>
        <div className="flex items-center gap-4">
          <Shield className="h-5 w-5 text-textSecondary" />
          <p className="text-sm text-white">{t('safeCheck')}</p>
        </div>

        {/* Buttons */}
        <div className="flex justify-center gap-3 pt-4">
          <button
            onClick={startCheck}
            disabled={checking}
            className="rounded-full bg-violet px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet/90 hover:shadow-lg hover:shadow-violet/20 disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              {checking ? '...' : t('startCheck')}
            </div>
          </button>
          <button
            onClick={startKeyCheck}
            disabled={checkingKeys}
            className="rounded-full border border-violet/30 bg-violet/10 px-6 py-3 text-sm font-semibold text-violet transition hover:bg-violet/20 disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              {checkingKeys ? '...' : 'Проверка клавиш'}
            </div>
          </button>
          <button
            onClick={startDeepScan}
            disabled={deepScanning}
            className="rounded-full border border-cyan/30 bg-cyan/10 px-6 py-3 text-sm font-semibold text-cyan transition hover:bg-cyan/20 disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <ScanSearch className="h-4 w-4" />
              {deepScanning ? 'Сканирование...' : 'Глубокий анализ'}
            </div>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/5 px-5 py-3">
            <XCircle className="h-4 w-4 text-danger" />
            <span className="text-sm text-danger">{error}</span>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-4 max-h-[300px] overflow-y-auto">
            {results.map((line, idx) => (
              <p key={idx} className={`text-xs ${line.includes('⚠️') ? 'text-yellow-400' : line.includes('✅') ? 'text-success' : line.includes('🔴') ? 'text-red-500 font-bold' : 'text-textSecondary'}`}>
                {line}
              </p>
            ))}
          </div>
        )}

        {/* Key check results */}
        {keyResults.length > 0 && keyResults[0].includes('❌') && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/5 px-5 py-3">
            <XCircle className="h-4 w-4 text-danger" />
            <span className="text-sm text-danger">{keyResults[0].replace('❌ ', '')}</span>
          </div>
        )}
        {keyResults.length > 0 && !keyResults[0].includes('❌') && (
          <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-violet">🎹 Нажмите клавиши — нажатые подсветятся зелёным</p>
              <span className="text-[10px] text-textSecondary">{pressedKeys.size}/{CHEAT_HOTKEYS.length} нажато</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CHEAT_HOTKEYS.map((hotkey) => {
                const isPressed = pressedKeys.has(hotkey.code);
                return (
                  <div
                    key={hotkey.code}
                    className={`rounded-lg border px-3 py-2 transition ${
                      isPressed
                        ? 'border-success/50 bg-success/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <p className={`text-xs font-bold ${isPressed ? 'text-success' : 'text-textPrimary'}`}>
                      {isPressed ? '✅' : '⬜'} {hotkey.keys}
                    </p>
                    <p className="text-[10px] text-textSecondary mt-0.5">{hotkey.desc}</p>
                  </div>
                );
              })}
            </div>
            {pressedKeys.size === CHEAT_HOTKEYS.length && (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-2">
                <Shield className="h-4 w-4 text-success" />
                <span className="text-xs text-success font-medium">Все клавиши нажаты — проверка пройдена</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Deep scan results */}
      {deepResults.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-card p-5">
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {deepResults.map((line, idx) => (
              <p key={idx} className={`text-xs ${line.includes('🔴') ? 'text-red-500 font-bold' : line.includes('⚠️') ? 'text-yellow-400' : line.includes('✅') ? 'text-success' : line.includes('━━━') ? 'text-violet font-medium' : 'text-textSecondary'}`}>
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Important notice */}
      <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <p className="text-sm font-semibold text-yellow-400">{t('important')}</p>
        </div>
        <p className="mt-2 text-sm text-textSecondary">{t('importantDesc')}</p>
      </div>
    </section>
  );
}
