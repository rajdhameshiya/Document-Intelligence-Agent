import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api('/api/dashboard/manager').then(setData); }, []);
  if (!data) return <div>Loading...</div>;
  const riskClass = (risk: string) => risk === 'critical' ? 'text-red-600' : risk === 'high' ? 'text-orange-500' : risk === 'medium' ? 'text-yellow-600' : 'text-green-600';
  return <div className='space-y-4'>
    <div className='grid grid-cols-4 gap-2'>{Object.entries(data.stats).map(([k,v]) => <div key={k} className='card'><div className='text-xs uppercase text-slate-500'>{k}</div><div className='text-xl font-semibold'>{String(v)}</div></div>)}</div>
    <div className='card'><h3 className='font-semibold mb-2'>Shipment Pipeline</h3><table className='w-full text-sm'><thead><tr className='text-left border-b'><th>Ref</th><th>Exec</th><th>Status</th><th>Docs</th><th>Exceptions</th><th>Risk</th></tr></thead><tbody>{data.pipeline.map((p:any) => <tr key={p.shipmentId} className='border-b'><td><Link className='text-blue-600' to={`/shipments/${p.shipmentId}`}>{p.referenceNumber}</Link></td><td>{p.exec}</td><td>{p.status}</td><td>{p.documents}/4</td><td>{p.exceptions}</td><td className={riskClass(p.risk)}>{p.risk}</td></tr>)}</tbody></table></div>
    <div id='workload' className='card'><h3 className='font-semibold mb-2'>Exec Workload</h3>{data.execWorkload.map((w:any) => <div key={w.execName} className='text-sm border-b py-1'>{w.execName} • Shipments {w.shipments} • Docs Today {w.docsProcessedToday} • Open Exceptions {w.openExceptions} • Avg BL {w.avgBLTime} min</div>)}</div>
  </div>;
}
