import { useEffect, useState } from 'react';
import { Bell, Trash2, TrendingDown, CheckCircle2, Target } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { EmptyState } from '@/components/EmptyStates';
import { formatPrice, timeAgo, cn } from '@/lib/utils';
import type { PriceAlert, DatabaseProduct, Listing } from '@/types';

interface AlertWithProduct extends PriceAlert {
  product: DatabaseProduct;
  current_lowest: number;
  currency: string;
}

export function AlertsPage() {
  const { session } = useAuth();
  const { toast } = useToast();
  const { navigate } = useRouter();
  const [alerts, setAlerts] = useState<AlertWithProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) { navigate('/signin'); return; }
    (async () => {
      const { data: aRows } = await supabase
        .from('price_alerts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      const aList = (aRows ?? []) as PriceAlert[];
      if (!aList.length) { setAlerts([]); setLoading(false); return; }
      const ids = aList.map((a) => a.product_id);
      const [{ data: pRows }, { data: lRows }] = await Promise.all([
        supabase.from('products').select('*').in('id', ids),
        supabase.from('product_listings').select('*').in('product_id', ids),
      ]);
      const products = (pRows ?? []) as DatabaseProduct[];
      const listings = (lRows ?? []) as Listing[];
      const enriched = aList.map((a) => {
        const product = products.find((p) => p.id === a.product_id);
        const pL = listings.filter((l) => l.product_id === a.product_id);
        const inStock = pL.filter((l) => l.availability === 'in_stock');
        const prices = inStock.length ? inStock.map((l) => l.current_price) : pL.map((l) => l.current_price);
        const lowest = prices.length ? Math.min(...prices) : 0;
        return { ...a, product: product!, current_lowest: lowest, currency: a.currency };
      }).filter((a) => a.product);
      setAlerts(enriched);
      setLoading(false);
    })();
  }, [session, navigate]);

  if (!session) return null;

  async function removeAlert(id: string) {
    const { error } = await supabase.from('price_alerts').delete().eq('id', id);
    if (error) { toast('Failed to remove alert', 'error'); return; }
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    toast('Alert removed', 'info');
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <h1 className="flex items-center gap-2 text-2xl font-bold font-display">
        <Bell className="h-6 w-6 text-brand-500" /> Price Alerts
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        We'll notify you when a product's price drops below your target.
      </p>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 w-full rounded-2xl" />)}
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={<Target className="h-8 w-8" />}
          title="No price alerts yet"
          description="Set a target price on any product and we'll let you know the moment it drops."
          action={<button onClick={() => navigate('/search')} className="btn-primary">Browse products</button>}
        />
      ) : (
        <div className="mt-6 space-y-3">
          {alerts.map((a) => {
            const triggered = a.current_lowest > 0 && a.current_lowest <= a.target_price;
            const above = a.current_lowest > a.target_price;
            const diff = Math.abs(a.current_lowest - a.target_price);
            return (
              <div key={a.id} className="card p-4 flex items-center gap-4">
                <button onClick={() => navigate(`/product/${a.product_id}`)} className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-white/5">
                  {a.product.hero_image && <img src={a.product.hero_image} alt="" className="h-full w-full object-cover" />}
                </button>
                <div className="min-w-0 flex-1">
                  <button onClick={() => navigate(`/product/${a.product_id}`)} className="block text-left">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400">{a.product.name}</p>
                  </button>
                  <p className="text-xs text-gray-400">{a.product.brand} · set {timeAgo(a.created_at)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                      <Target className="h-3 w-3" /> Target: <span className="font-medium text-gray-700 dark:text-gray-200">{formatPrice(a.target_price, a.currency)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                      Current: <span className={cn('font-medium', triggered ? 'text-success-600 dark:text-success-400' : 'text-gray-700 dark:text-gray-200')}>{a.current_lowest > 0 ? formatPrice(a.current_lowest, a.currency) : '—'}</span>
                    </span>
                    {triggered ? (
                      <span className="badge bg-success-500/10 text-success-600 dark:text-success-400"><CheckCircle2 className="h-3 w-3" /> Target reached!</span>
                    ) : above ? (
                      <span className="inline-flex items-center gap-1 text-gray-400"><TrendingDown className="h-3 w-3" /> {formatPrice(diff, a.currency)} to go</span>
                    ) : null}
                  </div>
                </div>
                <button onClick={() => removeAlert(a.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 transition" aria-label="Remove alert">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
