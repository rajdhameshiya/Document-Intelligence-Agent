import { useAppStore } from '../store/appStore';

const ROLES = [
  { value: 'documentation_exec', label: 'Documentation Executive', user: 'Priya Sharma' },
  { value: 'cs_exec', label: 'CS Executive', user: 'Rahul Verma' },
  { value: 'manager', label: 'Manager', user: 'Suresh Menon' }
];

export function RoleSwitcher() {
  const { currentRole, setRole } = useAppStore();
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-500">View as:</span>
      <select
        value={currentRole}
        onChange={(event) => setRole(event.target.value as any)}
        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-medium"
      >
        {ROLES.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label} | {role.user}
          </option>
        ))}
      </select>
    </div>
  );
}
