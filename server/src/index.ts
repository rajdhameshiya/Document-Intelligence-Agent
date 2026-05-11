import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import documentsRouter from './routes/documents';
import shipmentsRouter from './routes/shipments';
import exceptionsRouter from './routes/exceptions';
import auditRouter from './routes/audit';
import dashboardRouter from './routes/dashboard';
import { seedDataIfNeeded } from './utils/dataStore';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

seedDataIfNeeded();

app.use('/api/documents', documentsRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/exceptions', exceptionsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/dashboard', dashboardRouter);

app.use((err: any, _: any, res: any, __: any) => {
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Server error' } });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`Server running on ${port}`));
