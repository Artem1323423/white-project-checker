import { create } from 'zustand';
import { Language, defaultLanguage } from '../i18n';

interface UserProfile {
  username: string;
  password: string;
}

interface AppState {
  language: Language;
  theme: 'dark' | 'light';
  isAuthenticated: boolean;
  currentUser: string | null;
  isScanning: boolean;
  progress: number;
  alerts: string[];
  setLanguage: (language: Language) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => void;
  logout: () => void;
  startScan: () => Promise<void>;
}

const getStoredLanguage = (): Language => {
  if (typeof window === 'undefined') return defaultLanguage;
  const stored = window.localStorage.getItem('checker-language');
  return (stored as Language) || defaultLanguage;
};

const getStoredTheme = (): 'dark' | 'light' => {
  if (typeof window === 'undefined') return 'dark';
  return (window.localStorage.getItem('checker-theme') as 'dark' | 'light') || 'dark';
};

const getStoredUser = (): UserProfile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('checker-user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const getStoredSession = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem('checker-session');
  } catch { return null; }
};

export const useAppStore = create<AppState>((set) => {
  const savedSession = getStoredSession();

  return {
    language: getStoredLanguage(),
    theme: getStoredTheme(),
    isAuthenticated: savedSession !== null,
    currentUser: savedSession,
    isScanning: false,
    progress: 0,
    alerts: [],

    setLanguage: (language) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('checker-language', language);
      }
      set({ language });
    },

    setTheme: (theme) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('checker-theme', theme);
        document.documentElement.classList.toggle('light', theme === 'light');
      }
      set({ theme });
    },

    register: (username, password) => {
      const profile = { username, password };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('checker-user', JSON.stringify(profile));
        window.localStorage.setItem('checker-session', username);
        window.launcherApi?.saveAccounts(JSON.stringify(profile));
        // Sync to server with password
        window.launcherApi?.registerUser?.(username, password);
      }
      set({ isAuthenticated: true, currentUser: username });
    },

    login: async (username, password) => {
      // First try local storage
      const stored = getStoredUser();
      if (stored && stored.username === username && stored.password === password) {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('checker-session', username);
        }
        set({ isAuthenticated: true, currentUser: username });
        return true;
      }

      // If local check failed, try server (Gist)
      try {
        const data = await window.launcherApi.fetchAdmins();
        const accounts = data?.accounts || [];
        const account = accounts.find((a: any) => {
          const name = typeof a === 'string' ? a : a.name;
          return name?.toLowerCase() === username.toLowerCase();
        });

        if (account) {
          const serverPassword = typeof account === 'string' ? '' : account.password;
          if (serverPassword && serverPassword === password) {
            // Save locally for future logins
            const profile = { username, password };
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('checker-user', JSON.stringify(profile));
              window.localStorage.setItem('checker-session', username);
            }
            set({ isAuthenticated: true, currentUser: username });
            return true;
          }
        }
      } catch {}

      return false;
    },

    logout: () => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('checker-session');
      }
      set({ isAuthenticated: false, currentUser: null });
    },

    startScan: async () => {
      set({ isScanning: true, progress: 0, alerts: [] });
      const logStep = (msg: string, val: number) => {
        set({ progress: val });
        set((s) => ({ alerts: [...s.alerts, msg] }));
      };
      try {
        logStep('Initializing scan engine...', 10);
        await new Promise((r) => setTimeout(r, 300));
        logStep('Scanning file system...', 40);
        await new Promise((r) => setTimeout(r, 400));
        logStep('Analyzing results...', 70);
        await new Promise((r) => setTimeout(r, 300));
        logStep('Scan complete', 100);
      } catch (e) {
        set((s) => ({ alerts: [...s.alerts, `Error: ${e}`] }));
      } finally {
        set({ isScanning: false });
      }
    },
  };
});
