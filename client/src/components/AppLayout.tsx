import { Outlet } from 'react-router-dom';
import { RoleSwitcher } from './RoleSwitcher';
import { Sidebar } from './Sidebar';
import { ToastContainer } from './ToastContainer';

export function AppLayout() {
  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="ml-56 flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-end border-b border-slate-200 bg-white px-6">
          <RoleSwitcher />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
