import { Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-600' },
  processing: { label: 'Processing', className: 'bg-yellow-100 text-yellow-800' },
  processed: { label: 'Processed', className: 'bg-green-100 text-green-800' },
  flagged: { label: 'Flagged', className: 'bg-red-100 text-red-800' },
  failed: { label: 'Failed', className: 'bg-red-200 text-red-900' },
  duplicate: { label: 'Duplicate', className: 'bg-orange-100 text-orange-800' },
  open: { label: 'Open', className: 'bg-red-100 text-red-800' },
  in_review: { label: 'In Review', className: 'bg-yellow-100 text-yellow-800' },
  resolved: { label: 'Resolved', className: 'bg-green-100 text-green-800' },
  escalated: { label: 'Escalated', className: 'bg-purple-100 text-purple-800' },
  booking_confirmed: { label: 'Booking Confirmed', className: 'bg-blue-100 text-blue-800' },
  documents_pending: { label: 'Docs Pending', className: 'bg-yellow-100 text-yellow-800' },
  documents_received: { label: 'Docs Received', className: 'bg-blue-100 text-blue-800' },
  bl_draft_generated: { label: 'BL Draft Ready', className: 'bg-indigo-100 text-indigo-800' },
  bl_revision_in_progress: { label: 'BL In Revision', className: 'bg-orange-100 text-orange-800' },
  bl_approved: { label: 'BL Approved', className: 'bg-green-100 text-green-800' },
  bl_submitted: { label: 'BL Submitted', className: 'bg-teal-100 text-teal-800' }
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', config.className)}>
      {status === 'processing' && <Loader2 className="h-3 w-3 animate-spin" />}
      {config.label}
    </span>
  );
}
