import { format } from 'date-fns';

export function formatDate(value?: string, withTime = false): string {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return format(date, withTime ? 'dd MMM yyyy HH:mm' : 'dd MMM yyyy');
}

export function formatFieldName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (letter) => letter.toUpperCase())
    .trim();
}

export function formatMoney(currency?: string, value?: number): string {
  if (!value) return 'N/A';
  return `${currency || 'USD'} ${value.toLocaleString()}`;
}
