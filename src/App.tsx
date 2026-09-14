import React, { useEffect, useState } from 'react';
import {
  Terminal as TerminalIcon,
  Server,
  Code,
  FolderPlus,
  Activity,
  Plus,
  Settings,
  ChevronDown,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Power,
  RefreshCw,
} from 'lucide-react';
import { SSHFormModal } from './components/SSHFormModal';
import { TerminalView } from './components/TerminalView';
import { CommandRunner } from './components/CommandRunner';
import { ServerStatsDashboard } from './components/ServerStatsDashboard';
import { SFTPExplorer } from './components/SFTPExplorer';
import { DEMO_PRESET_CONFIGS } from './data/constants';
import type { SSHConfig } from './types';

const STORAGE_KEY = 'web_ssh_configs_v1';

export default function App() {
  const [savedConfigs, setSavedConfigs] = useState<SSHConfig[]>([]);
  const [activeConfig, setActiveConfig] = useState<SSHConfig | null>(null);
  const [activeView, setActiveView] = useState<'terminal' | 'commands' | 'sftp' | 'stats' | 'manage'>('manage');
  const [showServerDropdown, setShowServerDropdown] = useState<boolean>(false);

  // Load saved configs from localStorage
  useEffect(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedConfigs(parsed);
          return;
        }
      }
    } catch (e) {
      console.error('Error loading saved SSH configs:', e);
    }
    // Default fallback
    setSavedConfigs(DEMO_PRESET_CONFIGS);
  }, []);

  // Save configs to localStorage
  const handleSaveConfig = (newConfig: SSHConfig) => {
    setSavedConfigs((prev) => {
      const index = prev.findIndex((c) => c.id === newConfig.id);
      let updated: SSHConfig[];
      if (index >= 0) {
        updated = [...prev];
        updated[index] = newConfig;
      } else {
        updated = [newConfig, ...prev];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteConfig = (id: string) => {
    setSavedConfigs((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    if (activeConfig?.id === id) {
      setActiveConfig(null);
      setActiveView('manage');
    }
  };

  const handleConnectServer = (config: SSHConfig) => {
    setActiveConfig(config);
    setActiveView('terminal');
    setShowServerDropdown(false);
  };

  const disconnectCurrentServer = () => {
    setActiveConfig(null);
    setActiveView('manage');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans dir-rtl selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl text-white shadow-lg shadow-emerald-900/20">
              <TerminalIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-wide text-slate-100 flex items-center gap-2">
                <span>ترمینال SSH آنلاین</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Web SSH v1.0
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">ارتباط مستقیم تعاملی SSH با سرور لینوکس و اجرای واقعی دستورات</p>
            </div>
          </div>

          {/* Active Server Quick Selector or Status */}
          {activeConfig ? (
            <div className="flex items-center gap-3">
              {/* Server Switcher Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowServerDropdown(!showServerDropdown)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs font-semibold transition-all shadow-inner"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-slate-200 font-bold">{activeConfig.name}</span>
                  <span className="text-slate-400 font-mono font-normal">
                    ({activeConfig.username}@{activeConfig.host})
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {showServerDropdown && (
                  <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-800">
                      تغییر سرور فعال:
                    </div>
                    {savedConfigs.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleConnectServer(c)}
                        className={`w-full text-right px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                          activeConfig.id === c.id
                            ? 'bg-emerald-950/60 text-emerald-300 font-bold'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color || '#10b981' }} />
                          <span>{c.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{c.host}</span>
                      </button>
                    ))}
                    <div className="border-t border-slate-800 pt-1 mt-1">
                      <button
                        onClick={() => {
                          setShowServerDropdown(false);
                          setActiveView('manage');
                        }}
                        className="w-full text-right px-3 py-2 text-xs text-emerald-400 hover:bg-slate-800 rounded-lg font-semibold flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>مدیریت یا افزودن سرور جدید</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setActiveView('terminal')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    activeView === 'terminal' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <TerminalIcon className="w-3.5 h-3.5" />
                  <span>ترمینال زنده</span>
                </button>
                <button
                  onClick={() => setActiveView('commands')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    activeView === 'commands' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>دستورات سریع</span>
                </button>
                <button
                  onClick={() => setActiveView('sftp')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    activeView === 'sftp' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>مدیریت فایل (SFTP)</span>
                </button>
                <button
                  onClick={() => setActiveView('stats')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    activeView === 'stats' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>پایش سخت‌افزار</span>
                </button>
              </div>

              <button
                onClick={disconnectCurrentServer}
                className="p-2 bg-slate-800 hover:bg-rose-900/50 text-slate-300 hover:text-rose-300 rounded-xl transition-colors border border-slate-700/60"
                title="قطع ارتباط"
              >
                <Power className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveView('manage')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/50"
            >
              <Server className="w-4 h-4" />
              <span>انتخاب سرور برای اتصال</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Active SSH Connection Content */}
        {activeConfig && activeView === 'terminal' && (
          <TerminalView config={activeConfig} onDisconnect={disconnectCurrentServer} />
        )}

        {activeConfig && activeView === 'commands' && <CommandRunner config={activeConfig} />}

        {activeConfig && activeView === 'sftp' && <SFTPExplorer config={activeConfig} />}

        {activeConfig && activeView === 'stats' && <ServerStatsDashboard config={activeConfig} />}

        {/* Server Manager Form */}
        {(!activeConfig || activeView === 'manage') && (
          <SSHFormModal
            savedConfigs={savedConfigs}
            onSaveConfig={handleSaveConfig}
            onDeleteConfig={handleDeleteConfig}
            onConnect={handleConnectServer}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 px-6 text-center text-xs text-slate-500 bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>سامانه اتصال به سرور SSH و SFTP با پوسته تعاملی xterm.js و WebSocket</span>
          </div>
          <div className="text-slate-500 font-mono text-[11px]">
            امنیت کامل - رمزهای عبور تنها در پروتکل SSH2 استفاده می‌شوند.
          </div>
        </div>
      </footer>
    </div>
  );
}
