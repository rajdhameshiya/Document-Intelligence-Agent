import { Router } from 'express';
import multer from 'multer';
import { store } from '../utils/dataStore';
import { createDocumentRecord, processDocument, saveUploadedFile } from '../services/documentProcessor';

const router = Router();
const upload = multer({ dest: 'uploads/tmp' });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: { code: 'EXTRACTION_FAILED', message: 'File is required' } });
    const fileUrl = await saveUploadedFile(req.file);
    const document = createDocumentRecord({
      fileName: req.file.originalname,
      fileUrl,
      channel: (req.body.channel || 'upload') as any,
      senderIdentity: req.body.senderIdentity || 'unknown@sender',
      shipmentId: req.body.shipmentId || undefined
    });
    setTimeout(() => processDocument(document.id).catch(() => null), 3000);
    return res.json({ success: true, data: document });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: { code: 'EXTRACTION_FAILED', message: e.message } });
  }
});

router.get('/', (_, res) => res.json({ success: true, data: store.getDocuments() }));
router.get('/:id', (req, res) => {
  const d = store.getDocuments().find((x) => x.id === req.params.id);
  if (!d) return res.status(404).json({ success: false, error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found' } });
  return res.json({ success: true, data: d });
});

router.post('/:id/classify', (req, res) => {
  const docs = store.getDocuments();
  const d = docs.find((x) => x.id === req.params.id);
  if (!d) return res.status(404).json({ success: false, error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found' } });
  d.type = req.body.type;
  store.saveDocuments(docs);
  return res.json({ success: true, data: d });
});

router.post('/:id/link', (req, res) => {
  const docs = store.getDocuments();
  const d = docs.find((x) => x.id === req.params.id);
  const s = store.getShipments().find((x) => x.id === req.body.shipmentId);
  if (!d) return res.status(404).json({ success: false, error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found' } });
  if (!s) return res.status(404).json({ success: false, error: { code: 'SHIPMENT_NOT_FOUND', message: 'Shipment not found' } });
  d.shipmentId = s.id;
  store.saveDocuments(docs);
  return res.json({ success: true, data: d });
});

router.post('/:id/process', async (req, res) => {
  try {
    const d = await processDocument(req.params.id);
    return res.json({ success: true, data: d });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: { code: 'EXTRACTION_FAILED', message: e.message } });
  }
});

export default router;
