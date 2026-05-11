import { create } from 'zustand';
import type { Role } from '../types/models';

interface AppState { role: Role; setRole: (role: Role) => void; toast?: string; setToast: (msg?: string) => void; }
export const useAppStore = create<AppState>((set) => ({ role: 'Documentation Executive', setRole: (role) => set({ role }), toast: undefined, setToast: (msg) => set({ toast: msg }) }));
