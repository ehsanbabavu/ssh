export interface SSHConfig {
  id?: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'privateKey';
  password?: string;
  privateKey?: string;
  passphrase?: string;
  color?: string;
}

export interface SSHTestResult {
  success: boolean;
  message: string;
  banner?: string;
  latencyMs?: number;
}

export interface SSHExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
  signal?: string;
  executionTimeMs?: number;
  error?: string;
}

export interface SFTPItem {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  isSymbolicLink: boolean;
  modifyTime: number;
  rights: {
    user: string;
    group: string;
    other: string;
  };
  owner: number;
  group: number;
}

export interface ServerStats {
  hostname?: string;
  osInfo?: string;
  uptime?: string;
  cpuLoad?: string;
  memTotalMb?: number;
  memUsedMb?: number;
  memFreeMb?: number;
  diskUsage?: Array<{
    filesystem: string;
    size: string;
    used: string;
    avail: string;
    capacity: string;
    mount: string;
  }>;
}

export interface TerminalTab {
  id: string;
  config: SSHConfig;
  title: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  errorMessage?: string;
  activeView: 'terminal' | 'commands' | 'sftp' | 'stats';
}

export interface QuickMacro {
  id: string;
  title: string;
  command: string;
  description: string;
  category: 'system' | 'network' | 'docker' | 'files' | 'process';
}
