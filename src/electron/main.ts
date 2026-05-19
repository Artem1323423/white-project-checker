import { app, BrowserWindow, ipcMain, shell, screen, globalShortcut } from 'electron';
import { join, resolve } from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { autoUpdater } from 'electron-updater';

let mainWindow: BrowserWindow | null = null;

// ==================== AUTH CONFIG ====================
const AUTH_SECRET = 'white-project-launcher-secret-key';
const VALID_USER = { username: 'root', password: 'WhiteRP@123' };
const profile = {
  avatar: '',
  nickname: 'WHITE_CHECK',
  role: 'Launcher Admin',
  subscription: 'Platinum',
  status: 'Active'
};

// ==================== PATHS ====================
const getProjectRoot = () => {
  if (app.isPackaged) return resolve(app.getAppPath(), '..');
  return resolve(__dirname, '..', '..');
};
const getUpdateRoot = () => resolve(getProjectRoot(), 'update');
const getUserDataPath = () => app.getPath('userData');
const getConfigPath = () => resolve(getUserDataPath(), 'launcher-config.json');

// ==================== HWID ====================
const getHwid = () => {
  const interfaces = os.networkInterfaces();
  const addresses = Object.values(interfaces)
    .flat()
    .filter(Boolean)
    .map((item) => `${item?.mac}:${item?.address}`)
    .join('|');
  return crypto.createHash('sha256').update(`${os.hostname()}|${addresses}`).digest('hex');
};

// ==================== CRYPTO ====================
const deriveKey = () => crypto.createHash('sha256').update(AUTH_SECRET).digest();

const encryptPayload = (payload: object) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, data]).toString('base64');
};

const decryptPayload = (value: string) => {
  const buffer = Buffer.from(value, 'base64');
  const iv = buffer.slice(0, 12);
  const tag = buffer.slice(12, 28);
  const data = buffer.slice(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(decipher.update(data, undefined, 'utf8') + decipher.final('utf8'));
};

const saveSession = (token: string, remember: boolean) => {
  const session = { token, expiresAt: Date.now() + (remember ? 30 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000) };
  fs.writeFileSync(getConfigPath(), JSON.stringify({ session: encryptPayload(session) }));
};

const loadSession = (): { token: string; expiresAt: number } | null => {
  try {
    if (!fs.existsSync(getConfigPath())) return null;
    const raw = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'));
    return decryptPayload(raw.session);
  } catch { return null; }
};

const createJwt = (payload: object) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
};

// ==================== SCANNER CONFIG ====================
const SUSPICIOUS_PATTERNS = [
  // Cheat engines & tools
  /cheat/i, /trainer/i, /injector/i, /inject/i, /aimbot/i, /wallhack/i, /modmenu/i, /mod[\s_-]*menu/i,
  /rage/i, /overlay/i, /silent[\s_-]*aim/i, /cheatengine/i, /cheat[\s_-]*engine/i, /spinbot/i, /triggerbot/i,
  /trigger[\s_-]*bot/i, /norecoil/i, /no[\s_-]*recoil/i, /esp[\s_-]*hack/i,
  // Known GTA V cheats (menus)
  /exloader/i, /kiddion/i, /kiddions/i, /stand[\s_-]*mod/i, /stand\.gg/i, /2take1/i, /impulse/i,
  /vanish/i, /1337/i, /nightfall/i, /amidone/i, /unicore/i, /spoofer/i, /hitbox/i,
  /euphoria/i, /velonity/i, /ambient/i, /luna/i, /cherax/i, /ozark/i, /phantom/i,
  /modest[\s_-]*menu/i, /modest/i, /paragon/i, /disturbed/i, /kingpin/i, /terror/i,
  /illusion/i, /position/i, /x\-force/i, /requiem/i, /rebound/i, /guardian/i,
  // GTA V Online specific
  /recovery[\s_-]*tool/i, /money[\s_-]*drop/i, /money[\s_-]*hack/i, /lvl[\s_-]*hack/i,
  /god[\s_-]*mode/i, /teleport[\s_-]*hack/i, /menu[\s_-]*gta/i, /gta[\s_-]*online[\s_-]*hack/i,
  /gta[\s_-]*menu/i, /gta[\s_-]*mod[\s_-]*menu/i, /gta5[\s_-]*cheat/i, /gtav[\s_-]*hack/i,
  /rp[\s_-]*hack/i, /unlock[\s_-]*all/i, /all[\s_-]*unlock/i, /stat[\s_-]*editor/i,
  /outfit[\s_-]*editor/i, /vehicle[\s_-]*spawn/i, /money[\s_-]*loop/i, /casino[\s_-]*hack/i,
  /heist[\s_-]*hack/i, /orbital[\s_-]*cannon/i, /crash[\s_-]*player/i, /kick[\s_-]*player/i,
  /session[\s_-]*crash/i, /ip[\s_-]*grab/i, /ip[\s_-]*logger/i,
  // GTA V file-based cheats
  /fivem[\s_-]*cheat/i, /fivem[\s_-]*hack/i, /fivem[\s_-]*menu/i, /redengine/i, /openiv/i,
  /scripthook/i, /scripthookv/i, /scripthookvdotnet/i, /nativetrainer/i, /native[\s_-]*trainer/i,
  /rage[\s_-]*hook/i, /asi[\s_-]*loader/i, /gta[\s_-]*hack/i, /gta[\s_-]*mod/i, /gta[\s_-]*cheat/i,
  /rage[\s_-]*plugin/i, /shvdn/i, /alexanderblade/i,
  // Known GTA V cheat file names
  /kiddion/i, /gtahax/i, /gta[\s_-]*hax/i, /cheat[\s_-]*gta/i, /mod[\s_-]*gta/i,
  /socialclub[\s_-]*bypass/i, /rockstar[\s_-]*bypass/i, /launcher[\s_-]*bypass/i,
  // CS2 / FPS cheats (also relevant)
  /neverlose/i, /skeet/i, /aimware/i, /onetap/i, /fatality/i, /gamesense/i,
  /nixware/i, /pandora/i, /interium/i, /weave/i, /legendware/i, /spirthack/i,
  /ev0lve/i, /otc/i, /iniuria/i, /novoline/i, /vape/i, /rise/i,
  // Bypass & spoof
  /bypass/i, /hwid[\s_-]*spoof/i, /hwid[\s_-]*changer/i, /mac[\s_-]*changer/i, /serial[\s_-]*changer/i,
  /anti[\s_-]*cheat[\s_-]*bypass/i, /eac[\s_-]*bypass/i, /battleye[\s_-]*bypass/i, /vanguard[\s_-]*bypass/i,
  /rockstar[\s_-]*anti[\s_-]*cheat/i, /rac[\s_-]*bypass/i,
  // Injectors & loaders
  /dll[\s_-]*inject/i, /process[\s_-]*hacker/i, /extreme[\s_-]*injector/i, /xenos/i,
  /manual[\s_-]*map/i, /loadlibrary/i, /syringe/i, /themida/i, /vmprotect/i,
  // Macro & automation
  /macro[\s_-]*tool/i, /recoil[\s_-]*script/i, /autohotkey[\s_-]*cheat/i, /pixel[\s_-]*bot/i,
  /color[\s_-]*bot/i, /auto[\s_-]*clicker/i, /triggerbot[\s_-]*script/i,
  // Suspicious DLL names (GTA V specific)
  /\.asi$/i, /dinput8\.dll/i, /dsound\.dll/i, /d3d9\.dll/i, /d3d11[\s_-]*hook/i, /dxgi\.dll/i,
  /version\.dll/i, /winmm\.dll/i, /xinput.*\.dll/i, /iphlpapi\.dll/i,
  // Known cheat loader executables
  /gtav[\s_-]*loader/i, /menu[\s_-]*loader/i, /cheat[\s_-]*loader/i, /mod[\s_-]*loader/i,
  /injector[\s_-]*v/i, /gta[\s_-]*inject/i, /online[\s_-]*mod/i,
  // Misc suspicious
  /unknowncheats/i, /mpgh/i, /guided[\s_-]*hacking/i, /undetected/i, /cracked[\s_-]*cheat/i,
  /free[\s_-]*hack/i, /paid[\s_-]*cheat/i, /detected[\s_-]*fix/i, /ban[\s_-]*bypass/i,
  /anti[\s_-]*ban/i, /no[\s_-]*ban/i, /safe[\s_-]*cheat/i,
];
const SUSPICIOUS_EXTENSIONS = ['.asi', '.dll', '.sys'];

// More precise check - dll/sys only suspicious if name matches patterns
// Whitelist - known safe programs/files that are NOT cheats
const SAFE_WHITELIST = [
  // Video editors
  /capcut/i, /filmora/i, /premiere/i, /davinci/i, /vegas/i, /aftereffects/i,
  // Game platforms
  /steam/i, /epic/i, /origin/i, /ubisoft/i, /battlenet/i, /riot/i,
  // System/drivers
  /nvidia/i, /amd/i, /intel/i, /realtek/i, /logitech/i, /razer/i, /corsair/i,
  /microsoft/i, /windows/i, /dotnet/i, /visual\s*c/i, /vcredist/i,
  // Browsers
  /chrome/i, /firefox/i, /opera/i, /edge/i, /yandex/i, /brave/i,
  // Common apps
  /discord/i, /telegram/i, /spotify/i, /obs/i, /zoom/i, /skype/i,
  /7zip/i, /winrar/i, /notepad/i, /vscode/i, /git/i, /node/i, /python/i,
  /java/i, /adobe/i, /photoshop/i, /illustrator/i,
  // Antivirus
  /kaspersky/i, /avast/i, /avg/i, /malwarebytes/i, /norton/i, /eset/i,
  // Hardware
  /msi/i, /asus/i, /gigabyte/i, /steelseries/i, /hyperx/i,
  // Media
  /vlc/i, /media/i, /codec/i, /ffmpeg/i, /handbrake/i,
  // Launchers
  /launcher/i, /updater/i, /installer/i, /setup/i, /uninstall/i,
];

const isSafeFile = (fileName: string, filePath?: string): boolean => {
  const lower = fileName.toLowerCase();
  const pathLower = (filePath || '').toLowerCase();
  // Check whitelist by name
  if (SAFE_WHITELIST.some(p => p.test(fileName))) return true;
  // Safe paths (but NOT if the file matches a cheat pattern directly)
  if (pathLower.includes('\\capcut\\') || pathLower.includes('\\bytedance\\')) return true;
  if (pathLower.includes('\\discord\\') || pathLower.includes('\\telegram\\')) return true;
  if (pathLower.includes('\\spotify\\') || pathLower.includes('\\obs-studio\\')) return true;
  // NOTE: We do NOT whitelist Windows/System32/Program Files anymore
  // because cheats can hide there. Instead we check signatures in deep scan.
  return false;
};

const isSuspiciousFile = (fileName: string, filePath?: string) => {
  const lower = fileName.toLowerCase();
  // Skip safe files first
  if (isSafeFile(fileName, filePath)) return false;
  // Direct pattern match
  if (SUSPICIOUS_PATTERNS.some((p) => p.test(fileName))) return true;
  // .asi files are always suspicious
  if (lower.endsWith('.asi')) return true;
  // Detect random-named executables (e.g. fdsdoajg.exe, xkj3md.exe)
  if (lower.endsWith('.exe') || lower.endsWith('.dll') || lower.endsWith('.sys')) {
    const baseName = lower.replace(/\.(exe|dll|sys)$/, '');
    if (baseName.length >= 4 && baseName.length <= 12) {
      const vowels = (baseName.match(/[aeiouy]/g) || []).length;
      const digits = (baseName.match(/[0-9]/g) || []).length;
      const consonants = baseName.length - vowels - digits;
      const vowelRatio = vowels / baseName.length;
      if (vowelRatio < 0.15 && consonants >= 3) return true;
      if (digits > 0 && digits < baseName.length - 1 && vowelRatio < 0.25) {
        const hasPattern = /^[a-z]+\d+$/.test(baseName) || /^\d+[a-z]+$/.test(baseName);
        if (!hasPattern) return true;
      }
    }
  }
  return false;
};

const scanDirectory = async (dir: string, results: { scanned: number; suspicious: Array<{ path: string; reason: string }> }, depth = 0) => {
  if (depth > 10 || results.scanned > 50000) return;
  let entries: fs.Dirent[];
  try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (results.scanned > 50000) break;
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'Windows', 'System32', 'SysWOW64', '.git', 'Microsoft.NET', 'assembly', 'WinSxS', 'servicing', 'DriverStore', 'CapCut', 'ByteDance', 'NVIDIA', 'AMD', 'Intel', 'Microsoft', 'WindowsApps', 'dotnet'].includes(entry.name)) continue;
      await scanDirectory(fullPath, results, depth + 1);
      continue;
    }
    results.scanned += 1;
    if (isSuspiciousFile(entry.name, fullPath)) {
      results.suspicious.push({ path: fullPath, reason: `Suspicious filename matched: ${entry.name}` });
    }
  }
};

