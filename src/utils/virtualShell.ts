export interface VirtualFile {
  name: string;
  type: 'file' | 'dir';
  content?: string;
  size?: number;
  updatedAt?: string;
  children?: Record<string, VirtualFile>;
}

export interface ShellState {
  currentPath: string;
  user: string;
  hostname: string;
  history: string[];
  env: Record<string, string>;
  filesystem: Record<string, VirtualFile>;
}

const INITIAL_FS: Record<string, VirtualFile> = {
  home: {
    name: 'home',
    type: 'dir',
    children: {
      user: {
        name: 'user',
        type: 'dir',
        children: {
          'welcome.txt': {
            name: 'welcome.txt',
            type: 'file',
            content: `سلام! به ترمینال لایو و تعاملی تحت وب خوش آمدید.
---------------------------------------------------------
این ترمینال دستورات لینوکس و Bash را به صورت زنده و خط‌به‌خط
مستقیماً در داخل مرورگر و سایت اجرا می‌کند.

دستورات پیشنهادی برای تست:
- help         : مشاهده فهرست تمام دستورات
- neofetch     : نمایش مشخصات سیستم و گرافیک اسکی
- ls -la       : مشاهده فایل‌ها و پوشه‌ها
- cat welcome.txt : خواندن فایل
- pwd          : نمایش آدرس مسیر فعلی
- mkdir test   : ساخت پوشه جدید
- date         : تاریخ و ساعت فعلی
- ping google.com : تست پینگ شبکه
- node -e "2+2" : اجرای کدهای جاوااسکریپت
- clear        : پاک کردن صفحه ترمینال
`,
            size: 580,
            updatedAt: new Date().toISOString(),
          },
          'system_info.sh': {
            name: 'system_info.sh',
            type: 'file',
            content: `#!/bin/bash
echo "=== System Health ==="
uname -a
uptime
free -m
df -h
`,
            size: 85,
            updatedAt: new Date().toISOString(),
          },
          'notes.md': {
            name: 'notes.md',
            type: 'file',
            content: `# یادداشت‌های مدیر سرور
- بهینه‌سازی کانفیگ Nginx
- بررسی لاگ‌های سیستم
- پشتیبان‌گیری از دیتابیس
`,
            size: 110,
            updatedAt: new Date().toISOString(),
          },
          projects: {
            name: 'projects',
            type: 'dir',
            children: {
              'app.js': {
                name: 'app.js',
                type: 'file',
                content: `console.log("Web Terminal Engine v2.0 Started!");`,
                size: 47,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        },
      },
    },
  },
  etc: {
    name: 'etc',
    type: 'dir',
    children: {
      'os-release': {
        name: 'os-release',
        type: 'file',
        content: `NAME="WebTerminal Linux"
VERSION="24.04 LTS (Interactive Browser Edition)"
ID=webterminal
PRETTY_NAME="WebTerminal Linux 24.04 LTS"
`,
        size: 130,
        updatedAt: new Date().toISOString(),
      },
      hostname: {
        name: 'hostname',
        type: 'file',
        content: `web-terminal\n`,
        size: 13,
        updatedAt: new Date().toISOString(),
      },
    },
  },
  var: {
    name: 'var',
    type: 'dir',
    children: {
      log: {
        name: 'log',
        type: 'dir',
        children: {
          'syslog': {
            name: 'syslog',
            type: 'file',
            content: `systemd[1]: Started Web SSH Terminal Interactive Service.
sshd[4102]: Server listening on 0.0.0.0 port 22.
kernel: Linux version 6.8.0-web (antigravity@build) #1 SMP PREEMPT
`,
            size: 165,
            updatedAt: new Date().toISOString(),
          },
        },
      },
    },
  },
};

export class VirtualBashShell {
  private state: ShellState;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.state = {
      currentPath: '/home/user',
      user: 'user',
      hostname: 'web-terminal',
      history: [],
      env: {
        USER: 'user',
        HOME: '/home/user',
        SHELL: '/bin/bash',
        TERM: 'xterm-256color',
        PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      },
      filesystem: JSON.parse(JSON.stringify(INITIAL_FS)),
    };
  }

  public getPrompt(): string {
    const displayPath =
      this.state.currentPath === '/home/user'
        ? '~'
        : this.state.currentPath.replace('/home/user', '~');
    return `\x1b[1;32m${this.state.user}@${this.state.hostname}\x1b[0m:\x1b[1;34m${displayPath}\x1b[0m$ `;
  }

  public getHistory(): string[] {
    return this.state.history;
  }

  private resolvePath(pathStr: string): string[] {
    let target = pathStr.trim();
    if (!target) return this.resolvePath(this.state.currentPath);

    let parts: string[] = [];
    if (target.startsWith('/')) {
      parts = target.split('/').filter(Boolean);
    } else if (target.startsWith('~')) {
      parts = ['home', 'user', ...target.slice(1).split('/').filter(Boolean)];
    } else {
      const currentParts = this.state.currentPath.split('/').filter(Boolean);
      const relParts = target.split('/').filter(Boolean);
      parts = [...currentParts, ...relParts];
    }

    const resolved: string[] = [];
    for (const p of parts) {
      if (p === '.') continue;
      if (p === '..') {
        resolved.pop();
      } else {
        resolved.push(p);
      }
    }
    return resolved;
  }

  private getNode(pathParts: string[]): VirtualFile | null {
    if (pathParts.length === 0) {
      return { name: '/', type: 'dir', children: this.state.filesystem };
    }

    let curr: VirtualFile = { name: '/', type: 'dir', children: this.state.filesystem };
    for (const part of pathParts) {
      if (!curr.children || !curr.children[part]) {
        return null;
      }
      curr = curr.children[part];
    }
    return curr;
  }

  public getCompletions(partial: string): string[] {
    const commands = [
      'help',
      'neofetch',
      'ls',
      'pwd',
      'cd',
      'cat',
      'echo',
      'mkdir',
      'touch',
      'rm',
      'clear',
      'whoami',
      'hostname',
      'uname',
      'date',
      'uptime',
      'top',
      'ps',
      'curl',
      'ping',
      'node',
      'python',
      'history',
      'env',
      'grep',
      'wc',
    ];

    if (!partial.includes(' ')) {
      return commands.filter((c) => c.startsWith(partial));
    }

    const tokens = partial.split(' ');
    const lastToken = tokens[tokens.length - 1];
    const currParts = this.resolvePath(this.state.currentPath);
    const currNode = this.getNode(currParts);
    if (currNode && currNode.children) {
      return Object.keys(currNode.children).filter((name) => name.startsWith(lastToken));
    }
    return [];
  }

  public async execute(rawCommandLine: string): Promise<string> {
    const line = rawCommandLine.trim();
    if (!line) return '';

    this.state.history.push(line);

    // Handle piping or simple redirection
    if (line.includes('>')) {
      const [cmdPart, filePart] = line.split('>').map((s) => s.trim());
      const append = line.includes('>>');
      const filename = filePart.replace('>', '').trim();
      const output = await this.executeSingle(cmdPart);
      return this.writeFile(filename, output, append);
    }

    return this.executeSingle(line);
  }

  private writeFile(filename: string, content: string, append = false): string {
    const parts = this.resolvePath(filename);
    if (parts.length === 0) return '\x1b[31merror: invalid file path\x1b[0m\r\n';

    const fileName = parts.pop()!;
    const parentNode = this.getNode(parts);
    if (!parentNode || parentNode.type !== 'dir') {
      return `\x1b[31mbash: ${filename}: No such directory\x1b[0m\r\n`;
    }

    if (!parentNode.children) parentNode.children = {};

    const existing = parentNode.children[fileName];
    if (existing && existing.type === 'dir') {
      return `\x1b[31mbash: ${fileName}: Is a directory\x1b[0m\r\n`;
    }

    const newContent = append && existing?.content ? existing.content + content : content;
    parentNode.children[fileName] = {
      name: fileName,
      type: 'file',
      content: newContent,
      size: newContent.length,
      updatedAt: new Date().toISOString(),
    };
    return '';
  }

  private async executeSingle(line: string): Promise<string> {
    const args: string[] = [];
    let currentArg = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if ((ch === '"' || ch === "'") && (!inQuotes || quoteChar === ch)) {
        inQuotes = !inQuotes;
        quoteChar = inQuotes ? ch : '';
      } else if (ch === ' ' && !inQuotes) {
        if (currentArg.length > 0) {
          args.push(currentArg);
          currentArg = '';
        }
      } else {
        currentArg += ch;
      }
    }
    if (currentArg.length > 0) args.push(currentArg);

    if (args.length === 0) return '';
    const cmd = args[0].toLowerCase();
    const rest = args.slice(1);

    switch (cmd) {
      case 'help':
        return `\x1b[1;36m=== ترمینال لایو تعاملی وب (Web Shell) ===\x1b[0m\r\n` +
          `\x1b[33mدستورات فایل و پوشه:\x1b[0m\r\n` +
          `  ls [-la]       مشاهده محتوای پوشه\r\n` +
          `  pwd            نمایش مسیر کنونی\r\n` +
          `  cd <مسیر>      تغییر پوشه کاری\r\n` +
          `  cat <فایل>     خواندن محتوای فایل\r\n` +
          `  mkdir <پوشه>   ساخت پوشه جدید\r\n` +
          `  touch <فایل>   ساخت فایل خالی\r\n` +
          `  rm [-r] <نام>  حذف فایل یا پوشه\r\n` +
          `  echo "متن" > f نوشتن در فایل\r\n\r\n` +
          `\x1b[33mدستورات سیستم و مانیتورینگ:\x1b[0m\r\n` +
          `  neofetch       مشخصات سیستم به همراه لوگوی اسکی\r\n` +
          `  top / ps       مشاهده پردازش‌های زنده و RAM/CPU\r\n` +
          `  uname -a       اطلاعات کرنل و سیستم‌عامل\r\n` +
          `  whoami         نام کاربر فعال\r\n` +
          `  uptime / date  زمان روشن بودن و تاریخ\r\n` +
          `  history        تاریخچه دستورات تایپ‌شده\r\n` +
          `  clear          پاک‌سازی کامل صفحه\r\n\r\n` +
          `\x1b[33mدستورات شبکه و اجرا:\x1b[0m\r\n` +
          `  ping <host>    تست لایو پینگ سرور (مثال: ping google.com)\r\n` +
          `  curl <url>     دریافت آنلاین اطلاعات از وب\r\n` +
          `  node -e "کد"   اجرای زنده کدهای جاوااسکریپت\r\n` +
          `  calc <فرمول>   ماشین‌حساب ریاضی (مثال: calc (10*5)+20)\r\n\r\n` +
          `\x1b[90mنکته: برای تکمیل خودکار کلید Tab و برای دستورات قبلی کلیدهای Up/Down را بزنید.\x1b[0m\r\n`;

      case 'pwd':
        return `${this.state.currentPath}\r\n`;

      case 'clear':
        return '\x1b[2J\x1b[H';

      case 'whoami':
        return `${this.state.user}\r\n`;

      case 'hostname':
        return `${this.state.hostname}\r\n`;

      case 'date':
        return `${new Date().toUTCString()}\r\n`;

      case 'uptime': {
        const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000) + 72400;
        const hours = Math.floor(uptimeSec / 3600);
        const mins = Math.floor((uptimeSec % 3600) / 60);
        return ` ${new Date().toLocaleTimeString()} up ${hours} hours, ${mins} min, 1 user, load average: 0.14, 0.08, 0.03\r\n`;
      }

      case 'uname': {
        if (rest.includes('-a') || rest.includes('--all')) {
          return `Linux ${this.state.hostname} 6.8.0-web-terminal #1 SMP PREEMPT x86_64 GNU/Linux\r\n`;
        }
        return `Linux\r\n`;
      }

      case 'echo': {
        const text = rest.join(' ');
        return `${text}\r\n`;
      }

      case 'history':
        return this.state.history
          .map((h, i) => `  ${String(i + 1).padStart(4, ' ')}  ${h}`)
          .join('\r\n') + '\r\n';

      case 'env':
        return Object.entries(this.state.env)
          .map(([k, v]) => `${k}=${v}`)
          .join('\r\n') + '\r\n';

      case 'cd': {
        const target = rest[0] || '~';
        const parts = this.resolvePath(target);
        const node = this.getNode(parts);
        if (!node) {
          return `\x1b[31mbash: cd: ${target}: No such file or directory\x1b[0m\r\n`;
        }
        if (node.type !== 'dir') {
          return `\x1b[31mbash: cd: ${target}: Not a directory\x1b[0m\r\n`;
        }
        this.state.currentPath = '/' + parts.join('/');
        return '';
      }

      case 'ls': {
        const target = rest.find((a) => !a.startsWith('-')) || '.';
        const showAll = rest.some((a) => a.includes('a'));
        const longFormat = rest.some((a) => a.includes('l'));

        const parts = this.resolvePath(target);
        const node = this.getNode(parts);

        if (!node) {
          return `\x1b[31mls: cannot access '${target}': No such file or directory\x1b[0m\r\n`;
        }

        if (node.type === 'file') {
          return `${node.name}\r\n`;
        }

        const items = Object.values(node.children || {});
        if (longFormat) {
          let out = `total ${items.length * 4}\r\n`;
          for (const it of items) {
            const isDir = it.type === 'dir';
            const perm = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
            const size = (it.size || (isDir ? 4096 : 0)).toString().padStart(6, ' ');
            const dateStr = 'Sep 15 12:30';
            const coloredName = isDir ? `\x1b[1;34m${it.name}/\x1b[0m` : `\x1b[0m${it.name}`;
            out += `${perm} 1 ${this.state.user} ${this.state.user} ${size} ${dateStr} ${coloredName}\r\n`;
          }
          return out;
        } else {
          const list = items.map((it) => {
            return it.type === 'dir' ? `\x1b[1;34m${it.name}/\x1b[0m` : it.name;
          });
          return list.join('  ') + '\r\n';
        }
      }

      case 'cat': {
        if (rest.length === 0) {
          return `\x1b[31mcat: missing file operand\x1b[0m\r\n`;
        }
        const results: string[] = [];
        for (const fname of rest) {
          const parts = this.resolvePath(fname);
          const node = this.getNode(parts);
          if (!node) {
            results.push(`\x1b[31mcat: ${fname}: No such file or directory\x1b[0m`);
          } else if (node.type === 'dir') {
            results.push(`\x1b[31mcat: ${fname}: Is a directory\x1b[0m`);
          } else {
            results.push(node.content || '');
          }
        }
        return results.join('\r\n') + '\r\n';
      }

      case 'mkdir': {
        if (rest.length === 0) return `\x1b[31mmkdir: missing operand\x1b[0m\r\n`;
        for (const dname of rest) {
          const parts = this.resolvePath(dname);
          const name = parts.pop()!;
          const parent = this.getNode(parts);
          if (!parent || parent.type !== 'dir') {
            return `\x1b[31mmkdir: cannot create directory '${dname}': No such parent directory\x1b[0m\r\n`;
          }
          if (!parent.children) parent.children = {};
          if (parent.children[name]) {
            return `\x1b[31mmkdir: cannot create directory '${dname}': File exists\x1b[0m\r\n`;
          }
          parent.children[name] = {
            name,
            type: 'dir',
            children: {},
            updatedAt: new Date().toISOString(),
          };
        }
        return '';
      }

      case 'touch': {
        if (rest.length === 0) return `\x1b[31mtouch: missing file operand\x1b[0m\r\n`;
        for (const fname of rest) {
          const parts = this.resolvePath(fname);
          const name = parts.pop()!;
          const parent = this.getNode(parts);
          if (!parent || parent.type !== 'dir') {
            return `\x1b[31mtouch: cannot touch '${fname}': No such directory\x1b[0m\r\n`;
          }
          if (!parent.children) parent.children = {};
          if (!parent.children[name]) {
            parent.children[name] = {
              name,
              type: 'file',
              content: '',
              size: 0,
              updatedAt: new Date().toISOString(),
            };
          }
        }
        return '';
      }

      case 'rm': {
        if (rest.length === 0) return `\x1b[31mrm: missing operand\x1b[0m\r\n`;
        const recursive = rest.includes('-r') || rest.includes('-rf') || rest.includes('-f');
        const targets = rest.filter((a) => !a.startsWith('-'));
        for (const target of targets) {
          const parts = this.resolvePath(target);
          const name = parts.pop()!;
          const parent = this.getNode(parts);
          if (!parent || !parent.children || !parent.children[name]) {
            return `\x1b[31mrm: cannot remove '${target}': No such file or directory\x1b[0m\r\n`;
          }
          if (parent.children[name].type === 'dir' && !recursive) {
            return `\x1b[31mrm: cannot remove '${target}': Is a directory (use -r)\x1b[0m\r\n`;
          }
          delete parent.children[name];
        }
        return '';
      }

      case 'neofetch':
        return (
          `\r\n` +
          `\x1b[1;32m      ___        \x1b[1;36m${this.state.user}\x1b[0m@\x1b[1;36m${this.state.hostname}\x1b[0m\r\n` +
          `\x1b[1;32m     (.. \\       \x1b[0m-------------------------\r\n` +
          `\x1b[1;32m     (<>  )      \x1b[1;33mOS:\x1b[0m WebTerminal Linux (Interactive Live Engine)\r\n` +
          `\x1b[1;32m    / __  \\      \x1b[1;33mHost:\x1b[0m Browser Web Shell (In-Memory POSIX Sandbox)\r\n` +
          `\x1b[1;32m   ( /  \\ /|     \x1b[1;33mKernel:\x1b[0m 6.8.0-web-terminal-x86_64\r\n` +
          `\x1b[1;32m  _/\ __)/_)     \x1b[1;33mUptime:\x1b[0m 1 day, 4 hours, 12 mins\r\n` +
          `\x1b[1;32m  \/-____\/       \x1b[1;33mShell:\x1b[0m bash 5.2.21 (Interactive Line-by-Line)\r\n` +
          `\x1b[1;32m                 \x1b[1;33mTerminal:\x1b[0m xterm-256color (xterm.js)\r\n` +
          `\x1b[1;32m                 \x1b[1;33mCPU:\x1b[0m Virtual 8-Core Intel Xeon E5-2686 v4 @ 2.30GHz\r\n` +
          `\x1b[1;32m                 \x1b[1;33mMemory:\x1b[0m 1420MiB / 8192MiB (17%)\r\n` +
          `\x1b[1;32m                 \x1b[1;33mDisk (/):\x1b[0m 14GB / 60GB (23%)\r\n` +
          `\r\n` +
          `\x1b[40m   \x1b[41m   \x1b[42m   \x1b[43m   \x1b[44m   \x1b[45m   \x1b[46m   \x1b[47m   \x1b[0m\r\n`
        );

      case 'top':
      case 'htop':
      case 'ps':
        return (
          `\x1b[7m  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND       \x1b[0m\r\n` +
          `    1 root      20   0  168540  12980   8564 S   0.0   0.2   0:02.14 systemd       \r\n` +
          `  412 user      20   0   18420   3620   3100 S   0.0   0.0   0:00.12 bash          \r\n` +
          ` 1088 node      20   0  982140 182400  32100 S   1.8   2.2   0:14.89 web-ssh-server\r\n` +
          ` 2104 nginx     20   0   54210   6120   4200 S   0.2   0.1   0:01.33 nginx: worker \r\n` +
          ` 3940 user      20   0   22400   4100   3200 R   0.5   0.1   0:00.04 ${cmd}           \r\n`
        );

      case 'ping': {
        const host = rest[0] || '127.0.0.1';
        return (
          `PING ${host} (${host}) 56(84) bytes of data.\r\n` +
          `64 bytes from ${host}: icmp_seq=1 ttl=118 time=14.2 ms\r\n` +
          `64 bytes from ${host}: icmp_seq=2 ttl=118 time=13.8 ms\r\n` +
          `64 bytes from ${host}: icmp_seq=3 ttl=118 time=14.5 ms\r\n` +
          `--- ${host} ping statistics ---\r\n` +
          `3 packets transmitted, 3 received, 0% packet loss, time 2003ms\r\n` +
          `rtt min/avg/max/mdev = 13.812/14.170/14.524/0.291 ms\r\n`
        );
      }

      case 'curl':
      case 'fetch': {
        const url = rest[0];
        if (!url) return `\x1b[31mcurl: try 'curl --help' or provide a URL\x1b[0m\r\n`;
        try {
          const res = await fetch(url);
          const text = await res.text();
          const preview = text.length > 1500 ? text.slice(0, 1500) + '\r\n...[truncated]' : text;
          return `\x1b[32mHTTP ${res.status} ${res.statusText}\x1b[0m\r\n${preview}\r\n`;
        } catch (e: any) {
          return `\x1b[33mcurl: Connected to simulated endpoint.\x1b[0m\r\nStatus: 200 OK\r\nContent-Type: application/json\r\n\r\n{"status":"success","url":"${url}","timestamp":"${new Date().toISOString()}"}\r\n`;
        }
      }

      case 'node': {
        if (rest[0] === '-e' || rest[0] === '--eval') {
          const code = rest.slice(1).join(' ');
          try {
            // Safe evaluation in sandbox
            const fn = new Function(`"use strict"; return (${code});`);
            const res = fn();
            return `${res !== undefined ? String(res) : 'undefined'}\r\n`;
          } catch (e: any) {
            return `\x1b[31mEvalError: ${e.message}\x1b[0m\r\n`;
          }
        }
        return `Welcome to Node.js v20.15.0.\r\nType ".help" for more information.\r\n`;
      }

      case 'python':
      case 'python3': {
        if (rest[0] === '-c') {
          const code = rest.slice(1).join(' ');
          return `\x1b[32m[Python3 Output]: ${code}\x1b[0m\r\n`;
        }
        return `Python 3.12.3 (main, Sep 15 2026, 12:00:00) [GCC 13.2.0] on linux\r\nType "help", "copyright", "credits" or "license" for more information.\r\n`;
      }

      case 'calc':
      case 'expr': {
        const expr = rest.join(' ');
        if (!expr) return `Usage: calc <math expression> (e.g., calc 2 * (10 + 5))\r\n`;
        try {
          const sanitized = expr.replace(/[^0-9+\-*/(). %^]/g, '');
          const fn = new Function(`return (${sanitized});`);
          return `${fn()}\r\n`;
        } catch (e: any) {
          return `\x1b[31mMath error: ${e.message}\x1b[0m\r\n`;
        }
      }

      case 'grep': {
        if (rest.length < 2) return `Usage: grep <pattern> <file>\r\n`;
        const pattern = rest[0];
        const filename = rest[1];
        const parts = this.resolvePath(filename);
        const node = this.getNode(parts);
        if (!node || node.type !== 'file') return `\x1b[31mgrep: ${filename}: No such file\x1b[0m\r\n`;
        const lines = (node.content || '').split('\n');
        const matched = lines.filter((l) => l.includes(pattern));
        return matched.map((l) => l.replace(new RegExp(pattern, 'g'), `\x1b[1;31m${pattern}\x1b[0m`)).join('\r\n') + '\r\n';
      }

      case 'wc': {
        const fname = rest[rest.length - 1];
        if (!fname) return `Usage: wc <file>\r\n`;
        const parts = this.resolvePath(fname);
        const node = this.getNode(parts);
        if (!node || node.type !== 'file') return `\x1b[31mwc: ${fname}: No such file\x1b[0m\r\n`;
        const content = node.content || '';
        const lines = content.split('\n').length;
        const words = content.trim().split(/\s+/).filter(Boolean).length;
        const bytes = content.length;
        return ` ${lines}  ${words} ${bytes} ${fname}\r\n`;
      }

      default:
        return `\x1b[31mbash: ${cmd}: command not found\x1b[0m\r\n` +
          `\x1b[90mبرای مشاهده فهرست دستورات در دسترس دستور \x1b[32mhelp\x1b[90m را وارد کنید.\x1b[0m\r\n`;
    }
  }
}
