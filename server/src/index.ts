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
import { seedData } from './utils/seed';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
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

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
