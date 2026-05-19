import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { UpdateModal } from './components/UpdateModal';
import { DashboardPage } from './pages/DashboardPage';
import { ScannerPage } from './pages/ScannerPage';
import { SettingsPage } from './pages/SettingsPage';
import { SystemInformationPage } from './pages/SystemInformationPage';
import { AuthPage } from './pages/AuthPage';
import { BrowserHistoryPage } from './pages/BrowserHistoryPage';
import { UtilitiesPage } from './pages/UtilitiesPage';
import { SteamPage } from './pages/SteamPage';
import { UsbHistoryPage } from './pages/UsbHistoryPage';
import { ProgramAnalysisPage } from './pages/ProgramAnalysisPage';
import { AutoCheckPage } from './pages/AutoCheckPage';
import { AdminPage } from './pages/AdminPage';
import { CheckHistoryPage } from './pages/CheckHistoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { useAppStore } from './store/useAppStore';

function App() {
  const location = useLocation();
  const { isAuthenticated, theme } = useAppStore();

  // Apply theme class on mount
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  // Sync admins from server on startup
  useEffect(() => {
    window.launcherApi?.fetchAdmins?.().then((data) => {
      if (data?.admins) {
        localStorage.setItem('checker-admins', JSON.stringify(data.admins));
      }
    }).catch(() => {});
  }, []);

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="h-screen bg-background text-textPrimary overflow-hidden">
      <UpdateModal />
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar title="WHITE PROJECT CHECKER" subtitle="" />
          <main className="flex-1 overflow-y-auto p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                <Routes location={location}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/scanner" element={<ScannerPage />} />
                  <Route path="/system-information" element={<SystemInformationPage />} />
                  <Route path="/browser-history" element={<BrowserHistoryPage />} />
                  <Route path="/utilities" element={<UtilitiesPage />} />
                  <Route path="/steam" element={<SteamPage />} />
                  <Route path="/usb-history" element={<UsbHistoryPage />} />
                  <Route path="/program-analysis" element={<ProgramAnalysisPage />} />
                  <Route path="/auto-check" element={<AutoCheckPage />} />
                  <Route path="/check-history" element={<CheckHistoryPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
