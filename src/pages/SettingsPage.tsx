import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { Language } from '../i18n';
import { Settings, Globe, Sun, Moon } from 'lucide-react';

const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

export function SettingsPage() {
  const { t, language } = useTranslation();
  const { setLanguage, theme, setTheme } = useAppStore();

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Settings className="h-7 w-7 text-violet" />
          <h1 className="text-3xl font-bold text-textPrimary">{t('settings')}</h1>
        </div>
        <p className="mt-2 text-sm text-textSecondary">{t('panelDescription')}</p>
      </div>

      {/* Theme */}
      <div className="rounded-2xl border border-white/10 bg-card p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-textSecondary mb-4">
          {t('display')}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-center gap-3 rounded-xl border py-4 text-sm font-medium transition ${
              theme === 'dark'
                ? 'border-violet/50 bg-violet/10 text-textPrimary'
                : 'border-white/10 bg-white/5 text-textSecondary hover:text-textPrimary'
            }`}
          >
            <Moon className="h-5 w-5" />
            Тёмная
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center justify-center gap-3 rounded-xl border py-4 text-sm font-medium transition ${
              theme === 'light'
                ? 'border-violet/50 bg-violet/10 text-textPrimary'
                : 'border-white/10 bg-white/5 text-textSecondary hover:text-textPrimary'
            }`}
          >
            <Sun className="h-5 w-5" />
            Светлая
          </button>
        </div>
      </div>

      {/* Language */}
      <div className="rounded-2xl border border-white/10 bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-4 w-4 text-violet" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-textSecondary">
            Language / {t('languageSelect')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                language === lang.code
                  ? 'border-violet/50 bg-violet/10 text-textPrimary font-medium'
                  : 'border-white/10 bg-white/5 text-textSecondary hover:border-white/20 hover:text-textPrimary'
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Launch Options */}
      <div className="rounded-2xl border border-white/10 bg-card p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-textSecondary">
          {t('launchBehavior')}
        </p>
        <div className="mt-4 space-y-3">
          <div className="rounded-xl bg-white/5 p-4 text-sm text-textSecondary">{t('autoScan')}</div>
          <div className="rounded-xl bg-white/5 p-4 text-sm text-textSecondary">{t('secureToken')}</div>
          <div className="rounded-xl bg-white/5 p-4 text-sm text-textSecondary">{t('logPersistence')}</div>
        </div>
      </div>
    </section>
  );
}
