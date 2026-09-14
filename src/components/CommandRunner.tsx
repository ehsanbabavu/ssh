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
} from 'lucide-react';
import { DEFAULT_QUICK_MACROS } from '../data/constants';
import type { SSHConfig, SSHExecResult } from '../types';

interface CommandRunnerProps {
  config: SSHConfig;
}

export const CommandRunner: React.FC<CommandRunnerProps> = ({ config }) => {
  const [command, setCommand] = useState<string>('uname -a && free -h && df -h');
  const [running, setRunning] = useState<boolean>(false);
  const [result, setResult] = useState<SSHExecResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [history, setHistory] = useState<Array<{ command: string; result: SSHExecResult; time: string }>>([]);

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

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl dir-rtl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Code className="w-5 h-5 text-emerald-400" />
            <span>اجراکننده آنلاین دستورات (Batch Command Runner)</span>
          </h3>
          <p className="text-xs text-slate-400">
            اجرای مستقیم دستورات Bash و اسکریپت‌ها بر روی سرور{' '}
            <span className="font-mono text-emerald-300">
              {config.username}@{config.host}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {DEFAULT_QUICK_MACROS.slice(0, 4).map((macro) => (
            <button
              key={macro.id}
              onClick={() => {
                setCommand(macro.command);
                handleExecute(macro.command);
              }}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{macro.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor & Execution Controls */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-slate-300">دستور لینوکس (Bash Script):</label>
        <div className="relative">
          <textarea
            rows={3}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="دستور را وارد کنید (مثال: apt update && apt upgrade -y)"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 dir-ltr text-left"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            می‌توانید دستورات چندخطی یا ترکیب با piping (<code>|</code> و <code>&&</code>) را وارد کنید.
          </span>
          <button
            onClick={() => handleExecute()}
            disabled={running || !command.trim()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-lg transition-colors"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
            <span>اجرای دستور</span>
          </button>
        </div>
      </div>

      {/* Execution Output Result */}
      {result && (
        <div className="space-y-2 border-t border-slate-800 pt-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-200">خروجی دستور (Result):</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                  result.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {result.success ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                <span>کد خروجی (Exit Code): {result.code}</span>
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
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'کپی شد' : 'کپی خروجی'}</span>
            </button>
          </div>

          {/* Stdout Output Box */}
          {result.stdout && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-300 overflow-x-auto max-h-96 dir-ltr text-left whitespace-pre-wrap select-text">
              {result.stdout}
            </div>
          )}

          {/* Stderr Error Box */}
          {result.stderr && (
            <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-4 font-mono text-xs text-rose-300 overflow-x-auto max-h-60 dir-ltr text-left whitespace-pre-wrap select-text">
              <div className="font-bold text-rose-400 mb-1 text-right dir-rtl font-sans">[خطا / Stderr]:</div>
              {result.stderr}
            </div>
          )}
        </div>
      )}

      {/* History Log */}
      {history.length > 0 && (
        <div className="border-t border-slate-800 pt-4 space-y-2">
          <h4 className="text-xs font-bold text-slate-400">تاریخچه دستورات اخیر:</h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {history.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setCommand(item.command);
                  setResult(item.result);
                }}
                className="p-2 bg-slate-950/60 hover:bg-slate-950 rounded-lg border border-slate-800/80 cursor-pointer flex items-center justify-between text-xs transition-colors"
              >
                <div className="flex items-center gap-2 font-mono text-slate-300 truncate dir-ltr text-left">
                  <span className={item.result.success ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {item.result.success ? '✓' : '✗'}
                  </span>
                  <span className="truncate">{item.command}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
