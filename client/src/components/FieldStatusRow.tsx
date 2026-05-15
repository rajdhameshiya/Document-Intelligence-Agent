import { AlertCircle, AlertTriangle, CheckCircle, GitMerge, XCircle } from 'lucide-react';
import { ExtractedField } from '../types';
import { cn } from '../utils/cn';
import { formatFieldName } from '../utils/format';

const FIELD_STATUS_CONFIG = {
  extracted: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', label: 'Extracted' },
  low_confidence: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100', label: 'Low Confidence' },
  missing: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', label: 'Missing' },
  illegible: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', label: 'Illegible' },
  conflict: { icon: GitMerge, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', label: 'Conflict' }
};

interface FieldStatusRowProps {
  field: ExtractedField;
  onResolveConflict?: (field: ExtractedField) => void;
}

export function FieldStatusRow({ field, onResolveConflict }: FieldStatusRowProps) {
  const config = FIELD_STATUS_CONFIG[field.status];
  const Icon = config.icon;

  return (
    <div className={cn('grid grid-cols-[1fr_auto] gap-4 rounded-lg border p-3', config.bg, config.border)}>
      <div className="flex min-w-0 gap-3">
        <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', config.color)} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">
            {formatFieldName(field.fieldName)}
            {field.mandatory && <span className="ml-1 text-red-500">*</span>}
          </p>
          <p className="break-words text-sm text-slate-600">{field.value === null || field.value === '' ? 'Not found' : String(field.value)}</p>
          {field.status === 'conflict' && field.conflictValue && (
            <p className="mt-1 text-xs text-purple-700">TMS value: {field.conflictValue}</p>
          )}
          {field.evidence && (
            <p className="mt-2 max-w-3xl rounded bg-white/70 px-2 py-1 text-xs text-slate-600" title={field.evidence}>
              Evidence: {field.evidence}
            </p>
          )}
          {field.reasoning && (
            <p className="mt-1 text-xs text-slate-500" title={field.reasoning}>
              Reasoning: {field.reasoning}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {field.confidence > 0 && <span className={cn('text-xs font-medium', config.color)}>{field.confidence}%</span>}
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', config.color, config.bg)}>{config.label}</span>
        {field.status === 'conflict' && onResolveConflict && (
          <button onClick={() => onResolveConflict(field)} className="text-xs font-medium text-purple-700 underline">
            Resolve
          </button>
        )}
      </div>
    </div>
  );
}
