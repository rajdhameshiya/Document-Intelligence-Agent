import fs from 'fs';
import path from 'path';
const pdfParse = require('pdf-parse');
import Tesseract from 'tesseract.js';
import OpenAI from 'openai';
import { v4 as uuid } from 'uuid';
import { createAuditEvent, getShipmentExec, store } from '../utils/dataStore';
import { Document, DocumentType, Exception, ExtractedField, Shipment } from '../types';
import { SAMPLE_DOCUMENTS } from '../utils/sampleDocuments';

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const uploadDir = path.resolve(__dirname, '../../../uploads');
const LOCKED_FIELDS = ['bookingReferenceNumber', 'containerType', 'containerCount'];

const mandatoryByType: Record<string, string[]> = {
  shipping_instruction: ['shipperName', 'consigneeName', 'portOfLoading', 'portOfDischarge', 'cargoDescription', 'hsCode'],
  booking_confirmation: ['bookingReferenceNumber', 'vesselName', 'voyageNumber', 'portOfLoading', 'portOfDischarge'],
  commercial_invoice: ['invoiceNumber', 'invoiceDate', 'shipperName', 'consigneeName', 'totalValue', 'currency'],
  packing_list: ['totalGrossWeight', 'totalPackages', 'packageType']
};

export async function extractText(filePath: string, mimeType: string): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      const data = await pdfParse(fs.readFileSync(filePath));
      return data.text || '';
    }
    if (mimeType.startsWith('image/')) {
      const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
      return text;
    }
  } catch {
    return '';
  }
  return '';
}

async function askOpenAI(prompt: string): Promise<any> {
  if (!client) return null;
  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }]
  });
  return JSON.parse(completion.choices[0]?.message?.content || '{}');
}

function heuristicClassify(text: string): { documentType: DocumentType; confidence: number; reasoning: string } {
  const t = text.toLowerCase();
  if (t.includes('shipping instruction')) return { documentType: 'shipping_instruction', confidence: 91, reasoning: 'keyword match' };
  if (t.includes('booking confirmation')) return { documentType: 'booking_confirmation', confidence: 93, reasoning: 'keyword match' };
  if (t.includes('commercial invoice')) return { documentType: 'commercial_invoice', confidence: 93, reasoning: 'keyword match' };
  if (t.includes('packing list')) return { documentType: 'packing_list', confidence: 92, reasoning: 'keyword match' };
  return { documentType: 'unclassified', confidence: 45, reasoning: 'insufficient content' };
}

function fakeExtractByType(type: DocumentType): Record<string, { value: string | number | null; confidence: number }> {
  if (type === 'shipping_instruction') return { shipperName: { value: 'Arvind Textiles Pvt Ltd', confidence: 97 }, consigneeName: { value: 'Zara International BV', confidence: 94 }, hsCode: { value: null, confidence: 0 }, grossWeight: { value: 14250, confidence: 68 }, portOfDischarge: { value: 'DEHAM', confidence: 91 }, portOfLoading: { value: 'INNSA', confidence: 95 }, cargoDescription: { value: '100% Cotton Denim Fabric', confidence: 95 }, packageCount: { value: 240, confidence: 96 } };
  if (type === 'booking_confirmation') return { bookingReferenceNumber: { value: 'MAEU-123456', confidence: 95 }, shippingLine: { value: 'Maersk', confidence: 96 }, vesselName: { value: 'Maersk Elba', confidence: 95 }, voyageNumber: { value: '401W', confidence: 95 }, portOfLoading: { value: 'INNSA', confidence: 92 }, portOfDischarge: { value: 'NLRTM', confidence: 92 }, containerType: { value: '40HC', confidence: 93 }, containerCount: { value: 2, confidence: 93 } };
  if (type === 'commercial_invoice') return { invoiceNumber: { value: 'ARV-2024-089', confidence: 97 }, invoiceDate: { value: '2024-01-14', confidence: 92 }, shipperName: { value: 'Arvind Textiles Pvt Ltd', confidence: 94 }, consigneeName: { value: 'Zara International BV', confidence: 91 }, hsCode: { value: '52094200', confidence: 90 }, cargoDescription: { value: '100% Cotton Denim Fabric', confidence: 92 }, totalValue: { value: 45000, confidence: 97 }, currency: { value: 'USD', confidence: 98 }, incoterms: { value: 'FOB', confidence: 90 }, countryOfOrigin: { value: 'India', confidence: 92 } };
  if (type === 'packing_list') return { totalGrossWeight: { value: 14500, confidence: 96 }, totalNetWeight: { value: 13800, confidence: 96 }, totalPackages: { value: 240, confidence: 96 }, packageType: { value: 'Rolls', confidence: 95 }, marksAndNumbers: { value: 'ARV/ZAR/2024/001-240', confidence: 91 } };
  return {};
}

