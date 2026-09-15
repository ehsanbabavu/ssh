import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import {
  Maximize2,
  Minimize2,
  Trash2,
  RefreshCw,
  Zap,
  Terminal as TerminalIcon,
  Server,
  Laptop,
  AlertTriangle,
  Send,
  Play,
  ArrowRight,
  HelpCircle,
  Code2,
  Globe,
  User,
  Lock,
  Key,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Power,
  ShieldCheck,
  Radio,
  Eye,
  EyeOff,
  Bookmark,
  BookmarkPlus,
  History,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import { TERMINAL_THEMES, DEFAULT_QUICK_MACROS } from '../data/constants';
import { VirtualBashShell } from '../utils/virtualShell';
import type { SSHConfig, SSHTestResult, SavedCommand } from '../types';

interface TerminalViewProps {
  config?: SSHConfig | null;
  savedConfigs?: SSHConfig[];
  isVisible?: boolean;
  onDisconnect?: () => void;
  onConnectRemote?: (config: SSHConfig) => void;
  onSaveConfig?: (config: SSHConfig) => void;
}

const STORAGE_SAVED_COMMANDS_KEY = 'ssh_terminal_saved_commands_v1';
const STORAGE_COMMAND_HISTORY_KEY = 'ssh_terminal_cmd_history_v1';

export const TerminalView: React.FC<TerminalViewProps> = ({
  config,
  savedConfigs = [],
  isVisible = true,
  onDisconnect,
  onConnectRemote,
  onSaveConfig,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const shellRef = useRef<VirtualBashShell>(new VirtualBashShell());

  // Mode: 'ssh' for real remote VPS/server, 'web-local' for in-browser POSIX shell
  const [terminalMode, setTerminalMode] = useState<'ssh' | 'web-local'>('ssh');

  // Active remote SSH configuration
  const [currentSSHConfig, setCurrentSSHConfig] = useState<SSHConfig | null>(config || null);

  // Quick Connect form states
  const [showConnectBar, setShowConnectBar] = useState<boolean>(!config);
  const [host, setHost] = useState<string>(config?.host || '');
  const [port, setPort] = useState<number>(config?.port || 22);
  const [username, setUsername] = useState<string>(config?.username || 'root');
  const [authType, setAuthType] = useState<'password' | 'privateKey'>(config?.authType || 'password');
  const [password, setPassword] = useState<string>(config?.password || '');
  const [privateKey, setPrivateKey] = useState<string>(config?.privateKey || '');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [saveToHistory, setSaveToHistory] = useState<boolean>(true);

  // Status & Connection States
  const [status, setStatus] = useState<'connected' | 'connecting' | 'closed' | 'error'>('closed');
  const [statusMessage, setStatusMessage] = useState<string>('ترمینال خارجی آماده اتصال است');
  const [latency, setLatency] = useState<number | null>(null);
  const [testTesting, setTestTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<SSHTestResult | null>(null);

  // Display Controls
  const [themeId, setThemeId] = useState<string>('pure-black');
  const [fontSize, setFontSize] = useState<number>(14);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [quickInput, setQuickInput] = useState<string>('');
  const [showMacrosMenu, setShowMacrosMenu] = useState<boolean>(false);
  const [reconnectCounter, setReconnectCounter] = useState<number>(0);

  // Saved Commands and Command History state
  const [savedCommands, setSavedCommands] = useState<SavedCommand[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_SAVED_COMMANDS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [
      { id: 'sc-1', command: 'uname -a && uptime && free -h', title: 'اطلاعات سیستم و رم', createdAt: Date.now(), useCount: 3 },
      { id: 'sc-2', command: 'df -h', title: 'بررسی فضای دیسک', createdAt: Date.now(), useCount: 2 },
      { id: 'sc-3', command: 'ps aux --sort=-%cpu | head -n 10', title: 'پردازش‌های پرمصرف', createdAt: Date.now(), useCount: 1 },
      { id: 'sc-4', command: 'docker ps -a', title: 'کانتینرهای داکر', createdAt: Date.now(), useCount: 1 },
      { id: 'sc-5', command: 'sudo journalctl -n 40 --no-pager', title: 'لاگ‌های اخیر سیستم', createdAt: Date.now(), useCount: 1 },
    ];
  });

  const [cmdHistory, setCmdHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_COMMAND_HISTORY_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [
      'uname -a && uptime && free -h',
      'df -h',
      'free -m',
      'ps aux --sort=-%cpu | head -n 10',
      'docker ps',
      'netstat -tuln',
      'uptime',
    ];
  });

  const [historyNavIndex, setHistoryNavIndex] = useState<number>(-1);
  const [showSavedModal, setShowSavedModal] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);

  const commandInputRef = useRef<HTMLInputElement>(null);

  // Save to local storage on changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SAVED_COMMANDS_KEY, JSON.stringify(savedCommands));
    } catch (e) {}
  }, [savedCommands]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COMMAND_HISTORY_KEY, JSON.stringify(cmdHistory));
    } catch (e) {}
  }, [cmdHistory]);

  // Local shell state references
  const currentLineRef = useRef<string>('');
  const historyIndexRef = useRef<number>(-1);

  // Sync prop changes
  useEffect(() => {
    if (config) {
      setCurrentSSHConfig((prev) => {
        // Prevent reconnecting if it's the exact same server config ID and credentials
        if (
          prev &&
          prev.id === config.id &&
          prev.host === config.host &&
          prev.port === config.port &&
          prev.username === config.username &&
          prev.password === config.password &&
          prev.privateKey === config.privateKey
        ) {
          return prev;
        }
        return config;
      });
      setHost(config.host);
      setPort(config.port || 22);
      setUsername(config.username);
      setAuthType(config.authType || 'password');
      setPassword(config.password || '');
      setPrivateKey(config.privateKey || '');
      setTerminalMode('ssh');
      setShowConnectBar(false);
    }
  }, [config]);

  // Initialize Terminal Instance & Handle I/O
  useEffect(() => {
    if (!containerRef.current) return;

    const themeObj =
      TERMINAL_THEMES.find((t) => t.id === themeId)?.theme || TERMINAL_THEMES[0].theme;

    const term = new Terminal({
      fontSize,
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      cursorBlink: false,
      cursorStyle: 'bar',
      disableStdin: true,
      theme: themeObj,
      allowProposedApi: true,
      scrollback: 8000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(containerRef.current);
    try {
      fitAddon.fit();
    } catch (e) {}

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    let ws: WebSocket | null = null;
    let onDataDisposable: { dispose: () => void } | null = null;
    let onResizeDisposable: { dispose: () => void } | null = null;
    let pingInterval: NodeJS.Timeout | null = null;

    if (terminalMode === 'ssh') {
      if (currentSSHConfig && currentSSHConfig.host && currentSSHConfig.username) {
        // Active Real Remote SSH Connection via WebSocket
        setStatus('connecting');
        setStatusMessage(`در حال اتصال لایو به سرور خارجی: ${currentSSHConfig.username}@${currentSSHConfig.host}:${currentSSHConfig.port || 22}...`);

        term.writeln(
          `\x1b[1;36m┌─────────────────────────────────────────────────────────────────────────┐\x1b[0m`
        );
        term.writeln(
          `\x1b[1;36m│\x1b[0m \x1b[1;37m⚡ برقراری اتصال زنده SSH به سرور خارجی (Live Remote SSH Terminal)\x1b[0m       \x1b[1;36m│\x1b[0m`
        );
        term.writeln(
          `\x1b[1;36m│\x1b[0m سرور: \x1b[32m${currentSSHConfig.username}@${currentSSHConfig.host}:${currentSSHConfig.port || 22}\x1b[0m                                     \x1b[1;36m│\x1b[0m`
        );
        term.writeln(
          `\x1b[1;36m└─────────────────────────────────────────────────────────────────────────┘\x1b[0m\r\n`
        );

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/ssh`;
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        const connectStartTime = Date.now();

        ws.onopen = () => {
          ws?.send(
            JSON.stringify({
              type: 'init',
              config: currentSSHConfig,
              cols: term.cols,
              rows: term.rows,
            })
          );

          // Heartbeat ping every 10 seconds to keep WebSocket and SSH connection alive while in background/SFTP
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 10000);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'output') {
              term.write(msg.data);
            } else if (msg.type === 'status') {
              if (msg.status === 'connected') {
                setStatus('connected');
                const elapsed = Date.now() - connectStartTime;
                setLatency(elapsed);
                setStatusMessage(`اتصال لایو SSH برقرار شد (${elapsed}ms)`);
                term.writeln(`\r\n\x1b[1;32m✔ ${msg.message} (تاخیر: ${elapsed} میلی‌ثانیه)\x1b[0m\r\n`);
                term.focus();
              } else if (msg.status === 'closed') {
                setStatus('closed');
                setStatusMessage(msg.message || 'ارتباط با سرور خارجی بسته شد');
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
              term.writeln(`\r\n\x1b[1;31m❌ خطای اتصال به سرور خارجی:\x1b[0m \x1b[31m${msg.message}\x1b[0m\r\n`);
              term.writeln(`\x1b[90mراهنما: پورت ۲۲ سرور، آدرس IP و رمز عبور وارد شده را بررسی فرمایید.\x1b[0m\r\n`);
            }
          } catch (err) {
            console.error('Error handling WS message:', err);
          }
        };

        ws.onerror = () => {
          setStatus('error');
          setStatusMessage('خطا در برقراری ارتباط با سرور یا مسدود بودن پورت SSH');
          term.writeln(
            '\r\n\x1b[1;31m❌ خطا در برقراری ارتباط شبکه با سرور خارجی.\x1b[0m\r\n' +
              '\x1b[33mنکات مهم جهت بررسی:\x1b[0m\r\n' +
              '  ۱. پورت ۲۲ سرور لینوکس در فایروال (UFW / Security Group) باز باشد.\r\n' +
              '  ۲. آدرس IP یا دامنه وارد شده صحیح و آنلاین باشد.\r\n' +
              '  ۳. در صورت نیاز به اجرای درون مرورگر، از گزینه «ترمینال لایو وب» استفاده کنید.\r\n'
          );
        };

        ws.onclose = () => {
          if (status !== 'error') {
            setStatus('closed');
            setStatusMessage('ارتباط لایو با سرور خارجی پایان یافت');
          }
        };

        onDataDisposable = term.onData((data) => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'input', data }));
          }
        });

        onResizeDisposable = term.onResize(({ cols, rows }) => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'resize', cols, rows }));
          }
        });
      } else {
        // SSH Mode selected, but no server configuration provided yet
        setStatus('closed');
        setStatusMessage('لطفاً مشخصات سرور خارجی را جهت اتصال زنده وارد نمایید');
        term.writeln(
          `\x1b[1;33m⚡ ترمینال زنده سرور خارجی (Live Remote SSH Terminal)\x1b[0m\r\n` +
            `\x1b[37mبرای شروع اتصال لایو به سرور لینوکس، سرور مجازی (VPS) یا رزبری‌پای:\x1b[0m\r\n` +
            `\x1b[36m۱. آدرس IP یا دامنه سرور (Host)، پورت (22) و نام کاربری (مانند root) را در کادر بالا وارد کنید.\x1b[0m\r\n` +
            `\x1b[36m۲. دکمه «⚡ اتصال لایو به سرور خارجی» را بزنید.\x1b[0m\r\n` +
            `\x1b[90mهمچنین می‌توانید از منوی بالا سرورهای ذخیره‌شده را انتخاب فرمایید.\x1b[0m\r\n`
        );
      }
    } else {
      // Local In-Browser Live POSIX Bash Terminal
      setStatus('connected');
      setStatusMessage('ترمینال لایو مرورگر فعال است');

      const shell = shellRef.current;
      currentLineRef.current = '';
      historyIndexRef.current = -1;

      term.writeln(
        `\x1b[1;32m┌─────────────────────────────────────────────────────────────┐\x1b[0m`
      );
      term.writeln(
        `\x1b[1;32m│\x1b[0m \x1b[1;37m🚀 ترمینال زنده شبیه‌ساز وب (Interactive Web Terminal)\x1b[0m       \x1b[1;32m│\x1b[0m`
      );
      term.writeln(
        `\x1b[1;32m│\x1b[0m \x1b[36mدستورات لینوکس مستقیماً در خود سایت خط‌به‌خط اجرا می‌شوند.\x1b[0m   \x1b[1;32m│\x1b[0m`
      );
      term.writeln(
        `\x1b[1;32m│\x1b[0m \x1b[33mدستور \x1b[1;32mhelp\x1b[0m\x1b[33m را تایپ کنید تا فهرست دستورات را ببینید.         \x1b[0m \x1b[1;32m│\x1b[0m`
      );
      term.writeln(
        `\x1b[1;32m└─────────────────────────────────────────────────────────────┘\x1b[0m\r\n`
      );

      term.write(shell.getPrompt());

      onDataDisposable = term.onData(async (data) => {
        const shell = shellRef.current;
        const currentLine = currentLineRef.current;
        const history = shell.getHistory();

        if (data === '\r' || data === '\n') {
          term.writeln('');
          const trimmed = currentLine.trim();
          if (trimmed) {
            const output = await shell.execute(trimmed);
            if (output) term.write(output);
          }
          currentLineRef.current = '';
          historyIndexRef.current = -1;
          term.write(shell.getPrompt());
          return;
        }

        if (data === '\x7f' || data === '\b') {
          if (currentLineRef.current.length > 0) {
            currentLineRef.current = currentLineRef.current.slice(0, -1);
            term.write('\b \b');
          }
          return;
        }

        if (data === '\t') {
          const suggestions = shell.getCompletions(currentLineRef.current);
          if (suggestions.length === 1) {
            const suggestion = suggestions[0];
            const tokens = currentLineRef.current.split(' ');
            tokens[tokens.length - 1] = suggestion;
            const newLine = tokens.join(' ');
            const diff = newLine.slice(currentLineRef.current.length);
            currentLineRef.current = newLine;
            term.write(diff);
          } else if (suggestions.length > 1) {
            term.writeln('');
            term.writeln(suggestions.map((s) => `\x1b[36m${s}\x1b[0m`).join('    '));
            term.write(shell.getPrompt() + currentLineRef.current);
          }
          return;
        }

        if (data === '\x03') {
          term.writeln('^C');
          currentLineRef.current = '';
          historyIndexRef.current = -1;
          term.write(shell.getPrompt());
          return;
        }

        if (data === '\x0c') {
          term.clear();
          term.write(shell.getPrompt() + currentLineRef.current);
          return;
        }

        if (data === '\x1b[A') {
          if (history.length === 0) return;
          if (historyIndexRef.current === -1) {
            historyIndexRef.current = history.length - 1;
          } else if (historyIndexRef.current > 0) {
            historyIndexRef.current--;
          }
          const prevCmd = history[historyIndexRef.current] || '';
          while (currentLineRef.current.length > 0) {
            term.write('\b \b');
            currentLineRef.current = currentLineRef.current.slice(0, -1);
          }
          currentLineRef.current = prevCmd;
          term.write(prevCmd);
          return;
        }

        if (data === '\x1b[B') {
          if (historyIndexRef.current === -1) return;
          if (historyIndexRef.current < history.length - 1) {
            historyIndexRef.current++;
            const nextCmd = history[historyIndexRef.current] || '';
            while (currentLineRef.current.length > 0) {
              term.write('\b \b');
              currentLineRef.current = currentLineRef.current.slice(0, -1);
            }
            currentLineRef.current = nextCmd;
            term.write(nextCmd);
          } else {
            historyIndexRef.current = -1;
            while (currentLineRef.current.length > 0) {
              term.write('\b \b');
              currentLineRef.current = currentLineRef.current.slice(0, -1);
            }
          }
          return;
        }

        if (data >= ' ' || data.charCodeAt(0) > 127) {
          currentLineRef.current += data;
          term.write(data);
        }
      });
    }

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch (e) {}
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      onDataDisposable?.dispose();
      onResizeDisposable?.dispose();
      resizeObserver.disconnect();
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
      term.dispose();
    };
  }, [terminalMode, currentSSHConfig, reconnectCounter]);

  // Handle Theme or Font Size Changes
  useEffect(() => {
    if (!terminalRef.current) return;
    const themeObj =
      TERMINAL_THEMES.find((t) => t.id === themeId)?.theme || TERMINAL_THEMES[0].theme;
    terminalRef.current.options.theme = themeObj;
    terminalRef.current.options.fontSize = fontSize;
    if (fitAddonRef.current) {
      try {
        fitAddonRef.current.fit();
      } catch (e) {}
    }
  }, [themeId, fontSize]);

  // Refit terminal whenever becoming visible
  useEffect(() => {
    if (isVisible && fitAddonRef.current) {
      const timer = setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
        } catch (e) {}
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // Handle Connect to External SSH
  const handleConnectSSH = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!host.trim() || !username.trim()) {
      alert('لطفاً آدرس IP سرور و نام کاربری را وارد فرمایید.');
      return;
    }

    const newConfig: SSHConfig = {
      id: currentSSHConfig?.id || `ssh-${Date.now()}`,
      name: currentSSHConfig?.name || `${username}@${host}`,
      host: host.trim(),
      port: Number(port) || 22,
      username: username.trim(),
      authType,
      password,
      privateKey,
    };

    setCurrentSSHConfig(newConfig);
    setTerminalMode('ssh');
    setShowConnectBar(false);
    setReconnectCounter((c) => c + 1);

    if (onConnectRemote) {
      onConnectRemote(newConfig);
    }
    if (saveToHistory && onSaveConfig) {
      onSaveConfig(newConfig);
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    if (!host.trim() || !username.trim()) {
      setTestResult({
        success: false,
        message: 'لطفاً آدرس سرور و نام کاربری را وارد کنید.',
      });
      return;
    }

    setTestTesting(true);
    setTestResult(null);

    const testCfg: SSHConfig = {
      name: `${username.trim()}@${host.trim()}`,
      host: host.trim(),
      port: Number(port) || 22,
      username: username.trim(),
      authType,
      password,
      privateKey,
    };

    try {
      const res = await fetch('/api/ssh/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCfg),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'خطا در ارتباط با سرور',
      });
    } finally {
      setTestTesting(false);
    }
  };

  // Execute line or command directly
  const runCommandLine = async (cmd: string) => {
    const term = terminalRef.current;
    if (!term) return;

    if (terminalMode === 'ssh') {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: 'input', data: cmd.endsWith('\r') ? cmd : cmd + '\r' })
        );
        term.focus();
      } else {
        setShowConnectBar(true);
      }
    } else {
      const shell = shellRef.current;
      while (currentLineRef.current.length > 0) {
        term.write('\b \b');
        currentLineRef.current = currentLineRef.current.slice(0, -1);
      }
      term.writeln(cmd);
      const output = await shell.execute(cmd);
      if (output) term.write(output);
      term.write(shell.getPrompt());
      term.focus();
    }
  };

  const handleQuickSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cmd = quickInput.trim();
    if (!cmd) return;

    // Record in command history
    setCmdHistory((prev) => {
      const filtered = prev.filter((item) => item !== cmd);
      return [cmd, ...filtered].slice(0, 50);
    });
    setHistoryNavIndex(-1);

    // Update useCount if in savedCommands
    setSavedCommands((prev) =>
      prev.map((sc) => (sc.command === cmd ? { ...sc, useCount: (sc.useCount || 0) + 1 } : sc))
    );

    runCommandLine(cmd);
    setQuickInput('');
    setSelectedSuggestionIndex(-1);
  };

  const handleSaveCurrentCommand = () => {
    const cmd = quickInput.trim();
    if (!cmd) return;
    const exists = savedCommands.some((sc) => sc.command === cmd);
    if (!exists) {
      const newSaved: SavedCommand = {
        id: `sc-${Date.now()}`,
        command: cmd,
        title: cmd.slice(0, 30),
        createdAt: Date.now(),
        useCount: 1,
      };
      setSavedCommands((prev) => [newSaved, ...prev]);
    }
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 2200);
  };

  const handleKeyDownInCommandInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Arrow Up / Down for History or Suggestions
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIdx = historyNavIndex + 1 < cmdHistory.length ? historyNavIndex + 1 : historyNavIndex;
      setHistoryNavIndex(nextIdx);
      if (cmdHistory[nextIdx]) {
        setQuickInput(cmdHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyNavIndex > 0) {
        const prevIdx = historyNavIndex - 1;
        setHistoryNavIndex(prevIdx);
        setQuickInput(cmdHistory[prevIdx]);
      } else if (historyNavIndex === 0) {
        setHistoryNavIndex(-1);
        setQuickInput('');
      }
    } else if (e.key === 'Escape') {
      setIsInputFocused(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  // Compute matched suggestions from history and saved commands
  const suggestedCommands = React.useMemo(() => {
    const query = quickInput.trim().toLowerCase();
    const map = new Map<string, { command: string; title?: string; isSaved?: boolean; count?: number }>();

    // Add saved commands
    savedCommands.forEach((sc) => {
      map.set(sc.command, {
        command: sc.command,
        title: sc.title,
        isSaved: true,
        count: sc.useCount || 1,
      });
    });

    // Add history commands
    cmdHistory.forEach((cmd) => {
      if (!map.has(cmd)) {
        map.set(cmd, {
          command: cmd,
          isSaved: false,
        });
      }
    });

    const all = Array.from(map.values());
    if (!query) {
      // return top 6 most relevant/used
      return all.slice(0, 6);
    }
    return all
      .filter((item) => item.command.toLowerCase().includes(query) || item.title?.toLowerCase().includes(query))
      .slice(0, 7);
  }, [quickInput, savedCommands, cmdHistory]);

  const sendControlKey = (key: string) => {
    const term = terminalRef.current;
    if (!term) return;

    if (terminalMode === 'ssh') {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      if (key === 'ctrl-c') {
        wsRef.current.send(JSON.stringify({ type: 'input', data: '\x03' }));
      } else if (key === 'ctrl-z') {
        wsRef.current.send(JSON.stringify({ type: 'input', data: '\x1a' }));
      } else if (key === 'tab') {
        wsRef.current.send(JSON.stringify({ type: 'input', data: '\t' }));
      } else if (key === 'clear') {
        wsRef.current.send(JSON.stringify({ type: 'input', data: 'clear\r' }));
      }
    } else {
      const shell = shellRef.current;
      if (key === 'ctrl-c') {
        term.writeln('^C');
        currentLineRef.current = '';
        term.write(shell.getPrompt());
      } else if (key === 'clear') {
        term.clear();
        term.write(shell.getPrompt() + currentLineRef.current);
      } else if (key === 'tab') {
        const suggestions = shell.getCompletions(currentLineRef.current);
        if (suggestions.length > 0) {
          term.writeln('');
          term.writeln(suggestions.map((s) => `\x1b[36m${s}\x1b[0m`).join('    '));
          term.write(shell.getPrompt() + currentLineRef.current);
        }
      }
      term.focus();
    }
  };

  const handleDisconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setStatus('closed');
    setStatusMessage('ارتباط با سرور خارجی قطع شد');
    if (onDisconnect) {
      onDisconnect();
    }
  };

  return (
    <div
      className={`flex flex-col bg-white text-slate-800 rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'w-full h-[700px]'
      }`}
    >
      {/* Top Main Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/90 border-b border-slate-200 text-xs select-none">
        {/* Left Side: Mode Selection & Connection Status */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Live External SSH Badge */}
          <div className="flex items-center bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-blue-700 font-semibold text-xs gap-1.5 shadow-xs">
            <Server className="w-3.5 h-3.5 text-blue-600" />
            <span>ترمینال خارجی زنده (Live SSH)</span>
          </div>

          {/* Quick Connect Drawer Toggle */}
          <button
            onClick={() => setShowConnectBar(!showConnectBar)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showConnectBar
                ? 'bg-white border-slate-300 text-slate-800 shadow-xs'
                : 'bg-white/80 border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>تنظیمات و اتصال سرور</span>
            {showConnectBar ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Real-time Status Badge */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white border border-slate-200 shadow-xs">
            {terminalMode === 'ssh' ? (
              status === 'connected' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-700 font-mono dir-ltr">
                    {currentSSHConfig?.username}@{currentSSHConfig?.host}:{currentSSHConfig?.port || 22}
                  </span>
                  {latency && (
                    <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                      {latency}ms
                    </span>
                  )}
                </>
              ) : status === 'connecting' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-amber-700">در حال اتصال SSH...</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span className="text-slate-500">سرور قطع است</span>
                </>
              )
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700">شبیه‌ساز فعال</span>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Reconnect, Controls, Themes, Fullscreen */}
        <div className="flex items-center gap-1.5">
          {terminalMode === 'ssh' && currentSSHConfig && (
            <>
              <button
                onClick={() => setReconnectCounter((c) => c + 1)}
                className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                title="اتصال مجدد به سرور خارجی"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              </button>

              {status === 'connected' && (
                <button
                  onClick={handleDisconnect}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs flex items-center gap-1 cursor-pointer"
                  title="قطع اتصال سرور"
                >
                  <Power className="w-3 h-3" />
                  <span className="hidden sm:inline">قطع</span>
                </button>
              )}
            </>
          )}

          {/* Saved Commands Button */}
          <button
            onClick={() => setShowSavedModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer text-xs font-semibold"
            title="دستورات ذخیره شده"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">دستورات ذخیره‌شده</span>
            <span className="bg-amber-200/80 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
              {savedCommands.length}
            </span>
          </button>

          {/* Quick Macros Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMacrosMenu(!showMacrosMenu)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              title="دستورات آماده سرور"
            >
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline font-medium">دستورات سریع</span>
            </button>

            {showMacrosMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-1">
                <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 border-b border-slate-100 mb-1">
                  دستورات لایو سرور لینوکس
                </div>
                {DEFAULT_QUICK_MACROS.map((macro) => (
                  <button
                    key={macro.id}
                    onClick={() => {
                      runCommandLine(macro.command);
                      setShowMacrosMenu(false);
                    }}
                    className="w-full text-right px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors text-xs flex flex-col gap-0.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span>{macro.title}</span>
                      <Play className="w-3 h-3 text-blue-600" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono truncate dir-ltr text-left">
                      {macro.command}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Special Control Keys */}
          <button
            onClick={() => sendControlKey('ctrl-c')}
            className="px-2 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors font-mono font-bold text-[11px] cursor-pointer"
            title="Ctrl + C (توقف دستور)"
          >
            Ctrl+C
          </button>
          <button
            onClick={() => sendControlKey('tab')}
            className="px-2 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors font-mono text-[11px] cursor-pointer"
            title="Tab"
          >
            Tab
          </button>

          {/* Theme Selector */}
          <select
            value={themeId}
            onChange={(e) => setThemeId(e.target.value)}
            className="bg-white text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none cursor-pointer"
          >
            {TERMINAL_THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Font Size */}
          <div className="hidden sm:flex items-center bg-white rounded-lg border border-slate-200">
            <button
              onClick={() => setFontSize((s) => Math.max(10, s - 1))}
              className="px-2 py-1 text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              -
            </button>
            <span className="px-1 font-mono text-[11px] text-slate-700">{fontSize}px</span>
            <button
              onClick={() => setFontSize((s) => Math.min(22, s + 1))}
              className="px-2 py-1 text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              +
            </button>
          </div>

          <button
            onClick={() => sendControlKey('clear')}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
            title="پاک‌سازی صفحه"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
            title={isFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* QUICK CONNECT BAR FOR LIVE EXTERNAL SSH (Slide-down drawer) */}
      {showConnectBar && (
        <div className="bg-slate-50/95 border-b border-slate-200 p-4 shadow-sm transition-all dir-rtl">
          <form onSubmit={handleConnectSSH} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>مشخصات اتصال لایو به سرور خارجی (Live External SSH)</span>
              </div>

              {/* Saved Presets Shortcut */}
              {savedConfigs.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">سرورهای ذخیره‌شده:</span>
                  <select
                    onChange={(e) => {
                      const selected = savedConfigs.find((c) => c.id === e.target.value);
                      if (selected) {
                        setHost(selected.host);
                        setPort(selected.port || 22);
                        setUsername(selected.username);
                        setAuthType(selected.authType || 'password');
                        setPassword(selected.password || '');
                        setPrivateKey(selected.privateKey || '');
                        setCurrentSSHConfig(selected);
                      }
                    }}
                    className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- انتخاب از لیست --</option>
                    {savedConfigs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.username}@{c.host})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
              {/* Host / IP */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  آدرس IP سرور یا دامنه (Host):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="مثال: 194.31.55.102 یا vps.example.com"
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono dir-ltr focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Port */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">پورت SSH:</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  placeholder="22"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono dir-ltr focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">نام کاربری:</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="root یا ubuntu"
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono dir-ltr focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Password or Key */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {authType === 'password' ? 'رمز عبور (Password):' : 'کلید خصوصی (PEM):'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="رمز ورود سرور..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono dir-ltr focus:outline-none focus:border-blue-500 pl-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Buttons Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <Server className="w-4 h-4 text-white" />
                  <span>اتصال لایو به سرور خارجی</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testTesting || !host.trim()}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {testTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                  <span>تست آنلاین پورت ۲۲</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                  <span>{testResult.message}</span>
                  {testResult.latencyMs && <span className="font-mono font-bold">({testResult.latencyMs}ms)</span>}
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Terminal Viewport */}
      <div className="flex-1 w-full relative bg-[#090d16] p-2 overflow-hidden dir-ltr">
        <div ref={containerRef} className="w-full h-full" />

        {/* Overlay when SSH Disconnected & No Config */}
        {terminalMode === 'ssh' && !currentSSHConfig && (
          <div className="absolute inset-0 bg-[#090d16]/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10 dir-rtl text-slate-100">
            <div className="w-14 h-14 bg-slate-900 border border-slate-700 rounded-2xl flex items-center justify-center mb-4 text-sky-400 shadow-lg">
              <Server className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              اتصال زنده به سرور خارجی (Live Remote SSH)
            </h3>
            <p className="text-xs text-slate-400 max-w-lg mb-5 leading-relaxed">
              با وارد کردن آدرس IP سرور لینوکس، پورت و رمز عبور در کادر بالا، ترمینال خط‌به‌خط و بلادرنگ به سرور شما وصل می‌شود و خروجی کامل شل، bash، دستورات سیستم و ویرایشگرها را زنده استریم می‌کند.
            </p>
            <button
              onClick={() => setShowConnectBar(true)}
              className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Server className="w-4 h-4" />
              <span>باز کردن فرم اتصال سریع سرور</span>
            </button>
          </div>
        )}
      </div>

      {/* Quick Interactive Command Input Bar & Predictive Suggestions */}
      <div className="relative border-t border-slate-200 bg-white dir-rtl">
        {/* Predictive Suggestions Floating Panel when input has focus or content */}
        {isInputFocused && suggestedCommands.length > 0 && (
          <div className="absolute bottom-full left-2 right-2 mb-1.5 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl overflow-hidden z-40 p-1.5 transition-all">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-slate-400 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>پیشنهادات هوشمند دستور (تاریخچه و دستورات ذخیره‌شده)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal">کلیک برای انتخاب یا اینتر</span>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-50 mt-1">
              {suggestedCommands.map((item, idx) => (
                <button
                  key={`${item.command}-${idx}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setQuickInput(item.command);
                    runCommandLine(item.command);
                    setCmdHistory((prev) => [item.command, ...prev.filter((c) => c !== item.command)].slice(0, 50));
                    setIsInputFocused(false);
                  }}
                  className={`w-full text-right px-3 py-2 rounded-lg flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer group ${
                    selectedSuggestionIndex === idx ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    {item.isSaved ? (
                      <Bookmark className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <History className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 shrink-0" />
                    )}
                    <span className="font-mono text-xs text-slate-800 dir-ltr text-left truncate flex-1 font-semibold">
                      {item.command}
                    </span>
                  </div>
                  {item.title && (
                    <span className="text-[11px] text-slate-400 shrink-0 hidden sm:inline font-sans">
                      {item.title}
                    </span>
                  )}
                  <Play className="w-3 h-3 text-slate-300 group-hover:text-blue-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleQuickSubmit} className="flex items-center gap-2 p-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono px-2 shrink-0">
            <TerminalIcon className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline font-sans font-medium text-slate-700">ارسال خط فرمان:</span>
          </div>

          <div className="relative flex-1">
            <input
              ref={commandInputRef}
              type="text"
              value={quickInput}
              onChange={(e) => {
                setQuickInput(e.target.value);
                setHistoryNavIndex(-1);
              }}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
              onKeyDown={handleKeyDownInCommandInput}
              placeholder={
                terminalMode === 'ssh'
                  ? 'دستور را وارد کنید (جهت بالا/پایین برای تاریخچه، مثال: htop, docker ps, uname -a)...'
                  : 'دستور لینوکس برای ترمینال وب (مثال: help, neofetch, ls -la, ping google.com)...'
              }
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:bg-white dir-ltr placeholder:text-slate-400 placeholder:dir-rtl placeholder:text-right"
            />
            {quickInput.trim() && (
              <button
                type="button"
                onClick={handleSaveCurrentCommand}
                title="ذخیره این دستور در لیست منتخب"
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-amber-500 rounded transition-colors cursor-pointer"
              >
                {saveSuccessNotice ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <BookmarkPlus className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          {/* Quick Save Bookmark Action if text entered */}
          {quickInput.trim() && (
            <button
              type="button"
              onClick={handleSaveCurrentCommand}
              className="hidden md:flex items-center gap-1 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0"
              title="ذخیره این دستور برای پیشنهادات بعدی"
            >
              {saveSuccessNotice ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">ذخیره شد</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-3.5 h-3.5 text-amber-600" />
                  <span>ذخیره دستور</span>
                </>
              )}
            </button>
          )}

          <button
            type="submit"
            disabled={!quickInput.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>ارسال</span>
          </button>
        </form>
      </div>

      {/* Saved Commands Modal */}
      {showSavedModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 dir-rtl">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-800">بانک دستورات ذخیره‌شده و پرکاربرد</h3>
              </div>
              <button
                onClick={() => setShowSavedModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto space-y-2">
              {savedCommands.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  هیچ دستوری ذخیره نشده است. با تایپ دستور و زدن آیکون بوکمارک می‌توانید دستورات را ذخیره کنید.
                </div>
              ) : (
                savedCommands.map((sc) => (
                  <div
                    key={sc.id}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 bg-slate-50/50 hover:bg-white flex items-center justify-between gap-3 transition-all group"
                  >
                    <div className="flex-1 overflow-hidden">
                      <div className="text-xs font-bold text-slate-800 mb-0.5">{sc.title || 'دستور اختصاصی'}</div>
                      <div className="font-mono text-xs text-blue-600 dir-ltr text-left truncate">
                        {sc.command}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          runCommandLine(sc.command);
                          setShowSavedModal(false);
                        }}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="اجرای مستقیم در سرور"
                      >
                        <Play className="w-3 h-3" />
                        <span>اجرا</span>
                      </button>
                      <button
                        onClick={() => {
                          setSavedCommands((prev) => prev.filter((item) => item.id !== sc.id));
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="حذف از ذخیره‌ها"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <span>تعداد دستورات: {savedCommands.length}</span>
              <button
                onClick={() => setShowSavedModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium cursor-pointer transition-colors"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
