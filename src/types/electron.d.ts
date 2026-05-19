export interface LoginResponse {
  token: string;
  expiresAt: number;
  profile: {
    avatar: string;
    nickname: string;
    role: string;
    subscription: string;
    status: string;
  };
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  severity: 'maintenance' | 'announcement' | 'changelog';
  date: string;
}

export interface SystemInfo {
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

export interface SteamAccount {
  username: string;
  steamId: string;
  platform: string;
  gtaHours: number;
  vacBanned: boolean;
}

export interface UsbDevice {
  name: string;
  deviceId: string;
  lastConnected: string;
  serial?: string;
}

export interface ProgramEntry {
  name: string;
  path: string;
  type: string;
  lastLaunch: string;
  launchCount: number;
  isCheat: boolean;
  cheatName?: string;
  exists: boolean;
}

declare global {
  interface Window {
    launcherApi: {
      login: (username: string, password: string, remember: boolean) => Promise<LoginResponse>;
      autoLogin: () => Promise<LoginResponse | null>;
      getNews: () => Promise<NewsItem[]>;
      getLocalVersion: () => Promise<string>;
      checkForUpdates: () => Promise<any[]>;
      saveAccounts: (data: string) => Promise<void>;
      loadAccounts: () => Promise<string | null>;
      fetchAdmins: () => Promise<{ admins: any[]; accounts: any[]; checks?: any[]; bans?: Record<string, string> }>;
      updateAdmins: (admins: any) => Promise<boolean>;
      registerUser: (username: string, password?: string) => Promise<boolean>;
      changePassword: (username: string, newPassword: string) => Promise<boolean>;
      saveCheck: (check: { target: string; result: string; checker: string; comment: string; date: string }) => Promise<boolean>;
      fetchReports: () => Promise<any[]>;
      createReport: (report: any) => Promise<boolean>;
      updateReport: (report: any) => Promise<boolean>;
    };
    checkerApi: {
      runScan: () => Promise<{ scanned: number; suspicious: Array<{ path: string; reason: string }>; targets: string[]; summary: string }>;
      runBrowserHistoryCheck: () => Promise<{ browser: string; entries: Array<{ browser: string; title: string; url: string; keyword: string; count: number; timestamp: string }> }>;
      getSystemInfo: () => Promise<SystemInfo>;
      getSteamAccounts: () => Promise<SteamAccount[]>;
      getUsbHistory: () => Promise<UsbDevice[]>;
      getProgramAnalysis: () => Promise<ProgramEntry[]>;
      autoCheckGTA: () => Promise<{ running: boolean; message: string }>;
      autoCheckKeys: () => Promise<{ results: string[] }>;
      deepScan: () => Promise<{ results: string[] }>;
      startKeyListener: () => Promise<boolean>;
      stopKeyListener: () => Promise<boolean>;
      onKeyPressed: (callback: (key: string) => void) => void;
      healthPing: () => Promise<{ status: string; timestamp: number }>;
      getDiskUsage: () => Promise<{ used: number; total: number; percent: number }>;
      getInternetSpeed: () => Promise<string>;
      getNetworkUsage: () => Promise<Array<{ name: string; usage: string; bytes: number }>>;
      getRecentFiles: () => Promise<string[]>;
      openFolder: (path: string) => void;
      openExternal: (url: string) => void;
      launchUtility: (id: number) => void;
      sendWebhook: (data: { target: string; result: string; checker: string; comment: string }) => Promise<boolean>;
      windowMinimize: () => void;
      windowMaximize: () => void;
      windowClose: () => void;
      onUpdateAvailable: (callback: (info: { version: string; releaseNotes: string }) => void) => void;
      onUpdateProgress: (callback: (percent: number) => void) => void;
      onUpdateDownloaded: (callback: () => void) => void;
      onUtilityNotFound: (callback: (name: string) => void) => void;
      onUtilityDownloading: (callback: (name: string) => void) => void;
      onUtilityReady: (callback: (name: string) => void) => void;
      downloadUpdate: () => Promise<void>;
      installUpdate: () => Promise<void>;
    };
  }
}

export {};