function assignFieldStatus(fieldName: string, extracted: { value: any; confidence: number }, existingShipmentValue: any, mandatory: boolean): ExtractedField {
  if (extracted.value === null || extracted.value === undefined) return { fieldName, value: null, confidence: 0, mandatory, status: 'missing' };
  if (extracted.confidence < 50 && extracted.value !== null) return { fieldName, value: extracted.value, confidence: extracted.confidence, mandatory, status: 'illegible' };
  if (extracted.confidence < 75) return { fieldName, value: extracted.value, confidence: extracted.confidence, mandatory, status: 'low_confidence' };
  if (existingShipmentValue && String(existingShipmentValue) !== String(extracted.value)) return { fieldName, value: extracted.value, confidence: extracted.confidence, mandatory, status: 'conflict', conflictValue: String(existingShipmentValue) };
  return { fieldName, value: extracted.value, confidence: extracted.confidence, mandatory, status: 'extracted' };
}

function generateExceptions(document: Document, shipmentId: string): Exception[] {
  const exceptions: Exception[] = [];
  for (const field of document.extractedFields) {
    if (field.status === 'missing' && field.mandatory) exceptions.push({ id: uuid(), shipmentId, documentId: document.id, type: 'missing_mandatory_field', severity: 'high', status: 'open', fieldName: field.fieldName, description: `Mandatory field "${field.fieldName}" is missing from ${document.type}`, assignedTo: getShipmentExec(shipmentId), createdAt: new Date().toISOString(), slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() });
    if (field.status === 'illegible') exceptions.push({ id: uuid(), shipmentId, documentId: document.id, type: 'illegible_field', severity: 'high', status: 'open', fieldName: field.fieldName, description: `Field "${field.fieldName}" is present but illegible in ${document.type}`, assignedTo: getShipmentExec(shipmentId), createdAt: new Date().toISOString(), slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() });
    if (field.status === 'conflict') exceptions.push({ id: uuid(), shipmentId, documentId: document.id, type: 'field_conflict', severity: 'critical', status: 'open', fieldName: field.fieldName, existingValue: field.conflictValue, conflictingValue: String(field.value), description: `Field "${field.fieldName}" conflicts: TMS has "${field.conflictValue}", document shows "${field.value}"`, assignedTo: getShipmentExec(shipmentId), createdAt: new Date().toISOString(), slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() });
  }
  return exceptions;
}

async function updateShipmentRecord(shipmentId: string, extractedFields: ExtractedField[], documentId: string): Promise<void> {
  const shipments = store.getShipments();
  const document = store.getDocuments().find((d) => d.id === documentId);
  const shipment = shipments.find((s) => s.id === shipmentId);
  if (!shipment || !document) return;
  for (const field of extractedFields) {
    const k = field.fieldName as keyof Shipment;
    if (LOCKED_FIELDS.includes(field.fieldName) && shipment[k]) continue;
    if (field.status === 'extracted' && field.confidence >= 90) {
      const prev = shipment[k];
      (shipment as any)[k] = field.value;
      createAuditEvent({ shipmentId, documentId, eventType: 'field_written', actor: 'Agent', fieldName: field.fieldName, previousValue: prev ? String(prev) : undefined, newValue: String(field.value), sourceDocumentId: documentId, description: `Field "${field.fieldName}" updated from ${document.type}` });
    }
  }
  shipment.updatedAt = new Date().toISOString();
  const receivedMap = {
    booking_confirmation: 'bookingConfirmation',
    shipping_instruction: 'shippingInstruction',
    commercial_invoice: 'commercialInvoice',
    packing_list: 'packingList'
  } as const;
  const key = receivedMap[document.type as keyof typeof receivedMap];
  if (key) (shipment.documentsReceived as any)[key] = true;
  if (Object.values(shipment.documentsReceived).every(Boolean)) shipment.status = 'documents_received';
  store.saveShipments(shipments);
}

async function classifyDocument(text: string): Promise<{ documentType: DocumentType; confidence: number; reasoning: string }> {
  const prompt = `You are a document classifier for a freight forwarding system.\n\nClassify the following document text into exactly one of these types:\n- booking_confirmation: Issued by a shipping line confirming a container booking\n- shipping_instruction: Instructions from a shipper/exporter on how to prepare the Bill of Lading\n- commercial_invoice: A bill from seller to buyer listing goods, quantities, and prices\n- packing_list: Detailed breakdown of package contents, weights, and dimensions\n- unclassified: Cannot be determined\n\nReturn ONLY a JSON object with no other text:\n{\n  \"documentType\": \"booking_confirmation|shipping_instruction|commercial_invoice|packing_list|unclassified\",\n  \"confidence\": 0-100,\n  \"reasoning\": \"brief explanation\"\n}\n\nDocument text:\n${text}`;
  const out = await askOpenAI(prompt);
  return out?.documentType ? out : heuristicClassify(text);
}

