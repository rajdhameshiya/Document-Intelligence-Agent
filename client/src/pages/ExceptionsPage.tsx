import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import type { AppException } from '../types/models';

export default function ExceptionsPage() {
  const [rows, setRows] = useState<AppException[]>([]);
  const [filter, setFilter] = useState('all');
  const load = () => api<AppException[]>('/api/exceptions').then(setRows);
  useEffect(() => { load(); }, []);
  const visible = rows.filter((e) => filter === 'all' ? true : e.severity === filter || e.status === filter);
  const slaText = (deadline: string) => {
    const ms = new Date(deadline).getTime() - Date.now();
    const h = Math.max(0, Math.floor(ms / (1000 * 60 * 60)));
    const m = Math.max(0, Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60)));
    return `${h}h ${m}m remaining`;
  };
  return <div className='card'>
    <h2 className='text-lg font-semibold mb-3'>Exception Queue</h2>
    <div className='flex gap-2 mb-3'>
      {['all', 'critical', 'high', 'medium', 'low', 'escalated'].map((f) => <button key={f} className={`px-2 py-1 border rounded ${filter === f ? 'bg-primary text-white' : ''}`} onClick={() => setFilter(f)}>{f}</button>)}
    </div>
    {visible.map((e) => <div key={e.id} className='border p-2 rounded mb-2'><div className='font-semibold'>{e.severity.toUpperCase()} — {e.type}</div><div>{e.description}</div><div className={`text-xs ${new Date(e.slaDeadline).getTime() - Date.now() < 2 * 60 * 60 * 1000 ? 'text-red-500 font-semibold' : 'text-slate-500'}`}>SLA: {slaText(e.slaDeadline)}</div><div className='mt-1 flex gap-2'><button className='px-2 py-1 bg-primary text-white rounded' onClick={async()=>{await api(`/api/exceptions/${e.id}/resolve`,{method:'POST',body:JSON.stringify({note:'Resolved manually',actor:'Priya Sharma'})});load();}}>Resolve</button><button className='px-2 py-1 border rounded' onClick={async()=>{await api(`/api/exceptions/${e.id}/escalate`,{method:'POST',body:JSON.stringify({actor:'Manager'})});load();}}>Escalate</button></div></div>)}
  </div>;
}
