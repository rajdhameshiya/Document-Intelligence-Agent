import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

const navByRole = {
  'Documentation Executive': [ ['Intake Queue', '/intake'], ['Shipments', '/shipments'], ['Exceptions', '/exceptions'], ['Dashboard', '/dashboard'] ],
  Manager: [ ['Dashboard (Manager)', '/dashboard'], ['Shipments', '/shipments'], ['Exceptions', '/exceptions'], ['Team Workload', '/dashboard#workload'] ],
  'CS Executive': [ ['Shipments', '/shipments'], ['Dashboard', '/dashboard'] ]
} as const;

export default function Layout() {
  const location = useLocation();
  const { role, setRole, toast } = useAppStore();
  return <div className='flex min-h-screen'>
    <aside className='w-64 bg-primary text-white p-4'>
      <h1 className='text-xl font-semibold mb-8'>Shipmnts</h1>
      <nav className='space-y-2'>
        {navByRole[role].map(([name, to]) => <Link key={to} to={to} className={`block p-2 rounded ${location.pathname === to ? 'bg-white/20' : ''}`}>{name}</Link>)}
      </nav>
      <div className='mt-8 text-sm'>Logged in as: Priya Sharma<br/>Role: {role}</div>
    </aside>
    <main className='flex-1 p-6'>
      <div className='flex justify-end gap-3 mb-4'>
        <select className='border rounded px-2 py-1' value={role} onChange={(e) => setRole(e.target.value as any)}>
          <option>Documentation Executive</option><option>Manager</option><option>CS Executive</option>
        </select>
      </div>
      {toast && <div className='mb-3 bg-green-100 text-green-700 p-2 rounded'>{toast}</div>}
      <Outlet />
    </main>
  </div>;
}
