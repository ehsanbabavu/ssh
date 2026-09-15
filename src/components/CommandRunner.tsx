import React, { useState } from 'react';
import {
  Play,
  Loader2,
  Terminal as TerminalIcon,
  CheckCircle2,
  XCircle,
  Copy,
  Clock,
  Sparkles,
  Zap,
  Code,
  Check,
  Key,
  Lock,
  User,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DEFAULT_QUICK_MACROS } from '../data/constants';
import type { SSHConfig, SSHExecResult } from '../types';

interface CommandRunnerProps {
  config: SSHConfig;
  onUpdateConfig?: (updatedConfig: SSHConfig) => void;
}

export const CommandRunner: React.FC<CommandRunnerProps> = ({ config, onUpdateConfig }) => {
  const [command, setCommand] = useState<string>('uname -a && free -h && df -h');
  const [running, setRunning] = useState<boolean>(false);
  const [result, setResult] = useState<SSHExecResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [history, setHistory] = useState<Array<{ command: string; result: SSHExecResult; time: string }>>([]);

  // Change Password Modal / Drawer State
  const [showPasswordBox, setShowPasswordBox] = useState<boolean>(false);
  const [targetUsername, setTargetUsername] = useState<string>(config.username || 'root');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassText, setShowPassText] = useState<boolean>(false);
  const [updateSavedConfig, setUpdateSavedConfig] = useState<boolean>(true);
  const [passChanging, setPassChanging] = useState<boolean>(false);
  const [passChangeStatus, setPassChangeStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);

  const handleExecute = async (cmdToRun?: string) => {
    const targetCmd = cmdToRun || command;
    if (!targetCmd.trim()) return;

    setRunning(true);
    setResult(null);

    try {
      const res = await fetch('/api/ssh/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, command: targetCmd }),
      });

      const data: SSHExecResult = await res.json();
      setResult(data);

      setHistory((prev) => [
        {
          command: targetCmd,
          result: data,
          time: new Date().toLocaleTimeString('fa-IR'),
        },
        ...prev.slice(0, 19),
      ]);
    } catch (err: any) {
      setResult({
        success: false,
        stdout: '',
        stderr: err.message || 'خطا در ارتباط با سرور برنامه',
        code: 1,
      });
    } finally {
      setRunning(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate strong random password
  const generateRandomPassword = () => {
    const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*()_+';
    let pass = '';
    for (let i = 0; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setConfirmPassword(pass);
    setShowPassText(true);
  };

  // Handle Changing Linux User Password via chpasswd
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetUsername.trim()) {
      setPassChangeStatus({ success: false, message: 'نام کاربری نمی‌تواند خالی باشد.' });
      return;
    }

    if (!newPassword) {
      setPassChangeStatus({ success: false, message: 'لطفاً رمز عبور جدید را وارد فرمایید.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassChangeStatus({ success: false, message: 'رمز عبور جدید با تکرار آن یکسان نیست.' });
      return;
    }

    const safeUser = targetUsername.trim().replace(/["'\\]/g, '');
    const safePass = newPassword.replace(/["'\\]/g, '');
    const chpasswdCmd = `echo "${safeUser}:${safePass}" | (sudo chpasswd 2>/dev/null || chpasswd)`;

    setPassChanging(true);
    setPassChangeStatus(null);

    try {
      const res = await fetch('/api/ssh/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, command: chpasswdCmd }),
      });

      const data: SSHExecResult = await res.json();

      if (data.success && data.code === 0) {
        setPassChangeStatus({
          success: true,
          message: `رمز عبور کاربر "${safeUser}" با موفقیت بر روی سرور تغییر یافت!`,
        });

        if (updateSavedConfig && onUpdateConfig && safeUser === config.username) {
          onUpdateConfig({
            ...config,
            password: newPassword,
            authType: 'password',
          });
        }

        setHistory((prev) => [
          {
            command: `chpasswd (تغییر رمز عبور کاربر ${safeUser})`,
            result: data,
            time: new Date().toLocaleTimeString('fa-IR'),
          },
          ...prev,
        ]);
      } else {
        setPassChangeStatus({
          success: false,
          message:
            data.stderr ||
            'خطا در تغییر رمز عبور. بررسی کنید که کاربر دسترسی sudo یا root داشته باشد.',
        });
      }
    } catch (err: any) {
      setPassChangeStatus({
        success: false,
        message: err.message || 'خطا در برقراری ارتباط با سرور جهت تغییر پسوورد.',
      });
    } finally {
      setPassChanging(false);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs dir-rtl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Code className="w-5 h-5 text-blue-600" />
            <span>دستورات سریع و مدیریت سرور (Quick Commands)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            اجرای دستورات از پیش آماده و عملیات مدیریتی بر روی سرور{' '}
            <span className="font-mono text-blue-600 font-semibold dir-ltr inline-block">
              {config.username}@{config.host}
            </span>
          </p>
        </div>

        {/* Change Password Highlight Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPasswordBox(!showPasswordBox)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              showPasswordBox
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100/80 text-amber-800 border border-amber-200'
            }`}
          >
            <Key className="w-4 h-4 text-amber-600" />
            <span>تغییر رمز عبور (Change Password)</span>
            {showPasswordBox ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* DEDICATED CHANGE PASSWORD PANEL */}
      {showPasswordBox && (
        <div className="bg-amber-50/40 border border-amber-200 rounded-2xl p-5 shadow-xs relative overflow-hidden transition-all">
          <div className="flex items-center gap-2.5 mb-4 text-amber-800">
            <div className="p-2 rounded-xl bg-amber-100 border border-amber-200 text-amber-700">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">تغییر فوری رمز عبور کاربر در سرور لینوکس</h4>
              <p className="text-xs text-slate-600">
                با استفاده از دستور استاندارد لینوکسی <code className="text-amber-700 font-mono bg-amber-100 px-1.5 py-0.5 rounded">chpasswd</code>، رمز عبور بدون قطعی و بلافاصله بر روی سرور تنظیم می‌شود.
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Username Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>نام کاربری سرور:</span>
                </label>
                <input
                  type="text"
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  placeholder="مثال: root یا ubuntu"
                  required
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono dir-ltr focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* New Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>رمز عبور جدید:</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-amber-700 hover:text-amber-800 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>رمز تصادفی قوی</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassText ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="حداقل ۸ کاراکتر..."
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl pr-3 pl-9 py-2 text-xs text-slate-800 font-mono dir-ltr focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassText(!showPassText)}
                    className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassText ? 'مخفی کردن رمز' : 'نمایش رمز'}
                  >
                    {showPassText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>تکرار رمز عبور جدید:</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassText ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="تکرار رمز عبور..."
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl pr-3 pl-9 py-2 text-xs text-slate-800 font-mono dir-ltr focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassText(!showPassText)}
                    className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassText ? 'مخفی کردن رمز' : 'نمایش رمز'}
                  >
                    {showPassText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Options & Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-amber-200/70">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={updateSavedConfig}
                  onChange={(e) => setUpdateSavedConfig(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>رمز عبور جدید در تنظیمات ذخیره‌شده برنامه نیز به‌روزرسانی شود</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={passChanging || !newPassword}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  {passChanging ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Key className="w-4 h-4 text-white" />
                  )}
                  <span>ثبت و تغییر رمز در سرور</span>
                </button>
              </div>
            </div>

            {/* Status Feedback */}
            {passChangeStatus && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  passChangeStatus.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {passChangeStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{passChangeStatus.message}</span>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Quick Macros Grid */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700">
          انتخاب از میان دستورات آماده لینوکس:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {DEFAULT_QUICK_MACROS.map((macro) => (
            <button
              key={macro.id}
              onClick={() => {
                if (macro.id === 'm-chpasswd') {
                  setShowPasswordBox(true);
                } else {
                  setCommand(macro.command);
                  handleExecute(macro.command);
                }
              }}
              className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl text-right transition-all flex flex-col justify-between group cursor-pointer hover:border-slate-300"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                  {macro.id === 'm-chpasswd' ? (
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  <span>{macro.title}</span>
                </span>
                <Play className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1">{macro.description}</p>
              <code className="text-[10px] text-slate-500 font-mono mt-1.5 dir-ltr text-left truncate block bg-white border border-slate-200 px-2 py-0.5 rounded">
                {macro.command}
              </code>
            </button>
          ))}
        </div>
      </div>

      {/* Editor & Execution Controls */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <label className="block text-xs font-semibold text-slate-700">
          دستور دلخواه لینوکس (Custom Bash Command):
        </label>
        <div className="relative">
          <textarea
            rows={3}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="دستور را وارد کنید (مثال: apt update && apt upgrade -y یا echo 'root:myNewPass' | chpasswd)"
            className="w-full bg-slate-50/70 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:bg-white dir-ltr text-left transition-colors"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            می‌توانید دستورات چندخطی یا ترکیب با piping (<code>|</code> و <code>&&</code>) را وارد کنید.
          </span>
          <button
            onClick={() => handleExecute()}
            disabled={running || !command.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Play className="w-4 h-4 fill-white" />}
            <span>اجرای دستور</span>
          </button>
        </div>
      </div>

      {/* Execution Output Result */}
      {result && (
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">خروجی دستور (Result):</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 ${
                  result.success
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {result.success ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                <span>Exit Code: {result.code}</span>
              </span>

              {result.executionTimeMs && (
                <span className="text-slate-500 text-[11px] flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{result.executionTimeMs} ms</span>
                </span>
              )}
            </div>

            <button
              onClick={() => copyToClipboard(result.stdout || result.stderr)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'کپی شد' : 'کپی خروجی'}</span>
            </button>
          </div>

          {/* Stdout Output Box */}
          {result.stdout && (
            <div className="bg-slate-900 text-emerald-400 border border-slate-800 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-96 dir-ltr text-left whitespace-pre-wrap select-text shadow-inner">
              {result.stdout}
            </div>
          )}

          {/* Stderr Error Box */}
          {result.stderr && (
            <div className="bg-rose-50 text-rose-800 border border-rose-200 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-60 dir-ltr text-left whitespace-pre-wrap select-text">
              <div className="font-bold text-rose-700 mb-1 text-right dir-rtl font-sans">[خطا / Stderr]:</div>
              {result.stderr}
            </div>
          )}
        </div>
      )}

      {/* History Log */}
      {history.length > 0 && (
        <div className="border-t border-slate-100 pt-4 space-y-2">
          <h4 className="text-xs font-bold text-slate-600">تاریخچه دستورات اخیر:</h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {history.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setCommand(item.command);
                  setResult(item.result);
                }}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer flex items-center justify-between text-xs transition-colors"
              >
                <div className="flex items-center gap-2 font-mono text-slate-700 truncate dir-ltr text-left">
                  <span className={item.result.success ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                    {item.result.success ? '✓' : '✗'}
                  </span>
                  <span className="truncate">{item.command}</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
