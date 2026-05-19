import { contextBridge, ipcRenderer } from 'electron';

// Launcher API (auth, news, updates)
contextBridge.exposeInMainWorld('launcherApi', {
  login: (username: string, password: string, remember: boolean) => ipcRenderer.invoke('launcher:login', username, password, remember),
  autoLogin: () => ipcRenderer.invoke('launcher:autoLogin'),
  getNews: () => ipcRenderer.invoke('launcher:getNews'),
  getLocalVersion: () => ipcRenderer.invoke('launcher:getLocalVersion'),
  checkForUpdates: () => ipcRenderer.invoke('launcher:checkForUpdates'),
  saveAccounts: (data: string) => ipcRenderer.invoke('accounts:save', data),
  loadAccounts: () => ipcRenderer.invoke('accounts:load'),
  fetchAdmins: () => ipcRenderer.invoke('admins:fetch'),
  updateAdmins: (admins: string[]) => ipcRenderer.invoke('admins:update', admins),
  registerUser: (username: string, password?: string) => ipcRenderer.invoke('admins:registerUser', username, password),
  changePassword: (username: string, newPassword: string) => ipcRenderer.invoke('admins:changePassword', username, newPassword),
  saveCheck: (check: { target: string; result: string; checker: string; comment: string; date: string }) => ipcRenderer.invoke('admins:saveCheck', check),
  fetchReports: () => ipcRenderer.invoke('reports:fetch'),
  createReport: (report: any) => ipcRenderer.invoke('reports:create', report),
  updateReport: (report: any) => ipcRenderer.invoke('reports:update', report),
});

// Checker API (scan, browser history, system info, etc.)
contextBridge.exposeInMainWorld('checkerApi', {
  runScan: () => ipcRenderer.invoke('checker:runScan'),
  runBrowserHistoryCheck: () => ipcRenderer.invoke('checker:runBrowserHistoryCheck'),
  getSystemInfo: () => ipcRenderer.invoke('checker:getSystemInfo'),
  getSteamAccounts: () => ipcRenderer.invoke('checker:getSteamAccounts'),
  getUsbHistory: () => ipcRenderer.invoke('checker:getUsbHistory'),
  getProgramAnalysis: () => ipcRenderer.invoke('checker:getProgramAnalysis'),
  autoCheckGTA: () => ipcRenderer.invoke('checker:autoCheckGTA'),
  autoCheckKeys: () => ipcRenderer.invoke('checker:autoCheckKeys'),
  deepScan: () => ipcRenderer.invoke('checker:deepScan'),
  startKeyListener: () => ipcRenderer.invoke('checker:startKeyListener'),
  stopKeyListener: () => ipcRenderer.invoke('checker:stopKeyListener'),
  onKeyPressed: (callback: (key: string) => void) => {
    ipcRenderer.on('keyCheck:pressed', (_e, key) => callback(key));
  },
  healthPing: () => ipcRenderer.invoke('checker:healthPing'),
  getDiskUsage: () => ipcRenderer.invoke('checker:getDiskUsage'),
  getInternetSpeed: () => ipcRenderer.invoke('checker:getInternetSpeed'),
  getNetworkUsage: () => ipcRenderer.invoke('checker:getNetworkUsage'),
  getRecentFiles: () => ipcRenderer.invoke('checker:getRecentFiles'),
  openFolder: (path: string) => ipcRenderer.send('checker:openFolder', path),
  openExternal: (url: string) => ipcRenderer.send('checker:openExternal', url),
  launchUtility: (id: number) => ipcRenderer.send('checker:launchUtility', id),
  sendWebhook: (data: { target: string; result: string; checker: string; comment: string }) => ipcRenderer.invoke('checker:sendWebhook', data),
  // Window controls
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),
  // Updater
  onUpdateAvailable: (callback: (info: { version: string; releaseNotes: string }) => void) => {
    ipcRenderer.on('updater:available', (_e, info) => callback(info));
  },
  onUpdateProgress: (callback: (percent: number) => void) => {
    ipcRenderer.on('updater:progress', (_e, percent) => callback(percent));
  },
  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on('updater:downloaded', () => callback());
  },
  onUtilityNotFound: (callback: (name: string) => void) => {
    ipcRenderer.on('utility:notFound', (_e, name) => callback(name));
  },
  onUtilityDownloading: (callback: (name: string) => void) => {
    ipcRenderer.on('utility:downloading', (_e, name) => callback(name));
  },
  onUtilityReady: (callback: (name: string) => void) => {
    ipcRenderer.on('utility:ready', (_e, name) => callback(name));
  },
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
});
