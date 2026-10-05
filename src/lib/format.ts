import type { ParcelStatus } from './types';

export const STATUS_LABEL: Record<ParcelStatus, string> = {
  booked: 'Booked',
  at_sort: 'At sorting point',
  on_route: 'On the boda',
  at_agent: 'Ready at agent',
  collected: 'Collected',
};

export const STATUS_ORDER: ParcelStatus[] = ['booked', 'at_sort', 'on_route', 'at_agent', 'collected'];

export const tzs = (n: number) => `TZS ${n.toLocaleString('en-US')}`;

// 255712345678 -> 0712 345 678
export function displayPhone(phone: string) {
  const local = phone.startsWith('255') ? '0' + phone.slice(3) : phone;
  return local.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3');
}

// Accepts 0712345678, 712345678, 255712345678 or +255 712 345 678; returns 255712345678 or null.
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, '');
  if (/^0[67]\d{8}$/.test(d)) return '255' + d.slice(1);
  if (/^[67]\d{8}$/.test(d)) return '255' + d;
  if (/^255[67]\d{8}$/.test(d)) return d;
  return null;
}

export function timeOf(iso: string) {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}
