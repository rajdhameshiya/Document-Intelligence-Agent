import { AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FieldStatusRow } from '../components/FieldStatusRow';
import { Skeleton } from '../components/Skeleton';
import { StatusBadge } from '../components/StatusBadge';
import { API_URL, useAppStore } from '../store/appStore';
import { ExtractedField } from '../types';
import { formatDate, truncateMiddle } from '../utils/format';

export function DocumentDetailPage() {
  const { id } = useParams();
  const { documents, shipments, fetchDocuments, fetchShipments, resolveDocumentField, updateShipmentField, addToast } = useAppStore();
  const [conflictField, setConflictField] = useState<ExtractedField | null>(null);
  const [resolution, setResolution] = useState<'keep_tms' | 'use_document' | 'manual'>('use_document');
  const [manualValue, setManualValue] = useState('');

  useEffect(() => {
    fetchDocuments();
    fetchShipments();
  }, [fetchDocuments, fetchShipments]);

  const document = documents.find((item) => item.id === id);
  const shipment = shipments.find((item) => item.id === document?.shipmentId);
  const previewUrl = document ? `${API_URL}${document.fileUrl}` : '';
  const summary = useMemo(() => document?.extractionSummary, [document]);

  if (!document) {
    return (
      <div className="grid grid-cols-2 gap-5">
        <Skeleton className="h-[720px]" />
        <Skeleton className="h-[720px]" />
      </div>
    );
  }

  const acceptAll = async () => {
    if (!shipment) return;
    for (const field of document.extractedFields.filter((item) => item.status === 'extracted' && item.confidence >= 90)) {
      await updateShipmentField(shipment.id, field.fieldName, field.value);
    }
  };

  const confirmResolution = async () => {
    if (!conflictField) return;
    await resolveDocumentField(
      document.id,
      conflictField.fieldName,
      resolution,
      resolution === 'manual' ? manualValue : conflictField.value
    );
    setConflictField(null);
    setManualValue('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            <Link to="/intake" className="hover:text-[#E8533A]">
              Intake
            </Link>{' '}
            / <span title={document.fileName}>{truncateMiddle(document.fileName, 42)}</span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Document Extraction Review</h1>
        </div>
        <StatusBadge status={document.status} />
      </div>

      <div className="grid min-h-[720px] grid-cols-2 gap-5">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-500" />
              <span className="text-sm font-semibold text-slate-900">Document Preview</span>
            </div>
            <span className="text-xs text-slate-500">{formatDate(document.receivedAt, true)}</span>
          </div>
          {document.fileName.toLowerCase().match(/\.(png|jpg|jpeg)$/) ? (
            <img src={previewUrl} alt={document.fileName} className="max-h-[620px] w-full rounded-md object-contain" />
          ) : (
            <iframe title={document.fileName} src={previewUrl} className="h-[620px] w-full rounded-md border border-slate-200 bg-slate-50" />
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{document.type.replace(/_/g, ' ')}</h2>
                <p className="text-sm text-slate-500">
                  {document.senderIdentity} | {shipment?.referenceNumber || 'Unmatched'}
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <MiniStat label="Fields" value={summary?.totalFields || 0} />
                <MiniStat label="OK" value={summary?.extractedSuccessfully || 0} />
                <MiniStat label="Missing" value={summary?.missingMandatory || 0} />
                <MiniStat label="Conflicts" value={summary?.conflicts || 0} />
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {document.extractedFields.map((field) => (
              <FieldStatusRow key={field.fieldName} field={field} onResolveConflict={setConflictField} />
            ))}
          </div>

          <div className="mt-5 flex gap-2 border-t border-slate-200 pt-4">
            <button onClick={acceptAll} className="inline-flex items-center gap-2 rounded-md bg-[#1E3A5F] px-3 py-2 text-sm font-semibold text-white">
              <CheckCircle2 className="h-4 w-4" />
              Accept All Extracted Fields
            </button>
            <button onClick={() => addToast({ type: 'warning', message: 'Field-by-field review is ready in this panel' })} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              Review & Confirm
            </button>
            <button onClick={() => addToast({ type: 'warning', message: 'Document flagged for manual review' })} className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Flag for Manual Review
            </button>
          </div>
        </section>
      </div>

      {conflictField && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Resolve Conflict</h3>
            <p className="mt-1 text-sm text-slate-500">{conflictField.fieldName}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-purple-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-purple-700">Extracted value</p>
                <p className="mt-1 font-medium text-slate-900">{String(conflictField.value)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">TMS current value</p>
                <p className="mt-1 font-medium text-slate-900">{conflictField.conflictValue}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={resolution === 'keep_tms'} onChange={() => setResolution('keep_tms')} />
                Keep TMS value
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={resolution === 'use_document'} onChange={() => setResolution('use_document')} />
                Use document value
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={resolution === 'manual'} onChange={() => setResolution('manual')} />
                Enter manually
              </label>
              {resolution === 'manual' && (
                <input value={manualValue} onChange={(event) => setManualValue(event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConflictField(null)} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold">
                Cancel
              </button>
              <button onClick={confirmResolution} className="rounded-md bg-[#1E3A5F] px-3 py-2 text-sm font-semibold text-white">
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
