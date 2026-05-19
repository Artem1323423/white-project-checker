import { useAppStore } from '../store/useAppStore';
import { translations, defaultLanguage, Language } from '../i18n';

export function useTranslation() {
  const language = useAppStore((state) => state.language);
  const t = (key: string) => {
    const locale = translations[language] || translations[defaultLanguage];
    return locale[key] || translations[defaultLanguage][key] || key;
  };

  return { t, language };
}
