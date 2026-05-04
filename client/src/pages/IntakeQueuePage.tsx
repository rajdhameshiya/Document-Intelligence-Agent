import { FileText, RefreshCw, UploadCloud } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Link } from 'react-router-dom';
import { ChannelIcon } from '../components/ChannelIcon';
import { FieldStatusRow } from '../components/FieldStatusRow';
import { Skeleton } from '../components/Skeleton';
import { StatusBadge } from '../components/StatusBadge';
import { FreightDocument } from '../types';
import { cn } from '../utils/cn';
import { formatDate } from '../utils/format';
import { useAppStore } from '../store/appStore';

const DOC_TYPES = ['booking_confirmation', 'shipping_instruction', 'commercial_invoice', 'packing_list', 'unclassified'];

export function IntakeQueuePage() {
  const {
    documents,
    shipments,
    loadingDocuments,
    fetchDocuments,
    fetchShipments,
    uploadDocument,
    processDocument,
    classifyDocument,
    linkDocument
  } = useAppStore();
  const [selectedId, setSelectedId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [channel, setChannel] = useState('upload');
  const [senderIdentity, setSenderIdentity] = useState('ops@shipper.com');
  const [shipmentReference, setShipmentReference] = useState('SHIP-2024-001');
  const [linkTarget, setLinkTarget] = useState('');
  const [classifyTarget, setClassifyTarget] = useState('shipping_instruction');

  useEffect(() => {
    fetchDocuments();
    fetchShipments();
    const interval = window.setInterval(fetchDocuments, 4000);
    return () => window.clearInterval(interval);
  }, [fetchDocuments, fetchShipments]);

  useEffect(() => {
    if (!selectedId && documents.length > 0) setSelectedId(documents[0].id);
  }, [documents, selectedId]);

  const selected = documents.find((document) => document.id === selectedId) || documents[0];
  const stats = useMemo(
    () => ({
      total: documents.length,
      pending: documents.filter((document) => document.status === 'pending' || document.status === 'processing').length,
      flagged: documents.filter((document) => document.status === 'flagged').length,
      processedToday: documents.filter((document) => Boolean(document.processedAt)).length
    }),
    [documents]
  );

  const onDrop = (accepted: File[]) => {
    setFile(accepted[0] || null);
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1
  });

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('channel', channel);
    formData.append('senderIdentity', senderIdentity);
    formData.append('shipmentReference', shipmentReference);
    const uploaded = await uploadDocument(formData);
    setSelectedId(uploaded.id);
    setFile(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Document Intake Queue</h1>
          <p className="text-sm text-slate-500">Processing queue for inbound freight documents</p>
        </div>
        <button
          onClick={fetchDocuments}
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Stat label="Total in Queue" value={stats.total} />
        <Stat label="Pending Processing" value={stats.pending} />
        <Stat label="Flagged" value={stats.flagged} />
        <Stat label="Processed Today" value={stats.processedToday} />
      </div>

      <div className="grid grid-cols-[420px_1fr] gap-5">
        <section className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div
              {...getRootProps()}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center',
                isDragActive ? 'border-[#E8533A] bg-orange-50' : 'border-slate-300 bg-slate-50'
              )}
            >
              <input {...getInputProps()} />
              <UploadCloud className="h-8 w-8 text-slate-500" />
              <p className="mt-2 text-sm font-medium text-slate-900">{file ? file.name : 'Drop PDF, DOCX, JPG or PNG'}</p>
              <p className="text-xs text-slate-500">Click to browse</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Channel
                <select value={channel} onChange={(event) => setChannel(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-sm normal-case tracking-normal">
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="upload">Upload</option>
                </select>
              </label>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Shipment Ref
                <input value={shipmentReference} onChange={(event) => setShipmentReference(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-sm normal-case tracking-normal" />
              </label>
              <label className="col-span-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Sender
                <input value={senderIdentity} onChange={(event) => setSenderIdentity(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-sm normal-case tracking-normal" />
              </label>
            </div>
            <button
              onClick={handleUpload}
              disabled={!file}
              className="mt-4 w-full rounded-md bg-[#1E3A5F] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Upload Document
            </button>
          </div>

          <div className="space-y-3">
            {loadingDocuments && documents.length === 0 ? (
              <>
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </>
            ) : (
              documents.map((document) => (
                <DocumentQueueItem key={document.id} document={document} selected={selected?.id === document.id} onSelect={() => setSelectedId(document.id)} />
              ))
            )}
          </div>
        </section>

        <section className="min-h-[640px] rounded-lg border border-slate-200 bg-white p-5">
          {selected ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100">
                    <FileText className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{selected.fileName}</h2>
                    <p className="text-sm text-slate-500">
                      {selected.senderIdentity} | {formatDate(selected.receivedAt, true)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <Info label="Type" value={selected.type.replace(/_/g, ' ')} />
                <Info label="Channel" value={selected.channel} />
                <Info label="Shipment" value={shipmentLabel(selected, shipments)} />
              </div>

              {!selected.shipmentId && (
                <div className="flex items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <label className="flex-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Link to Shipment
                    <select value={linkTarget} onChange={(event) => setLinkTarget(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-sm normal-case tracking-normal">
                      <option value="">Select shipment</option>
                      {shipments.map((shipment) => (
                        <option key={shipment.id} value={shipment.id}>
                          {shipment.referenceNumber}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button onClick={() => linkTarget && linkDocument(selected.id, linkTarget)} className="rounded-md bg-[#1E3A5F] px-3 py-2 text-sm font-semibold text-white">
                    Link
                  </button>
                </div>
              )}

              {selected.type === 'unclassified' && (
                <div className="flex items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <label className="flex-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Classify Document
                    <select value={classifyTarget} onChange={(event) => setClassifyTarget(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-sm normal-case tracking-normal">
                      {DOC_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button onClick={() => classifyDocument(selected.id, classifyTarget)} className="rounded-md bg-[#1E3A5F] px-3 py-2 text-sm font-semibold text-white">
                    Classify
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                {selected.status !== 'processing' && (
                  <button onClick={() => processDocument(selected.id)} className="rounded-md bg-[#E8533A] px-3 py-2 text-sm font-semibold text-white">
                    Process Document
                  </button>
                )}
                <Link to={`/documents/${selected.id}`} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                  Open Review
                </Link>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">Extracted Fields</h3>
                {selected.extractedFields.length > 0 ? (
                  selected.extractedFields.slice(0, 8).map((field) => <FieldStatusRow key={field.fieldName} field={field} />)
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">No fields extracted yet</div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">Select a document from the queue</div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium capitalize text-slate-900">{value}</p>
    </div>
  );
}

function DocumentQueueItem({ document, selected, onSelect }: { document: FreightDocument; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full rounded-lg border bg-white p-4 text-left transition-shadow hover:shadow-md',
        selected ? 'border-[#E8533A] ring-1 ring-[#E8533A]' : 'border-slate-200'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ChannelIcon channel={document.channel} />
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">{document.type.replace(/_/g, ' ')}</span>
        </div>
        <StatusBadge status={document.status} />
      </div>
      <p className="mt-3 truncate text-sm font-medium text-slate-900">{document.fileName}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span className="font-mono">{document.shipmentId || 'Unmatched'}</span>
        <span>{formatDate(document.receivedAt, true)}</span>
      </div>
    </button>
  );
}

function shipmentLabel(document: FreightDocument, shipments: { id: string; referenceNumber: string }[]) {
  return shipments.find((shipment) => shipment.id === document.shipmentId)?.referenceNumber || 'Unmatched';
}
