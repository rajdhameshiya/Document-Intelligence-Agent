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

export function truncateMiddle(value: string, maxLength = 34): string {
  if (value.length <= maxLength) return value;

  const extensionMatch = value.match(/(\.[a-z0-9]{2,8})$/i);
  const extension = extensionMatch?.[1] || '';
  const name = extension ? value.slice(0, -extension.length) : value;
  const available = Math.max(maxLength - extension.length - 3, 8);
  const startLength = Math.ceil(available * 0.6);
  const endLength = Math.floor(available * 0.4);

  return `${name.slice(0, startLength)}...${name.slice(Math.max(name.length - endLength, startLength))}${extension}`;
}
