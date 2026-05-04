import { Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../store/appStore';
import { Shipment } from '../types';
import { cn } from '../utils/cn';
import { formatDate } from '../utils/format';

const STATUSES = ['all', 'documents_pending', 'documents_received', 'bl_draft_generated', 'bl_revision_in_progress', 'bl_approved'];

export function ShipmentsPage() {
  const navigate = useNavigate();
  const { shipments, fetchShipments, createShipment } = useAppStore();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [exec, setExec] = useState('all');
  const [line, setLine] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<Partial<Shipment>>({
    shippingLine: 'Maersk',
    assignedExec: 'Priya Sharma',
    cutoffDate: new Date().toISOString(),
    sailingDate: new Date().toISOString()
  });

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const execs = Array.from(new Set(shipments.map((shipment) => shipment.assignedExec)));
  const lines = Array.from(new Set(shipments.map((shipment) => shipment.shippingLine)));
  const filtered = useMemo(
    () =>
      shipments.filter((shipment) => {
        const matchesQuery = [shipment.referenceNumber, shipment.shipperName, shipment.consigneeName].some((value) =>
          String(value || '').toLowerCase().includes(query.toLowerCase())
        );
        return matchesQuery && (status === 'all' || shipment.status === status) && (exec === 'all' || shipment.assignedExec === exec) && (line === 'all' || shipment.shippingLine === line);
      }),
    [shipments, query, status, exec, line]
  );

  const submitShipment = async () => {
    await createShipment(form);
    setShowNew(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Shipments</h1>
          <p className="text-sm text-slate-500">All shipment records with documentation status</p>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 rounded-md bg-[#1E3A5F] px-3 py-2 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" />
          New Shipment
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="relative min-w-72 flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reference, shipper, consignee" className="w-full rounded-md border border-slate-200 py-2 pl-9 pr-3 text-sm" />
        </div>
        <Filter value={status} onChange={setStatus} options={STATUSES} />
        <Filter value={exec} onChange={setExec} options={['all', ...execs]} />
        <Filter value={line} onChange={setLine} options={['all', ...lines]} />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Ref #</th>
              <th className="px-4 py-3">Exec</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Documents</th>
              <th className="px-4 py-3">Shipping Line</th>
              <th className="px-4 py-3">Cut-off</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((shipment) => (
              <tr key={shipment.id} onClick={() => navigate(`/shipments/${shipment.id}`)} className="cursor-pointer hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-medium text-slate-900">{shipment.referenceNumber}</td>
                <td className="px-4 py-3">{shipment.assignedExec}</td>
                <td className="px-4 py-3"><StatusBadge status={shipment.status} /></td>
                <td className="px-4 py-3">{Object.values(shipment.documentsReceived).filter(Boolean).length}/4</td>
                <td className="px-4 py-3">{shipment.shippingLine}</td>
                <td className="px-4 py-3">{formatDate(shipment.cutoffDate, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40">
          <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Create Shipment</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {['referenceNumber', 'shippingLine', 'assignedExec', 'bookingReferenceNumber', 'vesselName', 'voyageNumber', 'portOfLoading', 'portOfDischarge', 'containerType'].map((field) => (
                <label key={field} className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {field.replace(/([A-Z])/g, ' $1')}
                  <input value={String(form[field] || '')} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm normal-case tracking-normal" />
                </label>
              ))}
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Container Count
                <input type="number" value={String(form.containerCount || '')} onChange={(event) => setForm({ ...form, containerCount: Number(event.target.value) })} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm normal-case tracking-normal" />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold">Cancel</button>
              <button onClick={submitShipment} className="rounded-md bg-[#1E3A5F] px-3 py-2 text-sm font-semibold text-white">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Filter({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={cn('rounded-md border border-slate-200 bg-white px-3 py-2 text-sm capitalize')}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option.replace(/_/g, ' ')}
        </option>
      ))}
    </select>
  );
}
