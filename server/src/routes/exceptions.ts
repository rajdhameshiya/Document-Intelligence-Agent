import { Router } from 'express';
import { createAuditEvent, store } from '../utils/dataStore';

const router = Router();
router.get('/', (req, res) => {
  let rows = store.getExceptions();
  if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
  if (req.query.severity) rows = rows.filter((r) => r.severity === req.query.severity);
  res.json({ success: true, data: rows });
});
router.get('/:id', (req, res) => {
  const row = store.getExceptions().find((x) => x.id === req.params.id);
  if (!row) return res.status(404).json({ success: false, error: { code: 'DOCUMENT_NOT_FOUND', message: 'Exception not found' } });
  res.json({ success: true, data: row });
});
router.post('/:id/resolve', (req, res) => {
  const rows = store.getExceptions();
  const row = rows.find((x) => x.id === req.params.id);
  if (!row) return res.status(404).json({ success: false, error: { code: 'DOCUMENT_NOT_FOUND', message: 'Exception not found' } });
  const actor = req.body.actor || 'Priya Sharma';
  row.status = 'resolved'; row.resolutionNote = req.body.note; row.resolvedBy = actor; row.resolvedAt = new Date().toISOString();
  store.saveExceptions(rows);
  createAuditEvent({ shipmentId: row.shipmentId, documentId: row.documentId, exceptionId: row.id, eventType: 'exception_resolved', actor, description: `Exception resolved: ${row.description}` });
  res.json({ success: true, data: row });
});
router.post('/:id/escalate', (req, res) => {
  const rows = store.getExceptions();
  const row = rows.find((x) => x.id === req.params.id);
  if (!row) return res.status(404).json({ success: false, error: { code: 'DOCUMENT_NOT_FOUND', message: 'Exception not found' } });
  row.status = 'escalated'; row.escalatedAt = new Date().toISOString();
  store.saveExceptions(rows);
  createAuditEvent({ shipmentId: row.shipmentId, documentId: row.documentId, exceptionId: row.id, eventType: 'escalation_triggered', actor: req.body.actor || 'Manager', description: `Exception escalated: ${row.description}` });
  res.json({ success: true, data: row });
});
export default router;
