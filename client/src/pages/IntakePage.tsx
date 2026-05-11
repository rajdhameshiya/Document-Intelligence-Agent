import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, api } from '../utils/api';
import type { Document, Shipment } from '../types/models';
import { useAppStore } from '../store/appStore';

export default function IntakePage() {
  const [documents, setDocuments] = useState<Document[]>([]); const [shipments, setShipments] = useState<Shipment[]>([]); const [file, setFile] = useState<File | null>(null);
  const [channel, setChannel] = useState<'email'|'whatsapp'|'upload'>('upload'); const [senderIdentity, setSender] = useState(''); const [shipmentId, setShipmentId] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [classification, setClassification] = useState<string>('shipping_instruction');
  const [linkShipmentId, setLinkShipmentId] = useState<string>('');
  const setToast = useAppStore((s) => s.setToast);
  const reload = async () => { setDocuments(await api('/api/documents')); setShipments(await api('/api/shipments')); };
  useEffect(() => { reload(); const i=setInterval(reload,2000); return ()=>clearInterval(i); }, []);
  const stats = useMemo(() => ({ total: documents.length, pending: documents.filter((d) => ['pending','processing'].includes(d.status)).length, flagged: documents.filter((d) => d.status === 'flagged').length, processed: documents.filter((d) => d.status === 'processed').length }), [documents]);
  const selectedDocument = documents.find((d) => d.id === selectedDocumentId) || documents[0];
  const selectedShipment = shipments.find((s) => s.id === selectedDocument?.shipmentId);

  const onUpload = async () => {
    if (!file) return;
    const fd = new FormData(); fd.append('file', file); fd.append('channel', channel); fd.append('senderIdentity', senderIdentity); if (shipmentId) fd.append('shipmentId', shipmentId);
    const res = await fetch(`${API_URL}/api/documents/upload`, { method: 'POST', body: fd }); const json = await res.json();
    if (json.success) { setToast('Document uploaded and processing started'); setSelectedDocumentId(json.data.id); reload(); }
  };

  const processSelected = async () => {
    if (!selectedDocument) return;
    await api(`/api/documents/${selectedDocument.id}/process`, { method: 'POST' });
    setToast('Document processed — extraction pipeline completed');
    reload();
  };

  const classifySelected = async () => {
    if (!selectedDocument) return;
    await api(`/api/documents/${selectedDocument.id}/classify`, {
      method: 'POST',
      body: JSON.stringify({ type: classification })
    });
    setToast(`Document classified as ${classification}`);
    reload();
  };

  const linkSelected = async () => {
    if (!selectedDocument || !linkShipmentId) return;
    await api(`/api/documents/${selectedDocument.id}/link`, {
      method: 'POST',
      body: JSON.stringify({ shipmentId: linkShipmentId })
    });
    setToast('Document linked to shipment');
    reload();
  };

  return <div className='grid grid-cols-3 gap-4'>
    <div className='col-span-3 card'><h2 className='text-lg font-semibold mb-3'>Upload Document</h2>
      <div className='grid grid-cols-5 gap-2'>
        <input type='file' className='col-span-2 border p-2 rounded' onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <select className='border p-2 rounded' value={channel} onChange={(e) => setChannel(e.target.value as any)}><option value='email'>Email</option><option value='whatsapp'>WhatsApp</option><option value='upload'>Upload</option></select>
        <input className='border p-2 rounded' placeholder='Sender identity' value={senderIdentity} onChange={(e) => setSender(e.target.value)} />
        <select className='border p-2 rounded' value={shipmentId} onChange={(e) => setShipmentId(e.target.value)}><option value=''>Link shipment (optional)</option>{shipments.map((s) => <option key={s.id} value={s.id}>{s.referenceNumber}</option>)}</select>
      </div><button onClick={onUpload} className='mt-3 bg-primary text-white px-4 py-2 rounded'>Upload</button>
    </div>
    <div className='col-span-3 grid grid-cols-4 gap-2'>{Object.entries(stats).map(([k,v]) => <div key={k} className='card'><div className='text-xs uppercase text-slate-500'>{k}</div><div className='text-xl font-semibold'>{v}</div></div>)}</div>
    <div className='col-span-2 card space-y-2'>
      {documents.map((d) => (
        <button
          type='button'
          key={d.id}
          onClick={() => setSelectedDocumentId(d.id)}
          className={`block w-full text-left border rounded p-2 hover:bg-slate-50 ${selectedDocument?.id === d.id ? 'border-primary bg-slate-50' : ''}`}
        >
          <div className='flex justify-between'><b>{d.fileName}</b><span>{d.status}</span></div>
          <div className='text-sm text-slate-500'>{d.type} • {d.channel}</div>
        </button>
      ))}
    </div>
    <div className='card'>
      {!selectedDocument && <p className='text-sm text-slate-600'>Select a document to view details.</p>}
      {selectedDocument && (
        <div className='space-y-3'>
          <h3 className='font-semibold'>Document Details</h3>
          <div className='text-sm text-slate-600'>
            <div><b>File:</b> {selectedDocument.fileName}</div>
            <div><b>Channel:</b> {selectedDocument.channel}</div>
            <div><b>Sender:</b> {selectedDocument.senderIdentity}</div>
            <div><b>Shipment:</b> {selectedShipment?.referenceNumber || 'Unmatched'}</div>
          </div>
          {!selectedDocument.shipmentId && (
            <div className='space-y-2'>
              <select className='w-full border rounded p-2' value={linkShipmentId} onChange={(e) => setLinkShipmentId(e.target.value)}>
                <option value=''>Link to shipment</option>
                {shipments.map((s) => <option key={s.id} value={s.id}>{s.referenceNumber}</option>)}
              </select>
              <button type='button' className='w-full border rounded px-3 py-2' onClick={linkSelected}>Link Document</button>
            </div>
          )}
          {selectedDocument.type === 'unclassified' && (
            <div className='space-y-2'>
              <select className='w-full border rounded p-2' value={classification} onChange={(e) => setClassification(e.target.value)}>
                <option value='booking_confirmation'>Booking Confirmation</option>
                <option value='shipping_instruction'>Shipping Instruction</option>
                <option value='commercial_invoice'>Commercial Invoice</option>
                <option value='packing_list'>Packing List</option>
                <option value='unclassified'>Unclassified</option>
              </select>
              <button type='button' className='w-full border rounded px-3 py-2' onClick={classifySelected}>Classify Document</button>
            </div>
          )}
          {selectedDocument.status === 'pending' && <button type='button' className='w-full bg-primary text-white rounded px-3 py-2' onClick={processSelected}>Process Document</button>}
          <Link className='block text-center w-full border rounded px-3 py-2' to={`/documents/${selectedDocument.id}`}>Open Extraction Review</Link>
        </div>
      )}
    </div>
  </div>;
}
