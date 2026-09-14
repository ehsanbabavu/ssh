import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import {
  Maximize2,
  Minimize2,
  Trash2,
  Copy,
  RefreshCw,
  Zap,
  Terminal as TerminalIcon,
  Sun,
  Moon,
  ChevronRight,
  Send,
  AlertTriangle,
  CheckCircle2,
  Play,
} from 'lucide-react';
import { TERMINAL_THEMES, DEFAULT_QUICK_MACROS } from '../data/constants';
import type { SSHConfig, QuickMacro } from '../types';

interface TerminalViewProps {
  config: SSHConfig;
  onDisconnect?: () => void;
  onRunMacro?: (command: string) => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({ config, onDisconnect }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [status, setStatus] = useState<'connecting' | 'connected' | 'closed' | 'error'>('connecting');
  const [statusMessage, setStatusMessage] = useState<string>('در حال برقراری اتصال...');
  const [themeId, setThemeId] = useState<string>('dracula');
  const [fontSize, setFontSize] = useState<number>(14);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [quickInput, setQuickInput] = useState<string>('');
  const [showMacrosMenu, setShowMacrosMenu] = useState<boolean>(false);

  // Initialize Terminal & WebSocket Connection
  useEffect(() => {
    if (!containerRef.current) return;

    const themeObj = TERMINAL_THEMES.find((t) => t.id === themeId)?.theme || TERMINAL_THEMES[0].theme;

    const term = new Terminal({
      fontSize,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      cursorBlink: true,
      cursorStyle: 'block',
      theme: themeObj,
      allowProposedApi: true,
      scrollback: 5000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln(`\x1b[36m⚡ در حال اتصال به سرور SSH: ${config.username}@${config.host}:${config.port || 22}...\x1b[0m\r\n`);

    // Connect WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/ssh`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'init',
          config,
          cols: term.cols,
          rows: term.rows,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'output') {
          term.write(msg.data);
        } else if (msg.type === 'status') {
          if (msg.status === 'connected') {
            setStatus('connected');
            setStatusMessage('ارتباط برقرار شد');
            term.writeln(`\x1b[32m✔ ${msg.message}\x1b[0m\r\n`);
          } else if (msg.status === 'closed') {
            setStatus('closed');
            setStatusMessage(msg.message || 'جلسه متوقف شد');
            term.writeln(`\r\n\x1b[33m⚡ ${msg.message}\x1b[0m\r\n`);
          } else if (msg.status === 'connecting') {
            setStatus('connecting');
            setStatusMessage(msg.message);
          }
        } else if (msg.type === 'banner') {
          term.write(`\r\n\x1b[35m[SSH Banner] ${msg.banner}\x1b[0m\r\n`);
        } else if (msg.type === 'error') {
          setStatus('error');
          setStatusMessage(msg.message);
          term.writeln(`\r\n\x1b[31m❌ خطای اتصال: ${msg.message}\x1b[0m\r\n`);
        }
      } catch (err) {
        console.error('Error handling WS message:', err);
      }
    };

    ws.onerror = (err) => {
      setStatus('error');
      setStatusMessage('خطای ارتباط با سرور برنامه (WebSocket Error)');
      term.writeln('\r\n\x1b[31m❌ خطای ارتباط با WebSocket backend.\x1b[0m\r\n');
    };

    ws.onclose = () => {
      if (status !== 'error') {
        setStatus('closed');
        setStatusMessage('ارتباط قطع شد');
      }
    };

    // Forward user terminal input to WebSocket
    const onDataDisposable = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    // Forward terminal resize to WebSocket
    const onResizeDisposable = term.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch (e) {}
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      onDataDisposable.dispose();
      onResizeDisposable.dispose();
      resizeObserver.disconnect();
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      term.dispose();
    };
  }, [config]);

  // Handle Theme or Font Size Changes
  useEffect(() => {
    if (!terminalRef.current) return;

    const themeObj = TERMINAL_THEMES.find((t) => t.id === themeId)?.theme || TERMINAL_THEMES[0].theme;
    terminalRef.current.options.theme = themeObj;
    terminalRef.current.options.fontSize = fontSize;

    if (fitAddonRef.current) {
      try {
        fitAddonRef.current.fit();
      } catch (e) {}
    }
  }, [themeId, fontSize]);

  const sendCommand = (cmd: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input', data: cmd.endsWith('\r') ? cmd : cmd + '\r' }));
      if (terminalRef.current) {
        terminalRef.current.focus();
      }
    }
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    sendCommand(quickInput);
    setQuickInput('');
  };

  const sendControlKey = (key: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (key === 'ctrl-c') {
      wsRef.current.send(JSON.stringify({ type: 'input', data: '\x03' }));
    } else if (key === 'ctrl-z') {
      wsRef.current.send(JSON.stringify({ type: 'input', data: '\x1a' }));
    } else if (key === 'tab') {
      wsRef.current.send(JSON.stringify({ type: 'input', data: '\t' }));
    } else if (key === 'clear') {
      terminalRef.current?.clear();
    }
  };

  const reconnect = () => {
    setStatus('connecting');
    setStatusMessage('در حال اتصال مجدد...');
    if (wsRef.current) {
      wsRef.current.close();
    }
    // Force re-mount by triggering a slight change or refreshing component logic
    if (terminalRef.current) {
      terminalRef.current.clear();
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/ssh`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (terminalRef.current) {
        ws.send(
          JSON.stringify({
            type: 'init',
            config,
            cols: terminalRef.current.cols,
            rows: terminalRef.current.rows,
          })
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output') terminalRef.current?.write(msg.data);
        else if (msg.type === 'status') {
          if (msg.status === 'connected') {
            setStatus('connected');
            setStatusMessage('اتصال برقرار شد');
          } else if (msg.status === 'closed') {
            setStatus('closed');
            setStatusMessage(msg.message);
          }
        } else if (msg.type === 'error') {
          setStatus('error');
          setStatusMessage(msg.message);
        }
      } catch (e) {}
    };
  };

  return (
    <div
      className={`flex flex-col bg-slate-950 text-slate-100 rounded-xl border border-slate-800 shadow-2xl overflow-hidden transition-all duration-200 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'w-full h-[650px]'
      }`}
    >
      {/* Terminal Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-900/90 border-b border-slate-800 text-xs select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono font-semibold">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: config.color || '#3b82f6' }}
            />
            <span className="text-slate-200">{config.name}</span>
            <span className="text-slate-500 font-normal">
              ({config.username}@{config.host}:{config.port || 22})
            </span>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800/80 border border-slate-700/50">
            {status === 'connected' && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400">متصل</span>
              </>
            )}
            {status === 'connecting' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="text-amber-400">در حال اتصال...</span>
              </>
            )}
            {(status === 'closed' || status === 'error') && (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-rose-400">{status === 'error' ? 'خطا' : 'قطع شده'}</span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Quick Macros Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMacrosMenu(!showMacrosMenu)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50 transition-colors"
              title="دستورات آماده"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>دستورات سریع</span>
            </button>

            {showMacrosMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 border-b border-slate-800 mb-1">
                  دستورات پرکاربرد سیستم
                </div>
                {DEFAULT_QUICK_MACROS.map((macro) => (
                  <button
                    key={macro.id}
                    onClick={() => {
                      sendCommand(macro.command);
                      setShowMacrosMenu(false);
                    }}
                    className="w-full text-right px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 transition-colors text-xs flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span>{macro.title}</span>
                      <Play className="w-3 h-3 text-emerald-400" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono truncate">{macro.command}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Special Key Buttons */}
          <button
            onClick={() => sendControlKey('ctrl-c')}
            className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors font-mono font-bold text-[11px]"
            title="ارسال کلید Ctrl + C (توقف دستور)"
          >
            Ctrl+C
          </button>
          <button
            onClick={() => sendControlKey('ctrl-z')}
            className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors font-mono font-bold text-[11px]"
            title="ارسال کلید Ctrl + Z"
          >
            Ctrl+Z
          </button>
          <button
            onClick={() => sendControlKey('tab')}
            className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors font-mono text-[11px]"
            title="کلید Tab (تکمیل خودکار)"
          >
            Tab
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          {/* Theme Selector */}
          <select
            value={themeId}
            onChange={(e) => setThemeId(e.target.value)}
            className="bg-slate-800 text-slate-300 px-2 py-1.5 rounded border border-slate-700 text-xs focus:outline-none"
          >
            {TERMINAL_THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Font Size Adjuster */}
          <div className="flex items-center bg-slate-800 rounded border border-slate-700">
            <button
              onClick={() => setFontSize((s) => Math.max(10, s - 1))}
              className="px-2 py-1 text-slate-400 hover:text-white"
              title="کاهش اندازه‌فونت"
            >
              -
            </button>
            <span className="px-1 font-mono text-[11px] text-slate-300">{fontSize}px</span>
            <button
              onClick={() => setFontSize((s) => Math.min(24, s + 1))}
              className="px-2 py-1 text-slate-400 hover:text-white"
              title="افزایش اندازه‌فونت"
            >
              +
            </button>
          </div>

          <button
            onClick={() => sendControlKey('clear')}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="پاک‌سازی ترمینال"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={reconnect}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="اتصال مجدد"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title={isFullscreen ? 'خروج از تمام‌صفحه' : 'حالت تمام‌صفحه'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal Container */}
      <div className="flex-1 w-full relative bg-slate-950 p-2 overflow-hidden dir-ltr">
        <div ref={containerRef} className="w-full h-full" />

        {status === 'closed' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10 dir-rtl">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-full mb-3 text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">اتصال SSH پایان یافت</h3>
            <p className="text-xs text-slate-400 mb-4">{statusMessage}</p>
            <button
              onClick={reconnect}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>اتصال دوباره به سرور</span>
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10 dir-rtl">
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-full mb-3 text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-rose-300 mb-1">خطا در برقراری ارتباط SSH</h3>
            <p className="text-xs text-slate-400 max-w-md mb-4 bg-slate-900 p-3 rounded border border-slate-800 font-mono dir-ltr">
              {statusMessage}
            </p>
            <div className="flex gap-2">
              <button
                onClick={reconnect}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>تلاش مجدد</span>
              </button>
              {onDisconnect && (
                <button
                  onClick={onDisconnect}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
                >
                  تغییر تنظیمات سرور
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Interactive Command Input Bar */}
      <form onSubmit={handleQuickSubmit} className="flex items-center gap-2 p-2 bg-slate-900 border-t border-slate-800 dir-rtl">
        <div className="flex items-center gap-1 text-xs text-slate-400 font-mono px-2">
          <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span>ارسال دستور:</span>
        </div>
        <input
          type="text"
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          placeholder="دستور را تایپ کرده و Enter بزنید (مانند: htop, docker ps, ls -l)..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 dir-ltr"
        />
        <button
          type="submit"
          disabled={status !== 'connected'}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          <span>ارسال</span>
        </button>
      </form>
    </div>
  );
};
