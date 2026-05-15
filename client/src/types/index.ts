export type ShipmentStatus =
  | 'booking_confirmed'
  | 'documents_pending'
  | 'documents_received'
  | 'bl_draft_generated'
  | 'bl_revision_in_progress'
  | 'bl_approved'
  | 'bl_submitted';

export interface Shipment {
  [key: string]: any;
  id: string;
  referenceNumber: string;
  status: ShipmentStatus;
  shippingLine: string;
  assignedExec: string;
  createdAt: string;
  updatedAt: string;
  cutoffDate: string;
  sailingDate: string;
  bookingReferenceNumber?: string;
  vesselName?: string;
  voyageNumber?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  containerType?: string;
  containerCount?: number;
  shipperName?: string;
  shipperAddress?: string;
  consigneeName?: string;
  consigneeAddress?: string;
  notifyParty?: string;
  cargoDescription?: string;
  hsCode?: string;
  freightTerms?: 'Prepaid' | 'Collect';
  grossWeight?: number;
  netWeight?: number;
  packageCount?: number;
  packageType?: string;
  marksAndNumbers?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceValue?: number;
  invoiceCurrency?: string;
  incoterms?: string;
  countryOfOrigin?: string;
  blDraftVersion?: number;
  blApprovedAt?: string;
  blDraftData?: BLDraft;
  blRevisionHistory?: BLRevision[];
  documentsReceived: {
    bookingConfirmation: boolean;
    shippingInstruction: boolean;
    commercialInvoice: boolean;
    packingList: boolean;
  };
}

export type DocumentType =
  | 'booking_confirmation'
  | 'shipping_instruction'
  | 'commercial_invoice'
  | 'packing_list'
  | 'bl_draft'
  | 'unclassified';

export type DocumentStatus = 'pending' | 'processing' | 'processed' | 'flagged' | 'failed' | 'duplicate';
export type Channel = 'email' | 'whatsapp' | 'upload' | 'telegram';

export interface ExtractedField {
  fieldName: string;
  normalizedFieldName?: string;
  value: string | number | null;
  confidence: number;
  mandatory: boolean;
  status: 'extracted' | 'missing' | 'illegible' | 'low_confidence' | 'conflict';
  conflictValue?: string;
  evidence?: string;
  reasoning?: string;
  sourceLabel?: string;
}

export interface FreightDocument {
  id: string;
  shipmentId?: string | null;
  type: DocumentType;
  status: DocumentStatus;
  channel: Channel;
  fileName: string;
  fileUrl: string;
  senderIdentity: string;
  receivedAt: string;
  processedAt?: string;
  extractedFields: ExtractedField[];
  extractionSummary: {
    totalFields: number;
    extractedSuccessfully: number;
    missingMandatory: number;
    lowConfidence: number;
    conflicts: number;
  };
  isDuplicate?: boolean;
  duplicateOfDocumentId?: string;
  processingError?: string;
  classificationConfidence?: number;
  classificationReasoning?: string;
}

export type ExceptionSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ExceptionStatus = 'open' | 'in_review' | 'resolved' | 'escalated';

export interface FreightException {
  id: string;
  shipmentId?: string | null;
  documentId: string;
  type: string;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  fieldName?: string;
  existingValue?: string;
  conflictingValue?: string;
  description: string;
  assignedTo: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  escalatedAt?: string;
  slaDeadline: string;
}

export interface AuditEvent {
  id: string;
  shipmentId?: string | null;
  documentId?: string;
  exceptionId?: string;
  eventType: string;
  actor: string;
  description: string;
  fieldName?: string;
  previousValue?: string | null;
  newValue?: string;
  sourceDocumentId?: string;
  timestamp: string;
}

export interface BLDraft {
  [key: string]: any;
  blNumber: string;
  shippingLine: string;
  issueDate: string;
  placeOfIssue: string;
  freightTerms: string;
  shipper: { name?: string; address?: string };
  consignee: { name?: string; address?: string };
  notifyParty: { name?: string };
  portOfLoading?: string;
  portOfDischarge?: string;
  vessel?: string;
  voyage?: string;
  sailingDate?: string;
  containerNumber?: string;
  containerType?: string;
  containerCount?: number;
  cargoDescription?: string;
  hsCode?: string;
  grossWeight: string;
  netWeight: string;
  packageCount?: number;
  packageType?: string;
  marksAndNumbers: string;
  invoiceNumber?: string;
  invoiceValue?: number;
  invoiceCurrency?: string;
  incoterms?: string;
  countryOfOrigin?: string;
  isDraft: boolean;
  version: number;
  generatedAt: string;
  generatedBy: string;
}

export interface BLRevision {
  id: string;
  field: string;
  previousValue?: string;
  correctedValue: string;
  reason: string;
  actor: string;
  version: number;
  timestamp: string;
}

export interface ManagerDashboard {
  stats: {
    activeShipments: number;
    documentsInQueue: number;
    openExceptions: number;
    atRisk: number;
  };
  pipeline: Array<{
    shipment: Shipment;
    documentsComplete: number;
    documentsTotal: number;
    openExceptions: number;
    criticalExceptions: number;
    risk: 'Critical' | 'High' | 'Medium' | 'Low';
  }>;
  exceptionsSummary: FreightException[];
  execWorkload: Array<{
    execName: string;
    shipments: number;
    docsProcessedToday: number;
    openExceptions: number;
    avgBLTime: string;
  }>;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning';
  message: string;
}
