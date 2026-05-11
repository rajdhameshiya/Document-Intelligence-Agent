import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/api';
import type { Document } from '../types/models';
import { useAppStore } from '../store/appStore';

const color: Record<string, string> = { extracted: 'bg-green-100', low_confidence: 'bg-yellow-100', missing: 'bg-red-100', illegible: 'bg-orange-100', conflict: 'bg-purple-100' };

export default function DocumentDetailPage() {
  const { id } = useParams(); const [doc, setDoc] = useState<Document | null>(null); const [manual, setManual] = useState(''); const setToast = useAppStore((s) => s.setToast);
  const load = async () => setDoc(await api(`/api/documents/${id}`));
  useEffect(() => { load(); }, [id]);
  const resolveConflict = (fieldName: string, value: string) => {
    if (!doc || !doc.shipmentId) return; api(`/api/shipments/${doc.shipmentId}/field`, { method: 'PATCH', body: JSON.stringify({ fieldName, value }) }).then(() => { setToast('Conflict resolved and field updated'); load(); });
  };
  const acceptAll = async () => {
    if (!doc?.shipmentId) return;
    const candidates = doc.extractedFields.filter((f) => f.status === 'extracted' && f.confidence >= 90);
    await Promise.all(candidates.map((f) => api(`/api/shipments/${doc.shipmentId}/field`, { method: 'PATCH', body: JSON.stringify({ fieldName: f.fieldName, value: f.value }) })));
    setToast(`Accepted ${candidates.length} high-confidence fields`);
    load();
  };
  const flagForReview = async () => {
    if (!doc) return;
    await api(`/api/documents/${doc.id}/classify`, { method: 'POST', body: JSON.stringify({ type: doc.type }) });
    setToast('Document flagged for manual review');
    load();
  };
  if (!doc) return <div>Loading...</div>;
  return <div className='grid grid-cols-2 gap-4'>
    <div className='card'><h2 className='text-lg font-semibold mb-2'>{doc.fileName}</h2><div className='text-sm'>Channel: {doc.channel}<br/>Sender: {doc.senderIdentity}<br/>Status: {doc.status}</div></div>
    <div className='card'>
      <h2 className='text-lg font-semibold mb-2'>Extracted Fields</h2>
      <div className='space-y-2'>{doc.extractedFields.map((f) => <div key={f.fieldName} className={`p-2 rounded ${color[f.status] || ''}`}><div className='flex justify-between'><b>{f.fieldName}</b><span>{f.confidence}%</span></div><div>{String(f.value ?? '-')}</div><div className='text-xs'>{f.status}</div>{f.status === 'conflict' && <div className='mt-2 text-xs'>TMS: {f.conflictValue}<div className='flex gap-2 mt-1'><button className='px-2 py-1 bg-primary text-white rounded' onClick={() => resolveConflict(f.fieldName, String(f.value))}>Use Extracted Value</button><input className='border rounded px-1' value={manual} onChange={(e) => setManual(e.target.value)} /><button className='px-2 py-1 border rounded' onClick={() => resolveConflict(f.fieldName, manual)}>Enter Manually</button></div></div>}</div>)}</div>
      <div className='mt-4 flex gap-2'>
        <button type='button' className='bg-primary text-white px-3 py-2 rounded' onClick={acceptAll}>Accept All Extracted Fields</button>
        <button type='button' className='border px-3 py-2 rounded' onClick={load}>Review & Confirm</button>
        <button type='button' className='border px-3 py-2 rounded' onClick={flagForReview}>Flag for Manual Review</button>
      </div>
    </div>
  </div>;
}
