import { WebSocket } from 'ws';
import { Client as SSHClient } from 'ssh2';
import type { SSHConfig } from '../types.js';

export function handleSSHWebSocketConnection(ws: WebSocket) {
  let conn: SSHClient | null = null;
  let sshStream: any = null;
  let isConnected = false;

  const sendMessage = (msg: object) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  ws.on('message', (message: string) => {
    try {
      const parsed = JSON.parse(message.toString());

      if (parsed.type === 'init') {
        const config: SSHConfig = parsed.config;
        const cols = parsed.cols || 80;
        const rows = parsed.rows || 24;

        if (!config || !config.host || !config.username) {
          sendMessage({ type: 'error', message: 'اطلاعات سرور SSH ناقص است.' });
          ws.close();
          return;
        }

        sendMessage({ type: 'status', status: 'connecting', message: `در حال اتصال به ${config.username}@${config.host}:${config.port || 22}...` });

        conn = new SSHClient();

        conn.on('banner', (banner) => {
          sendMessage({ type: 'banner', banner });
        });

        conn.on('ready', () => {
          isConnected = true;
          sendMessage({ type: 'status', status: 'connected', message: 'اتصال SSH برقرار شد!' });

          conn!.shell({ term: 'xterm-256color', cols, rows }, (err, stream) => {
            if (err) {
              sendMessage({ type: 'error', message: `خطا در ایجاد پوسته تعاملی (Shell): ${err.message}` });
              ws.close();
              return;
            }

            sshStream = stream;

            stream.on('data', (data: Buffer) => {
              sendMessage({ type: 'output', data: data.toString('utf-8') });
            });

            stream.on('close', () => {
              sendMessage({ type: 'status', status: 'closed', message: 'جلسه SSH توسط سرور پایان یافت.' });
              ws.close();
            });

            stream.stderr.on('data', (data: Buffer) => {
              sendMessage({ type: 'output', data: data.toString('utf-8') });
            });
          });
        });

        conn.on('error', (err) => {
          sendMessage({ type: 'error', message: `خطای SSH: ${err.message}` });
          if (!isConnected) {
            ws.close();
          }
        });

        conn.on('close', () => {
          if (isConnected) {
            sendMessage({ type: 'status', status: 'closed', message: 'ارتباط با سرور SSH قطع شد.' });
          }
        });

        try {
          conn.connect({
            host: config.host,
            port: Number(config.port) || 22,
            username: config.username,
            password: config.authType === 'password' ? config.password : undefined,
            privateKey: config.authType === 'privateKey' ? config.privateKey : undefined,
            passphrase: config.passphrase,
            readyTimeout: 12000,
          });
        } catch (e: any) {
          sendMessage({ type: 'error', message: `خطا در پارامترهای اتصال: ${e.message}` });
          ws.close();
        }
      } else if (parsed.type === 'input') {
        if (sshStream) {
          sshStream.write(parsed.data);
        }
      } else if (parsed.type === 'resize') {
        if (sshStream && parsed.cols && parsed.rows) {
          sshStream.setWindow(parsed.rows, parsed.cols, 0, 0);
        }
      } else if (parsed.type === 'ping') {
        sendMessage({ type: 'pong' });
      }
    } catch (err: any) {
      console.error('WebSocket parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (sshStream) {
      try {
        sshStream.end();
      } catch (e) {}
    }
    if (conn) {
      try {
        conn.end();
      } catch (e) {}
    }
  });
}
