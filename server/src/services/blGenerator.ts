import { v4 as uuid } from 'uuid';
import { BLDraft, Shipment } from '../types';
import { createAuditEvent, getShipment, saveShipment } from '../utils/dataLayer';

export function generateBLDraft(shipmentId: string): BLDraft {
  const shipment = getShipment(shipmentId);
  if (!shipment) throw new Error('Shipment not found');

  const requiredFields = [
    'shipperName',
    'consigneeName',
    'portOfLoading',
    'portOfDischarge',
    'vesselName',
    'voyageNumber',
    'cargoDescription',
    'grossWeight',
    'packageCount'
  ];

  const missingFields = requiredFields.filter((field) => !shipment[field]);
  if (missingFields.length > 0) {
    throw new Error(`Cannot generate BL. Missing fields: ${missingFields.join(', ')}`);
  }

  const nextVersion = (shipment.blDraftVersion || 0) + 1;
  const blData = buildBLData(shipment, nextVersion);

  shipment.blDraftVersion = blData.version;
  shipment.blDraftData = blData;
  shipment.status = 'bl_draft_generated';
  saveShipment(shipment);

  createAuditEvent({
    shipmentId,
    eventType: 'bl_generated',
    actor: 'Agent',
    description: `BL Draft v${blData.version} generated automatically from extracted documents`
  });

  return blData;
}

export function getBLDraft(shipmentId: string): BLDraft | null {
  const shipment = getShipment(shipmentId);
  if (!shipment) throw new Error('Shipment not found');
  return shipment.blDraftData || null;
}

export function applyBLRevision(
  shipmentId: string,
  field: string,
  correctedValue: string,
  reason: string,
  actor: string
): BLDraft {
  const shipment = getShipment(shipmentId);
  if (!shipment) throw new Error('Shipment not found');

  const draft = shipment.blDraftData || buildBLData(shipment, shipment.blDraftVersion || 1);
  const previousValue = readDraftField(draft, field);
  writeDraftField(draft, field, correctedValue);

  const nextVersion = (shipment.blDraftVersion || draft.version || 0) + 1;
  draft.version = nextVersion;
  draft.blNumber = `DRAFT-${shipment.referenceNumber}-V${nextVersion}`;
  draft.generatedAt = new Date().toISOString();

  shipment.blDraftVersion = nextVersion;
  shipment.blDraftData = draft;
  shipment.status = 'bl_revision_in_progress';
  shipment.blRevisionHistory = [
    ...(shipment.blRevisionHistory || []),
    {
      id: uuid(),
      field,
      previousValue,
      correctedValue,
      reason,
      actor,
      version: nextVersion,
      timestamp: new Date().toISOString()
    }
  ];

  applyShipmentFieldUpdate(shipment, field, correctedValue);
  saveShipment(shipment);

  createAuditEvent({
    shipmentId,
    eventType: 'bl_revised',
    actor,
    fieldName: field,
    previousValue: previousValue || null,
    newValue: correctedValue,
    description: `BL Draft revised: ${field} changed from "${previousValue || 'N/A'}" to "${correctedValue}". Reason: ${reason}`
  });

  return draft;
}

export function approveBLDraft(shipmentId: string, actor: string): BLDraft {
  const shipment = getShipment(shipmentId);
  if (!shipment) throw new Error('Shipment not found');
  if (!shipment.blDraftData) throw new Error('BL draft not found');

  shipment.status = 'bl_approved';
  shipment.blApprovedAt = new Date().toISOString();
  saveShipment(shipment);

  createAuditEvent({
    shipmentId,
    eventType: 'bl_approved',
    actor,
    description: `BL Draft v${shipment.blDraftData.version} approved for shipper review`
  });

  createAuditEvent({
    shipmentId,
    eventType: 'bl_sent_to_shipper',
    actor,
    description: `BL Draft v${shipment.blDraftData.version} sent to shipper after approval gate`
  });

  return shipment.blDraftData;
}

function buildBLData(shipment: Shipment, version: number): BLDraft {
  return {
    blNumber: `DRAFT-${shipment.referenceNumber}-V${version}`,
    shippingLine: shipment.shippingLine,
    issueDate: new Date().toISOString().split('T')[0],
    placeOfIssue: 'Mumbai, India',
    freightTerms: shipment.freightTerms || 'Prepaid',
    shipper: {
      name: shipment.shipperName,
      address: shipment.shipperAddress
    },
    consignee: {
      name: shipment.consigneeName,
      address: shipment.consigneeAddress
    },
    notifyParty: {
      name: shipment.notifyParty
    },
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
    version,
    generatedAt: new Date().toISOString(),
    generatedBy: 'Document Intelligence Agent'
  };
}

function readDraftField(draft: BLDraft, field: string): string {
  if (field === 'shipperAddress') return draft.shipper.address || '';
  if (field === 'shipperName') return draft.shipper.name || '';
  if (field === 'consigneeAddress') return draft.consignee.address || '';
  if (field === 'consigneeName') return draft.consignee.name || '';
  const value = draft[field];
  return value === undefined || value === null ? '' : String(value);
}

function writeDraftField(draft: BLDraft, field: string, value: string): void {
  if (field === 'shipperAddress') draft.shipper.address = value;
  else if (field === 'shipperName') draft.shipper.name = value;
  else if (field === 'consigneeAddress') draft.consignee.address = value;
  else if (field === 'consigneeName') draft.consignee.name = value;
  else draft[field] = value;
}

function applyShipmentFieldUpdate(shipment: Shipment, field: string, value: string): void {
  const map: Record<string, string> = {
    shipperAddress: 'shipperAddress',
    shipperName: 'shipperName',
    consigneeAddress: 'consigneeAddress',
    consigneeName: 'consigneeName',
    portOfLoading: 'portOfLoading',
    portOfDischarge: 'portOfDischarge',
    vessel: 'vesselName',
    voyage: 'voyageNumber',
    cargoDescription: 'cargoDescription',
    hsCode: 'hsCode',
    packageType: 'packageType',
    marksAndNumbers: 'marksAndNumbers',
    freightTerms: 'freightTerms',
    incoterms: 'incoterms',
    countryOfOrigin: 'countryOfOrigin'
  };
  const shipmentField = map[field];
  if (shipmentField) shipment[shipmentField] = value;
}
