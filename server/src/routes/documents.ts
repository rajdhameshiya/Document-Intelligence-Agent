import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { FreightDocument } from '../types';
import { fail, getErrorMessage, ok } from '../utils/api';
import {
  createAuditEvent,
  getDocument,
  getDocuments,
  getShipment,
  getShipmentByReference,
  saveDocument
} from '../utils/dataLayer';
import { processDocument, resolveDocumentField } from '../services/documentProcessor';

export const documentsRouter = express.Router();

const UPLOAD_DIR = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

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

    const channel = (req.body.channel || 'upload') as FreightDocument['channel'];
    const senderIdentity = req.body.senderIdentity || 'manual-upload';
    const shipment =
      (req.body.shipmentId && getShipment(req.body.shipmentId)) ||
      (req.body.shipmentReference && getShipmentByReference(req.body.shipmentReference)) ||
      null;

    const existingDuplicate = getDocuments().find(
      (document) => document.fileName === req.file?.originalname && document.senderIdentity === senderIdentity
    );

    const document: FreightDocument = {
      id: uuid(),
      shipmentId: shipment?.id || null,
      type: 'unclassified',
      status: existingDuplicate ? 'duplicate' : 'processing',
      channel,
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      senderIdentity,
      receivedAt: new Date().toISOString(),
      extractedFields: [],
      extractionSummary: { totalFields: 0, extractedSuccessfully: 0, missingMandatory: 0, lowConfidence: 0, conflicts: 0 },
      isDuplicate: Boolean(existingDuplicate),
      duplicateOfDocumentId: existingDuplicate?.id
    };

    saveDocument(document);
    createAuditEvent({
      shipmentId: shipment?.id || null,
      documentId: document.id,
      eventType: 'document_received',
      actor: 'Agent',
      description: `Document received via ${channel} from ${senderIdentity}`
    });

    if (!existingDuplicate) {
      setTimeout(() => {
        processDocument(document.id).catch((error) => {
          const failed = getDocument(document.id);
          if (failed) {
            failed.status = 'failed';
            failed.processingError = getErrorMessage(error);
            saveDocument(failed);
          }
        });
      }, 3000);
    }

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
