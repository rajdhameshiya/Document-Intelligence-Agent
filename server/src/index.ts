import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { auditRouter } from './routes/audit';
import { dashboardRouter } from './routes/dashboard';
import { documentsRouter } from './routes/documents';
import { exceptionsRouter } from './routes/exceptions';
import { shipmentsRouter } from './routes/shipments';
import { telegramRouter } from './routes/telegram';
import { seedData } from './utils/seed';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const configuredOrigins = (process.env.CLIENT_URL || process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        configuredOrigins.length === 0 ||
        configuredOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin === 'http://localhost:3000'
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

['../../data', '../../uploads'].forEach((dir) => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

seedData();

app.use('/api/documents', documentsRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/exceptions', exceptionsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/webhooks/telegram', telegramRouter);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

const clientBuildPath = path.join(__dirname, '../../client/build');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    return res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
