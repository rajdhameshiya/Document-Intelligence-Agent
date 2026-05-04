import { cn } from '../utils/cn';

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-800 border border-red-200' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-800 border border-orange-200' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800 border border-yellow-200' },
  low: { label: 'Low', className: 'bg-slate-100 text-slate-600 border border-slate-200' }
};

export function SeverityBadge({ severity }: { severity: string }) {
  const config = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.low;
  return <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', config.className)}>{config.label}</span>;
}
