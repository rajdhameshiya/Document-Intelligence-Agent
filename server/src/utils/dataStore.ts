import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { AuditEvent, Document, Exception, Shipment } from '../types';

const root = path.resolve(__dirname, '../../../');
const dataDir = path.join(root, 'data');

const files = {
  shipments: path.join(dataDir, 'shipments.json'),
  documents: path.join(dataDir, 'documents.json'),
  exceptions: path.join(dataDir, 'exceptions.json'),
  audit: path.join(dataDir, 'audit_log.json')
};

function ensureFile(filePath: string): void {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]', 'utf8');
}

function readJsonFile<T>(filePath: string): T[] {
  ensureFile(filePath);
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.trim()) return [];
  return JSON.parse(raw) as T[];
}

function writeJsonFile<T>(filePath: string, data: T[]): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

const seededShipments: Shipment[] = [
  { id: 'ship-001', referenceNumber: 'SHIP-2024-001', status: 'documents_pending', shippingLine: 'Maersk', assignedExec: 'Priya Sharma', createdAt: '2024-01-15T09:00:00Z', updatedAt: '2024-01-15T09:00:00Z', cutoffDate: '2024-01-22T18:00:00Z', sailingDate: '2024-01-25T00:00:00Z', bookingReferenceNumber: 'MAEU-123456', vesselName: 'Maersk Elba', voyageNumber: '401W', portOfLoading: 'INNSA', portOfDischarge: 'NLRTM', containerType: '40HC', containerCount: 2, documentsReceived: { bookingConfirmation: true, shippingInstruction: false, commercialInvoice: false, packingList: false } },
  { id: 'ship-002', referenceNumber: 'SHIP-2024-002', status: 'documents_received', shippingLine: 'MSC', assignedExec: 'Rahul Verma', createdAt: '2024-01-14T10:00:00Z', updatedAt: '2024-01-15T11:00:00Z', cutoffDate: '2024-01-20T18:00:00Z', sailingDate: '2024-01-23T00:00:00Z', bookingReferenceNumber: 'MSCU-789012', vesselName: 'MSC Pamela', voyageNumber: 'FX201W', portOfLoading: 'INMUN', portOfDischarge: 'DEHAM', containerType: '20GP', containerCount: 1, shipperName: 'Arvind Textiles Pvt Ltd', shipperAddress: 'Plot 45, GIDC Estate, Surat, Gujarat 395010', consigneeName: 'Zara International BV', consigneeAddress: 'Calle Industria 55, Amsterdam 1012, Netherlands', cargoDescription: '100% Cotton Denim Fabric', hsCode: '52094200', grossWeight: 14500, packageCount: 240, packageType: 'Rolls', freightTerms: 'Prepaid', invoiceNumber: 'ARV-2024-089', invoiceValue: 45000, invoiceCurrency: 'USD', incoterms: 'FOB', countryOfOrigin: 'India', documentsReceived: { bookingConfirmation: true, shippingInstruction: true, commercialInvoice: true, packingList: true } },
  { id: 'ship-003', referenceNumber: 'SHIP-2024-003', status: 'bl_revision_in_progress', shippingLine: 'CMA CGM', assignedExec: 'Priya Sharma', createdAt: '2024-01-12T08:00:00Z', updatedAt: '2024-01-15T14:00:00Z', cutoffDate: '2024-01-19T18:00:00Z', sailingDate: '2024-01-21T00:00:00Z', bookingReferenceNumber: 'CMDU-345678', vesselName: 'CMA CGM Titus', voyageNumber: 'MX1W', portOfLoading: 'INNSA', portOfDischarge: 'GBFXT', containerType: '40GP', containerCount: 3, shipperName: 'Reliance Exports Ltd', consigneeName: 'UK Pharma Distributors Ltd', cargoDescription: 'Pharmaceutical Packaging Material', hsCode: '39239000', grossWeight: 22000, packageCount: 480, packageType: 'Cartons', freightTerms: 'Prepaid', blDraftVersion: 2, documentsReceived: { bookingConfirmation: true, shippingInstruction: true, commercialInvoice: true, packingList: true } }
];

export function seedDataIfNeeded(): void {
  const shipments = readJsonFile<Shipment>(files.shipments);
  if (shipments.length === 0) writeJsonFile(files.shipments, seededShipments);
  ensureFile(files.documents); ensureFile(files.exceptions); ensureFile(files.audit);
}

export const store = {
  getShipments: () => readJsonFile<Shipment>(files.shipments),
  saveShipments: (rows: Shipment[]) => writeJsonFile(files.shipments, rows),
  getDocuments: () => readJsonFile<Document>(files.documents),
  saveDocuments: (rows: Document[]) => writeJsonFile(files.documents, rows),
  getExceptions: () => readJsonFile<Exception>(files.exceptions),
  saveExceptions: (rows: Exception[]) => writeJsonFile(files.exceptions, rows),
  getAudit: () => readJsonFile<AuditEvent>(files.audit),
  saveAudit: (rows: AuditEvent[]) => writeJsonFile(files.audit, rows)
};

export function createAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
  const rows = store.getAudit();
  const created: AuditEvent = { id: uuid(), timestamp: new Date().toISOString(), ...event };
  rows.unshift(created);
  store.saveAudit(rows);
  return created;
}

export function getShipmentExec(shipmentId: string): string {
  const s = store.getShipments().find((x) => x.id === shipmentId);
  return s?.assignedExec || 'Priya Sharma';
}
