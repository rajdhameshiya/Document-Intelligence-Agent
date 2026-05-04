import { AlertTriangle, BarChart3, FileStack, PackageCheck, Timer } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SeverityBadge } from '../components/SeverityBadge';
import { Skeleton } from '../components/Skeleton';
import { SLACountdown } from '../components/SLACountdown';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../store/appStore';
import { cn } from '../utils/cn';
import { formatDate } from '../utils/format';

export function ManagerDashboardPage() {
  const navigate = useNavigate();
  const { dashboardData, fetchDashboard, setRole } = useAppStore();

  useEffect(() => {
    setRole('manager');
    fetchDashboard();
  }, [fetchDashboard, setRole]);

  if (!dashboardData) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const stats = [
    { label: 'Active Shipments', value: dashboardData.stats.activeShipments, icon: PackageCheck },
    { label: 'Documents in Queue', value: dashboardData.stats.documentsInQueue, icon: FileStack },
    { label: 'Open Exceptions', value: dashboardData.stats.openExceptions, icon: AlertTriangle },
    { label: 'At Risk (< 48h)', value: dashboardData.stats.atRisk, icon: Timer }
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Manager Dashboard</h1>
        <p className="text-sm text-slate-500">Pipeline, exception pressure, and team workload</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{stat.label}</p>
              <stat.icon className="h-5 w-5 text-[#E8533A]" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <BarChart3 className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Shipment Pipeline</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Ref #</th>
              <th className="px-4 py-3">Exec</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Documents</th>
              <th className="px-4 py-3">Exceptions</th>
              <th className="px-4 py-3">Cut-off</th>
              <th className="px-4 py-3">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {dashboardData.pipeline.map((row) => (
              <tr key={row.shipment.id} onClick={() => navigate(`/shipments/${row.shipment.id}`)} className="cursor-pointer hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-medium text-slate-900">{row.shipment.referenceNumber}</td>
                <td className="px-4 py-3">{row.shipment.assignedExec}</td>
                <td className="px-4 py-3"><StatusBadge status={row.shipment.status} /></td>
                <td className="px-4 py-3">{row.documentsComplete}/{row.documentsTotal}</td>
                <td className="px-4 py-3">{row.openExceptions}{row.criticalExceptions > 0 ? ' critical' : ''}</td>
                <td className="px-4 py-3">{formatDate(row.shipment.cutoffDate, true)}</td>
                <td className="px-4 py-3"><RiskBadge risk={row.risk} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Exception Summary</h2>
          <div className="mt-3 space-y-3">
            {dashboardData.exceptionsSummary.map((exception) => (
              <div key={exception.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <SeverityBadge severity={exception.severity} />
                  <SLACountdown deadline={exception.slaDeadline} />
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">{exception.description}</p>
                <p className="text-xs text-slate-500">Assigned: {exception.assignedTo}</p>
              </div>
            ))}
          </div>
        </div>
        <div id="workload" className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Exec Workload</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2">Exec Name</th>
                <th className="py-2">Shipments</th>
                <th className="py-2">Docs Today</th>
                <th className="py-2">Open Exceptions</th>
                <th className="py-2">Avg BL Time</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.execWorkload.map((row) => (
                <tr key={row.execName} className="border-t border-slate-100">
                  <td className="py-2 font-medium">{row.execName}</td>
                  <td className="py-2">{row.shipments}</td>
                  <td className="py-2">{row.docsProcessedToday}</td>
                  <td className="py-2">{row.openExceptions}</td>
                  <td className="py-2">{row.avgBLTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const className =
    risk === 'Critical'
      ? 'bg-red-100 text-red-800'
      : risk === 'High'
        ? 'bg-orange-100 text-orange-800'
        : risk === 'Medium'
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-green-100 text-green-800';
  return <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', className)}>{risk}</span>;
}
