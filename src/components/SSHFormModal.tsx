import React, { useState } from 'react';
import {
  Server,
  Key,
  Lock,
  User,
  Globe,
  Hash,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit2,
  Play,
  ShieldCheck,
  Sparkles,
  Info,
} from 'lucide-react';
import { DEMO_PRESET_CONFIGS } from '../data/constants';
import type { SSHConfig, SSHTestResult } from '../types';

interface SSHFormModalProps {
  savedConfigs: SSHConfig[];
  onSaveConfig: (config: SSHConfig) => void;
  onDeleteConfig: (id: string) => void;
  onConnect: (config: SSHConfig) => void;
}

export const SSHFormModal: React.FC<SSHFormModalProps> = ({
  savedConfigs,
  onSaveConfig,
  onDeleteConfig,
  onConnect,
}) => {
  const [activeTab, setActiveTab] = useState<'form' | 'saved'>('saved');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState<string>('سرور جدید');
  const [host, setHost] = useState<string>('');
  const [port, setPort] = useState<number>(22);
  const [username, setUsername] = useState<string>('root');
  const [authType, setAuthType] = useState<'password' | 'privateKey'>('password');
  const [password, setPassword] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');
  const [passphrase, setPassphrase] = useState<string>('');
  const [color, setColor] = useState<string>('#10b981');

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<SSHTestResult | null>(null);

  const handleTestConnection = async () => {
    if (!host.trim() || !username.trim()) {
      setTestResult({
        success: false,
        message: 'لطفاً آدرس IP/دامنه و نام‌کاربری سرور را وارد کنید.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const config: SSHConfig = {
      name,
      host: host.trim(),
      port: Number(port) || 22,
      username: username.trim(),
      authType,
      password,
      privateKey,
      passphrase,
    };

    try {
      const res = await fetch('/api/ssh/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'خطا در برقراری ارتباط با سرور برنامه.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!host.trim() || !username.trim()) {
      alert('آدرس سرور و نام کاربری الزامی است.');
      return;
    }

    const newConfig: SSHConfig = {
      id: editingId || `ssh-${Date.now()}`,
      name: name.trim() || host,
      host: host.trim(),
      port: Number(port) || 22,
      username: username.trim(),
      authType,
      password,
      privateKey,
      passphrase,
      color,
    };

    onSaveConfig(newConfig);
    resetForm();
    setActiveTab('saved');
  };

  const startEdit = (config: SSHConfig) => {
    setEditingId(config.id || null);
    setName(config.name);
    setHost(config.host);
    setPort(config.port || 22);
    setUsername(config.username);
    setAuthType(config.authType);
    setPassword(config.password || '');
    setPrivateKey(config.privateKey || '');
    setPassphrase(config.passphrase || '');
    setColor(config.color || '#10b981');
    setTestResult(null);
    setActiveTab('form');
  };

  const resetForm = () => {
    setEditingId(null);
    setName('سرور جدید');
    setHost('');
    setPort(22);
    setUsername('root');
    setAuthType('password');
    setPassword('');
    setPrivateKey('');
    setPassphrase('');
    setColor('#10b981');
    setTestResult(null);
  };

  const applyPreset = (preset: SSHConfig) => {
    setEditingId(null);
    setName(preset.name);
    setHost(preset.host);
    setPort(preset.port);
    setUsername(preset.username);
    setAuthType(preset.authType);
    setPassword(preset.password || '');
    setColor(preset.color || '#3b82f6');
    setTestResult(null);
    setActiveTab('form');
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden dir-rtl">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">مدیریت اتصالات SSH</h2>
            <p className="text-xs text-slate-400">تنظیمات اتصال مستقیم به سرورهای لینوکس و اجرای دستورات واقعی</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'saved'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            سرورهای ذخیره‌شده ({savedConfigs.length})
          </button>
          <button
            onClick={() => {
              resetForm();
              setActiveTab('form');
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'form'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>افزودن سرور جدید</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* TAB 1: Saved Servers List */}
        {activeTab === 'saved' && (
          <div className="space-y-6">
            {savedConfigs.length === 0 ? (
              <div className="text-center py-12 bg-slate-950/50 rounded-xl border border-dashed border-slate-800 p-8">
                <Server className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-300 mb-1">هیچ سرور SSH ذخیره نشده است</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
                  برای اتصال سریع و اجرای آنلاین دستورات ترمینال، مشخصات سرور لینوکسی یا VPS خود را وارد کنید.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => {
                      resetForm();
                      setActiveTab('form');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    <span>افزودن سرور SSH جدید</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedConfigs.map((config) => (
                  <div
                    key={config.id}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between gap-4 transition-all group shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-inner"
                          style={{ backgroundColor: config.color || '#10b981' }}
                        >
                          <Server className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-200 text-sm">{config.name}</h4>
                          <p className="text-xs font-mono text-slate-400 dir-ltr text-right">
                            {config.username}@{config.host}:{config.port || 22}
                          </p>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {config.authType === 'password' ? 'رمز عبور' : 'کلید خصوصی RSA'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-900 pt-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(config)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                          title="ویرایش"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => config.id && onDeleteConfig(config.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => onConnect(config)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>اتصال به ترمینال</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Demo Presets */}
            <div className="mt-8 bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>سرورهای نمونه یا تست عمومی (Public SSH Servers):</span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                اگر سرور اختصاصی ندارید، می‌توانید مشخصات سرور یا VPS خود را وارد کنید، یا از سرورهای تست استفاده نمایید:
              </p>
              <div className="flex flex-wrap gap-2">
                {DEMO_PRESET_CONFIGS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-200 rounded-lg text-xs flex items-center gap-2 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.color }} />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SSH Connection Form */}
        {activeTab === 'form' && (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Server Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">عنوان / نام سرور</label>
                <div className="relative">
                  <Server className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثلاً: سرور اصلی پروژه‌ها"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Host IP / Domain */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  آدرس IP یا نام دامنه سرور (Host) *
                </label>
                <div className="relative dir-ltr">
                  <Globe className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="192.168.1.1 یا vps.myhost.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 text-left"
                  />
                </div>
              </div>

              {/* Port */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">پورت SSH (Port)</label>
                <div className="relative dir-ltr">
                  <Hash className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    placeholder="22"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 text-left"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">نام کاربری (Username) *</label>
                <div className="relative dir-ltr">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="root یا ubuntu"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 text-left"
                  />
                </div>
              </div>
            </div>

            {/* Auth Type Switcher */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">روش احراز هویت (Authentication)</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAuthType('password')}
                  className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                    authType === 'password'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>رمز عبور (Password)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthType('privateKey')}
                  className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                    authType === 'privateKey'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Key className="w-4 h-4" />
                  <span>کلید خصوصی (Private Key PEM)</span>
                </button>
              </div>
            </div>

            {/* Password Field */}
            {authType === 'password' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">رمز عبور SSH</label>
                <div className="relative dir-ltr">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-10 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 text-left"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Private Key Field */}
            {authType === 'privateKey' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    محتوای کلید خصوصی (RSA / OpenSSH Private Key)
                  </label>
                  <textarea
                    rows={4}
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 dir-ltr text-left"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    عبارت عبور کلید (Passphrase - اختیاری)
                  </label>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="اگر کلید رمزنگاری شده باشد"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 dir-ltr text-left"
                  />
                </div>
              </div>
            )}

            {/* Color Accent */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">رنگ شناسه سرور</label>
              <div className="flex items-center gap-3">
                {['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Live Test Result Banner */}
            {testResult && (
              <div
                className={`p-4 rounded-xl border text-xs flex items-start gap-3 transition-all ${
                  testResult.success
                    ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-200'
                    : 'bg-rose-950/50 border-rose-800/80 text-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold mb-0.5">{testResult.message}</div>
                  {testResult.latencyMs && (
                    <div className="text-[11px] opacity-80 font-mono">پاسخ‌دهی: {testResult.latencyMs} میلی‌ثانیه</div>
                  )}
                  {testResult.banner && (
                    <div className="mt-2 p-2 bg-slate-950/60 rounded font-mono text-[10px] dir-ltr text-left">
                      {testResult.banner}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                <span>تست آنلاین اتصال (SSH Test)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('saved')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-colors"
                >
                  ذخیره و اتصال
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
