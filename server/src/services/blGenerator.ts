import { createAuditEvent, store } from '../utils/dataStore';

export interface BLDraft {
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
  revisions?: Array<{ field: string; previousValue: string; newValue: string; reason: string; revisedAt: string; actor: string }>;
}

const drafts = new Map<string, BLDraft>();

export async function generateBLDraft(shipmentId: string): Promise<BLDraft> {
  const shipments = store.getShipments();
  const shipment = shipments.find((s) => s.id === shipmentId);
  if (!shipment) throw new Error('SHIPMENT_NOT_FOUND');
  const requiredFields = ['shipperName', 'consigneeName', 'portOfLoading', 'portOfDischarge', 'vesselName', 'voyageNumber', 'cargoDescription', 'grossWeight', 'packageCount'];
  const missingFields = requiredFields.filter((f) => !(shipment as any)[f]);
  if (missingFields.length > 0) throw new Error(`MISSING_REQUIRED_FIELDS:${missingFields.join(', ')}`);

  const blData: BLDraft = {
    blNumber: `DRAFT-${shipment.referenceNumber}-V${(shipment.blDraftVersion || 0) + 1}`,
    shippingLine: shipment.shippingLine,
    issueDate: new Date().toISOString().split('T')[0],
    placeOfIssue: 'Mumbai, India',
    freightTerms: shipment.freightTerms || 'Prepaid',
    shipper: { name: shipment.shipperName, address: shipment.shipperAddress },
    consignee: { name: shipment.consigneeName, address: shipment.consigneeAddress },
    notifyParty: { name: shipment.notifyParty },
    portOfLoading: shipment.portOfLoading,
    portOfDischarge: shipment.portOfDischarge,
    vessel: shipment.vesselName,
    voyage: shipment.voyageNumber,
    sailingDate: shipment.sailingDate,
    containerNumber: shipment.bookingReferenceNumber,
    containerType: shipment.containerType,
    containerCount: shipment.containerCount,
    cargoDescription: shipment.cargoDescription,
    hsCode: shipment.hsCode,
    grossWeight: `${shipment.grossWeight} KGS`,
    netWeight: shipment.netWeight ? `${shipment.netWeight} KGS` : 'N/A',
    packageCount: shipment.packageCount,
    packageType: shipment.packageType,
    marksAndNumbers: shipment.marksAndNumbers || 'AS PER SHIPPER',
    invoiceNumber: shipment.invoiceNumber,
    invoiceValue: shipment.invoiceValue,
    invoiceCurrency: shipment.invoiceCurrency,
    incoterms: shipment.incoterms,
    countryOfOrigin: shipment.countryOfOrigin,
    isDraft: true,
    version: (shipment.blDraftVersion || 0) + 1,
    generatedAt: new Date().toISOString(),
    generatedBy: 'Document Intelligence Agent',
    revisions: drafts.get(shipmentId)?.revisions || []
  };

  shipment.blDraftVersion = blData.version;
  shipment.status = 'bl_draft_generated';
  shipment.updatedAt = new Date().toISOString();
  store.saveShipments(shipments);
  drafts.set(shipmentId, blData);

  createAuditEvent({ shipmentId, eventType: 'bl_generated', actor: 'Agent', description: `BL Draft v${blData.version} generated automatically from extracted documents` });
  return blData;
}

export function getBLDraft(shipmentId: string): BLDraft | null { return drafts.get(shipmentId) || null; }

export function applyBLRevision(shipmentId: string, field: string, correctedValue: string, reason: string, actor: string): BLDraft {
  const draft = drafts.get(shipmentId);
  if (!draft) throw new Error('BL_GENERATION_BLOCKED');
  const getPathValue = (obj: any, fieldPath: string) => fieldPath.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
  const setPathValue = (obj: any, fieldPath: string, value: string) => {
    const keys = fieldPath.split('.');
    const last = keys.pop()!;
    const parent = keys.reduce((acc, key) => {
      if (!acc[key] || typeof acc[key] !== 'object') acc[key] = {};
      return acc[key];
    }, obj);
    parent[last] = value;
  };

  const previousValue = String(getPathValue(draft, field) ?? '');
  setPathValue(draft as any, field, correctedValue);
  draft.version += 1;
  draft.blNumber = draft.blNumber.replace(/V\d+$/, `V${draft.version}`);
  draft.revisions = draft.revisions || [];
  draft.revisions.unshift({ field, previousValue, newValue: correctedValue, reason, revisedAt: new Date().toISOString(), actor });

  const shipments = store.getShipments();
  const shipment = shipments.find((s) => s.id === shipmentId);
  if (shipment) {
    (shipment as any).blDraftVersion = draft.version;
    shipment.status = 'bl_revision_in_progress';
    shipment.updatedAt = new Date().toISOString();
    store.saveShipments(shipments);
  }

  createAuditEvent({ shipmentId, eventType: 'bl_revised', actor, fieldName: field, previousValue, newValue: correctedValue, description: `BL revised field ${field}: ${previousValue} -> ${correctedValue}` });
  return draft;
}

export function approveBL(shipmentId: string, actor: string): void {
  const shipments = store.getShipments();
  const shipment = shipments.find((s) => s.id === shipmentId);
  if (!shipment) throw new Error('SHIPMENT_NOT_FOUND');
  shipment.status = 'bl_approved';
  shipment.blApprovedAt = new Date().toISOString();
  shipment.updatedAt = new Date().toISOString();
  store.saveShipments(shipments);
  createAuditEvent({ shipmentId, eventType: 'bl_approved', actor, description: `BL Draft v${shipment.blDraftVersion || 1} approved for shipper review` });
  createAuditEvent({ shipmentId, eventType: 'bl_sent_to_shipper', actor, description: `BL Draft v${shipment.blDraftVersion || 1} sent to shipper for review` });
}