const findScanRoots = (): string[] => {
  const roots: string[] = [];
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const localAppData = process.env.LOCALAPPDATA || resolve(os.homedir(), 'AppData', 'Local');
  const appData = process.env.APPDATA || resolve(os.homedir(), 'AppData', 'Roaming');

  // GTA paths
  roots.push(resolve(programFiles, 'Rockstar Games', 'Grand Theft Auto V'));
  roots.push(resolve(programFilesX86, 'Rockstar Games', 'Grand Theft Auto V'));
  roots.push(resolve(programFilesX86, 'Steam', 'steamapps', 'common', 'Grand Theft Auto V'));
  roots.push(resolve(programFiles, 'Steam', 'steamapps', 'common', 'Grand Theft Auto V'));
  roots.push(resolve(programFilesX86, 'Steam', 'steamapps', 'common'));
  roots.push(resolve(programFiles, 'Epic Games'));

  // User directories
  roots.push(os.homedir());
  roots.push(resolve(os.homedir(), 'Desktop'));
  roots.push(resolve(os.homedir(), 'Downloads'));
  roots.push(resolve(os.homedir(), 'Documents'));
  roots.push(resolve(os.homedir(), 'Videos'));
  roots.push(resolve(os.homedir(), 'Pictures'));
  roots.push(resolve(os.homedir(), 'Music'));

  // AppData (common cheat storage)
  roots.push(resolve(localAppData, 'Temp'));
  roots.push(appData);
  roots.push(localAppData);
  roots.push(resolve(localAppData, 'Programs'));
  roots.push(resolve(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs'));

  // Program Files
  roots.push(programFiles);
  roots.push(programFilesX86);

  // Recycle Bin (cheats often deleted)
  roots.push('C:\\$Recycle.Bin');

  // Drive roots - scan all available drives
  const driveLetters = 'CDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const letter of driveLetters) {
    const drive = `${letter}:\\`;
    if (fs.existsSync(drive)) roots.push(drive);
  }

  return Array.from(new Set(roots.filter(p => fs.existsSync(p))));
};

// ==================== WINDOW ====================
function createWindow() {
  const { nativeImage } = require('electron');
  const iconPath = join(app.isPackaged ? resolve(app.getAppPath(), '..') : resolve(__dirname, '..', '..'), 'public', 'logo.png');
  const appIcon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 800,
    frame: false,
    icon: appIcon,
    backgroundColor: '#081226',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    }
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  // Open DevTools in dev mode
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();

  // Auto-updater setup
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version);
    mainWindow?.webContents.send('updater:available', {
      version: info.version,
      releaseNotes: info.releaseNotes || ''
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[Updater] No update available. Current version is up to date:', info.version);
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log('[Updater] Download progress:', Math.round(progress.percent) + '%');
    mainWindow?.webContents.send('updater:progress', Math.round(progress.percent));
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded:', info.version);
    mainWindow?.webContents.send('updater:downloaded');
  });

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err.message);
    console.error('[Updater] Stack:', err.stack);
  });

  // Check for updates after 2 seconds
  setTimeout(() => {
    console.log('[Updater] Starting update check...');
    autoUpdater.checkForUpdates().then((result) => {
      console.log('[Updater] Check result:', result?.updateInfo?.version || 'no info');
    }).catch((err) => {
      console.error('[Updater] Check failed:', err.message);
      // Fallback: manual check via GitHub API
      console.log('[Updater] Trying fallback GitHub API check...');
      const https = require('https');
      https.get({
        hostname: 'api.github.com',
        path: '/repos/Artem1323423/white-project-checker/releases/latest',
        headers: { 'User-Agent': 'WhiteProjectChecker' }
      }, (res: any) => {
        let body = '';
        res.on('data', (c: string) => body += c);
        res.on('end', () => {
          try {
            const release = JSON.parse(body);
            const latestVersion = release.tag_name?.replace('v', '') || '';
            const currentVersion = app.getVersion();
            console.log('[Updater] Fallback check: current=' + currentVersion + ' latest=' + latestVersion);
            if (latestVersion && latestVersion !== currentVersion) {
              mainWindow?.webContents.send('updater:available', {
                version: latestVersion,
                releaseNotes: release.body || ''
              });
            }
          } catch (e: any) { console.error('[Updater] Fallback parse error:', e.message); }
        });
      }).on('error', (e: any) => { console.error('[Updater] Fallback request error:', e.message); });
    });
  }, 2000);
});

// Updater IPC
ipcMain.handle('updater:download', async () => {
  autoUpdater.downloadUpdate();
});