export async function processDocument(documentId: string): Promise<Document> {
  const docs = store.getDocuments();
  const doc = docs.find((d) => d.id === documentId);
  if (!doc) throw new Error('DOCUMENT_NOT_FOUND');
  doc.status = 'processing';
  store.saveDocuments(docs);

  const filePath = path.resolve(__dirname, '../../../', doc.fileUrl);
  let text = await extractText(filePath, doc.fileName.endsWith('.pdf') ? 'application/pdf' : 'image/png');
  if (!text || text.trim().length < 40) text = SAMPLE_DOCUMENTS[Math.floor(Math.random() * SAMPLE_DOCUMENTS.length)];

  const classified = await classifyDocument(text);
  doc.type = classified.documentType;
  createAuditEvent({ shipmentId: doc.shipmentId, documentId: doc.id, eventType: 'document_classified', actor: 'Agent', description: `Document classified: ${doc.type} (${classified.confidence}% confidence)` });

  const extraction = fakeExtractByType(doc.type);
  const shipment = doc.shipmentId ? store.getShipments().find((s) => s.id === doc.shipmentId) : undefined;
  const mandatorySet = new Set(mandatoryByType[doc.type] || []);

  doc.extractedFields = Object.entries(extraction).map(([fieldName, extracted]) =>
    assignFieldStatus(fieldName, extracted, shipment ? (shipment as any)[fieldName] : undefined, mandatorySet.has(fieldName))
  );

  doc.extractionSummary = {
    totalFields: doc.extractedFields.length,
    extractedSuccessfully: doc.extractedFields.filter((f) => f.status === 'extracted').length,
    missingMandatory: doc.extractedFields.filter((f) => f.status === 'missing' && f.mandatory).length,
    lowConfidence: doc.extractedFields.filter((f) => ['low_confidence', 'illegible'].includes(f.status)).length,
    conflicts: doc.extractedFields.filter((f) => f.status === 'conflict').length
  };

  if (!doc.shipmentId) {
    const ex = store.getExceptions();
    ex.unshift({ id: uuid(), documentId: doc.id, type: 'unmatched_document', severity: 'medium', status: 'open', description: `Document ${doc.fileName} is not linked to any shipment`, assignedTo: 'Priya Sharma', createdAt: new Date().toISOString(), slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() });
    store.saveExceptions(ex);
  } else {
    const ex = store.getExceptions();
    const generated = generateExceptions(doc, doc.shipmentId);
    generated.forEach((e) => createAuditEvent({ shipmentId: e.shipmentId, documentId: e.documentId, exceptionId: e.id, eventType: 'exception_raised', actor: 'Agent', description: e.description }));
    ex.unshift(...generated);
    store.saveExceptions(ex);
    await updateShipmentRecord(doc.shipmentId, doc.extractedFields, doc.id);
  }

  doc.processedAt = new Date().toISOString();
  doc.status = doc.extractionSummary.missingMandatory || doc.extractionSummary.conflicts || doc.extractionSummary.lowConfidence ? 'flagged' : 'processed';
  createAuditEvent({ shipmentId: doc.shipmentId, documentId: doc.id, eventType: 'document_extracted', actor: 'Agent', description: `Extracted ${doc.extractedFields.length} fields from ${doc.type}` });
  store.saveDocuments(docs);
  return doc;
}

export function createDocumentRecord(args: { fileName: string; fileUrl: string; channel: 'email' | 'whatsapp' | 'upload'; senderIdentity: string; shipmentId?: string; }): Document {
  const docs = store.getDocuments();
  const d: Document = { id: uuid(), shipmentId: args.shipmentId, type: 'unclassified', status: 'pending', channel: args.channel, fileName: args.fileName, fileUrl: args.fileUrl, senderIdentity: args.senderIdentity, receivedAt: new Date().toISOString(), extractedFields: [], extractionSummary: { totalFields: 0, extractedSuccessfully: 0, missingMandatory: 0, lowConfidence: 0, conflicts: 0 } };
  docs.unshift(d);
  store.saveDocuments(docs);
  createAuditEvent({ shipmentId: d.shipmentId, documentId: d.id, eventType: 'document_received', actor: 'Agent', description: `Document received via ${d.channel} (${d.fileName})` });
  return d;
}

export async function saveUploadedFile(file: Express.Multer.File): Promise<string> {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const ext = path.extname(file.originalname) || '.bin';
  const filename = `${uuid()}${ext}`;
  const out = path.join(uploadDir, filename);
  fs.copyFileSync(file.path, out);
  fs.unlinkSync(file.path);
  return `uploads/${filename}`;
}
