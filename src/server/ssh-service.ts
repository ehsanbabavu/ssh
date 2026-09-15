import { Client as SSHClient } from 'ssh2';
import type { SSHConfig, SSHExecResult, SSHTestResult, SFTPItem, ServerStats } from '../types.js';

export function testSSHConnection(config: SSHConfig): Promise<SSHTestResult> {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const conn = new SSHClient();
    let banner = '';

    conn.on('banner', (msg) => {
      banner += msg;
    });

    conn.on('ready', () => {
      const latencyMs = Date.now() - startTime;
      conn.end();
      resolve({
        success: true,
        message: 'اتصال با موفقیت برقرار شد (SSH Handshake Successful)',
        banner: banner || undefined,
        latencyMs,
      });
    });

    conn.on('error', (err) => {
      conn.end();
      resolve({
        success: false,
        message: err.message || 'خطا در برقراری ارتباط SSH',
      });
    });

    try {
      conn.connect({
        host: config.host,
        port: Number(config.port) || 22,
        username: config.username,
        password: config.authType === 'password' ? config.password : undefined,
        privateKey: config.authType === 'privateKey' ? config.privateKey : undefined,
        passphrase: config.passphrase,
        readyTimeout: 8000,
      });
    } catch (e: any) {
      resolve({
        success: false,
        message: e.message || 'تنظیمات SSH معتبر نیست',
      });
    }
  });
}

export function executeSSHCommand(config: SSHConfig, command: string): Promise<SSHExecResult> {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const conn = new SSHClient();
    let stdout = '';
    let stderr = '';

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return resolve({
            success: false,
            stdout: '',
            stderr: err.message,
            code: 1,
            error: err.message,
            executionTimeMs: Date.now() - startTime,
          });
        }

        stream.on('close', (code: number, signal: string) => {
          conn.end();
          resolve({
            success: code === 0,
            stdout,
            stderr,
            code: code ?? 0,
            signal,
            executionTimeMs: Date.now() - startTime,
          });
        });

        stream.on('data', (data: Buffer) => {
          stdout += data.toString('utf-8');
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString('utf-8');
        });
      });
    });

    conn.on('error', (err) => {
      conn.end();
      resolve({
        success: false,
        stdout: '',
        stderr: err.message,
        code: 1,
        error: err.message,
        executionTimeMs: Date.now() - startTime,
      });
    });

    try {
      conn.connect({
        host: config.host,
        port: Number(config.port) || 22,
        username: config.username,
        password: config.authType === 'password' ? config.password : undefined,
        privateKey: config.authType === 'privateKey' ? config.privateKey : undefined,
        passphrase: config.passphrase,
        readyTimeout: 10000,
      });
    } catch (e: any) {
      resolve({
        success: false,
        stdout: '',
        stderr: e.message,
        code: 1,
        error: e.message,
        executionTimeMs: Date.now() - startTime,
      });
    }
  });
}

export async function fetchServerStats(config: SSHConfig): Promise<ServerStats> {
  const cmd = `hostname; echo "===SECTION==="; uname -a; echo "===SECTION==="; uptime; echo "===SECTION==="; free -m; echo "===SECTION==="; df -h`;
  const result = await executeSSHCommand(config, cmd);

  if (!result.success || !result.stdout) {
    throw new Error(result.stderr || result.error || 'Failed to fetch server stats');
  }

  const sections = result.stdout.split('===SECTION===').map((s) => s.trim());
  const hostname = sections[0] || 'Unknown';
  const osInfo = sections[1] || 'Unknown';
  const uptime = sections[2] || 'Unknown';
  
  let memTotalMb = 0;
  let memUsedMb = 0;
  let memFreeMb = 0;

  if (sections[3]) {
    const freeLines = sections[3].split('\n');
    for (const line of freeLines) {
      if (line.toLowerCase().startsWith('mem:')) {
        const parts = line.replace(/\s+/g, ' ').trim().split(' ');
        if (parts.length >= 4) {
          memTotalMb = parseInt(parts[1], 10) || 0;
          memUsedMb = parseInt(parts[2], 10) || 0;
          memFreeMb = parseInt(parts[3], 10) || 0;
        }
      }
    }
  }

  const diskUsage: Array<{ filesystem: string; size: string; used: string; avail: string; capacity: string; mount: string }> = [];
  if (sections[4]) {
    const dfLines = sections[4].split('\n').slice(1);
    for (const line of dfLines) {
      const parts = line.replace(/\s+/g, ' ').trim().split(' ');
      if (parts.length >= 6) {
        diskUsage.push({
          filesystem: parts[0],
          size: parts[1],
          used: parts[2],
          avail: parts[3],
          capacity: parts[4],
          mount: parts[5],
        });
      }
    }
  }

  return {
    hostname,
    osInfo,
    uptime,
    memTotalMb,
    memUsedMb,
    memFreeMb,
    diskUsage,
  };
}

