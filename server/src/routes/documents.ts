import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { FreightDocument } from '../types';
import { fail, getErrorMessage, ok } from '../utils/api';
import { createAuditEvent, getDocument, getDocuments, getShipment, saveDocument } from '../utils/dataLayer';
import { processDocument, resolveDocumentField } from '../services/documentProcessor';
import { ingestDocument } from '../services/documentIngestion';
import { ensureUploadDir, UPLOAD_DIR } from '../utils/uploads';

export const documentsRouter = express.Router();

ensureUploadDir();

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname) || '.bin'}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('File type not supported'));
  }
});

documentsRouter.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return fail(res, 'DOCUMENT_UPLOAD_FAILED', 'No file was uploaded', 400);

    const document = ingestDocument({
      channel: (req.body.channel || 'upload') as FreightDocument['channel'],
      fileName: req.file.originalname,
      storedFileName: req.file.filename,
      senderIdentity: req.body.senderIdentity || 'manual-upload',
      shipmentId: req.body.shipmentId,
      shipmentReference: req.body.shipmentReference
    });

    return ok(res, document, 201);
  } catch (error) {
    return fail(res, 'DOCUMENT_UPLOAD_FAILED', getErrorMessage(error), 400);
  }
});

documentsRouter.get('/', (_req, res) => {
  return ok(
    res,
    getDocuments().sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
  );
});

documentsRouter.get('/:id', (req, res) => {
  const document = getDocument(req.params.id);
  if (!document) return fail(res, 'DOCUMENT_NOT_FOUND', 'Document not found', 404);
  return ok(res, document);
});

documentsRouter.post('/:id/classify', (req, res) => {
  const document = getDocument(req.params.id);
  if (!document) return fail(res, 'DOCUMENT_NOT_FOUND', 'Document not found', 404);
  document.type = req.body.documentType || 'unclassified';
  document.status = document.type === 'unclassified' ? 'flagged' : document.status;
  saveDocument(document);
  createAuditEvent({
    shipmentId: document.shipmentId,
    documentId: document.id,
    eventType: 'document_classified',
    actor: req.body.actor || 'Priya Sharma',
    description: `Document manually classified as ${document.type}`
  });
  return ok(res, document);
});

documentsRouter.post('/:id/link', (req, res) => {
  const document = getDocument(req.params.id);
  if (!document) return fail(res, 'DOCUMENT_NOT_FOUND', 'Document not found', 404);
  const shipment = getShipment(req.body.shipmentId);
  if (!shipment) return fail(res, 'SHIPMENT_NOT_FOUND', 'Shipment not found', 404);

  document.shipmentId = shipment.id;
  saveDocument(document);
  createAuditEvent({
    shipmentId: shipment.id,
    documentId: document.id,
    eventType: 'shipment_record_updated',
    actor: req.body.actor || 'Priya Sharma',
    description: `Document linked to shipment ${shipment.referenceNumber}`
  });
  return ok(res, document);
});

documentsRouter.post('/:id/process', async (req, res) => {
  try {
    const document = getDocument(req.params.id);
    if (!document) return fail(res, 'DOCUMENT_NOT_FOUND', 'Document not found', 404);
    const processed = await processDocument(document.id);
    return ok(res, processed);
  } catch (error) {
    return fail(res, 'EXTRACTION_FAILED', getErrorMessage(error), 500);
  }
});

documentsRouter.post('/:id/resolve-field', (req, res) => {
  try {
    const document = resolveDocumentField(
      req.params.id,
      req.body.fieldName,
      req.body.action,
      req.body.value ?? null,
      req.body.actor || 'Priya Sharma'
    );
    return ok(res, document);
  } catch (error) {
    return fail(res, 'FIELD_RESOLUTION_FAILED', getErrorMessage(error), 400);
  }
});
