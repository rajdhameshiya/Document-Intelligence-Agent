import express from 'express';
import { fail, getErrorMessage, ok } from '../utils/api';
import {
  createAuditEvent,
  getDocument,
  getException,
  getExceptions,
  getShipment,
  saveDocument,
  saveException,
  saveShipment
} from '../utils/dataLayer';

export const exceptionsRouter = express.Router();

exceptionsRouter.get('/', (req, res) => {
  const { status, severity, assignedTo } = req.query;
  let exceptions = getExceptions();
  if (status) exceptions = exceptions.filter((exception) => exception.status === status);
  if (severity) exceptions = exceptions.filter((exception) => exception.severity === severity);
  if (assignedTo) exceptions = exceptions.filter((exception) => exception.assignedTo === assignedTo);

  exceptions.sort((a, b) => new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime());
  return ok(res, exceptions);
});

exceptionsRouter.get('/:id', (req, res) => {
  const exception = getException(req.params.id);
  if (!exception) return fail(res, 'EXCEPTION_NOT_FOUND', 'Exception not found', 404);
  return ok(res, exception);
});

exceptionsRouter.post('/:id/resolve', (req, res) => {
  try {
    const exception = getException(req.params.id);
    if (!exception) return fail(res, 'EXCEPTION_NOT_FOUND', 'Exception not found', 404);

    const resolvedBy = req.body.resolvedBy || 'Priya Sharma';
    const action = req.body.action || 'keep_tms';
    let resolvedValue = req.body.value;

    const shipment = exception.shipmentId ? getShipment(exception.shipmentId) : null;
    const document = getDocument(exception.documentId);
    const documentField = document?.extractedFields.find((field) => field.fieldName === exception.fieldName);

    if (action === 'use_document') resolvedValue = documentField?.value ?? exception.conflictingValue;
    if (action === 'keep_tms' && shipment && exception.fieldName) resolvedValue = shipment[exception.fieldName];

    if (shipment && exception.fieldName && action !== 'keep_tms' && resolvedValue !== undefined && resolvedValue !== null) {
      const previousValue = shipment[exception.fieldName];
      shipment[exception.fieldName] = coerceValue(exception.fieldName, resolvedValue);
      saveShipment(shipment);
      createAuditEvent({
        shipmentId: shipment.id,
        documentId: exception.documentId,
        exceptionId: exception.id,
        eventType: 'field_written',
        actor: resolvedBy,
        fieldName: exception.fieldName,
        previousValue: previousValue === undefined || previousValue === null ? null : String(previousValue),
        newValue: String(resolvedValue),
        description: `Field "${exception.fieldName}" updated while resolving exception`
      });
    }

    if (documentField) {
      documentField.value = resolvedValue ?? documentField.value;
      documentField.status = 'extracted';
      documentField.confidence = Math.max(documentField.confidence, 95);
      documentField.conflictValue = undefined;
      if (document) saveDocument(document);
    }

    exception.status = 'resolved';
    exception.resolvedAt = new Date().toISOString();
    exception.resolvedBy = resolvedBy;
    exception.resolutionNote = req.body.note || `Resolved with action ${action}`;
    saveException(exception);

    createAuditEvent({
      shipmentId: exception.shipmentId,
      documentId: exception.documentId,
      exceptionId: exception.id,
      eventType: 'exception_resolved',
      actor: resolvedBy,
      fieldName: exception.fieldName,
      description: `Exception resolved: ${exception.description}`
    });

    return ok(res, exception);
  } catch (error) {
    return fail(res, 'EXCEPTION_RESOLUTION_FAILED', getErrorMessage(error), 400);
  }
});

exceptionsRouter.post('/:id/escalate', (req, res) => {
  const exception = getException(req.params.id);
  if (!exception) return fail(res, 'EXCEPTION_NOT_FOUND', 'Exception not found', 404);

  exception.status = 'escalated';
  exception.escalatedAt = new Date().toISOString();
  saveException(exception);
  createAuditEvent({
    shipmentId: exception.shipmentId,
    documentId: exception.documentId,
    exceptionId: exception.id,
    eventType: 'escalation_triggered',
    actor: req.body.actor || 'Priya Sharma',
    description: `Exception escalated to manager: ${exception.description}`
  });
  return ok(res, exception);
});

function coerceValue(field: string, value: unknown): string | number {
  if (['containerCount', 'grossWeight', 'netWeight', 'packageCount', 'invoiceValue'].includes(field)) return Number(value);
  return String(value);
}