export function listSFTPDirectory(config: SSHConfig, dirPath: string = '.'): Promise<SFTPItem[]> {
  return new Promise((resolve, reject) => {
    const conn = new SSHClient();

    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        sftp.readdir(dirPath || '.', (readErr, list) => {
          conn.end();
          if (readErr) {
            return reject(readErr);
          }

          const items: SFTPItem[] = list.map((item) => {
            const isDirectory = (item.attrs.mode & 0o040000) === 0o040000;
            const isSymbolicLink = (item.attrs.mode & 0o120000) === 0o120000;
            return {
              name: item.filename,
              path: dirPath === '.' ? item.filename : `${dirPath.replace(/\/$/, '')}/${item.filename}`,
              size: item.attrs.size,
              isDirectory,
              isSymbolicLink,
              modifyTime: item.attrs.mtime,
              rights: {
                user: (item.attrs.mode & 0o700).toString(8),
                group: (item.attrs.mode & 0o070).toString(8),
                other: (item.attrs.mode & 0o007).toString(8),
              },
              owner: item.attrs.uid,
              group: item.attrs.gid,
            };
          });

          // Sort directories first, then files alphabetically
          items.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
          });

          resolve(items);
        });
      });
    });

    conn.on('error', (err) => {
      conn.end();
      reject(err);
    });

    try {
      conn.connect({
        host: config.host,
        port: Number(config.port) || 22,
        username: config.username,
        password: config.authType === 'password' ? config.password : undefined,
        privateKey: config.authType === 'privateKey' ? config.privateKey : undefined,
        passphrase: config.passphrase,
        readyTimeout: 10000,
      });
    } catch (e: any) {
      reject(e);
    }
  });
}

export function readSFTPFile(config: SSHConfig, filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const conn = new SSHClient();

    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        const readStream = sftp.createReadStream(filePath, { encoding: 'utf-8' });
        let content = '';

        readStream.on('data', (chunk) => {
          content += chunk;
        });

        readStream.on('end', () => {
          conn.end();
          resolve(content);
        });

        readStream.on('error', (streamErr) => {
          conn.end();
          reject(streamErr);
        });
      });
    });

    conn.on('error', (err) => {
      conn.end();
      reject(err);
    });

    try {
      conn.connect({
        host: config.host,
        port: Number(config.port) || 22,
        username: config.username,
        password: config.authType === 'password' ? config.password : undefined,
        privateKey: config.authType === 'privateKey' ? config.privateKey : undefined,
        passphrase: config.passphrase,
        readyTimeout: 10000,
      });
    } catch (e: any) {
      reject(e);
    }
  });
}

export function writeSFTPFile(config: SSHConfig, filePath: string, content: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const conn = new SSHClient();

    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        const writeStream = sftp.createWriteStream(filePath, { encoding: 'utf-8' });

        writeStream.on('finish', () => {
          conn.end();
          resolve();
        });

        writeStream.on('error', (streamErr) => {
          conn.end();
          reject(streamErr);
        });

        writeStream.write(content);
        writeStream.end();
      });
    });

    conn.on('error', (err) => {
      conn.end();
      reject(err);
    });

    try {
      conn.connect({
        host: config.host,
        port: Number(config.port) || 22,
        username: config.username,
        password: config.authType === 'password' ? config.password : undefined,
        privateKey: config.authType === 'privateKey' ? config.privateKey : undefined,
        passphrase: config.passphrase,
        readyTimeout: 10000,
      });
    } catch (e: any) {
      reject(e);
    }
  });
}

export function deleteSFTPItem(config: SSHConfig, itemPath: string, isDirectory: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const conn = new SSHClient();

    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        if (isDirectory) {
          // First attempt rmdir, or recursive removal if needed
          sftp.rmdir(itemPath, (rmErr) => {
            if (rmErr) {
              // If rmdir fails because folder is not empty, fallback to rm -rf via exec shell
              conn.exec(`rm -rf "${itemPath.replace(/"/g, '\\"')}"`, (execErr, stream) => {
                if (execErr) {
                  conn.end();
                  return reject(execErr);
                }
                stream.on('close', (code: number) => {
                  conn.end();
                  if (code === 0) resolve();
                  else reject(new Error(`خطا در حذف پوشه (کد خروجی: ${code})`));
                });
              });
            } else {
              conn.end();
              resolve();
            }
          });
        } else {
          sftp.unlink(itemPath, (unlinkErr) => {
            conn.end();
            if (unlinkErr) return reject(unlinkErr);
            resolve();
          });
        }
      });
    });

    conn.on('error', (err) => {
      conn.end();
      reject(err);
    });

    try {
      conn.connect({
        host: config.host,
        port: Number(config.port) || 22,
        username: config.username,
        password: config.authType === 'password' ? config.password : undefined,
        privateKey: config.authType === 'privateKey' ? config.privateKey : undefined,
        passphrase: config.passphrase,
        readyTimeout: 10000,
      });
    } catch (e: any) {
      reject(e);
    }
  });
}

