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
  const [color, setColor] = useState<string>('#2563eb');

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
        body: JSON.stringify({ config }),
      });
      const data: SSHTestResult = await res.json();
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
      alert('لطفاً حداقل آدرس سرور و نام کاربری را مشخص کنید.');
      return;
    }

    const newConfig: SSHConfig = {
      id: editingId || `ssh-${Date.now()}`,
      name: name.trim() || `${username}@${host}`,
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
    setColor('#2563eb');
    setTestResult(null);
  };

  const startEdit = (config: SSHConfig) => {
    setEditingId(config.id || null);
    setName(config.name);
    setHost(config.host);
    setPort(config.port || 22);
    setUsername(config.username);
    setAuthType(config.authType || 'password');
    setPassword(config.password || '');
    setPrivateKey(config.privateKey || '');
    setPassphrase(config.passphrase || '');
    setColor(config.color || '#2563eb');
    setTestResult(null);
    setActiveTab('form');
  };

  const applyPreset = (preset: SSHConfig) => {
    setEditingId(null);
    setName(preset.name);
    setHost(preset.host);
    setPort(preset.port);
    setUsername(preset.username);
    setAuthType(preset.authType);
    setPassword(preset.password || '');
    setColor(preset.color || '#2563eb');
    setTestResult(null);
    setActiveTab('form');
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden dir-rtl">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-600">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">مدیریت اتصالات SSH</h2>
            <p className="text-xs text-slate-500 mt-0.5">تنظیمات اتصال به سرورهای لینوکس و اجرای دستورات مستقیم</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'saved'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            سرورهای ذخیره‌شده ({savedConfigs.length})
          </button>
          <button
            onClick={() => {
              resetForm();
              setActiveTab('form');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'form'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>افزودن سرور</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* TAB 1: Saved Servers List */}
        {activeTab === 'saved' && (
          <div className="space-y-6">
            {savedConfigs.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-8">
                <Server className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800 mb-1">هیچ سرور SSH ذخیره نشده است</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
                  برای اتصال سریع و پایش سخت‌افزاری، مشخصات سرور لینوکسی یا VPS خود را وارد کنید.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => {
                      resetForm();
                      setActiveTab('form');
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
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
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all group shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-2xs"
                          style={{ backgroundColor: config.color || '#2563eb' }}
                        >
                          <Server className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{config.name}</h4>
                          <p className="text-xs font-mono text-slate-500 dir-ltr text-right">
                            {config.username}@{config.host}:{config.port || 22}
                          </p>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        {config.authType === 'password' ? 'رمز عبور' : 'کلید خصوصی'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(config)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="ویرایش"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => config.id && onDeleteConfig(config.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => onConnect(config)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>اتصال به ترمینال</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Demo Presets */}
            <div className="mt-8 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>سرورهای نمونه عمومی (Public SSH Servers):</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                اگر سرور اختصاصی ندارید، می‌توانید از سرورهای آزمایشی آماده استفاده نمایید:
              </p>
              <div className="flex flex-wrap gap-2">
                {DEMO_PRESET_CONFIGS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
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
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Server Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">عنوان / نام سرور</label>
                <div className="relative">
                  <Server className="w-4 h-4 absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثلاً: سرور لینوکس آلمان"
                    className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Host IP / Domain */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  آدرس IP یا دامنه سرور (Host) *
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="194.31.55.102 یا vps.example.com"
                    className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:bg-white text-left dir-ltr transition-colors"
                  />
                </div>
              </div>

              {/* Port */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">پورت SSH (Port)</label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    placeholder="22"
                    className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:bg-white text-left dir-ltr transition-colors"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">نام کاربری (Username) *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="root یا ubuntu"
                    className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:bg-white text-left dir-ltr transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Auth Type Switcher */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">روش احراز هویت (Authentication)</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAuthType('password')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    authType === 'password'
                      ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>رمز عبور (Password)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthType('privateKey')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    authType === 'privateKey'
                      ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50'
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">رمز عبور SSH</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:bg-white text-left dir-ltr transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    محتوای کلید خصوصی (OpenSSH Private Key)
                  </label>
                  <textarea
                    rows={4}
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                    className="w-full bg-slate-50/70 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:bg-white dir-ltr text-left"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    عبارت عبور کلید (Passphrase - اختیاری)
                  </label>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="اگر کلید رمزنگاری شده باشد"
                    className="w-full bg-slate-50/70 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:bg-white dir-ltr text-left"
                  />
                </div>
              </div>
            )}

            {/* Color Accent */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">رنگ برچسب سرور</label>
              <div className="flex items-center gap-3">
                {['#2563eb', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                      color === c ? 'scale-125 ring-2 ring-blue-600 ring-offset-2' : ''
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
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold mb-0.5">{testResult.message}</div>
                  {testResult.latencyMs && (
                    <div className="text-[11px] font-mono text-slate-500">پاسخ‌دهی پورت: {testResult.latencyMs} میلی‌ثانیه</div>
                  )}
                  {testResult.banner && (
                    <div className="mt-2 p-2 bg-white rounded-lg border border-slate-200 font-mono text-[10px] dir-ltr text-left">
                      {testResult.banner}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <ShieldCheck className="w-4 h-4 text-emerald-600" />}
                <span>تست اتصال سرور (SSH Test)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('saved')}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
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
