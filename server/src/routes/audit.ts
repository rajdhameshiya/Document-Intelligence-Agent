import { Router } from 'express';
import { store } from '../utils/dataStore';

const router = Router();
router.get('/', (_, res) => res.json({ success: true, data: store.getAudit() }));
router.get('/shipment/:id', (req, res) => res.json({ success: true, data: store.getAudit().filter((a) => a.shipmentId === req.params.id) }));
export default router;
