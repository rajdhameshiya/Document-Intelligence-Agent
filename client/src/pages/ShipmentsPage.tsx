import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import type { Shipment } from '../types/models';

export default function ShipmentsPage() {
  const [rows, setRows] = useState<Shipment[]>([]); const [q, setQ] = useState('');
  useEffect(() => { api<Shipment[]>('/api/shipments').then(setRows); }, []);
  const filtered = rows.filter((s) => `${s.referenceNumber} ${s.shipperName || ''} ${s.consigneeName || ''}`.toLowerCase().includes(q.toLowerCase()));
  return <div className='card'><div className='flex justify-between mb-3'><h2 className='text-lg font-semibold'>All Shipments</h2><input className='border rounded px-2' placeholder='Search' value={q} onChange={(e) => setQ(e.target.value)} /></div>
    <table className='w-full text-sm'><thead><tr className='text-left border-b'><th>Ref</th><th>Exec</th><th>Status</th><th>Cutoff</th></tr></thead><tbody>{filtered.map((s) => <tr key={s.id} className='border-b hover:bg-slate-50'><td><Link className='text-blue-600' to={`/shipments/${s.id}`}>{s.referenceNumber}</Link></td><td>{s.assignedExec}</td><td>{s.status}</td><td>{new Date(s.cutoffDate).toLocaleDateString()}</td></tr>)}</tbody></table></div>;
}
