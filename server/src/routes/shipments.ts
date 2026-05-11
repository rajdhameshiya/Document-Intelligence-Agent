import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { approveBL, applyBLRevision, generateBLDraft, getBLDraft } from '../services/blGenerator';
import { createAuditEvent, store } from '../utils/dataStore';

const router = Router();
router.get('/', (_, res) => res.json({ success: true, data: store.getShipments() }));
router.get('/:id', (req, res) => {
  const s = store.getShipments().find((x) => x.id === req.params.id);
  if (!s) return res.status(404).json({ success: false, error: { code: 'SHIPMENT_NOT_FOUND', message: 'Shipment not found' } });
  return res.json({ success: true, data: s });
});
router.post('/', (req, res) => {
  const shipments = store.getShipments();
  const now = new Date().toISOString();
  const newS = { id: uuid(), status: 'documents_pending', createdAt: now, updatedAt: now, documentsReceived: { bookingConfirmation: false, shippingInstruction: false, commercialInvoice: false, packingList: false }, ...req.body };
  shipments.unshift(newS as any); store.saveShipments(shipments); res.json({ success: true, data: newS });
});
router.patch('/:id/field', (req, res) => {
  const shipments = store.getShipments();
  const s = shipments.find((x) => x.id === req.params.id);
  if (!s) return res.status(404).json({ success: false, error: { code: 'SHIPMENT_NOT_FOUND', message: 'Shipment not found' } });
  const { fieldName, value, actor = 'Priya Sharma' } = req.body;
  const prev = (s as any)[fieldName];
  (s as any)[fieldName] = value;
  s.updatedAt = new Date().toISOString();
  store.saveShipments(shipments);
  createAuditEvent({ shipmentId: s.id, eventType: 'shipment_record_updated', actor, fieldName, previousValue: prev ? String(prev) : undefined, newValue: String(value), description: `Field ${fieldName} manually updated` });
  res.json({ success: true, data: s });
});
router.post('/:id/generate-bl', async (req, res) => {
  try {
    const bl = await generateBLDraft(req.params.id);
    res.json({ success: true, data: bl });
  } catch (e: any) {
    const code = e.message.startsWith('MISSING_REQUIRED_FIELDS') ? 'MISSING_REQUIRED_FIELDS' : 'BL_GENERATION_BLOCKED';
    res.status(400).json({ success: false, error: { code, message: e.message } });
  }
});
router.get('/:id/bl', (req, res) => res.json({ success: true, data: getBLDraft(req.params.id) }));
router.post('/:id/bl/approve', (req, res) => {
  try { approveBL(req.params.id, req.body.actor || 'Priya Sharma'); res.json({ success: true, data: true }); }
  catch (e: any) { res.status(400).json({ success: false, error: { code: 'BL_GENERATION_BLOCKED', message: e.message } }); }
});
router.post('/:id/bl/revision', (req, res) => {
  try {
    const out = applyBLRevision(req.params.id, req.body.field, req.body.correctedValue, req.body.reason, req.body.actor || 'Priya Sharma');
    res.json({ success: true, data: out });
  } catch (e: any) {
    res.status(400).json({ success: false, error: { code: 'BL_GENERATION_BLOCKED', message: e.message } });
  }
});

export default router;
