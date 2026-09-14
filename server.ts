import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';

import {
  testSSHConnection,
  executeSSHCommand,
  fetchServerStats,
  listSFTPDirectory,
  readSFTPFile,
  writeSFTPFile,
} from './src/server/ssh-service.js';
import { handleSSHWebSocketConnection } from './src/server/ws-ssh-handler.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.post('/api/ssh/test', async (req, res) => {
    try {
      const config = req.body;
      const result = await testSSHConnection(config);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/ssh/exec', async (req, res) => {
    try {
      const { config, command } = req.body;
      if (!config || !command) {
        return res.status(400).json({ success: false, error: 'Command and SSH config are required' });
      }
      const result = await executeSSHCommand(config, command);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/ssh/stats', async (req, res) => {
    try {
      const { config } = req.body;
      if (!config) {
        return res.status(400).json({ success: false, error: 'SSH config is required' });
      }
      const stats = await fetchServerStats(config);
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/ssh/sftp/list', async (req, res) => {
    try {
      const { config, path: dirPath } = req.body;
      const items = await listSFTPDirectory(config, dirPath || '.');
      res.json({ success: true, items });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/ssh/sftp/read', async (req, res) => {
    try {
      const { config, path: filePath } = req.body;
      const content = await readSFTPFile(config, filePath);
      res.json({ success: true, content });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/ssh/sftp/write', async (req, res) => {
    try {
      const { config, path: filePath, content } = req.body;
      await writeSFTPFile(config, filePath, content);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  const server = http.createServer(app);

  // WebSocket Server
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws) => {
    handleSSHWebSocketConnection(ws);
  });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === '/ws/ssh') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  // Vite Dev Server / Static Serve
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SSH Terminal Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