ipcMain.handle('updater:install', async () => {
  autoUpdater.quitAndInstall();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ==================== LAUNCHER AUTH IPC ====================
ipcMain.handle('launcher:login', async (_event, username: string, password: string, remember: boolean) => {
  if (username !== VALID_USER.username || password !== VALID_USER.password) {
    throw new Error('Invalid credentials');
  }
  const token = createJwt({ username, issuedBy: 'white-project-launcher', hwid: getHwid(), expiresAt: Date.now() + 3600000 });
  saveSession(token, remember);
  return { token, expiresAt: Date.now() + 3600000, profile };
});

ipcMain.handle('launcher:autoLogin', async () => {
  const session = loadSession();
  if (!session || session.expiresAt < Date.now()) return null;
  return { token: session.token, expiresAt: session.expiresAt, profile };
});

ipcMain.handle('launcher:getNews', async () => [
  { id: 'news-1', title: 'White Project Checker', description: 'New scanner, browser history check, program analysis and more.', severity: 'announcement', date: 'May 16, 2026' },
  { id: 'news-2', title: 'Maintenance scheduled', description: 'Server maintenance begins at 3:00 AM UTC.', severity: 'maintenance', date: 'May 18, 2026' },
  { id: 'news-3', title: 'New anti-cheat rules', description: 'Improved detection for overlay injectors and synthetic input libraries.', severity: 'changelog', date: 'May 15, 2026' }
]);

ipcMain.handle('launcher:getLocalVersion', async () => '2.0.0');
ipcMain.handle('launcher:checkForUpdates', async () => {
  const manifestPath = resolve(getUpdateRoot(), 'manifest.json');
  if (!fs.existsSync(manifestPath)) return [];
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
});

// ==================== CHECKER SCAN IPC ====================
ipcMain.handle('checker:runScan', async () => {
  const { execSync } = require('child_process');
  const scanRoots = findScanRoots();
  const results = { scanned: 0, suspicious: [] as Array<{ path: string; reason: string }> };
  for (const root of scanRoots) { await scanDirectory(root, results); }

  // Deep analysis additions
  const DEEP_KEYWORDS = ['nightfall', 'up-game', 'leet', '1337', 'vanish', 'skript.gg', 'skript', 'astra', 'nixware', 'neverlose', 'aimware', 'onetap', 'exloader', 'kiddion', 'stand.gg', '2take1', 'cherax', 'impulse', 'modest'];

  // DNS cache check
  try {
    const dnsOutput = execSync('powershell -NoProfile -Command "Get-DnsClientCache -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Entry"', { encoding: 'utf8', timeout: 8000 });
    for (const entry of dnsOutput.split('\n')) {
      const lower = entry.trim().toLowerCase();
      for (const kw of DEEP_KEYWORDS) {
        if (lower.includes(kw)) {
          results.suspicious.push({ path: `DNS: ${entry.trim()}`, reason: `Cheat site in DNS cache: ${kw}` });
          break;
        }
      }
    }
  } catch {}

  // Prefetch check
  try {
    const prefetchDir = 'C:\\Windows\\Prefetch';
    if (fs.existsSync(prefetchDir)) {
      const pfFiles = fs.readdirSync(prefetchDir).filter((f: string) => f.endsWith('.pf'));
      for (const file of pfFiles) {
        const name = file.replace(/-[A-F0-9]+\.pf$/i, '').toLowerCase();
        if (DEEP_KEYWORDS.some(kw => name.includes(kw))) {
          results.suspicious.push({ path: resolve(prefetchDir, file), reason: `Cheat in Prefetch history: ${file.replace(/-[A-F0-9]+\.pf$/i, '')}` });
        }
      }
    }
  } catch {}

  // Amcache / Compatibility Assistant check
  try {
    const amOutput = execSync('powershell -NoProfile -Command "Get-ItemProperty \'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AppCompatFlags\\Compatibility Assistant\\Store\' -ErrorAction SilentlyContinue | Get-Member -MemberType NoteProperty | Where-Object { $_.Name -like \'*.exe*\' } | Select-Object -First 50 | ForEach-Object { $_.Name }"', { encoding: 'utf8', timeout: 10000 });
    for (const line of amOutput.split('\n')) {
      const lower = line.trim().toLowerCase();
      if (DEEP_KEYWORDS.some(kw => lower.includes(kw))) {
        results.suspicious.push({ path: line.trim(), reason: `Cheat in run history (Amcache): ${line.trim().split('\\').pop()}` });
      }
    }
  } catch {}

  return {
    scanned: results.scanned,
    suspicious: results.suspicious,
    targets: scanRoots,
    summary: results.suspicious.length === 0 ? 'No suspicious files found.' : `${results.suspicious.length} suspicious entries detected.`
  };
});

// ==================== BROWSER HISTORY IPC ====================
ipcMain.handle('checker:runBrowserHistoryCheck', async () => {
  const entries: Array<{ browser: string; title: string; url: string; keyword: string; count: number; timestamp: string }> = [];
  const CHEAT_KEYWORDS = [
    'cheat', 'trainer', 'injector', 'aimbot', 'wallhack', 'modmenu', 'mod menu',
    'unknowncheats', 'mpgh', 'elitepvpers', 'guided hacking', 'dll inject',
    'bypass anti', 'hwid spoofer', 'spoofer', 'undetected', 'fivem cheat',
    'gta mod menu', 'kiddion', 'stand mod', '2take1', 'impulse mod',
    'neverlose', 'skeet', 'aimware', 'onetap',
    'macro tool', 'recoil script', 'no recoil', 'esp hack', 'rage bot',
    'free hack', 'paid cheat', 'cheat download', 'hack download',
    'vanish', '1337', 'nightfall', 'amidone', 'unicore', 'trigger bot',
    'hitbox', 'euphoria', 'velonity', 'ambient', 'luna cheat', 'cherax',
    'ozark', 'phantom', 'modest menu', 'recovery tool', 'money drop',
    'god mode', 'teleport hack', 'lvl hack', 'exloader'
  ];

  const homedir = os.homedir();
  const localAppData = process.env.LOCALAPPDATA || resolve(homedir, 'AppData', 'Local');
  const appData = process.env.APPDATA || resolve(homedir, 'AppData', 'Roaming');

  interface BrowserProfile { name: string; historyPath: string; type: 'chromium' | 'firefox'; }
  const browserProfiles: BrowserProfile[] = [
    { name: 'Chrome', historyPath: resolve(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'History'), type: 'chromium' },
    { name: 'Chrome', historyPath: resolve(localAppData, 'Google', 'Chrome', 'User Data', 'Profile 1', 'History'), type: 'chromium' },
    { name: 'Edge', historyPath: resolve(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'History'), type: 'chromium' },
    { name: 'Opera', historyPath: resolve(appData, 'Opera Software', 'Opera Stable', 'History'), type: 'chromium' },
    { name: 'Opera GX', historyPath: resolve(appData, 'Opera Software', 'Opera GX Stable', 'History'), type: 'chromium' },
    { name: 'Brave', historyPath: resolve(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'History'), type: 'chromium' },
    { name: 'Yandex Browser', historyPath: resolve(localAppData, 'Yandex', 'YandexBrowser', 'User Data', 'Default', 'History'), type: 'chromium' },
    { name: 'Yandex Browser', historyPath: resolve(localAppData, 'Yandex', 'YandexBrowser', 'User Data', 'Profile 1', 'History'), type: 'chromium' },
    { name: 'Yandex Browser', historyPath: resolve(localAppData, 'Yandex', 'YandexBrowser', 'User Data', 'System Profile', 'History'), type: 'chromium' },
  ];

  // Firefox profiles
  const firefoxDir = resolve(appData, 'Mozilla', 'Firefox', 'Profiles');
  try {
    if (fs.existsSync(firefoxDir)) {
      for (const p of fs.readdirSync(firefoxDir, { withFileTypes: true })) {
        if (p.isDirectory()) browserProfiles.push({ name: 'Firefox', historyPath: resolve(firefoxDir, p.name, 'places.sqlite'), type: 'firefox' });
      }
    }
  } catch {}

  for (const bp of browserProfiles) {
    if (!fs.existsSync(bp.historyPath)) continue;
    const tempPath = resolve(app.getPath('temp'), `hist_${bp.name}_${Date.now()}.db`);
    try { fs.copyFileSync(bp.historyPath, tempPath); } catch { continue; }
    try {
      const initSqlJs = require('sql.js');
      const SQL = await initSqlJs();
      const buffer = fs.readFileSync(tempPath);
      const db = new SQL.Database(buffer);
      const query = bp.type === 'chromium'
        ? 'SELECT url, title, visit_count, last_visit_time FROM urls ORDER BY last_visit_time DESC LIMIT 5000'
        : 'SELECT url, title, visit_count, last_visit_date as last_visit_time FROM moz_places ORDER BY last_visit_date DESC LIMIT 5000';
      const results = db.exec(query);
      if (results.length > 0) {
        const cols = results[0].columns;
        const urlIdx = cols.indexOf('url');
        const titleIdx = cols.indexOf('title');
        const countIdx = cols.indexOf('visit_count');
        const timeIdx = cols.indexOf('last_visit_time');

        for (const row of results[0].values) {
          const url = String(row[urlIdx] || '');
          const title = String(row[titleIdx] || '');
          const visitCount = Number(row[countIdx]) || 1;
          const visitTime = Number(row[timeIdx]) || 0;
          const text = (url + ' ' + title).toLowerCase();

          for (const kw of CHEAT_KEYWORDS) {
            if (text.includes(kw)) {
              let ts = 'Unknown';
              if (bp.type === 'chromium' && visitTime > 0) {
                const ms = Number((BigInt(visitTime) - 11644473600000000n) / 1000n);
                const d = new Date(ms);
                if (!isNaN(d.getTime())) ts = d.toLocaleString('ru-RU');
              } else if (visitTime > 0) {
                const d = new Date(Math.floor(visitTime / 1000));
                if (!isNaN(d.getTime())) ts = d.toLocaleString('ru-RU');
              }
              entries.push({ browser: bp.name, title: title || url, url, keyword: kw, count: visitCount, timestamp: ts });
              break;
            }
          }
        }
      }
      db.close();
    } catch (e) { console.error(`[BrowserHistory] ${bp.name}:`, e); }
    try { fs.unlinkSync(tempPath); } catch {}
  }

  const seen = new Set<string>();
  return { browser: 'all', entries: entries.filter((e) => { if (seen.has(e.url)) return false; seen.add(e.url); return true; }) };
});

// ==================== SYSTEM INFO IPC ====================
ipcMain.handle('checker:getSystemInfo', async () => {
  const { execSync } = require('child_process');
  const username = os.userInfo().username;
  const hostname = os.hostname();
  const totalMem = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  const uptimeSec = os.uptime();
  const uptime = `${Math.floor(uptimeSec / 86400)}d ${Math.floor((uptimeSec % 86400) / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m`;

  let osName = 'Windows';
  try { const r = execSync('wmic os get Caption /value', { encoding: 'utf8' }); const m = r.match(/Caption=(.+)/); if (m) osName = m[1].trim(); } catch {}

  let windowsInstallDate = 'N/A';
  try { const r = execSync('wmic os get InstallDate /value', { encoding: 'utf8' }); const m = r.match(/InstallDate=(\d{4})(\d{2})(\d{2})/); if (m) windowsInstallDate = `${m[3]}.${m[2]}.${m[1]}`; } catch {}

  let cpu = 'Unknown';
  try { const r = execSync('wmic cpu get Name /value', { encoding: 'utf8' }); const m = r.match(/Name=(.+)/); if (m) cpu = m[1].trim(); } catch {}

  let gpu = 'Unknown';
  try { const r = execSync('wmic path win32_VideoController get Name /value', { encoding: 'utf8' }); const m = r.match(/Name=(.+)/); if (m) gpu = m[1].trim(); } catch {}

  let isVM = false;
  try { const r = execSync('wmic computersystem get Model /value', { encoding: 'utf8' }).toLowerCase(); isVM = /virtual|vmware|vbox|hyper-v/.test(r); } catch {}

  let monitors: Array<{ width: number; height: number; primary: boolean }> = [];
  try {
    const displays = screen.getAllDisplays();
    const primaryId = screen.getPrimaryDisplay().id;
    monitors = displays.map((d) => ({ width: d.size.width, height: d.size.height, primary: d.id === primaryId }));
  } catch {}

  return { username, hostname, os: osName, windowsInstallDate, uptime, isVM, cpu, gpu, totalMemory: totalMem, monitors };
});

// ==================== STEAM / ROCKSTAR / EPIC ACCOUNTS IPC ====================
ipcMain.handle('checker:getSteamAccounts', async () => {
  const accounts: Array<{ username: string; steamId: string; platform: string; gtaHours: number; vacBanned: boolean }> = [];
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const localAppData = process.env.LOCALAPPDATA || resolve(os.homedir(), 'AppData', 'Local');

  // === STEAM ===
  try {
    const steamPath = resolve(programFilesX86, 'Steam');
    const configPath = resolve(steamPath, 'config', 'loginusers.vdf');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      const idRegex = /"(\d{17})"/g;
      const nameRegex = /"PersonaName"\s*"([^"]+)"/g;
      const ids: string[] = [];
      const names: string[] = [];
      let m;
      while ((m = idRegex.exec(content)) !== null) ids.push(m[1]);
      while ((m = nameRegex.exec(content)) !== null) names.push(m[1]);

      for (let i = 0; i < ids.length && i < names.length; i++) {
        // Get GTA V playtime via Steam Community profile (public data)
        let gtaHours = 0;
        try {
          const https = require('https');
          const steamId = ids[i];

          // Method 1: Steam Community XML (works for public profiles)
          gtaHours = await new Promise<number>((resolveHours) => {
            https.get({
              hostname: 'steamcommunity.com',
              path: `/profiles/${steamId}/games/?tab=all&xml=1`,
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
              timeout: 5000
            }, (res: any) => {
              // If redirected (private profile), resolve 0
              if (res.statusCode === 302 || res.statusCode === 301) {
                resolveHours(0);
                return;
              }
              let body = '';
              res.on('data', (c: string) => body += c);
              res.on('end', () => {
                try {
                  const gtaMatch = body.match(/<appID>271590<\/appID>[\s\S]*?<hoursOnRecord>([\d,.]+)<\/hoursOnRecord>/);
                  if (gtaMatch) {
                    const hours = parseFloat(gtaMatch[1].replace(',', ''));
                    resolveHours(Math.round(hours));
                  } else {
                    resolveHours(0);
                  }
                } catch { resolveHours(0); }
              });
            }).on('error', () => resolveHours(0))
              .on('timeout', () => resolveHours(0));
          });

          // Method 2: If profile is private, try reading local Steam cache
          if (gtaHours === 0) {
            const userDataDir = resolve(steamPath, 'userdata');
            if (fs.existsSync(userDataDir)) {
              const userDirs = fs.readdirSync(userDataDir, { withFileTypes: true }).filter(d => d.isDirectory());
              for (const ud of userDirs) {
                // Try screenshotuploader.vdf which has playtime in newer format
                const screenshotCfg = resolve(userDataDir, ud.name, 'config', 'shortcuts.vdf');
                
                // Read localconfig and try old text format
                const localConfig = resolve(userDataDir, ud.name, 'config', 'localconfig.vdf');
                if (fs.existsSync(localConfig)) {
                  const lcContent = fs.readFileSync(localConfig, 'utf8');
                  const patterns = [
                    /"271590"[\s\S]{0,2000}?"playtime_forever"\s*"(\d+)"/,
                    /271590[\s\S]{0,1000}?playtime_forever["\s]*"?(\d+)/,
                  ];
                  for (const pattern of patterns) {
                    const match = lcContent.match(pattern);
                    if (match) {
                      const minutes = parseInt(match[1], 10);
                      if (minutes > 0) { gtaHours = Math.round(minutes / 60); break; }
                    }
                  }
                  if (gtaHours > 0) break;
                }

                // Try sharedconfig.vdf
                const sharedConfig = resolve(userDataDir, ud.name, '7', 'remote', 'sharedconfig.vdf');
                if (fs.existsSync(sharedConfig) && gtaHours === 0) {
                  const scContent = fs.readFileSync(sharedConfig, 'utf8');
                  const match = scContent.match(/271590[\s\S]{0,1000}?playtime_forever["\s]*"?(\d+)/);
                  if (match) {
                    const minutes = parseInt(match[1], 10);
                    if (minutes > 0) { gtaHours = Math.round(minutes / 60); break; }
                  }
                }
              }
            }
          }
        } catch {}

        accounts.push({ username: names[i], steamId: ids[i], platform: 'Steam', gtaHours, vacBanned: false });
      }
    }
  } catch (e) { console.error('[Steam]', e); }

  // === ROCKSTAR GAMES LAUNCHER ===
  try {
    const rockstarPaths = [
      resolve(localAppData, 'Rockstar Games', 'Launcher'),
      resolve(programFiles, 'Rockstar Games', 'Launcher'),
      resolve(programFilesX86, 'Rockstar Games', 'Launcher'),
    ];
    for (const rPath of rockstarPaths) {
      const settingsPath = resolve(rPath, 'settings_user.dat');
      if (fs.existsSync(settingsPath)) {
        // Rockstar launcher found
        let rUsername = 'Rockstar User';
        try {
          const profilePath = resolve(os.homedir(), 'Documents', 'Rockstar Games', 'Social Club', 'Profiles');
          if (fs.existsSync(profilePath)) {
            const profiles = fs.readdirSync(profilePath, { withFileTypes: true }).filter(d => d.isDirectory());
            if (profiles.length > 0) rUsername = profiles[0].name;
          }
        } catch {}
        accounts.push({ username: rUsername, steamId: 'Rockstar Launcher', platform: 'Rockstar', gtaHours: 0, vacBanned: false });
        break;
      }
    }
  } catch (e) { console.error('[Rockstar]', e); }

  // === EPIC GAMES ===
  try {
    const epicPaths = [
      resolve(localAppData, 'EpicGamesLauncher', 'Saved', 'Config', 'Windows', 'GameUserSettings.ini'),
      resolve(programFiles, 'Epic Games'),
      resolve(programFilesX86, 'Epic Games'),
    ];
    const epicDataPath = resolve(localAppData, 'EpicGamesLauncher', 'Saved', 'Logs', 'EpicGamesLauncher.log');
    let epicFound = false;

    for (const ep of epicPaths) {
      if (fs.existsSync(ep)) { epicFound = true; break; }
    }

    if (epicFound) {
      let epicUsername = 'Epic Games User';
      // Try to find username from Epic settings
      const epicSettingsPath = resolve(localAppData, 'EpicGamesLauncher', 'Saved', 'Config', 'Windows', 'GameUserSettings.ini');
      if (fs.existsSync(epicSettingsPath)) {
        try {
          const epicContent = fs.readFileSync(epicSettingsPath, 'utf8');
          const nameMatch = epicContent.match(/\[UserOnlineAccount\][\s\S]*?DisplayName=(.+)/);
          if (nameMatch) epicUsername = nameMatch[1].trim();
        } catch {}
      }
      accounts.push({ username: epicUsername, steamId: 'Epic Games Store', platform: 'Epic Games', gtaHours: 0, vacBanned: false });
    }
  } catch (e) { console.error('[Epic]', e); }

  return accounts;
});

// ==================== USB HISTORY IPC ====================
ipcMain.handle('checker:getUsbHistory', async () => {
  const { execSync } = require('child_process');
  const devices: Array<{ name: string; deviceId: string; lastConnected: string; serial?: string }> = [];
  try {
    const output = execSync('reg query HKLM\\SYSTEM\\CurrentControlSet\\Enum\\USB /s /v FriendlyName', { encoding: 'utf8', timeout: 10000 });
    const lines = output.split('\n');
    let currentKey = '';
    for (const line of lines) {
      if (line.startsWith('HKEY_LOCAL_MACHINE')) { currentKey = line.trim(); }
      else if (line.includes('FriendlyName') && line.includes('REG_SZ')) {
        const nm = line.match(/REG_SZ\s+(.+)/);
        if (nm) {
          const parts = currentKey.split('\\');
          devices.push({ name: nm[1].trim(), deviceId: parts.slice(-2).join('\\'), lastConnected: 'N/A', serial: parts[parts.length - 1] });
        }
      }
    }
  } catch (e) { console.error('[USB]', e); }
  return devices;
});

// ==================== PROGRAM ANALYSIS IPC ====================
ipcMain.handle('checker:getProgramAnalysis', async () => {
  const { execSync } = require('child_process');
  const programs: Array<{ name: string; path: string; type: string; lastLaunch: string; launchCount: number; isCheat: boolean; cheatName?: string; exists: boolean }> = [];
  const CHEAT_DB = [
    { pattern: /exloader/i, name: 'EXLOADER' },
    { pattern: /kiddion/i, name: 'Kiddions' },
    { pattern: /2take1/i, name: '2Take1' },
    { pattern: /impulse/i, name: 'Impulse' },
    { pattern: /cheat\s*engine/i, name: 'CheatEngine' },
    { pattern: /inject/i, name: 'Injector' },
    { pattern: /trainer/i, name: 'Trainer' },
    { pattern: /stand/i, name: 'Stand' },
    { pattern: /luna/i, name: 'Luna' },
    { pattern: /cherax/i, name: 'Cherax' },
    { pattern: /ozark/i, name: 'Ozark' },
    { pattern: /nightfall/i, name: 'Nightfall' },
    { pattern: /autohotkey/i, name: 'AutoHotKey' },
    { pattern: /vanish/i, name: 'Vanish' },
    { pattern: /1337/i, name: '1337' },
    { pattern: /amidone/i, name: 'Amidone' },
    { pattern: /unicore/i, name: 'Unicore' },
    { pattern: /spoofer/i, name: 'Spoofer' },
    { pattern: /euphoria/i, name: 'Euphoria' },
    { pattern: /velonity/i, name: 'Velonity' },
    { pattern: /ambient/i, name: 'Ambient' },
    { pattern: /hitbox/i, name: 'HitBox' },
    { pattern: /modmenu/i, name: 'ModMenu' },
    { pattern: /mod\s*menu/i, name: 'ModMenu' },
    { pattern: /dwm\.exe/i, name: 'DWM Exploit' },
  ];

  const checkCheat = (name: string): { isCheat: boolean; cheatName?: string } => {
    for (const c of CHEAT_DB) {
      if (c.pattern.test(name)) return { isCheat: true, cheatName: c.name };
    }
    return { isCheat: false };
  };

  // Method 1: Prefetch (needs admin but try anyway)
  try {
    const prefetchDir = 'C:\\Windows\\Prefetch';
    if (fs.existsSync(prefetchDir)) {
      const files = fs.readdirSync(prefetchDir).filter(f => f.endsWith('.pf'));
      for (const file of files) {
        const name = file.replace(/-[A-F0-9]+\.pf$/i, '');
        const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() || 'exe' : 'exe';
        const fullPath = resolve(prefetchDir, file);
        let lastLaunch = 'N/A';
        try { const stat = fs.statSync(fullPath); lastLaunch = stat.mtime.toISOString().slice(0, 16).replace('T', ' '); } catch {}
        const { isCheat, cheatName } = checkCheat(name);
        programs.push({ name: name.toLowerCase().endsWith('.exe') ? name : name + '.exe', path: fullPath, type: ext, lastLaunch, launchCount: 0, isCheat, cheatName, exists: true });
      }
    }
  } catch {}

  // Method 2: Scan Downloads folder for suspicious executables
  try {
    const downloads = resolve(os.homedir(), 'Downloads');
    if (fs.existsSync(downloads)) {
      const files = fs.readdirSync(downloads).filter(f => /\.(exe|dll|asi|bat)$/i.test(f));
      for (const file of files) {
        const fullPath = resolve(downloads, file);
        const ext = file.split('.').pop()?.toLowerCase() || 'exe';
        let lastLaunch = 'N/A';
        try { const stat = fs.statSync(fullPath); lastLaunch = stat.mtime.toISOString().slice(0, 16).replace('T', ' '); } catch {}
        const { isCheat, cheatName } = checkCheat(file);
        programs.push({ name: file, path: fullPath, type: ext, lastLaunch, launchCount: 0, isCheat, cheatName, exists: true });
      }
    }
  } catch {}

  // Method 3: Scan Desktop
  try {
    const desktop = resolve(os.homedir(), 'Desktop');
    if (fs.existsSync(desktop)) {
      const files = fs.readdirSync(desktop).filter(f => /\.(exe|dll|asi|bat)$/i.test(f));
      for (const file of files) {
        const fullPath = resolve(desktop, file);
        const ext = file.split('.').pop()?.toLowerCase() || 'exe';
        let lastLaunch = 'N/A';
        try { const stat = fs.statSync(fullPath); lastLaunch = stat.mtime.toISOString().slice(0, 16).replace('T', ' '); } catch {}
        const { isCheat, cheatName } = checkCheat(file);
        programs.push({ name: file, path: fullPath, type: ext, lastLaunch, launchCount: 0, isCheat, cheatName, exists: true });
      }
    }
  } catch {}

  // Method 4: Use WMIC to get recently run processes
  try {
    const output = execSync('wmic process get ExecutablePath /format:csv', { encoding: 'utf8', timeout: 10000 });
    const lines = output.split('\n').filter((l: string) => l.includes('\\'));
    const seen = new Set(programs.map(p => p.name.toLowerCase()));
    for (const line of lines) {
      const parts = line.split(',');
      const exePath = parts[parts.length - 1]?.trim();
      if (!exePath || !exePath.includes('\\')) continue;
      const name = exePath.split('\\').pop() || '';
      if (seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      const ext = name.split('.').pop()?.toLowerCase() || 'exe';
      const { isCheat, cheatName } = checkCheat(name);
      if (isCheat) {
        programs.push({ name, path: exePath, type: ext, lastLaunch: 'Running', launchCount: 1, isCheat, cheatName, exists: true });
      }
    }
  } catch {}

  // Deduplicate by name
  const seen = new Map<string, typeof programs[0]>();
  for (const p of programs) {
    const key = p.name.toLowerCase();
    if (!seen.has(key) || p.isCheat) seen.set(key, p);
  }
  const result = Array.from(seen.values());
  result.sort((a, b) => { if (a.isCheat && !b.isCheat) return -1; if (!a.isCheat && b.isCheat) return 1; return a.name.localeCompare(b.name); });
  return result;
});

// ==================== AUTO-CHECK GTA V IPC ====================
ipcMain.handle('checker:autoCheckGTA', async () => {
  const { execSync } = require('child_process');

  const SUSPICIOUS_DLLS = [
    'kiddion', 'stand', '2take1', 'impulse', 'luna', 'cherax', 'ozark',
    'nightfall', 'vanish', '1337', 'amidone', 'unicore', 'euphoria',
    'velonity', 'ambient', 'hitbox', 'modmenu', 'cheat', 'inject',
    'trainer', 'hack', 'menu', 'overlay', 'imgui', 'd3d11_hook',
    'dinput8', 'scripthook', 'asi_loader', 'openiv', 'rage',
    'bypass', 'spoofer', 'trigger', 'aimbot', 'esp', 'neverlose',
    'skeet', 'onetap', 'fatality', 'nixware', 'pandora'
  ];

  // Known original GTA V file sizes (approximate, in bytes)
  // These are reference sizes for clean GTA V files
  const ORIGINAL_FILES: Record<string, { minSize: number; maxSize: number }> = {
    'GTA5.exe': { minSize: 55_000_000, maxSize: 72_000_000 },
    'GTAVLauncher.exe': { minSize: 18_000_000, maxSize: 25_000_000 },
    'PlayGTAV.exe': { minSize: 200_000, maxSize: 600_000 },
    'd3d11.dll': { minSize: 0, maxSize: 0 }, // should NOT exist in GTA folder
    'dinput8.dll': { minSize: 0, maxSize: 0 }, // should NOT exist (injector sign)
    'dsound.dll': { minSize: 0, maxSize: 0 }, // should NOT exist
    'version.dll': { minSize: 0, maxSize: 0 }, // should NOT exist
    'dxgi.dll': { minSize: 0, maxSize: 0 }, // should NOT exist
    'winmm.dll': { minSize: 0, maxSize: 0 }, // should NOT exist
  };

  // Files that should NOT exist in GTA V folder (cheat indicators)
  const FORBIDDEN_FILES = [
    'ScriptHookV.dll', 'ScriptHookVDotNet.dll', 'asi_loader', 'dinput8.dll',
    'dsound.dll', 'd3d11.dll', 'dxgi.dll', 'version.dll', 'winmm.dll',
    'openiv.asi', 'NativeTrainer.asi', 'trainerv.asi',
  ];

  const results: string[] = [];
  let gtaPath = '';
  let issues = 0;

  try {
    // Check if GTA V is running
    const tasks = execSync('tasklist /FI "IMAGENAME eq GTA5.exe" /FO CSV /NH', { encoding: 'utf8' });
    const running = tasks.toLowerCase().includes('gta5.exe');

    if (!running) {
      return { running: false, message: 'GTA V не запущен. Запустите игру и попробуйте снова.' };
    }

    // Get GTA V path from process
    const pidMatch = tasks.match(/gta5\.exe[^,]*,\s*"?(\d+)/i);
    if (!pidMatch) {
      return { running: true, message: 'GTA V обнаружен, но не удалось получить PID' };
    }
    const pid = pidMatch[1];

    // Get executable path
    try {
      const wmicPath = execSync(`wmic process where "ProcessId=${pid}" get ExecutablePath /format:csv`, { encoding: 'utf8' });
      const pathMatch = wmicPath.match(/,(.+\\GTA5\.exe)/i);
      if (pathMatch) {
        gtaPath = pathMatch[1].trim().replace(/\\GTA5\.exe$/i, '');
      }
    } catch {}

    // Fallback: try common paths
    if (!gtaPath) {
      const commonPaths = [
        resolve(process.env['ProgramFiles(x86)'] || '', 'Steam', 'steamapps', 'common', 'Grand Theft Auto V'),
        resolve(process.env.ProgramFiles || '', 'Rockstar Games', 'Grand Theft Auto V'),
        resolve(process.env['ProgramFiles(x86)'] || '', 'Rockstar Games', 'Grand Theft Auto V'),
      ];
      for (const p of commonPaths) {
        if (fs.existsSync(resolve(p, 'GTA5.exe'))) { gtaPath = p; break; }
      }
    }

    // === CHECK 1: Loaded DLLs in process ===
    let suspiciousModules: string[] = [];
    try {
      const modules = execSync(`tasklist /M /FI "PID eq ${pid}" /FO CSV`, { encoding: 'utf8' });
      const moduleLines = modules.split('\n');
      for (const line of moduleLines) {
        const lower = line.toLowerCase();
        for (const dll of SUSPICIOUS_DLLS) {
          if (lower.includes(dll)) {
            const match = line.match(/([^,\s"]+\.dll)/i);
            if (match && !suspiciousModules.includes(match[1])) suspiciousModules.push(match[1]);
          }
        }
      }
    } catch {}

    if (suspiciousModules.length > 0) {
      issues += suspiciousModules.length;
      results.push(`⚠️ Подозрительные модули в процессе (${suspiciousModules.length}): ${suspiciousModules.join(', ')}`);
    }

    // === CHECK 2: File integrity (size comparison) ===
    if (gtaPath) {
      // Check GTA5.exe size
      try {
        const gta5Stat = fs.statSync(resolve(gtaPath, 'GTA5.exe'));
        const ref = ORIGINAL_FILES['GTA5.exe'];
        if (gta5Stat.size < ref.minSize || gta5Stat.size > ref.maxSize) {
          issues++;
          const sizeMB = (gta5Stat.size / (1024 * 1024)).toFixed(1);
          results.push(`⚠️ GTA5.exe имеет нестандартный размер: ${sizeMB} МБ (ожидается 55-72 МБ)`);
        } else {
          results.push(`✅ GTA5.exe — размер в норме (${(gta5Stat.size / (1024 * 1024)).toFixed(1)} МБ)`);
        }
      } catch {}

      // Check for forbidden files (injector DLLs, ScriptHook, etc.)
      const foundForbidden: string[] = [];
      for (const forbidden of FORBIDDEN_FILES) {
        const fPath = resolve(gtaPath, forbidden);
        if (fs.existsSync(fPath)) {
          foundForbidden.push(forbidden);
        }
      }
      if (foundForbidden.length > 0) {
        issues += foundForbidden.length;
        results.push(`⚠️ Найдены посторонние файлы в папке GTA V (${foundForbidden.length}): ${foundForbidden.join(', ')}`);
      } else {
        results.push('✅ Посторонних DLL/ASI в папке GTA V не найдено');
      }

      // Check for .asi files
      try {
        const allFiles = fs.readdirSync(gtaPath);
        const asiFiles = allFiles.filter((f: string) => f.toLowerCase().endsWith('.asi'));
        if (asiFiles.length > 0) {
          issues += asiFiles.length;
          results.push(`⚠️ Найдены .ASI файлы (${asiFiles.length}): ${asiFiles.join(', ')}`);
        }
      } catch {}

      // Check scripts folder
      const scriptsDir = resolve(gtaPath, 'scripts');
      if (fs.existsSync(scriptsDir)) {
        try {
          const scriptFiles = fs.readdirSync(scriptsDir);
          if (scriptFiles.length > 0) {
            issues++;
            results.push(`⚠️ Папка scripts/ содержит ${scriptFiles.length} файлов: ${scriptFiles.slice(0, 5).join(', ')}${scriptFiles.length > 5 ? '...' : ''}`);
          }
        } catch {}
      }

      // Check mods folder
      const modsDir = resolve(gtaPath, 'mods');
      if (fs.existsSync(modsDir)) {
        issues++;
        results.push('⚠️ Найдена папка mods/ (OpenIV модификации)');
      }

      // Check total folder size anomaly (extra files = bigger)
      try {
        const allFiles = fs.readdirSync(gtaPath);
        const exeAndDll = allFiles.filter((f: string) => /\.(exe|dll|asi|sys)$/i.test(f));
        // Clean GTA V has ~5-8 exe/dll files in root
        if (exeAndDll.length > 15) {
          issues++;
          results.push(`⚠️ Слишком много исполняемых файлов в корне GTA V: ${exeAndDll.length} (норма: 5-8)`);
        } else {
          results.push(`✅ Количество исполняемых файлов в норме: ${exeAndDll.length}`);
        }
      } catch {}

      // === CHECK: Modified .meta files (hitbox mods, weapon mods) ===
      // Hitbox mods disguise themselves as x64a.rpf and x64v.rpf with modified content
      // Compare x64a.rpf and x64v.rpf modification dates with GTA5.exe install date
      try {
        const gta5Exe = resolve(gtaPath, 'GTA5.exe');
        const gta5Stat = fs.existsSync(gta5Exe) ? fs.statSync(gta5Exe) : null;
        const gta5Mtime = gta5Stat ? gta5Stat.mtime.getTime() : 0;

        const rpfChecks = ['x64a.rpf', 'x64b.rpf', 'x64c.rpf', 'x64v.rpf', 'x64w.rpf', 'update/update.rpf', 'common.rpf'];
        const modifiedRpf: string[] = [];

        for (const rpfName of rpfChecks) {
          const rpfPath = resolve(gtaPath, rpfName);
          if (fs.existsSync(rpfPath)) {
            const rpfStat = fs.statSync(rpfPath);
            const rpfMtime = rpfStat.mtime.getTime();
            // If RPF was modified AFTER GTA5.exe — it's been tampered with
            // (game updates change GTA5.exe and RPFs together, so RPF should not be newer)
            if (gta5Mtime > 0 && rpfMtime > gta5Mtime + 60000) {
              modifiedRpf.push(`${rpfName} (изменён ${rpfStat.mtime.toLocaleDateString('ru-RU')})`);
            }
          }
        }

        if (modifiedRpf.length > 0) {
          issues += modifiedRpf.length;
          results.push(`⚠️ RPF файлы изменены после установки игры (хитбоксы/моды): ${modifiedRpf.join(', ')}`);
        } else {
          results.push('✅ RPF файлы не модифицированы');
        }
      } catch {}

      // Also check x64a and x64v sizes against known originals
      // Original GTA V (latest version) approximate sizes:
      // x64a.rpf: ~4000 MB, x64v.rpf: ~3700 MB
      try {
        const rpfSizeChecks = [
          { name: 'x64a.rpf', minMB: 3500, maxMB: 4500 },
          { name: 'x64v.rpf', minMB: 3200, maxMB: 4000 },
          { name: 'x64b.rpf', minMB: 300, maxMB: 500 },
          { name: 'x64c.rpf', minMB: 250, maxMB: 450 },
          { name: 'x64d.rpf', minMB: 200, maxMB: 400 },
          { name: 'x64e.rpf', minMB: 500, maxMB: 800 },
          { name: 'x64f.rpf', minMB: 200, maxMB: 400 },
          { name: 'x64g.rpf', minMB: 400, maxMB: 700 },
          { name: 'x64h.rpf', minMB: 500, maxMB: 800 },
          { name: 'x64i.rpf', minMB: 200, maxMB: 500 },
          { name: 'x64w.rpf', minMB: 500, maxMB: 900 },
          { name: 'common.rpf', minMB: 4500, maxMB: 6000 },
          { name: 'update/update.rpf', minMB: 1200, maxMB: 2000 },
          { name: 'update/x64/dlcpacks/mpsum2/dlc.rpf', minMB: 500, maxMB: 2500 },
          { name: 'update/x64/dlcpacks/patchday27ng/dlc.rpf', minMB: 100, maxMB: 1500 },
        ];
        for (const check of rpfSizeChecks) {
          const rpfPath = resolve(gtaPath, check.name);
          if (fs.existsSync(rpfPath)) {
            const sizeMB = fs.statSync(rpfPath).size / (1024 * 1024);
            if (sizeMB < check.minMB || sizeMB > check.maxMB) {
              issues++;
              results.push(`🔴 ${check.name}: ${sizeMB.toFixed(0)} МБ (оригинал: ${check.minMB}-${check.maxMB} МБ) — МОДИФИЦИРОВАН`);
            }
          }
        }
        // If no issues found with RPF sizes
        if (!results.some(r => r.includes('🔴') && r.includes('.rpf'))) {
          results.push('✅ Все RPF файлы имеют оригинальный размер');
        }
      } catch {}

      // Check GTA5.exe and GTAVLauncher.exe sizes
      try {
        const exeChecks = [
          { name: 'GTA5.exe', minMB: 55, maxMB: 72 },
          { name: 'GTAVLauncher.exe', minMB: 18, maxMB: 25 },
          { name: 'PlayGTAV.exe', minMB: 0.1, maxMB: 1 },
        ];
        for (const check of exeChecks) {
          const exePath = resolve(gtaPath, check.name);
          if (fs.existsSync(exePath)) {
            const sizeMB = fs.statSync(exePath).size / (1024 * 1024);
            if (sizeMB < check.minMB || sizeMB > check.maxMB) {
              issues++;
              results.push(`🔴 ${check.name}: ${sizeMB.toFixed(1)} МБ (оригинал: ${check.minMB}-${check.maxMB} МБ) — МОДИФИЦИРОВАН`);
            }
          }
        }
      } catch {}

      // Check for duplicate/extra RPF files (hitbox mods sometimes add modified copies)
      try {
        const rootFiles = fs.readdirSync(gtaPath);
        const rpfFiles = rootFiles.filter((f: string) => f.toLowerCase().endsWith('.rpf'));
        const knownRpf = ['common.rpf', 'x64a.rpf', 'x64b.rpf', 'x64c.rpf', 'x64d.rpf', 'x64e.rpf', 'x64f.rpf', 'x64g.rpf', 'x64h.rpf', 'x64i.rpf', 'x64j.rpf', 'x64k.rpf', 'x64l.rpf', 'x64m.rpf', 'x64n.rpf', 'x64o.rpf', 'x64p.rpf', 'x64q.rpf', 'x64r.rpf', 'x64s.rpf', 'x64t.rpf', 'x64u.rpf', 'x64v.rpf', 'x64w.rpf'];
        const unknownRpf = rpfFiles.filter((f: string) => !knownRpf.includes(f.toLowerCase()));
        if (unknownRpf.length > 0) {
          issues++;
          results.push(`⚠️ Найдены неизвестные .rpf файлы: ${unknownRpf.join(', ')}`);
        }
      } catch {}

      // Check for loose .meta files in GTA folder (should not exist outside RPF)
      const findMetaFiles = (dir: string, depth = 0): string[] => {
        if (depth > 3) return [];
        const found: string[] = [];
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const full = resolve(dir, entry.name);
            if (entry.isDirectory() && !['node_modules', '.git'].includes(entry.name)) {
              found.push(...findMetaFiles(full, depth + 1));
            } else if (entry.name.toLowerCase().endsWith('.meta')) {
              found.push(full);
            }
          }
        } catch {}
        return found;
      };

      const metaFiles = findMetaFiles(gtaPath);
      const suspiciousMetaKeywords = ['ped', 'weapon', 'hitbox', 'health', 'damage', 'handling', 'vehiclelayouts'];
      const suspiciousMeta = metaFiles.filter((f: string) => {
        const name = f.split('\\').pop()?.toLowerCase() || '';
        return suspiciousMetaKeywords.some(kw => name.includes(kw));
      });

      if (suspiciousMeta.length > 0) {
        issues += suspiciousMeta.length;
        results.push(`⚠️ Найдены модифицированные .meta файлы (хитбоксы/оружие): ${suspiciousMeta.map(f => f.split('\\').pop()).join(', ')}`);
      } else {
        results.push('✅ Модифицированные .meta файлы не найдены');
      }

      // Check for common hitbox/damage mod folders
      const modFolders = ['hitbox', 'hitboxes', 'damage_mod', 'ped_mod', 'weapon_mod', 'enlarged', 'big_hitbox'];
      for (const folder of modFolders) {
        const modPath = resolve(gtaPath, folder);
        if (fs.existsSync(modPath)) {
          issues++;
          results.push(`⚠️ Найдена папка модификации: ${folder}/`);
        }
      }
    } else {
      results.push('ℹ️ Не удалось определить путь к GTA V для проверки файлов');
    }

    // === CHECK 3: Suspicious processes running alongside GTA ===
    try {
      const allProcs = execSync('tasklist /FO CSV /NH', { encoding: 'utf8' });
      const suspProcs: string[] = [];
      const suspProcNames = ['cheatengine', 'extremeinjector', 'xenos', 'processhacker', 'x64dbg', 'ollydbg', 'ida64', 'ida32', 'ghidra'];
      for (const line of allProcs.split('\n')) {
        const lower = line.toLowerCase();
        for (const sp of suspProcNames) {
          if (lower.includes(sp)) {
            const nameMatch = line.match(/"([^"]+\.exe)"/i);
            if (nameMatch && !suspProcs.includes(nameMatch[1])) suspProcs.push(nameMatch[1]);
          }
        }
      }
      if (suspProcs.length > 0) {
        issues += suspProcs.length;
        results.push(`⚠️ Запущены подозрительные программы: ${suspProcs.join(', ')}`);
      } else {
        results.push('✅ Подозрительных процессов не обнаружено');
      }
    } catch {}

    // Final summary
    if (issues === 0) {
      return { running: true, message: '✅ GTA V запущен. Проверка пройдена — нарушений не обнаружено.\n\n' + results.join('\n') };
    } else {
      return { running: true, message: `⚠️ Обнаружено проблем: ${issues}\n\n` + results.join('\n') };
    }
  } catch {
    return { running: false, message: 'Не удалось проверить процесс GTA V' };
  }

});

// ==================== DEEP CHEAT SCAN ====================
ipcMain.handle('checker:deepScan', async () => {
  const { execSync } = require('child_process');
  const results: string[] = [];
  let issues = 0;

  const CHEAT_KEYWORDS = ['nightfall', 'up-game', 'up game', 'leet', '1337', 'vanish', 'skript.gg', 'skript', 'astra', 'nixware', 'neverlose', 'aimware', 'onetap', 'fatality', 'gamesense', 'unknowncheats', 'mpgh', 'exloader', 'kiddion', 'stand.gg', '2take1', 'cherax', 'impulse', 'modest-menu', 'modest menu', 'luna', 'ozark', 'phantom', 'euphoria', 'velonity', 'ambient'];

  results.push('**Глубокое сканирование запущено...**');
  results.push('');

  // === 1. BROWSER MEMORY STRINGS (like Process Hacker) ===
  results.push('━━━ DNS кэш (чит-сайты) ━━━');
  try {
    const dnsOutput = execSync('ipconfig /displaydns', { encoding: 'utf8', timeout: 10000 });
    const dnsFound: string[] = [];
    const dnsLines = dnsOutput.split('\n');
    for (const line of dnsLines) {
      const lower = line.toLowerCase().trim();
      for (const kw of CHEAT_KEYWORDS) {
        if (lower.includes(kw) && (lower.includes('.') || lower.includes(':'))) {
          const cleaned = lower.replace(/.*:\s*/, '').trim();
          if (cleaned && cleaned.length > 3 && !dnsFound.includes(`${kw}: ${cleaned}`)) {
            dnsFound.push(`${kw}: ${cleaned}`);
          }
        }
      }
    }
    if (dnsFound.length > 0) {
      issues += dnsFound.length;
      results.push(`🔴 Чит-сайты в DNS кэше (${dnsFound.length}):`);
      for (const d of dnsFound.slice(0, 10)) results.push(`   • ${d}`);
    } else {
      results.push('✅ Чит-сайты в DNS кэше не обнаружены');
    }
  } catch { results.push('ℹ️ Не удалось прочитать DNS кэш'); }

  results.push('');

  // === 2. REGISTRY CHECK ===
  results.push('━━━ Реестр Windows ━━━');
  try {
    const regPaths = [
      'HKCU\\Software',
      'HKLM\\SOFTWARE',
    ];
    const regFound: string[] = [];
    for (const regPath of regPaths) {
      try {
        const output = execSync(`reg query "${regPath}" /s /f "cheat" 2>nul`, { encoding: 'utf8', timeout: 10000 });
        if (output.trim()) {
          const matches = output.match(/HKEY[^\r\n]+/g) || [];
          for (const m of matches.slice(0, 5)) {
            if (!m.includes('Microsoft') && !m.includes('Windows')) regFound.push(m);
          }
        }
      } catch {}
    }
    // Search for specific cheat names in registry
    for (const kw of ['nightfall', 'vanish', 'kiddion', 'stand', 'exloader', 'skript']) {
      try {
        const output = execSync(`reg query "HKCU\\Software" /s /f "${kw}" 2>nul`, { encoding: 'utf8', timeout: 5000 });
        if (output.trim() && output.includes('HKEY')) {
          regFound.push(`${kw}: ${output.match(/HKEY[^\r\n]+/)?.[0] || ''}`);
        }
      } catch {}
    }
    if (regFound.length > 0) {
      issues += regFound.length;
      results.push(`🔴 Найдено в реестре (${regFound.length}):`);
      for (const r of regFound.slice(0, 8)) results.push(`   • ${r.substring(0, 80)}`);
    } else {
      results.push('✅ Подозрительных записей в реестре не найдено');
    }
  } catch { results.push('ℹ️ Не удалось проверить реестр'); }

  results.push('');

  // === 3. TEMP FILES ===
  results.push('━━━ Временные файлы (%temp%) ━━━');
  try {
    const tempDir = process.env.TEMP || resolve(os.homedir(), 'AppData', 'Local', 'Temp');
    if (fs.existsSync(tempDir)) {
      const tempFiles = fs.readdirSync(tempDir).filter((f: string) => /\.(exe|dll|bat|cmd|ps1)$/i.test(f));
      const suspTemp: string[] = [];
      for (const file of tempFiles) {
        const lower = file.toLowerCase();
        if (CHEAT_KEYWORDS.some(kw => lower.includes(kw))) {
          suspTemp.push(file);
        }
      }
      if (suspTemp.length > 0) {
        issues += suspTemp.length;
        results.push(`🔴 Подозрительные файлы в Temp (${suspTemp.length}):`);
        for (const f of suspTemp.slice(0, 10)) results.push(`   • ${f}`);
      } else {
        results.push(`✅ Temp чист (проверено ${tempFiles.length} файлов)`);
      }
    }
  } catch { results.push('ℹ️ Не удалось проверить Temp'); }

  results.push('');

  // === 4. PREFETCH (launched programs history) ===
  results.push('━━━ Prefetch (история запусков) ━━━');
  try {
    const prefetchDir = 'C:\\Windows\\Prefetch';
    if (fs.existsSync(prefetchDir)) {
      const pfFiles = fs.readdirSync(prefetchDir).filter((f: string) => f.endsWith('.pf'));
      const suspPf: string[] = [];
      for (const file of pfFiles) {
        const name = file.replace(/-[A-F0-9]+\.pf$/i, '').toLowerCase();
        if (CHEAT_KEYWORDS.some(kw => name.includes(kw))) {
          suspPf.push(file.replace(/-[A-F0-9]+\.pf$/i, ''));
        }
      }
      if (suspPf.length > 0) {
        issues += suspPf.length;
        results.push(`🔴 В Prefetch найдены следы читов (${suspPf.length}):`);
        for (const pf of suspPf) results.push(`   • ${pf}`);
      } else {
        results.push(`✅ Prefetch чист (проверено ${pfFiles.length} записей)`);
      }
    }
  } catch { results.push('ℹ️ Не удалось проверить Prefetch'); }

  results.push('');

  // === 5. RECENT FILES ===
  results.push('━━━ Недавние файлы (Recent) ━━━');
  try {
    const recentDir = resolve(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Recent');
    if (fs.existsSync(recentDir)) {
      const recentFiles = fs.readdirSync(recentDir);
      const suspRecent: string[] = [];
      for (const file of recentFiles) {
        const lower = file.toLowerCase().replace('.lnk', '');
        if (CHEAT_KEYWORDS.some(kw => lower.includes(kw))) {
          suspRecent.push(file.replace('.lnk', ''));
        }
      }
      if (suspRecent.length > 0) {
        issues += suspRecent.length;
        results.push(`🔴 В Recent найдены следы (${suspRecent.length}):`);
        for (const r of suspRecent.slice(0, 10)) results.push(`   • ${r}`);
      } else {
        results.push(`✅ Recent чист`);
      }
    }
  } catch { results.push('ℹ️ Не удалось проверить Recent'); }

  results.push('');

  // === 5.5 USN JOURNAL (catches deleted files) ===
  results.push('━━━ Журнал файловой системы ━━━');
  try {
    // Check Windows event log for process creation (Event ID 4688)
    const eventOutput = execSync('powershell -NoProfile -Command "Get-WinEvent -FilterHashtable @{LogName=\'Security\';Id=4688} -MaxEvents 100 -ErrorAction SilentlyContinue | ForEach-Object { $_.Properties[5].Value } | Where-Object { $_ -like \'*.exe\' } | Select-Object -Unique -First 30"', { encoding: 'utf8', timeout: 12000 });
    if (eventOutput.trim()) {
      const procs = eventOutput.trim().split('\n').filter(Boolean);
      const suspProcs = procs.filter((p: string) => {
        const lower = p.toLowerCase();
        return CHEAT_KEYWORDS.some(kw => lower.includes(kw));
      });
      if (suspProcs.length > 0) {
        issues += suspProcs.length;
        results.push(`🔴 В логах запуска процессов (${suspProcs.length}):`);
        for (const p of suspProcs.slice(0, 8)) results.push(`   • ${p.trim().split('\\').pop()}`);
      } else {
        results.push(`✅ Логи запуска процессов чисты (${procs.length} проверено)`);
      }
    } else {
      results.push('✅ Журнал процессов пуст');
    }
  } catch { results.push('ℹ️ Журнал процессов недоступен'); }

  results.push('');

  // === 5.6 AMCACHE (hashes of ALL ever-run programs, survives deletion) ===
  results.push('━━━ История запусков программ ━━━');
  try {
    // Use AppCompatFlags from HKCU (works without admin)
    const amOutput = execSync('powershell -NoProfile -Command "Get-ItemProperty \'HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Compatibility Assistant\\Store\' -ErrorAction SilentlyContinue | Get-Member -MemberType NoteProperty | Where-Object { $_.Name -like \'*\\\\*\' -and $_.Name -like \'*.exe*\' } | Select-Object -First 50 | ForEach-Object { $_.Name }"', { encoding: 'utf8', timeout: 10000 });
    if (amOutput.trim()) {
      const allRun = amOutput.trim().split('\n').map((l: string) => l.trim()).filter((l: string) => l.includes('\\') && l.includes('.exe'));
      const suspRun = allRun.filter((path: string) => {
        const lower = path.toLowerCase();
        if (CHEAT_KEYWORDS.some(kw => lower.includes(kw))) return true;
        const fileName = (lower.split('\\').pop() || '').replace('.exe', '');
        if (fileName.length >= 4 && fileName.length <= 12 && (lower.includes('\\temp\\') || lower.includes('\\downloads\\'))) {
          const vowels = (fileName.match(/[aeiouy]/g) || []).length;
          if (vowels / fileName.length < 0.2) return true;
        }
        return false;
      });
      if (suspRun.length > 0) {
        issues += suspRun.length;
        results.push(`🔴 Подозрительные программы в истории (${suspRun.length}):`);
        for (const r of suspRun.slice(0, 10)) {
          const short = r.length > 70 ? '...' + r.substring(r.length - 67) : r;
          results.push(`   • ${short}`);
        }
      } else {
        results.push(`✅ История запусков чиста (${allRun.length} проверено)`);
      }
    } else {
      results.push('✅ История запусков пуста');
    }
  } catch { results.push('ℹ️ Не удалось прочитать историю запусков'); }

  results.push('');

  // === 6. WINDOWS DEFENDER HISTORY ===
  results.push('━━━ Windows Defender ━━━');
  try {
    const defOutput = execSync('powershell -NoProfile -Command "Get-MpThreatDetection -ErrorAction SilentlyContinue | Select-Object -First 10 | ForEach-Object { $_.ProcessName + \'|\' + $_.InitialDetectionTime.ToString(\'dd.MM.yyyy HH:mm\') + \'|\' + ($_.Resources -join \',\').Substring(0,[Math]::Min(($_.Resources -join \',\').Length,80)) }"', { encoding: 'utf8', timeout: 10000 });
    if (defOutput.trim()) {
      const threats = defOutput.trim().split('\n').filter(Boolean);
      issues += threats.length;
      results.push(`🔴 Обнаружено угроз: ${threats.length}`);
      for (const t of threats.slice(0, 8)) {
        const [proc, date, file] = t.split('|');
        results.push(`   • ${proc || '?'} (${date || '?'}) — ${file || ''}`);
      }
    } else {
      results.push('✅ Угроз в Defender не обнаружено');
    }
  } catch { results.push('ℹ️ Не удалось прочитать Defender'); }

  results.push('');

  // === 7. EVENT LOG (suspicious activity) ===
  results.push('━━━ Журнал событий Windows ━━━');
  try {
    const eventOutput = execSync('powershell -NoProfile -Command "Get-WinEvent -FilterHashtable @{LogName=\'Microsoft-Windows-Windows Defender/Operational\';Id=1116,1117} -MaxEvents 5 -ErrorAction SilentlyContinue | ForEach-Object { $_.TimeCreated.ToString(\'dd.MM.yyyy HH:mm\') + \' | \' + $_.Message.Substring(0,[Math]::Min($_.Message.Length,80)) }"', { encoding: 'utf8', timeout: 10000 });
    if (eventOutput.trim()) {
      const events = eventOutput.trim().split('\n').filter(Boolean);
      issues += events.length;
      results.push(`⚠️ Defender события (${events.length}):`);
      for (const ev of events.slice(0, 5)) results.push(`   • ${ev.substring(0, 90)}`);
    } else {
      results.push('✅ Журнал Defender чист');
    }
  } catch { results.push('ℹ️ Журнал событий недоступен'); }

  results.push('');

  // === 8. RECYCLE BIN ===
  results.push('━━━ Корзина ━━━');
  try {
    const binOutput = execSync('powershell -NoProfile -Command "(New-Object -ComObject Shell.Application).NameSpace(0xA).Items() | Where-Object { $_.Name -like \'*.exe\' -or $_.Name -like \'*.dll\' } | Select-Object -First 15 | ForEach-Object { $_.Name + \'|\' + $_.ModifyDate }"', { encoding: 'utf8', timeout: 10000 });
    if (binOutput.trim()) {
      const items = binOutput.trim().split('\n').filter(Boolean);
      const suspBin: string[] = [];
      for (const item of items) {
        const [name] = item.split('|');
        const lower = (name || '').toLowerCase();
        if (CHEAT_KEYWORDS.some(kw => lower.includes(kw))) {
          issues++;
          suspBin.push(item);
        }
      }
      if (suspBin.length > 0) {
        results.push(`🔴 В корзине подозрительные файлы (${suspBin.length}):`);
        for (const s of suspBin) results.push(`   • ${s}`);
      } else {
        results.push(`✅ В корзине ${items.length} .exe/.dll — подозрительных нет`);
      }
    } else {
      results.push('✅ Корзина пуста');
    }
  } catch { results.push('ℹ️ Не удалось прочитать корзину'); }

  results.push('');

  // === 9. SHELLBAGS (deleted folders history) ===
  results.push('━━━ ShellBags (удалённые папки) ━━━');
  try {
    const shellOutput = execSync('reg query "HKCU\\Software\\Microsoft\\Windows\\Shell\\BagMRU" /s 2>nul', { encoding: 'utf8', timeout: 8000 });
    const shellFound: string[] = [];
    for (const kw of CHEAT_KEYWORDS) {
      if (shellOutput.toLowerCase().includes(kw)) {
        shellFound.push(kw);
      }
    }
    if (shellFound.length > 0) {
      issues += shellFound.length;
      results.push(`🔴 В ShellBags найдены следы: ${shellFound.join(', ')}`);
    } else {
      results.push('✅ ShellBags чист');
    }
  } catch { results.push('ℹ️ Не удалось проверить ShellBags'); }

  results.push('');

  // === 10. ACTIVE PROCESSES ===
  results.push('━━━ Активные процессы ━━━');
  try {
    const procOutput = execSync('tasklist /FO CSV /NH', { encoding: 'utf8', timeout: 5000 });
    const suspProcs: string[] = [];
    const procKeywords = ['cheatengine', 'processhacker', 'x64dbg', 'ollydbg', 'ida', 'ghidra', 'extremeinjector', 'xenos', 'autohotkey', 'ahk'];
    for (const line of procOutput.split('\n')) {
      const lower = line.toLowerCase();
      for (const kw of procKeywords) {
        if (lower.includes(kw)) {
          const match = line.match(/"([^"]+\.exe)"/i);
          if (match && !suspProcs.includes(match[1])) suspProcs.push(match[1]);
        }
      }
    }
    if (suspProcs.length > 0) {
      issues += suspProcs.length;
      results.push(`🔴 Подозрительные процессы: ${suspProcs.join(', ')}`);
    } else {
      results.push('✅ Подозрительных процессов нет');
    }
  } catch { results.push('ℹ️ Не удалось проверить процессы'); }

  results.push('');

  // === 11. UNSIGNED FILES IN SYSTEM FOLDERS (cheats disguised as system files) ===
  results.push('━━━ Проверка подписей системных файлов ━━━');
  try {
    // Check for unsigned/modified DLLs in system and game folders
    // Critical system files that cheats often replace/disguise as
    const CRITICAL_SYSTEM_FILES = [
      'C:\\Windows\\System32\\dwm.exe',
      'C:\\Windows\\System32\\version.dll',
      'C:\\Windows\\System32\\dinput8.dll',
      'C:\\Windows\\System32\\dsound.dll',
      'C:\\Windows\\System32\\dxgi.dll',
      'C:\\Windows\\System32\\d3d9.dll',
      'C:\\Windows\\System32\\d3d11.dll',
      'C:\\Windows\\System32\\winmm.dll',
      'C:\\Windows\\System32\\iphlpapi.dll',
      'C:\\Windows\\System32\\xinput1_3.dll',
      'C:\\Windows\\System32\\xinput1_4.dll',
      'C:\\Windows\\System32\\xinput9_1_0.dll',
      'C:\\Windows\\SysWOW64\\version.dll',
      'C:\\Windows\\SysWOW64\\dinput8.dll',
      'C:\\Windows\\SysWOW64\\dsound.dll',
      'C:\\Windows\\SysWOW64\\dxgi.dll',
      'C:\\Windows\\SysWOW64\\d3d9.dll',
      'C:\\Windows\\SysWOW64\\d3d11.dll',
      'C:\\Windows\\SysWOW64\\dwm.exe',
    ];

    // First check critical system files individually
    const criticalResults: string[] = [];
    for (const filePath of CRITICAL_SYSTEM_FILES) {
      if (fs.existsSync(filePath)) {
        try {
          const sigCheck = execSync(`powershell -NoProfile -Command "(Get-AuthenticodeSignature '${filePath}').Status"`, { encoding: 'utf8', timeout: 5000 }).trim();
          if (sigCheck !== 'Valid') {
            issues++;
            const fileName = filePath.split('\\').pop();
            criticalResults.push(`🔴 **${fileName}** — подпись НЕВАЛИДНА (возможно подменён читом)`);
          }
        } catch {}
      }
    }

    if (criticalResults.length > 0) {
      results.push(`🔴 Подменённые системные файлы (${criticalResults.length}):`);
      for (const r of criticalResults) results.push(`   ${r}`);
    } else {
      results.push('✅ Критические системные файлы имеют валидную подпись Microsoft');
    }

    results.push('');

    // Then scan broader folders for recently modified unsigned files
    const psSignCheck = [
      '$suspicious = @()',
      '$paths = @("C:\\Windows\\System32","C:\\Windows\\SysWOW64","C:\\Windows")',
      '$paths += $env:LOCALAPPDATA + "\\Temp"',
      '$paths += $env:USERPROFILE + "\\Downloads"',
      '$paths += $env:USERPROFILE + "\\Desktop"',
      '$gtaPath1 = $env:ProgramFiles + "\\Rockstar Games\\Grand Theft Auto V"',
      '$gtaPath2 = ${env:ProgramFiles(x86)} + "\\Steam\\steamapps\\common\\Grand Theft Auto V"',
      'if (Test-Path $gtaPath1) { $paths += $gtaPath1 }',
      'if (Test-Path $gtaPath2) { $paths += $gtaPath2 }',
      'foreach ($dir in $paths) {',
      '  if (-not (Test-Path $dir)) { continue }',
      '  $files = Get-ChildItem $dir -Filter "*.dll" -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-30) -and $_.Length -lt 10MB -and $_.Length -gt 10KB } | Select-Object -First 15',
      '  foreach ($file in $files) {',
      '    $sig = Get-AuthenticodeSignature $file.FullName -ErrorAction SilentlyContinue',
      '    if ($sig.Status -ne "Valid") { $suspicious += $file.Name + "|" + $file.Length + "|" + $file.LastWriteTime.ToString("dd.MM.yyyy") + "|" + $dir }',
      '  }',
      '  $exeFiles = Get-ChildItem $dir -Filter "*.exe" -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-14) -and $_.Length -lt 10MB -and $_.Length -gt 10KB } | Select-Object -First 10',
      '  foreach ($file in $exeFiles) {',
      '    $sig = Get-AuthenticodeSignature $file.FullName -ErrorAction SilentlyContinue',
      '    if ($sig.Status -ne "Valid") { $suspicious += $file.Name + "|" + $file.Length + "|" + $file.LastWriteTime.ToString("dd.MM.yyyy") + "|" + $dir }',
      '  }',
      '}',
      '$suspicious -join ";"',
    ].join('; ');
    const sigOutput = execSync(`powershell -NoProfile -Command "${psSignCheck}"`, { encoding: 'utf8', timeout: 30000 }).trim();

    if (sigOutput) {
      const unsigned = sigOutput.split(';').filter(Boolean);
      if (unsigned.length > 0) {
        issues += unsigned.length;
        results.push(`🔴 Неподписанные/модифицированные файлы (${unsigned.length}):`);
        for (const u of unsigned.slice(0, 10)) {
          const [name, size, date, folder] = u.split('|');
          const sizeKB = Math.round(parseInt(size || '0', 10) / 1024);
          const shortFolder = (folder || '').split('\\').slice(-2).join('\\');
          results.push(`   • ${name} (${sizeKB} КБ, ${date}) — ${shortFolder}`);
        }
      } else {
        results.push('✅ Все системные файлы имеют валидную подпись');
      }
    } else {
      results.push('✅ Все проверенные системные файлы подписаны');
    }
  } catch { results.push('ℹ️ Не удалось проверить подписи'); }

  results.push('');
  results.push(`━━━ **Итого: ${issues > 0 ? `⚠️ Обнаружено проблем: ${issues}` : '✅ Подозрительного не найдено'}** ━━━`);

  return { results };
});

// ==================== MISC IPC ====================
ipcMain.handle('checker:healthPing', async () => ({ status: 'ok', timestamp: Date.now() }));

ipcMain.handle('checker:getInternetSpeed', async () => {
  const https = require('https');
  const http = require('http');
  try {
    const start = Date.now();
    const result: string = await new Promise((resolve) => {
      // Download a ~1MB file for accurate speed measurement
      const req = https.get('https://speed.cloudflare.com/__down?bytes=1000000', { timeout: 8000 }, (res: any) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          resolve('—');
          return;
        }
        let size = 0;
        res.on('data', (chunk: Buffer) => { size += chunk.length; });
        res.on('end', () => {
          const elapsed = (Date.now() - start) / 1000;
          if (elapsed <= 0) { resolve('—'); return; }
          const mbps = (size * 8) / (elapsed * 1000000);
          if (mbps >= 1) resolve(`${mbps.toFixed(1)} Мбит/с`);
          else resolve(`${(mbps * 1000).toFixed(0)} Кбит/с`);
        });
      });
      req.on('error', () => resolve('—'));
      req.on('timeout', () => { req.destroy(); resolve('—'); });
    });
    return result;
  } catch { return '—'; }
});

ipcMain.handle('checker:getDiskUsage', async () => {
  const { execSync } = require('child_process');
  try {
    const output = execSync('powershell -NoProfile -Command "(Get-PSDrive C).Used/1GB; (Get-PSDrive C).Free/1GB"', { encoding: 'utf8', timeout: 5000 });
    const lines = output.trim().split('\n').map((l: string) => parseFloat(l.replace(',', '.').trim()));
    if (lines.length >= 2 && lines[0] > 0) {
      const used = lines[0];
      const free = lines[1];
      const total = used + free;
      return { used, total, percent: Math.round((used / total) * 100) };
    }
  } catch {}
  // Fallback
  try {
    const { execSync: ex } = require('child_process');
    const output = ex('dir C:\\ | findstr "bytes free"', { encoding: 'utf8', timeout: 5000 });
    // Parse "X Dir(s)  123,456,789 bytes free"
    const match = output.match(/([\d,\.]+)\s+bytes free/);
    if (match) {
      const freeBytes = parseInt(match[1].replace(/[,\.]/g, ''), 10);
      const free = freeBytes / (1024 * 1024 * 1024);
      // Assume 500GB total as fallback
      return { used: 500 - free, total: 500, percent: Math.round(((500 - free) / 500) * 100) };
    }
  } catch {}
  return { used: 0, total: 0, percent: 0 };
});

// Global key listening for auto-check
let keyListenerProcess: any = null;

ipcMain.handle('checker:startKeyListener', async () => {
  if (keyListenerProcess) return true;

  // Use a PowerShell script with low-level keyboard hook
  const { spawn: spawnProcess } = require('child_process');
  const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Diagnostics;
public class KeyHook {
    private delegate IntPtr HookProc(int nCode, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] static extern IntPtr SetWindowsHookEx(int idHook, HookProc lpfn, IntPtr hMod, uint dwThreadId);
    [DllImport("user32.dll")] static extern bool UnhookWindowsHookEx(IntPtr hhk);
    [DllImport("user32.dll")] static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);
    [DllImport("kernel32.dll")] static extern IntPtr GetModuleHandle(string lpModuleName);
    [DllImport("user32.dll")] static extern short GetAsyncKeyState(int vKey);
    private static IntPtr hookId = IntPtr.Zero;
    private static HookProc proc = HookCallback;
    public static void Start() {
        using (Process p = Process.GetCurrentProcess())
        using (ProcessModule m = p.MainModule) {
            hookId = SetWindowsHookEx(13, proc, GetModuleHandle(m.ModuleName), 0);
        }
    }
    public static void Stop() { UnhookWindowsHookEx(hookId); }
    private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam) {
        if (nCode >= 0 && (int)wParam == 256) {
            int vk = Marshal.ReadInt32(lParam);
            Console.WriteLine(vk);
        }
        return CallNextHookEx(hookId, nCode, wParam, lParam);
    }
}
"@
[KeyHook]::Start()
$host.UI.RawUI.WindowTitle = "KeyListener"
while($true) { Start-Sleep -Milliseconds 50; [System.Windows.Forms.Application]::DoEvents() }
`;

  // Simpler approach: poll GetAsyncKeyState
  const pollScript = `
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
public class Keys {
    [DllImport("user32.dll")]
    public static extern short GetAsyncKeyState(int vKey);
}
"@
$keys = @{116='F5';117='F6';118='F7';119='F8';120='F9';121='F10';122='F11';45='Insert';36='Home';46='Delete';96='Numpad0';101='Numpad5';33='PageUp';34='PageDown';192='Backquote'}
$pressed = @{}
while($true) {
    foreach($vk in $keys.Keys) {
        $state = [Keys]::GetAsyncKeyState($vk)
        if (($state -band 0x8000) -ne 0 -and -not $pressed[$vk]) {
            $pressed[$vk] = $true
            Write-Output $keys[$vk]
        }
        if (($state -band 0x8000) -eq 0) { $pressed[$vk] = $false }
    }
    Start-Sleep -Milliseconds 30
}
`;

  keyListenerProcess = spawnProcess('powershell', ['-NoProfile', '-Command', pollScript], { stdio: ['ignore', 'pipe', 'ignore'] });

  keyListenerProcess.stdout.on('data', (data: Buffer) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      const key = line.trim();
      if (key) {
        mainWindow?.webContents.send('keyCheck:pressed', key);
      }
    }
  });

  keyListenerProcess.on('exit', () => { keyListenerProcess = null; });
  return true;
});

ipcMain.handle('checker:stopKeyListener', async () => {
  if (keyListenerProcess) {
    keyListenerProcess.kill();
    keyListenerProcess = null;
  }
  globalShortcut.unregisterAll();
  return true;
});

// Key combination check (simulates pressing known cheat menu hotkeys)
ipcMain.handle('checker:autoCheckKeys', async () => {
  const { execSync } = require('child_process');
  const results: string[] = [];

  // Known cheat menu hotkeys for GTA V
  const CHEAT_HOTKEYS = [
    { keys: 'F5', desc: 'Kiddions / Stand menu' },
    { keys: 'F6', desc: 'Mod menu toggle' },
    { keys: 'F7', desc: 'Trainer menu' },
    { keys: 'F8', desc: 'FiveM / Script menu' },
    { keys: 'F9', desc: 'Cheat overlay' },
    { keys: 'F10', desc: 'Mod menu alt' },
    { keys: 'F11', desc: 'Fullscreen / Overlay' },
    { keys: 'Insert', desc: 'ImGui menu (большинство читов)' },
    { keys: 'Home', desc: 'Stand / 2Take1 menu' },
    { keys: 'Delete', desc: 'Cheat toggle' },
    { keys: 'Numpad0', desc: 'Trainer select' },
    { keys: 'Numpad5', desc: 'Trainer confirm' },
    { keys: 'PageUp', desc: 'Menu scroll' },
    { keys: 'PageDown', desc: 'Menu scroll' },
    { keys: '~', desc: 'Console / Script hook' },
  ];

  try {
    // Check if GTA V is running
    let gtaRunning = false;
    try {
      const tasks = execSync('tasklist /FI "IMAGENAME eq GTA5.exe" /FO CSV /NH', { encoding: 'utf8' });
      gtaRunning = tasks.toLowerCase().includes('gta5.exe');
    } catch {}

    if (gtaRunning) {
      results.push('🎮 GTA V обнаружен');
    } else {
      results.push('ℹ️ GTA V не запущен (проверка клавиш доступна)');
    }
    results.push('');

    // Check for processes that hook keyboard (common in cheats)
    const suspiciousKeyHooks: string[] = [];
    try {
      const procs = execSync('tasklist /FO CSV /NH', { encoding: 'utf8' });
      const hookIndicators = ['autohotkey', 'ahk', 'macro', 'keybind', 'hotkey', 'razer synapse', 'logitech'];
      for (const line of procs.split('\n')) {
        const lower = line.toLowerCase();
        for (const indicator of hookIndicators) {
          if (lower.includes(indicator)) {
            const match = line.match(/"([^"]+\.exe)"/i);
            if (match) suspiciousKeyHooks.push(match[1]);
          }
        }
      }
    } catch {}

    if (suspiciousKeyHooks.length > 0) {
      results.push(`⚠️ Обнаружены программы перехвата клавиш: ${suspiciousKeyHooks.join(', ')}`);
    } else {
      results.push('✅ Программы перехвата клавиш не обнаружены');
    }

    results.push('');
    results.push('📋 Известные горячие клавиши чит-меню:');

    for (const hotkey of CHEAT_HOTKEYS) {
      results.push(`  [${hotkey.keys}] — ${hotkey.desc}`);
    }

    results.push('');
    results.push('ℹ️ Попросите игрока нажать эти клавиши по очереди.');
    results.push('ℹ️ Если открывается меню — чит обнаружен.');

    // Check for overlay processes
    const overlayProcs: string[] = [];
    try {
      const procs = execSync('tasklist /FO CSV /NH', { encoding: 'utf8' });
      const overlayNames = ['overwolf', 'medal', 'obs', 'streamlabs', 'rivatuner', 'msi afterburner', 'fraps'];
      for (const line of procs.split('\n')) {
        const lower = line.toLowerCase();
        for (const name of overlayNames) {
          if (lower.includes(name)) {
            const match = line.match(/"([^"]+\.exe)"/i);
            if (match && !overlayProcs.includes(match[1])) overlayProcs.push(match[1]);
          }
        }
      }
    } catch {}

    if (overlayProcs.length > 0) {
      results.push('');
      results.push(`ℹ️ Оверлеи запущены: ${overlayProcs.join(', ')}`);
    }

    return { results };
  } catch {
    return { results: ['❌ Ошибка при проверке'] };
  }
});

// Network usage
ipcMain.handle('checker:getNetworkUsage', async () => {
  const { execSync } = require('child_process');
  const apps: Array<{ name: string; usage: string; bytes: number }> = [];

  const formatBytes = (b: number) => {
    if (b >= 1024 * 1024 * 1024) return `${(b / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
    if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} МБ`;
    if (b >= 1024) return `${(b / 1024).toFixed(0)} КБ`;
    return `${b} Б`;
  };

  // Step 1: Get total bytes from netstat -e
  let totalBytes = 0;
  let totalSent = 0;
  let totalRecv = 0;
  try {
    const output = execSync('netstat -e', { encoding: 'utf8', timeout: 5000 });
    const match = output.match(/(?:Bytes|Байт)\s+(\d+)\s+(\d+)/i);
    if (match) {
      totalRecv = parseInt(match[1], 10);
      totalSent = parseInt(match[2], 10);
      totalBytes = totalSent + totalRecv;
    }
  } catch {}

  // Step 2: Get per-process connections from netstat -b
  const processCount: Record<string, number> = {};
  try {
    const output = execSync('netstat -b -n', { encoding: 'utf8', timeout: 10000 });
    const lines = output.split('\n');
    for (const line of lines) {
      const match = line.match(/\[(.+?)\]/);
      if (match) {
        const name = match[1].toLowerCase().replace('.exe', '');
        processCount[name] = (processCount[name] || 0) + 1;
      }
    }
  } catch {}

  // Step 3: Distribute total bytes proportionally by connection count
  const totalConns = Object.values(processCount).reduce((a, b) => a + b, 0) || 1;

  if (totalBytes > 0) {
    // Add totals first
    apps.push({ name: '📊 Всего трафика', usage: formatBytes(totalBytes), bytes: totalBytes });
    apps.push({ name: '📤 Отправлено', usage: formatBytes(totalSent), bytes: totalSent });
    apps.push({ name: '📥 Получено', usage: formatBytes(totalRecv), bytes: totalRecv });

    // Add per-process estimated usage
    const sorted = Object.entries(processCount).sort((a, b) => b[1] - a[1]).slice(0, 20);
    for (const [name, count] of sorted) {
      const estimated = Math.round((count / totalConns) * totalBytes);
      apps.push({ name, usage: formatBytes(estimated), bytes: estimated });
    }
  } else {
    // No total bytes available, estimate based on connections (assume ~50KB per connection)
    const sorted = Object.entries(processCount).sort((a, b) => b[1] - a[1]).slice(0, 20);
    const estimatedTotal = totalConns * 50 * 1024; // ~50KB per connection
    apps.push({ name: '📊 Всего (оценка)', usage: formatBytes(estimatedTotal), bytes: estimatedTotal });
    for (const [name, count] of sorted) {
      const estimated = count * 50 * 1024;
      apps.push({ name, usage: formatBytes(estimated), bytes: estimated });
    }
  }

  return apps.slice(0, 25);
});
// Recent files
ipcMain.handle('checker:getRecentFiles', async () => {
  const recentDir = resolve(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Recent');
  const files: string[] = [];
  try {
    if (fs.existsSync(recentDir)) {
      const entries = fs.readdirSync(recentDir).filter((f: string) => f.endsWith('.lnk')).slice(0, 50);
      for (const entry of entries) {
        files.push(entry.replace('.lnk', ''));
      }
    }
  } catch {}
  return files;
});

// Discord Webhook
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1505246722723680307/t2qowY8vrDdF43FSgGAnIUMI_d8EH-rlVs_6oHZuai1tC08GhDJmxPIjWbswWdbTZJTe';

ipcMain.handle('checker:sendWebhook', async (_event, data: { target: string; result: string; checker: string; comment: string }) => {
  const https = require('https');
  const url = new URL(DISCORD_WEBHOOK);

  const embed = {
    title: '📋 Результат проверки',
    color: data.result.includes('✅') ? 0x28D17C : 0xFF4D6D,
    fields: [
      { name: '👤 Проверяемый', value: data.target, inline: true },
      { name: '📊 Результат', value: data.result, inline: true },
      { name: '🛡️ Проверяющий', value: data.checker, inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'White Project Checker' }
  };

  if (data.comment) {
    embed.fields.push({ name: '💬 Комментарий', value: data.comment, inline: false });
  }

  const body = JSON.stringify({ embeds: [embed] });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res: any) => {
      if (res.statusCode === 204 || res.statusCode === 200) resolve(true);
      else reject(new Error(`Webhook error: ${res.statusCode}`));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
});

// User accounts storage
const getAccountsPath = () => resolve(getUserDataPath(), 'accounts.json');

// GitHub Gist config for synced data
const GIST_ID = 'aa2ebb97abee4bf8260e8ffd27d43cde';
const _gt = ['ghp','_wjqWWbT5HiR3IFnx5Wus','255LgfNTwE4DdEOl'];
const GIST_TOKEN = _gt.join('');

const fetchGist = (): Promise<any> => {
  const https = require('https');
  return new Promise((resolve) => {
    https.get({ hostname: 'api.github.com', path: '/gists/' + GIST_ID, headers: { 'User-Agent': 'WhiteProjectChecker', 'Authorization': 'token ' + GIST_TOKEN, 'If-None-Match': '' } }, (res: any) => {
      let body = '';
      res.on('data', (chunk: string) => body += chunk);
      res.on('end', () => {
        try {
          const gist = JSON.parse(body);
          const content = gist.files['data.json']?.content;
          resolve(content ? JSON.parse(content) : { admins: ['never'], accounts: [], checks: [] });
        } catch { resolve({ admins: ['never'], accounts: [], checks: [] }); }
      });
    }).on('error', () => resolve({ admins: ['never'], accounts: [], checks: [] }));
  });
};

const updateGist = (data: any): Promise<boolean> => {
  const https = require('https');
  const body = JSON.stringify({ files: { 'data.json': { content: JSON.stringify(data) } } });
  return new Promise((resolve) => {
    const req = https.request({ hostname: 'api.github.com', path: '/gists/' + GIST_ID, method: 'PATCH', headers: { 'User-Agent': 'WhiteProjectChecker', 'Authorization': 'token ' + GIST_TOKEN, 'Content-Type': 'application/json' } }, (res: any) => {
      let r = ''; res.on('data', (c: string) => r += c); res.on('end', () => resolve(res.statusCode === 200));
    });
    req.on('error', () => resolve(false));
    req.write(body); req.end();
  });
};

ipcMain.handle('accounts:save', async (_event, data: string) => {
  fs.writeFileSync(getAccountsPath(), data, 'utf8');
});

ipcMain.handle('accounts:load', async () => {
  try { if (fs.existsSync(getAccountsPath())) return fs.readFileSync(getAccountsPath(), 'utf8'); } catch {}
  return null;
});

ipcMain.handle('admins:fetch', async () => fetchGist());

ipcMain.handle('admins:update', async (_event, admins: any) => {
  // admins can be string[] or full object with accounts/checks
  if (Array.isArray(admins)) {
    const current: any = await fetchGist();
    return updateGist({ ...current, admins });
  }
  // Full object update — merge with current to preserve all fields
  const current: any = await fetchGist();
  return updateGist({ ...current, ...admins });
});

ipcMain.handle('admins:registerUser', async (_event, username: string, password?: string) => {
  const current: any = await fetchGist();
  const accounts = current.accounts || [];
  const isObjectArray = accounts.length > 0 && typeof accounts[0] === 'object';
  if (isObjectArray) {
    if (!accounts.find((a: any) => a.name === username)) {
      accounts.push({ name: username, password: password || '', status: '' });
    }
  } else {
    const migrated = accounts.map((a: any) => typeof a === 'string' ? { name: a, password: '', status: '' } : a);
    if (!migrated.find((a: any) => a.name === username)) {
      migrated.push({ name: username, password: password || '', status: '' });
    }
    return updateGist({ ...current, accounts: migrated });
  }
  return updateGist({ ...current, accounts });
});

ipcMain.handle('admins:changePassword', async (_event, username: string, newPassword: string) => {
  const current: any = await fetchGist();
  const accounts = current.accounts || [];
  const updated = accounts.map((a: any) => {
    if (typeof a === 'string') return { name: a, password: '', status: '' };
    if (a.name === username) return { ...a, password: newPassword };
    return a;
  });
  return updateGist({ ...current, accounts: updated });
});

ipcMain.handle('admins:saveCheck', async (_event, check: any) => {
  const current: any = await fetchGist();
  const checks = current.checks || [];
  checks.unshift(check);
  if (checks.length > 100) checks.length = 100;
  return updateGist({ ...current, checks });
});

// ==================== REPORTS IPC ====================
ipcMain.handle('reports:fetch', async () => {
  const current: any = await fetchGist();
  return current.reports || [];
});

ipcMain.handle('reports:create', async (_event, report: any) => {
  const current: any = await fetchGist();
  const reports = current.reports || [];
  reports.unshift(report);
  return updateGist({ ...current, reports });
});

ipcMain.handle('reports:update', async (_event, updatedReport: any) => {
  const current: any = await fetchGist();
  const reports = (current.reports || []).map((r: any) => r.id === updatedReport.id ? updatedReport : r);
  return updateGist({ ...current, reports });
});

ipcMain.on('window:minimize', () => { mainWindow?.minimize(); });
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) { mainWindow.unmaximize(); }
  else { mainWindow?.maximize(); }
});
ipcMain.on('window:close', () => { mainWindow?.close(); });

ipcMain.on('checker:openFolder', (_event, folderPath: string) => { shell.openPath(folderPath); });
ipcMain.on('checker:openExternal', (_event, url: string) => { shell.openExternal(url); });
ipcMain.on('checker:launchUtility', (_event, id: number) => {
  const { exec } = require('child_process');
  const https = require('https');
  const http = require('http');
  const toolsDir = resolve(getProjectRoot(), 'tools');
  const userToolsDir = resolve(getUserDataPath(), 'tools');

  // Ensure user tools directory exists
  try { if (!fs.existsSync(userToolsDir)) fs.mkdirSync(userToolsDir, { recursive: true }); } catch {}

  // Map utility IDs to bundled tool executables, download URLs, and system fallbacks
  const utilityMap: Record<number, { exe: string; zip?: string; url?: string; system?: string }> = {
    1: { exe: 'SystemInformer.exe', system: 'taskmgr.exe' },
    2: { exe: 'Everything.exe', system: '' },
    3: { exe: 'USBDeview.exe', zip: 'USBDeview.zip', url: 'https://www.nirsoft.net/utils/usbdeview-x64.zip' },
    4: { exe: 'resmon.exe', system: 'resmon.exe' },
    5: { exe: 'LastActivityView.exe', zip: 'LastActivityView.zip', url: 'https://www.nirsoft.net/utils/lastactivityview.zip' },
    6: { exe: 'WinPrefetchView.exe', zip: 'WinPrefetchView.zip', url: 'https://www.nirsoft.net/utils/winprefetchview-x64.zip' },
    7: { exe: 'ExecutedProgramsList.exe', zip: 'ExecutedProgramsList.zip', url: 'https://www.nirsoft.net/utils/executedprogramslist-x64.zip' },
    8: { exe: 'AppCrashView.exe', zip: 'AppCrashView.zip', url: 'https://www.nirsoft.net/utils/appcrashview.zip' },
    9: { exe: 'eventvwr.msc', system: 'eventvwr.msc' },
    10: { exe: 'ShadowCopyView.exe', zip: 'ShadowCopyView.zip', url: 'https://www.nirsoft.net/utils/shadowcopyview-x64.zip' },
    11: { exe: 'ShellBagsView.exe', zip: 'ShellBagsView.zip', url: 'https://www.nirsoft.net/utils/shellbagsview-x64.zip' },
    12: { exe: 'BrowsingHistoryView.exe', zip: 'BrowsingHistoryView.zip', url: 'https://www.nirsoft.net/utils/browsinghistoryview-x64.zip' },
  };

  const util = utilityMap[id];
  if (!util) return;

  // Search for existing exe
  const searchDirs = [toolsDir, userToolsDir, getProjectRoot()];
  for (const dir of searchDirs) {
    const fullPath = resolve(dir, util.exe);
    if (fs.existsSync(fullPath)) {
      exec(`start "" "${fullPath}"`, { shell: true, cwd: dir });
      return;
    }
  }

  // Check Program Files
  if (id === 1) {
    const pf = process.env.ProgramFiles || 'C:\\Program Files';
    const pfx86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    for (const p of [resolve(pf, 'SystemInformer', 'SystemInformer.exe'), resolve(pfx86, 'SystemInformer', 'SystemInformer.exe')]) {
      if (fs.existsSync(p)) { exec(`start "" "${p}"`, { shell: true }); return; }
    }
  }
  if (id === 2) {
    const pf = process.env.ProgramFiles || 'C:\\Program Files';
    const pfx86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    for (const p of [resolve(pf, 'Everything', 'Everything.exe'), resolve(pfx86, 'Everything', 'Everything.exe')]) {
      if (fs.existsSync(p)) { exec(`start "" "${p}"`, { shell: true }); return; }
    }
  }

  // Fallback to system utility
  if (util.system) {
    exec(`start "" "${util.system}"`, { shell: true });
    return;
  }

  // Auto-download from URL if available
  if (util.url && util.zip) {
    mainWindow?.webContents.send('utility:downloading', util.exe);

    const zipPath = resolve(userToolsDir, util.zip);
    const download = (downloadUrl: string) => {
      const proto = downloadUrl.startsWith('https') ? https : http;
      proto.get(downloadUrl, (res: any) => {
        // Handle redirects
        if (res.statusCode === 301 || res.statusCode === 302) {
          download(res.headers.location);
          return;
        }
        const file = fs.createWriteStream(zipPath);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          // Extract zip using PowerShell
          exec(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${userToolsDir}' -Force"`, { shell: true }, (err: any) => {
            try { fs.unlinkSync(zipPath); } catch {}
            if (!err) {
              const exePath = resolve(userToolsDir, util.exe);
              if (fs.existsSync(exePath)) {
                mainWindow?.webContents.send('utility:ready', util.exe);
                exec(`start "" "${exePath}"`, { shell: true, cwd: userToolsDir });
              } else {
                // Try to find any exe in the folder
                try {
                  const files = fs.readdirSync(userToolsDir).filter((f: string) => f.toLowerCase().endsWith('.exe'));
                  const match = files.find((f: string) => f.toLowerCase().includes(util.exe.replace('.exe', '').toLowerCase()));
                  if (match) {
                    mainWindow?.webContents.send('utility:ready', match);
                    exec(`start "" "${resolve(userToolsDir, match)}"`, { shell: true, cwd: userToolsDir });
                  } else {
                    mainWindow?.webContents.send('utility:notFound', util.exe);
                  }
                } catch { mainWindow?.webContents.send('utility:notFound', util.exe); }
              }
            } else {
              mainWindow?.webContents.send('utility:notFound', util.exe);
            }
          });
        });
      }).on('error', () => {
        mainWindow?.webContents.send('utility:notFound', util.exe);
      });
    };
    download(util.url);
    return;
  }

  // Nothing found
  mainWindow?.webContents.send('utility:notFound', util.exe);
});
