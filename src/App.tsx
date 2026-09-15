import React, { useState, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  Server,
  FolderPlus,
  Activity,
  Code,
  Power,
  ChevronDown,
  Plus,
  Shield,
  Layers,
} from 'lucide-react';
import { TerminalView } from './components/TerminalView';
import { SSHFormModal } from './components/SSHFormModal';
import { SFTPExplorer } from './components/SFTPExplorer';
import { ServerStatsDashboard } from './components/ServerStatsDashboard';
import { CommandRunner } from './components/CommandRunner';
import { DEMO_PRESET_CONFIGS } from './data/constants';
import type { SSHConfig } from './types';

export function App() {
  const [savedConfigs, setSavedConfigs] = useState<SSHConfig[]>(() => {
    const saved = localStorage.getItem('ssh_configs');
    return saved ? JSON.parse(saved) : DEMO_PRESET_CONFIGS;
  });

  const [activeConfig, setActiveConfig] = useState<SSHConfig | null>(() => {
    return savedConfigs.length > 0 ? savedConfigs[0] : null;
  });

  const [activeView, setActiveView] = useState<'terminal' | 'commands' | 'sftp' | 'stats' | 'manage'>(
    'terminal'
  );

  const [showServerDropdown, setShowServerDropdown] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('ssh_configs', JSON.stringify(savedConfigs));
  }, [savedConfigs]);

  const handleSaveConfig = (newConfig: SSHConfig) => {
    setSavedConfigs((prev) => {
      const idx = prev.findIndex((c) => c.id === newConfig.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newConfig;
        return next;
      }
      return [...prev, newConfig];
    });

    if (!activeConfig || activeConfig.id === newConfig.id) {
      setActiveConfig(newConfig);
    }
  };

  const handleDeleteConfig = (id: string) => {
    setSavedConfigs((prev) => prev.filter((c) => c.id !== id));
    if (activeConfig?.id === id) {
      const remaining = savedConfigs.filter((c) => c.id !== id);
      setActiveConfig(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const handleConnectServer = (config: SSHConfig) => {
    setActiveConfig(config);
    setShowServerDropdown(false);
    setActiveView('terminal');
  };

  const disconnectCurrentServer = () => {
    setActiveConfig(null);
    setActiveView('terminal');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans dir-rtl selection:bg-blue-100 selection:text-blue-900">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand Logo & Clean Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/15">
              <TerminalIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  ترمینال زنده سرور لینوکس
                </h1>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live SSH
                </span>
              </div>
              <p className="text-xs text-slate-500">
                مدیریت آسان، دستورات سریع، انتقال فایل SFTP و پایش سرور
              </p>
            </div>
          </div>

          {/* Navigation Tabs & Active Server */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Elegant View Switcher */}
            <nav className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs font-medium">
              <button
                onClick={() => setActiveView('terminal')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'terminal'
                    ? 'bg-white text-blue-600 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <TerminalIcon className="w-3.5 h-3.5" />
                <span>ترمینال زنده</span>
              </button>

              <button
                onClick={() => {
                  if (!activeConfig && savedConfigs.length > 0) {
                    setActiveConfig(savedConfigs[0]);
                  }
                  setActiveView('commands');
                }}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'commands'
                    ? 'bg-white text-blue-600 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>دستورات سریع</span>
              </button>

              <button
                onClick={() => {
                  if (!activeConfig && savedConfigs.length > 0) {
                    setActiveConfig(savedConfigs[0]);
                  }
                  setActiveView('sftp');
                }}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'sftp'
                    ? 'bg-white text-blue-600 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>مدیریت فایل (SFTP)</span>
              </button>

              <button
                onClick={() => {
                  if (!activeConfig && savedConfigs.length > 0) {
                    setActiveConfig(savedConfigs[0]);
                  }
                  setActiveView('stats');
                }}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'stats'
                    ? 'bg-white text-blue-600 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>پایش سخت‌افزار</span>
              </button>
            </nav>

            {/* Server Selector / Management */}
            {activeConfig ? (
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <button
                    onClick={() => setShowServerDropdown(!showServerDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium transition-all shadow-xs cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-slate-800 font-bold">{activeConfig.name}</span>
                    <span className="text-slate-500 font-mono text-[11px] dir-ltr">
                      {activeConfig.username}@{activeConfig.host}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {showServerDropdown && (
                    <div className="absolute right-0 md:left-0 md:right-auto mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-1">
                      <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-100">
                        تغییر سرور SSH فعال:
                      </div>
                      {savedConfigs.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleConnectServer(c)}
                          className={`w-full text-right px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                            activeConfig.id === c.id
                              ? 'bg-blue-50 text-blue-700 font-bold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: c.color || '#3b82f6' }}
                            />
                            <span>{c.name}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono dir-ltr">{c.host}</span>
                        </button>
                      ))}
                      <div className="border-t border-slate-100 pt-1 mt-1">
                        <button
                          onClick={() => {
                            setShowServerDropdown(false);
                            setActiveView('manage');
                          }}
                          className="w-full text-right px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>مدیریت یا افزودن سرور جدید</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={disconnectCurrentServer}
                  className="p-2 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-colors border border-slate-200 shadow-xs cursor-pointer"
                  title="قطع اتصال سرور SSH"
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveView('manage')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Server className="w-3.5 h-3.5" />
                <span>اتصال به سرور SSH</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* Live Terminal */}
        {activeView === 'terminal' && (
          <TerminalView
            config={activeConfig}
            savedConfigs={savedConfigs}
            onDisconnect={disconnectCurrentServer}
            onConnectRemote={(cfg) => setActiveConfig(cfg)}
            onSaveConfig={handleSaveConfig}
          />
        )}

        {/* Command Runner */}
        {activeView === 'commands' &&
          (activeConfig ? (
            <CommandRunner
              config={activeConfig}
              onUpdateConfig={handleSaveConfig}
            />
          ) : (
            <div className="p-10 bg-white border border-slate-200 rounded-2xl text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                <Server className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-800">سرور SSH خارجی انتخاب نشده است</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                برای اجرای دستورات و تغییر پسوورد روی سرور خارجی، لطفاً سرور را متصل فرمایید.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setActiveView('terminal')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                >
                  بازگشت به ترمینال
                </button>
                <button
                  onClick={() => setActiveView('manage')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  انتخاب سرور SSH
                </button>
              </div>
            </div>
          ))}

        {/* SFTP Explorer */}
        {activeView === 'sftp' &&
          (activeConfig ? (
            <SFTPExplorer config={activeConfig} />
          ) : (
            <div className="p-10 bg-white border border-slate-200 rounded-2xl text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                <FolderPlus className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-800">اتصال به SFTP سرور خارجی</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                برای مرور و ویرایش فایل‌های سرور، ابتدا یک سرور را متصل نمایید.
              </p>
              <button
                onClick={() => setActiveView('manage')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                تنظیم و اتصال سرور
              </button>
            </div>
          ))}

        {/* Stats Dashboard */}
        {activeView === 'stats' &&
          (activeConfig ? (
            <ServerStatsDashboard config={activeConfig} />
          ) : (
            <div className="p-10 bg-white border border-slate-200 rounded-2xl text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                <Activity className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-800">پایش سخت‌افزار سرور خارجی</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                برای دریافت آمار زنده رم، سی‌پی‌یو و دیسک سرور لینوکس، سرور را متصل کنید.
              </p>
              <button
                onClick={() => setActiveView('manage')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                تنظیم و اتصال سرور
              </button>
            </div>
          ))}

        {/* Server Manager Form */}
        {activeView === 'manage' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-600" />
                <span>مدیریت اتصالات سرورهای SSH</span>
              </h2>
              <button
                onClick={() => setActiveView('terminal')}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>بازگشت به ترمینال</span>
                <span className="font-mono">←</span>
              </button>
            </div>
            <SSHFormModal
              savedConfigs={savedConfigs}
              onSaveConfig={handleSaveConfig}
              onDeleteConfig={handleDeleteConfig}
              onConnect={handleConnectServer}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
