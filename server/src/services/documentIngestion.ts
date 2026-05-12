import { v4 as uuid } from 'uuid';
import { FreightDocument } from '../types';
import { getDocument, getDocuments, getShipment, getShipmentByReference, saveDocument } from '../utils/dataLayer';
import { createAuditEvent } from '../utils/dataLayer';
import { getErrorMessage } from '../utils/api';
import { processDocument } from './documentProcessor';

interface IngestDocumentInput {
  channel: FreightDocument['channel'];
  fileName: string;
  storedFileName: string;
  senderIdentity: string;
  shipmentId?: string | null;
  shipmentReference?: string | null;
}

export function ingestDocument(input: IngestDocumentInput): FreightDocument {
  const shipment =
    (input.shipmentId && getShipment(input.shipmentId)) ||
    (input.shipmentReference && getShipmentByReference(input.shipmentReference)) ||
    null;

  const existingDuplicate = getDocuments().find(
    (document) => document.fileName === input.fileName && document.senderIdentity === input.senderIdentity
  );

  const document: FreightDocument = {
    id: uuid(),
    shipmentId: shipment?.id || null,
    type: 'unclassified',
    status: existingDuplicate ? 'duplicate' : 'processing',
    channel: input.channel,
    fileName: input.fileName,
    fileUrl: `/uploads/${input.storedFileName}`,
    senderIdentity: input.senderIdentity,
    receivedAt: new Date().toISOString(),
    extractedFields: [],
    extractionSummary: { totalFields: 0, extractedSuccessfully: 0, missingMandatory: 0, lowConfidence: 0, conflicts: 0 },
    isDuplicate: Boolean(existingDuplicate),
    duplicateOfDocumentId: existingDuplicate?.id
  };

  saveDocument(document);
  createAuditEvent({
    shipmentId: shipment?.id || null,
    documentId: document.id,
    eventType: 'document_received',
    actor: 'Agent',
    description: `Document received via ${input.channel} from ${input.senderIdentity}`
  });

  if (!existingDuplicate) {
    setTimeout(() => {
      processDocument(document.id).catch((error) => {
        const failed = getDocument(document.id);
        if (failed) {
          failed.status = 'failed';
          failed.processingError = getErrorMessage(error);
          saveDocument(failed);
        }
      });
    }, 3000);
  }

  return document;
}
