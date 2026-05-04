import { AlertTriangle, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { SeverityBadge } from '../components/SeverityBadge';
import { SLACountdown } from '../components/SLACountdown';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../store/appStore';
import { FreightException } from '../types';
import { cn } from '../utils/cn';
import { formatFieldName } from '../utils/format';

const FILTERS = ['all', 'critical', 'high', 'medium', 'low', 'my', 'escalated'];

export function ExceptionsPage() {
  const { exceptions, shipments, currentUser, fetchExceptions, fetchShipments, resolveException, escalateException } = useAppStore();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<FreightException | null>(null);
  const [action, setAction] = useState('use_document');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    fetchExceptions();
    fetchShipments();
  }, [fetchExceptions, fetchShipments]);

  const filtered = useMemo(
    () =>
      exceptions.filter((exception) => {
        if (filter === 'all') return exception.status !== 'resolved';
        if (filter === 'my') return exception.assignedTo === currentUser && exception.status !== 'resolved';
        if (filter === 'escalated') return exception.status === 'escalated';
        return exception.severity === filter && exception.status !== 'resolved';
      }),
    [exceptions, filter, currentUser]
  );

  const confirmResolve = async () => {
    if (!selected) return;
    await resolveException(selected.id, { action, value, note });
    setSelected(null);
    setValue('');
    setNote('');
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Exception Queue</h1>
        <p className="text-sm text-slate-500">Operational exceptions sorted by SLA deadline</p>
      </div>

      <div className="flex gap-2 rounded-lg border border-slate-200 bg-white p-2">
        {FILTERS.map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={cn('rounded-md px-3 py-2 text-sm font-medium capitalize', filter === item ? 'bg-[#1E3A5F] text-white' : 'text-slate-600 hover:bg-slate-100')}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((exception) => {
          const shipment = shipments.find((item) => item.id === exception.shipmentId);
          return (
            <div key={exception.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={exception.severity} />
                      <StatusBadge status={exception.status} />
                      <span className="font-mono text-xs text-slate-500">{shipment?.referenceNumber || 'Unmatched'}</span>
                    </div>
                    <h2 className="mt-2 text-sm font-semibold text-slate-900">{exception.description}</h2>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-sm text-slate-600">
                      <span>Field: {exception.fieldName ? formatFieldName(exception.fieldName) : 'N/A'}</span>
                      <span>Assigned: {exception.assignedTo}</span>
                      {exception.existingValue && <span>TMS Value: "{exception.existingValue}"</span>}
                      {exception.conflictingValue && <span>Doc Value: "{exception.conflictingValue}"</span>}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-3">
                  <SLACountdown deadline={exception.slaDeadline} />
                  <div className="flex gap-2">
                    <button onClick={() => setSelected(exception)} className="inline-flex items-center gap-1 rounded-md bg-[#1E3A5F] px-3 py-2 text-sm font-semibold text-white">
                      <CheckCircle2 className="h-4 w-4" />
                      Resolve
                    </button>
                    <button onClick={() => escalateException(exception.id)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                      <ArrowUpRight className="h-4 w-4" />
                      Escalate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Resolve Exception</h3>
            <p className="mt-1 text-sm text-slate-500">{selected.description}</p>
            <div className="mt-4 space-y-2 text-sm">
              {selected.existingValue && <p>TMS current value: <span className="font-medium">{selected.existingValue}</span></p>}
              {selected.conflictingValue && <p>Document value: <span className="font-medium">{selected.conflictingValue}</span></p>}
              <label className="flex items-center gap-2">
                <input type="radio" checked={action === 'keep_tms'} onChange={() => setAction('keep_tms')} />
                Keep TMS value
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={action === 'use_document'} onChange={() => setAction('use_document')} />
                Use document value
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={action === 'manual'} onChange={() => setAction('manual')} />
                Enter correct value
              </label>
              {action === 'manual' && <input value={value} onChange={(event) => setValue(event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />}
              <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Resolution note" className="h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setSelected(null)} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold">Cancel</button>
              <button onClick={confirmResolve} className="rounded-md bg-[#1E3A5F] px-3 py-2 text-sm font-semibold text-white">Confirm Resolution</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
