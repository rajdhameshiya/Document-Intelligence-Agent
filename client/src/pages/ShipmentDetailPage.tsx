import { CheckCircle2, FileText, GitBranch, Lock, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SeverityBadge } from '../components/SeverityBadge';
import { Skeleton } from '../components/Skeleton';
import { SLACountdown } from '../components/SLACountdown';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../store/appStore';
import { BLDraft, FreightException } from '../types';
import { formatDate, formatFieldName, formatMoney, truncateMiddle } from '../utils/format';

const TABS = ['Overview', 'Documents', 'Exceptions', 'BL Draft', 'Audit Trail'];
const REVISION_FIELDS = ['consigneeAddress', 'shipperAddress', 'consigneeName', 'shipperName', 'portOfDischarge', 'cargoDescription', 'marksAndNumbers', 'freightTerms'];

export function ShipmentDetailPage() {
  const { id } = useParams();
  const {
    shipments,
    documents,
    exceptions,
    auditEvents,
    fetchShipments,
    fetchDocuments,
    fetchExceptions,
    fetchAuditForShipment,
    generateBLDraft,
    reviseBLDraft,
    approveBLDraft
  } = useAppStore();
  const [tab, setTab] = useState('Overview');
  const [generating, setGenerating] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionField, setRevisionField] = useState('consigneeAddress');
  const [correctedValue, setCorrectedValue] = useState('Prins Hendrikkade 150, Amsterdam 1011 AT, Netherlands');
  const [reason, setReason] = useState('Shipper provided updated address');

  useEffect(() => {
    fetchShipments();
    fetchDocuments();
    fetchExceptions();
    if (id) fetchAuditForShipment(id);
  }, [id, fetchShipments, fetchDocuments, fetchExceptions, fetchAuditForShipment]);

  const shipment = shipments.find((item) => item.id === id);
  const shipmentDocs = documents.filter((document) => document.shipmentId === id);
  const shipmentExceptions = exceptions.filter((exception) => exception.shipmentId === id && exception.status !== 'resolved');
  const criticalOpen = shipmentExceptions.some((exception) => exception.severity === 'critical');
  const docsComplete = shipment ? Object.values(shipment.documentsReceived).filter(Boolean).length : 0;
  const draft = shipment?.blDraftData;

  const canGenerate = docsComplete === 4 && !criticalOpen;

  const generate = async () => {
    if (!id) return;
    setGenerating(true);
    await new Promise((resolve) => window.setTimeout(resolve, 2000));
    await generateBLDraft(id);
    setGenerating(false);
  };

  const applyRevision = async () => {
    if (!id) return;
    await reviseBLDraft(id, { field: revisionField, correctedValue, reason });
    setRevisionOpen(false);
  };

  if (!shipment) return <Skeleton className="h-[720px]" />;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate-500">
          <Link to="/dashboard" className="hover:text-[#E8533A]">Dashboard</Link> / <Link to="/shipments" className="hover:text-[#E8533A]">Shipments</Link> / {shipment.referenceNumber}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="font-mono text-2xl font-semibold text-slate-900">{shipment.referenceNumber}</h1>
          <StatusBadge status={shipment.status} />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-slate-500">
          {['Booking', 'Docs Pending', 'Docs Received', 'Draft', 'Revision', 'Approved', 'Submitted'].map((stage, index) => (
            <div key={stage} className={index <= stageIndex(shipment.status) ? 'text-[#1E3A5F]' : 'text-slate-400'}>
              <div className={`mb-2 h-2 rounded-full ${index <= stageIndex(shipment.status) ? 'bg-[#1E3A5F]' : 'bg-slate-200'}`} />
              {stage}
            </div>
          ))}
        </div>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          {TABS.map((item) => (
            <button key={item} onClick={() => setTab(item)} className={`px-4 py-2 text-sm font-medium ${tab === item ? 'border-b-2 border-[#E8533A] text-[#E8533A]' : 'text-slate-500'}`}>
              {item}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Overview' && <Overview shipment={shipment} />}
      {tab === 'Documents' && (
        <div className="rounded-lg border border-slate-200 bg-white">
          {shipmentDocs.map((document) => (
            <Link key={document.id} to={`/documents/${document.id}`} className="flex items-center justify-between border-b border-slate-200 px-4 py-3 last:border-b-0 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="max-w-[48ch] truncate text-sm font-medium text-slate-900" title={document.fileName}>
                    {truncateMiddle(document.fileName, 42)}
                  </p>
                  <p className="text-xs text-slate-500">{document.type.replace(/_/g, ' ')} | {formatDate(document.receivedAt, true)}</p>
                </div>
              </div>
              <StatusBadge status={document.status} />
            </Link>
          ))}
        </div>
      )}
      {tab === 'Exceptions' && <ExceptionList exceptions={shipmentExceptions} />}
      {tab === 'BL Draft' && (
        <div className="space-y-4">
          {!draft && (
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-900">Generation Checklist</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <ChecklistItem label="Shipping Instruction processed" ok={shipment.documentsReceived.shippingInstruction} />
                <ChecklistItem label="Commercial Invoice processed" ok={shipment.documentsReceived.commercialInvoice} />
                <ChecklistItem label="Packing List processed" ok={shipment.documentsReceived.packingList} />
                <ChecklistItem label="No critical unresolved exceptions" ok={!criticalOpen} />
              </div>
              <button disabled={!canGenerate || generating} onClick={generate} className="mt-5 rounded-md bg-[#1E3A5F] px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300">
                {generating ? 'Generating BL Draft...' : 'Generate BL Draft'}
              </button>
            </div>
          )}
          {draft && (
            <>
              <BLCard draft={draft} />
              <div className="flex gap-2">
                <button onClick={() => approveBLDraft(shipment.id)} className="inline-flex items-center gap-2 rounded-md bg-[#1E3A5F] px-3 py-2 text-sm font-semibold text-white">
                  <Send className="h-4 w-4" />
                  Approve & Send to Shipper
                </button>
                <button onClick={() => setRevisionOpen(true)} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                  <GitBranch className="h-4 w-4" />
                  Request Revision
                </button>
              </div>
              {(shipment.blRevisionHistory || []).length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Revision History</h3>
                  <div className="mt-3 space-y-2">
                    {(shipment.blRevisionHistory || []).map((revision) => (
                      <div key={revision.id} className="rounded-md bg-slate-50 p-3 text-sm">
                        <span className="font-medium">v{revision.version}</span> {formatFieldName(revision.field)} changed to "{revision.correctedValue}" | {revision.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {tab === 'Audit Trail' && (
        <div className="rounded-lg border border-slate-200 bg-white">
          {auditEvents.map((event) => (
            <div key={event.id} className="grid grid-cols-[160px_140px_1fr] gap-4 border-b border-slate-200 px-4 py-3 text-sm last:border-b-0">
              <span className="text-slate-500">{formatDate(event.timestamp, true)}</span>
              <span className="font-medium text-slate-900">{event.actor}</span>
              <span className="text-slate-700">{event.description}</span>
            </div>
          ))}
        </div>
      )}

      {revisionOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Request Revision</h3>
            <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Field to revise
              <select value={revisionField} onChange={(event) => setRevisionField(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm normal-case tracking-normal">
                {REVISION_FIELDS.map((field) => <option key={field} value={field}>{formatFieldName(field)}</option>)}
              </select>
            </label>
            <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Corrected value
              <input value={correctedValue} onChange={(event) => setCorrectedValue(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm normal-case tracking-normal" />
            </label>
            <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Reason
              <input value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm normal-case tracking-normal" />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setRevisionOpen(false)} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold">Cancel</button>
              <button onClick={applyRevision} className="rounded-md bg-[#1E3A5F] px-3 py-2 text-sm font-semibold text-white">Apply Revision</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Overview({ shipment }: { shipment: any }) {
  const left = [
    ['Shipping Line', shipment.shippingLine],
    ['Booking Reference', shipment.bookingReferenceNumber, true],
    ['Vessel', shipment.vesselName],
    ['Voyage', shipment.voyageNumber],
    ['Port of Loading', shipment.portOfLoading],
    ['Port of Discharge', shipment.portOfDischarge],
    ['Container Type', shipment.containerType, true],
    ['Container Count', shipment.containerCount, true],
    ['Sailing Date', formatDate(shipment.sailingDate)],
    ['Cut-off Date', formatDate(shipment.cutoffDate, true)]
  ];
  const right = [
    ['Shipper', shipment.shipperName],
    ['Consignee', shipment.consigneeName],
    ['Cargo Description', shipment.cargoDescription],
    ['HS Code', shipment.hsCode],
    ['Gross Weight', shipment.grossWeight ? `${shipment.grossWeight} KGS` : undefined],
    ['Package Count', shipment.packageCount ? `${shipment.packageCount} ${shipment.packageType || ''}` : undefined],
    ['Freight Terms', shipment.freightTerms],
    ['Invoice Number', shipment.invoiceNumber],
    ['Invoice Value', formatMoney(shipment.invoiceCurrency, shipment.invoiceValue)],
    ['Incoterms', shipment.incoterms]
  ];
  return (
    <div className="grid grid-cols-[1fr_1fr_320px] gap-5">
      <FieldPanel title="Booking Details" rows={left} />
      <FieldPanel title="Cargo Details" rows={right} />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Document Checklist</h3>
        <div className="mt-4 space-y-3">
          {Object.entries(shipment.documentsReceived).map(([key, done]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className={`h-4 w-4 ${done ? 'text-green-600' : 'text-slate-300'}`} />
              <span className={done ? 'text-slate-900' : 'text-slate-500'}>{formatFieldName(key)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FieldPanel({ title, rows }: { title: string; rows: any[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.map(([label, value, locked]) => (
          <div key={label} className="grid grid-cols-[150px_1fr] gap-3 text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="font-medium text-slate-900">
              {value || 'N/A'} {locked && <Lock className="ml-1 inline h-3 w-3 text-slate-400" />}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExceptionList({ exceptions }: { exceptions: FreightException[] }) {
  if (exceptions.length === 0) return <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">No open exceptions</div>;
  return (
    <div className="space-y-3">
      {exceptions.map((exception) => (
        <div key={exception.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between">
            <div>
              <SeverityBadge severity={exception.severity} />
              <h3 className="mt-2 text-sm font-semibold text-slate-900">{exception.description}</h3>
              <p className="text-sm text-slate-500">Field: {exception.fieldName || 'N/A'} | Assigned: {exception.assignedTo}</p>
            </div>
            <SLACountdown deadline={exception.slaDeadline} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChecklistItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm">
      <CheckCircle2 className={`h-4 w-4 ${ok ? 'text-green-600' : 'text-slate-300'}`} />
      <span className={ok ? 'text-slate-900' : 'text-slate-500'}>{label}</span>
    </div>
  );
}

function BLCard({ draft }: { draft: BLDraft }) {
  return (
    <div className="rounded-lg border border-slate-300 bg-white p-6 font-mono text-sm shadow-sm">
      <div className="flex items-start justify-between border-b border-slate-300 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">BILL OF LADING (DRAFT)</h2>
          <p className="text-slate-500">{draft.shippingLine}</p>
        </div>
        <div className="text-right">
          <p className="font-bold">Draft v{draft.version}</p>
          <p className="text-xs text-slate-500">{formatDate(draft.generatedAt, true)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 border-b border-slate-300 py-4">
        <Party title="Shipper" name={draft.shipper.name} address={draft.shipper.address} />
        <Party title="Consignee" name={draft.consignee.name} address={draft.consignee.address} />
      </div>
      <div className="grid grid-cols-4 gap-4 border-b border-slate-300 py-4">
        <BLField label="Port of Loading" value={draft.portOfLoading} />
        <BLField label="Port of Discharge" value={draft.portOfDischarge} />
        <BLField label="Vessel" value={draft.vessel} />
        <BLField label="Voyage" value={draft.voyage} />
      </div>
      <div className="grid grid-cols-4 gap-4 py-4">
        <BLField label="Description" value={draft.cargoDescription} />
        <BLField label="HS Code" value={draft.hsCode} />
        <BLField label="Gross Weight" value={draft.grossWeight} />
        <BLField label="Packages" value={`${draft.packageCount || ''} ${draft.packageType || ''}`} />
      </div>
      <p className="border-t border-slate-300 pt-3 text-xs text-slate-500">Generated by: {draft.generatedBy}</p>
    </div>
  );
}

function Party({ title, name, address }: { title: string; name?: string; address?: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-slate-500">{title}</p>
      <p className="mt-1 font-bold text-slate-900">{name || 'N/A'}</p>
      <p className="mt-1 whitespace-pre-wrap text-slate-600">{address || 'N/A'}</p>
    </div>
  );
}

function BLField({ label, value }: { label: string; value?: string | number }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-slate-900">{value || 'N/A'}</p>
    </div>
  );
}

function stageIndex(status: string) {
  return ['booking_confirmed', 'documents_pending', 'documents_received', 'bl_draft_generated', 'bl_revision_in_progress', 'bl_approved', 'bl_submitted'].indexOf(status);
}
