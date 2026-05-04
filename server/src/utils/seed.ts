import { v4 as uuid } from 'uuid';
import { AuditEvent, FreightDocument, FreightException, Shipment } from '../types';
import { getShipments, writeCollection } from './dataLayer';

const SEED_SHIPMENTS: Shipment[] = [
  {
    id: 'ship-001',
    referenceNumber: 'SHIP-2024-001',
    status: 'documents_pending',
    shippingLine: 'Maersk',
    assignedExec: 'Priya Sharma',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T09:00:00Z',
    cutoffDate: '2024-01-22T18:00:00Z',
    sailingDate: '2024-01-25T00:00:00Z',
    bookingReferenceNumber: 'MAEU-123456',
    vesselName: 'Maersk Elba',
    voyageNumber: '401W',
    portOfLoading: 'INNSA',
    portOfDischarge: 'NLRTM',
    containerType: '40HC',
    containerCount: 2,
    documentsReceived: {
      bookingConfirmation: true,
      shippingInstruction: false,
      commercialInvoice: false,
      packingList: false
    }
  },
  {
    id: 'ship-002',
    referenceNumber: 'SHIP-2024-002',
    status: 'documents_received',
    shippingLine: 'MSC',
    assignedExec: 'Rahul Verma',
    createdAt: '2024-01-14T10:00:00Z',
    updatedAt: '2024-01-15T11:00:00Z',
    cutoffDate: '2024-01-20T18:00:00Z',
    sailingDate: '2024-01-23T00:00:00Z',
    bookingReferenceNumber: 'MSCU-789012',
    vesselName: 'MSC Pamela',
    voyageNumber: 'FX201W',
    portOfLoading: 'INMUN',
    portOfDischarge: 'DEHAM',
    containerType: '20GP',
    containerCount: 1,
    shipperName: 'Arvind Textiles Pvt Ltd',
    shipperAddress: 'Plot 45, GIDC Estate, Surat, Gujarat 395010',
    consigneeName: 'Zara International BV',
    consigneeAddress: 'Calle Industria 55, Amsterdam 1012, Netherlands',
    cargoDescription: '100% Cotton Denim Fabric',
    hsCode: '52094200',
    grossWeight: 14500,
    packageCount: 240,
    packageType: 'Rolls',
    freightTerms: 'Prepaid',
    invoiceNumber: 'ARV-2024-089',
    invoiceValue: 45000,
    invoiceCurrency: 'USD',
    incoterms: 'FOB',
    countryOfOrigin: 'India',
    documentsReceived: {
      bookingConfirmation: true,
      shippingInstruction: true,
      commercialInvoice: true,
      packingList: true
    }
  },
  {
    id: 'ship-003',
    referenceNumber: 'SHIP-2024-003',
    status: 'bl_revision_in_progress',
    shippingLine: 'CMA CGM',
    assignedExec: 'Priya Sharma',
    createdAt: '2024-01-12T08:00:00Z',
    updatedAt: '2024-01-15T14:00:00Z',
    cutoffDate: '2024-01-19T18:00:00Z',
    sailingDate: '2024-01-21T00:00:00Z',
    bookingReferenceNumber: 'CMDU-345678',
    vesselName: 'CMA CGM Titus',
    voyageNumber: 'MX1W',
    portOfLoading: 'INNSA',
    portOfDischarge: 'GBFXT',
    containerType: '40GP',
    containerCount: 3,
    shipperName: 'Reliance Exports Ltd',
    consigneeName: 'UK Pharma Distributors Ltd',
    cargoDescription: 'Pharmaceutical Packaging Material',
    hsCode: '39239000',
    grossWeight: 22000,
    packageCount: 480,
    packageType: 'Cartons',
    freightTerms: 'Prepaid',
    blDraftVersion: 2,
    documentsReceived: {
      bookingConfirmation: true,
      shippingInstruction: true,
      commercialInvoice: true,
      packingList: true
    }
  }
];

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function seedData(): void {
  if (getShipments().length > 0) return;

  const seedDocuments: FreightDocument[] = [
    {
      id: 'doc-001',
      shipmentId: 'ship-001',
      type: 'booking_confirmation',
      status: 'processed',
      channel: 'email',
      fileName: 'MAEU-123456-booking-confirmation.pdf',
      fileUrl: '/uploads/doc-001.pdf',
      senderIdentity: 'bookings@maersk.com',
      receivedAt: '2024-01-15T09:15:00Z',
      processedAt: '2024-01-15T09:16:00Z',
      extractedFields: [
        { fieldName: 'bookingReferenceNumber', value: 'MAEU-123456', confidence: 99, mandatory: true, status: 'extracted' },
        { fieldName: 'vesselName', value: 'Maersk Elba', confidence: 97, mandatory: true, status: 'extracted' },
        { fieldName: 'voyageNumber', value: '401W', confidence: 95, mandatory: true, status: 'extracted' },
        { fieldName: 'portOfLoading', value: 'INNSA', confidence: 92, mandatory: true, status: 'extracted' },
        { fieldName: 'portOfDischarge', value: 'NLRTM', confidence: 94, mandatory: true, status: 'extracted' },
        { fieldName: 'containerType', value: '40HC', confidence: 98, mandatory: true, status: 'extracted' },
        { fieldName: 'containerCount', value: 2, confidence: 99, mandatory: true, status: 'extracted' },
        { fieldName: 'sailingDate', value: '2024-01-25', confidence: 96, mandatory: true, status: 'extracted' },
        { fieldName: 'cutoffDate', value: '2024-01-22T18:00:00Z', confidence: 93, mandatory: true, status: 'extracted' }
      ],
      extractionSummary: { totalFields: 9, extractedSuccessfully: 9, missingMandatory: 0, lowConfidence: 0, conflicts: 0 },
      classificationConfidence: 99,
      classificationReasoning: 'Booking reference, vessel, voyage and container details were present.'
    },
    {
      id: 'doc-002',
      shipmentId: 'ship-002',
      type: 'shipping_instruction',
      status: 'flagged',
      channel: 'whatsapp',
      fileName: 'SI_ARV_ZAR_Jan2024.pdf',
      fileUrl: '/uploads/doc-002.pdf',
      senderIdentity: '+91 98765 43210',
      receivedAt: '2024-01-15T10:30:00Z',
      processedAt: '2024-01-15T10:31:00Z',
      extractedFields: [
        { fieldName: 'shipperName', value: 'Arvind Textiles Pvt Ltd', confidence: 97, mandatory: true, status: 'extracted' },
        { fieldName: 'consigneeName', value: 'Zara International BV', confidence: 94, mandatory: true, status: 'extracted' },
        { fieldName: 'portOfLoading', value: 'INNSA', confidence: 91, mandatory: true, status: 'extracted' },
        { fieldName: 'portOfDischarge', value: 'NLRTM', confidence: 91, mandatory: true, status: 'conflict', conflictValue: 'DEHAM' },
        { fieldName: 'cargoDescription', value: '100% Cotton Denim Fabric', confidence: 95, mandatory: true, status: 'extracted' },
        { fieldName: 'hsCode', value: null, confidence: 0, mandatory: true, status: 'missing' },
        { fieldName: 'grossWeight', value: 14500, confidence: 67, mandatory: true, status: 'low_confidence' },
        { fieldName: 'packageCount', value: 240, confidence: 93, mandatory: true, status: 'extracted' },
        { fieldName: 'freightTerms', value: 'Prepaid', confidence: 98, mandatory: true, status: 'extracted' }
      ],
      extractionSummary: { totalFields: 9, extractedSuccessfully: 6, missingMandatory: 1, lowConfidence: 1, conflicts: 1 },
      classificationConfidence: 96,
      classificationReasoning: 'The document contains shipper instructions and cargo details for BL preparation.'
    },
    {
      id: 'doc-003',
      shipmentId: null,
      type: 'unclassified',
      status: 'flagged',
      channel: 'whatsapp',
      fileName: 'document_jan15.pdf',
      fileUrl: '/uploads/doc-003.pdf',
      senderIdentity: '+91 99887 76655',
      receivedAt: '2024-01-15T14:20:00Z',
      processedAt: '2024-01-15T14:21:00Z',
      extractedFields: [],
      extractionSummary: { totalFields: 0, extractedSuccessfully: 0, missingMandatory: 0, lowConfidence: 0, conflicts: 0 },
      classificationConfidence: 42,
      classificationReasoning: 'Document content did not match any supported freight document type.'
    }
  ];

  const seedExceptions: FreightException[] = [
    {
      id: 'exc-001',
      shipmentId: 'ship-002',
      documentId: 'doc-002',
      type: 'missing_mandatory_field',
      severity: 'high',
      status: 'open',
      fieldName: 'hsCode',
      description: 'Mandatory field "HS Code" is missing from Shipping Instruction',
      assignedTo: 'Rahul Verma',
      createdAt: '2024-01-15T10:31:00Z',
      slaDeadline: hoursFromNow(4)
    },
    {
      id: 'exc-002',
      shipmentId: 'ship-003',
      documentId: 'doc-002',
      type: 'field_conflict',
      severity: 'critical',
      status: 'open',
      fieldName: 'consigneeName',
      existingValue: 'UK Pharma Distributors Limited',
      conflictingValue: 'UK Pharma Distributors Ltd',
      description: 'Consignee name on SI conflicts with booking record',
      assignedTo: 'Priya Sharma',
      createdAt: '2024-01-15T11:00:00Z',
      slaDeadline: hoursFromNow(1.4)
    },
    {
      id: 'exc-003',
      shipmentId: null,
      documentId: 'doc-003',
      type: 'unmatched_document',
      severity: 'medium',
      status: 'open',
      description: 'Document received from unknown sender cannot link to any active shipment',
      assignedTo: 'Priya Sharma',
      createdAt: '2024-01-15T14:21:00Z',
      slaDeadline: hoursFromNow(6)
    }
  ];

  const seedAuditEvents: AuditEvent[] = [
    {
      id: uuid(),
      shipmentId: 'ship-001',
      documentId: 'doc-001',
      eventType: 'document_received',
      actor: 'Agent',
      description: 'Booking Confirmation received via Email from bookings@maersk.com',
      timestamp: '2024-01-15T09:15:00Z'
    },
    {
      id: uuid(),
      shipmentId: 'ship-001',
      documentId: 'doc-001',
      eventType: 'document_classified',
      actor: 'Agent',
      description: 'Document classified as booking_confirmation (99% confidence)',
      timestamp: '2024-01-15T09:15:30Z'
    },
    {
      id: uuid(),
      shipmentId: 'ship-001',
      documentId: 'doc-001',
      eventType: 'field_written',
      actor: 'Agent',
      fieldName: 'vesselName',
      previousValue: null,
      newValue: 'Maersk Elba',
      description: 'Field "vesselName" written from Booking Confirmation',
      timestamp: '2024-01-15T09:16:00Z'
    },
    {
      id: uuid(),
      shipmentId: 'ship-002',
      documentId: 'doc-002',
      eventType: 'document_received',
      actor: 'Agent',
      description: 'Shipping Instruction received via WhatsApp from +91 98765 43210',
      timestamp: '2024-01-15T10:30:00Z'
    },
    {
      id: uuid(),
      shipmentId: 'ship-002',
      documentId: 'doc-002',
      eventType: 'exception_raised',
      actor: 'Agent',
      description: 'Exception raised: Missing mandatory field "hsCode"',
      timestamp: '2024-01-15T10:31:00Z'
    }
  ];

  writeCollection('shipments', SEED_SHIPMENTS);
  writeCollection('documents', seedDocuments);
  writeCollection('exceptions', seedExceptions);
  writeCollection('audit_log', seedAuditEvents);
}
