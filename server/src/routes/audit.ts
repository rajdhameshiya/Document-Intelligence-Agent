import express from 'express';
import { ok } from '../utils/api';
import { getAuditEvents } from '../utils/dataLayer';

export const auditRouter = express.Router();

auditRouter.get('/', (_req, res) => {
  return ok(
    res,
    getAuditEvents().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  );
});

auditRouter.get('/shipment/:id', (req, res) => {
  return ok(
    res,
    getAuditEvents()
      .filter((event) => event.shipmentId === req.params.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  );
});
