const API_URL = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || 'http://localhost:3001';
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const hasFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: hasFormData ? init?.headers : { 'Content-Type': 'application/json', ...(init?.headers || {}) }
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'API error');
  return json.data as T;
}
export { API_URL };
