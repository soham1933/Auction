import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import { seedDemoData } from './config/seed.js';
import authRoutes from './routes/authRoutes.js';
import playerRoutes from './routes/playerRoutes.js';
import captainRoutes from './routes/captainRoutes.js';
import auctionRoutes from './routes/auctionRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import { registerAuctionHandlers } from './sockets/auctionHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.join(__dirname, '../.env');
const rootEnvExamplePath = path.join(__dirname, '../.env.example');

let loadedEnvPath = null;

if (fs.existsSync(rootEnvPath)) {
  const result = dotenv.config({ path: rootEnvPath });
  if (result.error) throw result.error;
  loadedEnvPath = rootEnvPath;
} else if (process.env.DATABASE_URL) {
  loadedEnvPath = 'process.env';
} else if (fs.existsSync(rootEnvExamplePath)) {
  const result = dotenv.config({ path: rootEnvExamplePath });
  if (result.error) throw result.error;
  loadedEnvPath = rootEnvExamplePath;
  console.warn('Loaded server/.env.example because server/.env and DATABASE_URL were not found. This is for convenience only; set real production environment variables in server/.env or Render environment settings.');
} else {
  const result = dotenv.config();
  if (result.error) throw result.error;
  loadedEnvPath = '.env (default path lookup)';
}

console.log(`Loaded env from: ${loadedEnvPath}`);

const app = express();
app.set('trust proxy', true);
const server = http.createServer(app);
const uploadsPath = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsPath, { recursive: true });
app.use('/uploads', express.static(uploadsPath));
const configuredOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/$/, ''))
  : [];

const localhostPattern = /^https?:\/\/localhost:\d+$/;
const vercelPattern = /^https:\/\/.*\.vercel\.app$/;

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = origin.replace(/\/$/, '');

  if (configuredOrigins.includes(normalizedOrigin)) {
    return true;
  }

  if (localhostPattern.test(normalizedOrigin)) {
    return true;
  }

  if (vercelPattern.test(normalizedOrigin)) {
    return true;
  }

  return false;
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingTimeout: 20000,
  pingInterval: 25000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000
  }
});

app.use(cors(corsOptions));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', websocket: 'ready' });
});

app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/captains', captainRoutes);
app.use('/api/auction', auctionRoutes);
app.use('/api/export', exportRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: error.message || 'Internal server error' });
});

registerAuctionHandlers(io);

const port = Number(process.env.PORT || 5000);

connectDB()
  .then(() => {
    if (!process.env.JWT_SECRET ) {
      console.warn(
        'JWT_SECRET is not set. Using a local development fallback secret. Configure server/.env for production.'
      );
    }

    return seedDemoData();
  })
  .then(() => {
    server.on('error', (error) => {
      if (error?.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Stop the other process or set a different PORT in server/.env.`);
        process.exit(1);
      }
      console.error('Server error', error);
      process.exit(1);
    });

    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
