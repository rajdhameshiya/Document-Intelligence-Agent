export type ShipmentStatus =
  | 'booking_confirmed'
  | 'documents_pending'
  | 'documents_received'
  | 'bl_draft_generated'
  | 'bl_revision_in_progress'
  | 'bl_approved'
  | 'bl_submitted';

export interface Shipment {
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
  specialInstructions?: string;
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
  blDraftUrl?: string;
  blApprovedAt?: string;
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
export type Channel = 'email' | 'whatsapp' | 'upload';

export interface ExtractedField {
  fieldName: string;
  value: string | number | null;
  confidence: number;
  mandatory: boolean;
  status: 'extracted' | 'missing' | 'illegible' | 'low_confidence' | 'conflict';
  conflictValue?: string;
}

export interface Document {
  id: string;
  shipmentId?: string;
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
}

export type ExceptionType =
  | 'missing_mandatory_field'
  | 'illegible_field'
  | 'field_conflict'
  | 'booking_mismatch'
  | 'processing_failure'
  | 'duplicate_document'
  | 'unmatched_document'
  | 'unclassified_document';

export type ExceptionSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ExceptionStatus = 'open' | 'in_review' | 'resolved' | 'escalated';

export interface Exception {
  id: string;
  shipmentId?: string;
  documentId: string;
  type: ExceptionType;
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

export type AuditEventType =
  | 'document_received'
  | 'document_classified'
  | 'document_extracted'
  | 'field_written'
  | 'exception_raised'
  | 'exception_resolved'
  | 'bl_generated'
  | 'bl_revised'
  | 'bl_approved'
  | 'bl_sent_to_shipper'
  | 'shipment_record_updated'
  | 'escalation_triggered';

export interface AuditEvent {
  id: string;
  shipmentId?: string;
  documentId?: string;
  exceptionId?: string;
  eventType: AuditEventType;
  actor: string;
  description: string;
  fieldName?: string;
  previousValue?: string;
  newValue?: string;
  sourceDocumentId?: string;
  timestamp: string;
}

export interface ApiSuccess<T> { success: true; data: T }
export interface ApiError { success: false; error: { code: string; message: string } }
