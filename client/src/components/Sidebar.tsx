import { AlertTriangle, Inbox, LayoutDashboard, Package, Ship } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { cn } from '../utils/cn';

const NAV_ITEMS = [
  { path: '/intake', label: 'Intake Queue', icon: Inbox, roles: ['documentation_exec', 'cs_exec', 'manager'] },
  { path: '/shipments', label: 'Shipments', icon: Package, roles: ['documentation_exec', 'cs_exec', 'manager'] },
  { path: '/exceptions', label: 'Exceptions', icon: AlertTriangle, roles: ['documentation_exec', 'cs_exec', 'manager'] },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['manager'] }
];

export function Sidebar() {
  const { currentRole, currentUser } = useAppStore();
  return (
    <aside className="fixed left-0 top-0 flex h-screen w-56 flex-col bg-[#1E3A5F]">
      <div className="border-b border-blue-950 px-4 py-5">
        <div className="flex items-center gap-2">
          <Ship className="h-6 w-6 text-[#E8533A]" />
          <span className="text-lg font-bold text-white">Shipmnts</span>
        </div>
        <p className="mt-1 text-xs text-blue-200">Document Intelligence</p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.filter((item) => item.roles.includes(currentRole)).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-[#E8533A] text-white' : 'text-blue-100 hover:bg-blue-900 hover:text-white'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-blue-950 px-4 py-4">
        <p className="text-sm font-medium text-white">{currentUser}</p>
        <p className="text-xs capitalize text-blue-200">{currentRole.replace(/_/g, ' ')}</p>
      </div>
    </aside>
  );
}
