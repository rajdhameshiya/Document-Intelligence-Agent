import axios from 'axios';
import { create } from 'zustand';
import {
  AuditEvent,
  BLDraft,
  FreightDocument,
  FreightException,
  ManagerDashboard,
  Shipment,
  Toast
} from '../types';

export const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
const api = axios.create({ baseURL: API_URL });

type Role = 'documentation_exec' | 'cs_exec' | 'manager';

interface AppState {
  currentRole: Role;
  currentUser: string;
  setRole: (role: Role) => void;
  shipments: Shipment[];
  loadingShipments: boolean;
  fetchShipments: () => Promise<void>;
  createShipment: (payload: Partial<Shipment>) => Promise<void>;
  updateShipmentField: (shipmentId: string, field: string, value: any) => Promise<void>;
  documents: FreightDocument[];
  loadingDocuments: boolean;
  fetchDocuments: () => Promise<void>;
  uploadDocument: (formData: FormData) => Promise<FreightDocument>;
  processDocument: (documentId: string) => Promise<void>;
  classifyDocument: (documentId: string, documentType: string) => Promise<void>;
  linkDocument: (documentId: string, shipmentId: string) => Promise<void>;
  resolveDocumentField: (
    documentId: string,
    fieldName: string,
    action: 'keep_tms' | 'use_document' | 'manual',
    value?: string | number | null
  ) => Promise<void>;
  exceptions: FreightException[];
  loadingExceptions: boolean;
  fetchExceptions: () => Promise<void>;
  resolveException: (exceptionId: string, resolution: { action: string; value?: any; note?: string }) => Promise<void>;
  escalateException: (exceptionId: string) => Promise<void>;
  auditEvents: AuditEvent[];
  fetchAuditForShipment: (shipmentId: string) => Promise<void>;
  dashboardData: ManagerDashboard | null;
  fetchDashboard: () => Promise<void>;
  generateBLDraft: (shipmentId: string) => Promise<BLDraft | null>;
  reviseBLDraft: (shipmentId: string, payload: { field: string; correctedValue: string; reason: string }) => Promise<void>;
  approveBLDraft: (shipmentId: string) => Promise<void>;
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentRole: 'documentation_exec',
  currentUser: 'Priya Sharma',

  setRole: (role) => {
    const userMap: Record<Role, string> = {
      documentation_exec: 'Priya Sharma',
      cs_exec: 'Rahul Verma',
      manager: 'Suresh Menon'
    };
    set({ currentRole: role, currentUser: userMap[role] });
  },

  shipments: [],
  loadingShipments: false,
  fetchShipments: async () => {
    set({ loadingShipments: true });
    try {
      const res = await api.get('/api/shipments');
      set({ shipments: res.data.data });
    } catch {
      get().addToast({ type: 'error', message: 'Failed to load shipments' });
    } finally {
      set({ loadingShipments: false });
    }
  },

  createShipment: async (payload) => {
    try {
      await api.post('/api/shipments', { ...payload, actor: get().currentUser });
      await get().fetchShipments();
      get().addToast({ type: 'success', message: 'Shipment created' });
    } catch {
      get().addToast({ type: 'error', message: 'Failed to create shipment' });
    }
  },

  updateShipmentField: async (shipmentId, field, value) => {
    try {
      await api.patch(`/api/shipments/${shipmentId}/field`, { field, value, actor: get().currentUser });
      await get().fetchShipments();
      await get().fetchAuditForShipment(shipmentId);
      get().addToast({ type: 'success', message: `Field "${field}" updated` });
    } catch {
      get().addToast({ type: 'error', message: 'Failed to update field' });
    }
  },

  documents: [],
  loadingDocuments: false,
  fetchDocuments: async () => {
    set({ loadingDocuments: true });
    try {
      const res = await api.get('/api/documents');
      set({ documents: res.data.data });
    } catch {
      get().addToast({ type: 'error', message: 'Failed to load documents' });
    } finally {
      set({ loadingDocuments: false });
    }
  },

