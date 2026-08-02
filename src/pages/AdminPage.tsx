import { useEffect, useState } from 'react';
import {
  Shield, Users, Package, Search, AlertTriangle, TrendingUp, Star,
  DollarSign, Store, BarChart3, Trash2, CheckCircle2, XCircle, Eye,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { EmptyState, ErrorState } from '@/components/EmptyStates';
import { formatPrice, formatDate, timeAgo, cn } from '@/lib/utils';
import type { Profile, DatabaseProduct, ReportedIssue } from '@/types';

type Tab = 'overview' | 'users' | 'products' | 'reports';

export function AdminPage() {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { navigate } = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState({ users: 0, products: 0, listings: 0, searches: 0, reports: 0, avgPrice: 0 });
  const [topProducts, setTopProducts] = useState<{ name: string; brand: string; listings: number; lowest: number }[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [products, setProducts] = useState<DatabaseProduct[]>([]);
  const [reports, setReports] = useState<ReportedIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!session || !isAdmin)) { navigate('/'); return; }
    if (!session || !isAdmin) return;
    (async () => {
      try {
        const [u, p, l, s, r] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('products').select('*', { count: 'exact', head: true }),
          supabase.from('product_listings').select('current_price', { count: 'exact' }),
          supabase.from('search_history').select('*', { count: 'exact', head: true }),
          supabase.from('reported_issues').select('*', { count: 'exact', head: true }),
        ]);
        const listingPrices = (l.data ?? []).map((row) => Number(row.current_price));
        setStats({
          users: u.count ?? 0, products: p.count ?? 0, listings: l.count ?? 0,
          searches: s.count ?? 0, reports: r.count ?? 0,
          avgPrice: listingPrices.length ? listingPrices.reduce((a, b) => a + b, 0) / listingPrices.length : 0,
        });

        const { data: topRows } = await supabase.from('products').select('*').order('popularity', { ascending: false }).limit(5);
        const topIds = (topRows ?? []).map((row) => (row as DatabaseProduct).id);
        if (topIds.length) {
          const { data: topListings } = await supabase.from('product_listings').select('*').in('product_id', topIds);
          const tl = topListings ?? [];
          setTopProducts((topRows as DatabaseProduct[]).map((prod) => {
            const pL = (tl as { product_id: string; availability: string; current_price: number }[]).filter((x) => x.product_id === prod.id);
            const inStock = pL.filter((x) => x.availability === 'in_stock');
            const prices = inStock.length ? inStock.map((x) => x.current_price) : pL.map((x) => x.current_price);
            return { name: prod.name, brand: prod.brand, listings: pL.length, lowest: prices.length ? Math.min(...prices) : 0 };
          }));
        }
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load admin data');
        setLoading(false);
      }
    })();
  }, [session, isAdmin, authLoading, navigate]);

  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers((data ?? []) as Profile[]);
  }
  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    setProducts((data ?? []) as DatabaseProduct[]);
  }
  async function loadReports() {
    const { data } = await supabase.from('reported_issues').select('*').order('created_at', { ascending: false });
    setReports((data ?? []) as ReportedIssue[]);
  }

  useEffect(() => {
    if (tab === 'users' && !users.length) loadUsers();
    if (tab === 'products' && !products.length) loadProducts();
    if (tab === 'reports' && !reports.length) loadReports();
  }, [tab]);

  if (authLoading) return <div className="grid place-items-center py-20"><div className="skeleton h-8 w-8 rounded-full" /></div>;
  if (!session || !isAdmin) return null;

  if (loading) return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="skeleton h-8 w-48 rounded mb-6" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
    </div>
  );
  if (error) return <div className="mx-auto max-w-3xl px-4 py-20"><ErrorState message={error} /></div>;

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'reports', label: 'Reports', icon: AlertTriangle },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-warning-500/10 text-warning-500"><Shield className="h-5 w-5" /></div>
        <div>
          <h1 className="text-2xl font-bold font-display">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Monitor and manage your platform</p>
        </div>
      </div>

      <div className="mt-6 flex gap-1 border-b border-gray-200 dark:border-white/10 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn('relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition whitespace-nowrap',
              tab === t.id ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200')}
          >
            <t.icon className="h-4 w-4" /> {t.label}
            {t.id === 'reports' && stats.reports > 0 && <span className="badge bg-error-500/10 text-error-600 dark:text-error-400">{stats.reports}</span>}
            {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'overview' && (
          <div className="animate-fade-in-fast space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard icon={Users} label="Users" value={stats.users} color="text-brand-500" />
              <StatCard icon={Package} label="Products" value={stats.products} color="text-accent-500" />
              <StatCard icon={Store} label="Listings" value={stats.listings} color="text-success-500" />
              <StatCard icon={Search} label="Searches" value={stats.searches} color="text-warning-500" />
              <StatCard icon={AlertTriangle} label="Reports" value={stats.reports} color="text-error-500" />
              <StatCard icon={DollarSign} label="Avg Price" value={formatPrice(stats.avgPrice)} color="text-brand-500" />
            </div>

            <div className="card p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <TrendingUp className="h-4 w-4 text-brand-500" /> Top Products by Popularity
              </h3>
              <div className="mt-4 space-y-3">
                {topProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-gray-100 dark:bg-white/5 text-xs font-bold text-gray-500">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.brand} · {p.listings} listings</p>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(p.lowest)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="animate-fade-in-fast">
            {users.length === 0 ? <EmptyState icon={<Users className="h-8 w-8" />} title="No users yet" /> : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5 text-left text-xs uppercase text-gray-500">
                      <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3 hidden sm:table-cell">Country</th><th className="px-4 py-3 hidden sm:table-cell">Joined</th></tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-t border-gray-100 dark:border-white/5">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-xs font-bold text-white">{u.display_name.charAt(0).toUpperCase()}</div>
                              <span className="font-medium text-gray-900 dark:text-white">{u.display_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('badge', u.role === 'admin' ? 'bg-warning-500/10 text-warning-600 dark:text-warning-400' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300')}>{u.role}</span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell text-gray-500">{u.country}</td>
                          <td className="px-4 py-3 hidden sm:table-cell text-gray-500">{formatDate(u.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'products' && (
          <div className="animate-fade-in-fast">
            {products.length === 0 ? <EmptyState icon={<Package className="h-8 w-8" />} title="No products" /> : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5 text-left text-xs uppercase text-gray-500">
                      <tr><th className="px-4 py-3">Product</th><th className="px-4 py-3 hidden sm:table-cell">Category</th><th className="px-4 py-3 hidden md:table-cell">Popularity</th><th className="px-4 py-3">Action</th></tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p.id} className="border-t border-gray-100 dark:border-white/5">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {p.hero_image && <img src={p.hero_image} alt="" className="h-8 w-8 rounded-lg object-cover" />}
                              <div><p className="font-medium text-gray-900 dark:text-white">{p.name}</p><p className="text-xs text-gray-400">{p.brand}</p></div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell text-gray-500">{p.category}</td>
                          <td className="px-4 py-3 hidden md:table-cell"><div className="flex items-center gap-1 text-gray-500"><Star className="h-3 w-3 text-amber-400 fill-amber-400" /> {p.popularity}</div></td>
                          <td className="px-4 py-3">
                            <button onClick={() => navigate(`/product/${p.id}`)} className="btn-ghost px-2 py-1 text-xs"><Eye className="h-3.5 w-3.5" /> View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'reports' && (
          <div className="animate-fade-in-fast">
            {reports.length === 0 ? <EmptyState icon={<CheckCircle2 className="h-8 w-8" />} title="No reported issues" description="Everything looks clean — no user reports to review." /> : (
              <div className="space-y-3">
                {reports.map((r) => (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="badge bg-error-500/10 text-error-600 dark:text-error-400">{r.reason}</span>
                          <span className={cn('badge', r.status === 'open' ? 'bg-warning-500/10 text-warning-600 dark:text-warning-400' : r.status === 'resolved' ? 'bg-success-500/10 text-success-600 dark:text-success-400' : 'bg-gray-100 dark:bg-white/5 text-gray-500')}>{r.status}</span>
                        </div>
                        {r.details && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{r.details}</p>}
                        <p className="mt-2 text-xs text-gray-400">{timeAgo(r.created_at)}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={async () => { await supabase.from('reported_issues').update({ status: 'resolved' }).eq('id', r.id); loadReports(); toast('Issue resolved', 'success'); }} className="grid h-8 w-8 place-items-center rounded-lg text-success-500 hover:bg-success-50 dark:hover:bg-success-500/10" aria-label="Resolve"><CheckCircle2 className="h-4 w-4" /></button>
                        <button onClick={async () => { await supabase.from('reported_issues').update({ status: 'dismissed' }).eq('id', r.id); loadReports(); toast('Issue dismissed', 'info'); }} className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5" aria-label="Dismiss"><XCircle className="h-4 w-4" /></button>
                        <button onClick={async () => { await supabase.from('reported_issues').delete().eq('id', r.id); loadReports(); toast('Report deleted', 'info'); }} className="grid h-8 w-8 place-items-center rounded-lg text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Shield; label: string; value: number | string; color: string }) {
  return (
    <div className="card p-4">
      <Icon className={cn('h-5 w-5', color)} />
      <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
