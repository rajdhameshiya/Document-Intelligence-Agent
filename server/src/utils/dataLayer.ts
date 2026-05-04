import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { AuditEvent, FreightDocument, FreightException, Shipment } from '../types';

const DATA_DIR = path.join(__dirname, '../../../data');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getFilePath(collection: string): string {
  ensureDataDir();
  return path.join(DATA_DIR, `${collection}.json`);
}

export function readCollection<T>(collection: string): T[] {
  const filePath = getFilePath(collection);
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

export function writeCollection<T>(collection: string, data: T[]): void {
  const filePath = getFilePath(collection);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function getShipments(): Shipment[] {
  return readCollection<Shipment>('shipments');
}

export function getShipment(id: string): Shipment | null {
  return getShipments().find((shipment) => shipment.id === id) || null;
}

export function getShipmentByReference(referenceNumber: string): Shipment | null {
  return getShipments().find((shipment) => shipment.referenceNumber === referenceNumber) || null;
}

export function saveShipment(shipment: Shipment): void {
  const shipments = getShipments();
  const index = shipments.findIndex((item) => item.id === shipment.id);
  const nextShipment = { ...shipment, updatedAt: new Date().toISOString() };
  if (index >= 0) {
    shipments[index] = nextShipment;
  } else {
    shipments.push(nextShipment);
  }
  writeCollection('shipments', shipments);
}

export function getDocuments(): FreightDocument[] {
  return readCollection<FreightDocument>('documents');
}

export function getDocument(id: string): FreightDocument | null {
  return getDocuments().find((document) => document.id === id) || null;
}

export function saveDocument(document: FreightDocument): void {
  const documents = getDocuments();
  const index = documents.findIndex((item) => item.id === document.id);
  if (index >= 0) {
    documents[index] = document;
  } else {
    documents.push(document);
  }
  writeCollection('documents', documents);
}

export function getExceptions(): FreightException[] {
  return readCollection<FreightException>('exceptions');
}

export function getException(id: string): FreightException | null {
  return getExceptions().find((exception) => exception.id === id) || null;
}

export function saveException(exception: FreightException): void {
  const exceptions = getExceptions();
  const index = exceptions.findIndex((item) => item.id === exception.id);
  if (index >= 0) {
    exceptions[index] = exception;
  } else {
    exceptions.push(exception);
  }
  writeCollection('exceptions', exceptions);
}

export function saveExceptions(nextExceptions: FreightException[]): void {
  writeCollection('exceptions', nextExceptions);
}

export function getAuditEvents(): AuditEvent[] {
  return readCollection<AuditEvent>('audit_log');
}

export function createAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
  const newEvent: AuditEvent = {
    ...event,
    id: uuid(),
    timestamp: new Date().toISOString()
  };
  const events = getAuditEvents();
  events.push(newEvent);
  writeCollection('audit_log', events);
  return newEvent;
}
