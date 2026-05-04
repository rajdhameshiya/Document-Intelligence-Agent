import express from 'express';
import { v4 as uuid } from 'uuid';
import { approveBLDraft, applyBLRevision, generateBLDraft, getBLDraft } from '../services/blGenerator';
import { Shipment } from '../types';
import { fail, getErrorMessage, ok } from '../utils/api';
import { createAuditEvent, getExceptions, getShipment, getShipments, saveShipment } from '../utils/dataLayer';

export const shipmentsRouter = express.Router();

const LOCKED_FIELDS = ['bookingReferenceNumber', 'containerType', 'containerCount'];

shipmentsRouter.get('/', (_req, res) => {
  return ok(
    res,
    getShipments().sort((a, b) => new Date(a.cutoffDate).getTime() - new Date(b.cutoffDate).getTime())
  );
});

shipmentsRouter.get('/:id', (req, res) => {
  const shipment = getShipment(req.params.id);
  if (!shipment) return fail(res, 'SHIPMENT_NOT_FOUND', 'Shipment not found', 404);
  return ok(res, shipment);
});

shipmentsRouter.post('/', (req, res) => {
  const now = new Date().toISOString();
  const shipment: Shipment = {
    id: uuid(),
    referenceNumber: req.body.referenceNumber || `SHIP-${new Date().getFullYear()}-${String(getShipments().length + 1).padStart(3, '0')}`,
    status: 'documents_pending',
    shippingLine: req.body.shippingLine || 'Maersk',
    assignedExec: req.body.assignedExec || 'Priya Sharma',
    createdAt: now,
    updatedAt: now,
    cutoffDate: req.body.cutoffDate || now,
    sailingDate: req.body.sailingDate || now,
    bookingReferenceNumber: req.body.bookingReferenceNumber,
    vesselName: req.body.vesselName,
    voyageNumber: req.body.voyageNumber,
    portOfLoading: req.body.portOfLoading,
    portOfDischarge: req.body.portOfDischarge,
    containerType: req.body.containerType,
    containerCount: req.body.containerCount ? Number(req.body.containerCount) : undefined,
    documentsReceived: {
      bookingConfirmation: false,
      shippingInstruction: false,
      commercialInvoice: false,
      packingList: false
    }
  };
  saveShipment(shipment);
  createAuditEvent({
    shipmentId: shipment.id,
    eventType: 'shipment_record_updated',
    actor: req.body.actor || 'Priya Sharma',
    description: `Shipment ${shipment.referenceNumber} created`
  });
  return ok(res, shipment, 201);
});

shipmentsRouter.patch('/:id/field', (req, res) => {
  const shipment = getShipment(req.params.id);
  if (!shipment) return fail(res, 'SHIPMENT_NOT_FOUND', 'Shipment not found', 404);

  const { field, value, actor = 'Priya Sharma' } = req.body;
  if (!field) return fail(res, 'INVALID_FIELD', 'Field is required', 400);
  if (LOCKED_FIELDS.includes(field) && shipment[field] && shipment[field] !== value) {
    return fail(res, 'LOCKED_FIELD_CONFLICT', `${field} is locked and cannot be overwritten`, 409);
  }

  const previousValue = shipment[field];
  shipment[field] = coerceValue(field, value);
  saveShipment(shipment);

  createAuditEvent({
    shipmentId: shipment.id,
    eventType: 'field_written',
    actor,
    fieldName: field,
    previousValue: previousValue === undefined || previousValue === null ? null : String(previousValue),
    newValue: String(value),
    description: `Field "${field}" updated manually`
  });

  return ok(res, shipment);
});

shipmentsRouter.post('/:id/generate-bl', (req, res) => {
  try {
    const unresolvedCritical = getExceptions().filter(
      (exception) => exception.shipmentId === req.params.id && exception.status !== 'resolved' && exception.severity === 'critical'
    );
    if (unresolvedCritical.length > 0) {
      return fail(res, 'BL_GENERATION_BLOCKED', 'Cannot generate BL while critical exceptions are open', 409);
    }

    const draft = generateBLDraft(req.params.id);
    return ok(res, draft);
  } catch (error) {
    return fail(res, 'MISSING_REQUIRED_FIELDS', getErrorMessage(error), 409);
  }
});

shipmentsRouter.get('/:id/bl', (req, res) => {
  try {
    return ok(res, getBLDraft(req.params.id));
  } catch (error) {
    return fail(res, 'SHIPMENT_NOT_FOUND', getErrorMessage(error), 404);
  }
});

shipmentsRouter.post('/:id/bl/approve', (req, res) => {
  try {
    return ok(res, approveBLDraft(req.params.id, req.body.actor || 'Priya Sharma'));
  } catch (error) {
    return fail(res, 'BL_APPROVAL_FAILED', getErrorMessage(error), 400);
  }
});

shipmentsRouter.post('/:id/bl/revision', (req, res) => {
  try {
    const draft = applyBLRevision(
      req.params.id,
      req.body.field,
      req.body.correctedValue,
      req.body.reason || 'Manual revision',
      req.body.actor || 'Priya Sharma'
    );
    return ok(res, draft);
  } catch (error) {
    return fail(res, 'BL_REVISION_FAILED', getErrorMessage(error), 400);
  }
});

function coerceValue(field: string, value: unknown): string | number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (['containerCount', 'grossWeight', 'netWeight', 'packageCount', 'invoiceValue'].includes(field)) {
    return Number(value);
  }
  return String(value);
}
