export function formatPrice(price: number, currency = 'USD'): string {
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥' };
  const symbol = symbols[currency] ?? '$';
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(price);
  return `${symbol}${formatted}`;
}

export function discountPercent(original: number | null, current: number): number | null {
  if (!original || original <= current) return null;
  return Math.round(((original - current) / original) * 100);
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function availabilityLabel(status: string): string {
  switch (status) {
    case 'in_stock': return 'In Stock';
    case 'out_of_stock': return 'Out of Stock';
    case 'preorder': return 'Pre-order';
    default: return status;
  }
}

export function timeUntil(target: string | Date): { days: number; hours: number; minutes: number; seconds: number; expired: boolean } {
  const end = new Date(target).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    expired: false,
  };
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function starColor(rating: number): string {
  if (rating >= 4.5) return 'text-success-500';
  if (rating >= 4) return 'text-brand-500';
  if (rating >= 3) return 'text-warning-500';
  return 'text-error-500';
}