  uploadDocument: async (formData) => {
    const res = await api.post('/api/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    await get().fetchDocuments();
    get().addToast({ type: 'success', message: 'Document uploaded and processing started' });
    setTimeout(() => {
      get().fetchDocuments();
      get().fetchExceptions();
    }, 3600);
    return res.data.data;
  },

  processDocument: async (documentId) => {
    try {
      await api.post(`/api/documents/${documentId}/process`);
      await get().fetchDocuments();
      await get().fetchExceptions();
      await get().fetchShipments();
      get().addToast({ type: 'success', message: 'Document processed' });
    } catch {
      get().addToast({ type: 'error', message: 'Document processing failed' });
    }
  },

  classifyDocument: async (documentId, documentType) => {
    await api.post(`/api/documents/${documentId}/classify`, { documentType, actor: get().currentUser });
    await get().fetchDocuments();
    get().addToast({ type: 'success', message: 'Document classified' });
  },

  linkDocument: async (documentId, shipmentId) => {
    await api.post(`/api/documents/${documentId}/link`, { shipmentId, actor: get().currentUser });
    await get().fetchDocuments();
    get().addToast({ type: 'success', message: 'Document linked to shipment' });
  },

  resolveDocumentField: async (documentId, fieldName, action, value = null) => {
    await api.post(`/api/documents/${documentId}/resolve-field`, {
      fieldName,
      action,
      value,
      actor: get().currentUser
    });
    await get().fetchDocuments();
    await get().fetchShipments();
    get().addToast({ type: 'success', message: 'Field resolved' });
  },

  exceptions: [],
  loadingExceptions: false,
  fetchExceptions: async () => {
    set({ loadingExceptions: true });
    try {
      const res = await api.get('/api/exceptions');
      set({ exceptions: res.data.data });
    } catch {
      get().addToast({ type: 'error', message: 'Failed to load exceptions' });
    } finally {
      set({ loadingExceptions: false });
    }
  },

  resolveException: async (exceptionId, resolution) => {
    try {
      await api.post(`/api/exceptions/${exceptionId}/resolve`, { ...resolution, resolvedBy: get().currentUser });
      await get().fetchExceptions();
      await get().fetchShipments();
      await get().fetchDocuments();
      get().addToast({ type: 'success', message: 'Exception resolved' });
    } catch {
      get().addToast({ type: 'error', message: 'Failed to resolve exception' });
    }
  },

  escalateException: async (exceptionId) => {
    try {
      await api.post(`/api/exceptions/${exceptionId}/escalate`, { actor: get().currentUser });
      await get().fetchExceptions();
      get().addToast({ type: 'warning', message: 'Exception escalated to manager' });
    } catch {
      get().addToast({ type: 'error', message: 'Failed to escalate exception' });
    }
  },

  auditEvents: [],
  fetchAuditForShipment: async (shipmentId) => {
    const res = await api.get(`/api/audit/shipment/${shipmentId}`);
    set({ auditEvents: res.data.data });
  },

  dashboardData: null,
  fetchDashboard: async () => {
    try {
      const res = await api.get('/api/dashboard/manager');
      set({ dashboardData: res.data.data });
    } catch {
      get().addToast({ type: 'error', message: 'Failed to load dashboard' });
    }
  },

  generateBLDraft: async (shipmentId) => {
    try {
      const res = await api.post(`/api/shipments/${shipmentId}/generate-bl`);
      await get().fetchShipments();
      await get().fetchAuditForShipment(shipmentId);
      get().addToast({ type: 'success', message: `BL Draft v${res.data.data.version} generated` });
      return res.data.data;
    } catch {
      get().addToast({ type: 'error', message: 'BL generation blocked' });
      return null;
    }
  },

  reviseBLDraft: async (shipmentId, payload) => {
    await api.post(`/api/shipments/${shipmentId}/bl/revision`, { ...payload, actor: get().currentUser });
    await get().fetchShipments();
    await get().fetchAuditForShipment(shipmentId);
    get().addToast({ type: 'success', message: 'BL revision applied' });
  },

  approveBLDraft: async (shipmentId) => {
    await api.post(`/api/shipments/${shipmentId}/bl/approve`, { actor: get().currentUser });
    await get().fetchShipments();
    await get().fetchAuditForShipment(shipmentId);
    get().addToast({ type: 'success', message: 'BL Draft sent to shipper for review' });
  },

  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2, 11);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => get().removeToast(id), 4000);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  }
}));
