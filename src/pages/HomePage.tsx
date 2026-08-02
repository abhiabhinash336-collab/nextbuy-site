import { useEffect, useRef, useState } from 'react';
import { Search, Sparkles, TrendingUp, ShieldCheck, Zap, ArrowRight, Store, Tag, Bell, BarChart3, Globe2 } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton } from '@/components/Skeletons';
import type { DatabaseProduct } from '@/types';
import type { ProductWithStats } from '@/hooks/useCatalog';
import type { Listing } from '@/types';

const CATEGORIES = [
  { name: 'Smartphones', icon: '📱', color: 'from-brand-500 to-brand-600' },
  { name: 'Laptops', icon: '💻', color: 'from-accent-500 to-accent-600' },
  { name: 'Headphones', icon: '🎧', color: 'from-success-500 to-success-600' },
  { name: 'Smartwatches', icon: '⌚', color: 'from-warning-500 to-warning-600' },
  { name: 'Cameras', icon: '📷', color: 'from-error-500 to-error-600' },
  { name: 'Gaming', icon: '🎮', color: 'from-brand-600 to-accent-600' },
];

const TRENDING = ['iPhone 15 Pro Max', 'Galaxy S24 Ultra', 'MacBook Air M3', 'WH-1000XM5', 'PS5 Slim'];

export function HomePage() {
  const { navigate } = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<DatabaseProduct[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [trending, setTrending] = useState<ProductWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from('products')
        .select('*')
        .order('popularity', { ascending: false })
        .limit(8);
      const productRows = (rows ?? []) as DatabaseProduct[];
      if (!productRows.length) { setLoading(false); return; }
      const ids = productRows.map((p) => p.id);
      const { data: lrows } = await supabase.from('product_listings').select('*').in('product_id', ids);
      const listings = (lrows ?? []) as Listing[];
      setTrending(productRows.map((p) => {
        const pListings = listings.filter((l) => l.product_id === p.id);
        const inStock = pListings.filter((l) => l.availability === 'in_stock');
        const prices = inStock.length ? inStock.map((l) => l.current_price) : pListings.map((l) => l.current_price);
        const best = inStock.sort((a, b) => a.current_price - b.current_price)[0] ?? null;
        const ratings = pListings.map((l) => l.rating);
        const reviews = pListings.map((l) => l.review_count);
        const discounts = pListings.map((l) => l.discount_percent).filter((d): d is number => d != null);
        const deliveries = pListings.map((l) => l.delivery_days).filter((d): d is number => d != null);
        return {
          ...p, lowest_price: prices.length ? Math.min(...prices) : 0, highest_price: prices.length ? Math.max(...prices) : 0,
          best_listing: best, listing_count: pListings.length, in_stock_count: inStock.length,
          avg_rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
          total_reviews: reviews.reduce((a, b) => a + b, 0),
          max_discount: discounts.length ? Math.max(...discounts) : null,
          min_delivery_days: deliveries.length ? Math.min(...deliveries) : null,
        };
      }));
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggest(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function fetchSuggestions(term: string) {
    if (!term.trim()) { setSuggestions([]); return; }
    const { data } = await supabase
      .from('products')
      .select('*')
      .or(`name.ilike.%${term}%,brand.ilike.%${term}%,category.ilike.%${term}%`)
      .limit(6);
    setSuggestions((data ?? []) as DatabaseProduct[]);
  }

  function onChange(value: string) {
    setQuery(value);
    setShowSuggest(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 180);
  }

  function submit(term: string) {
    const q = term.trim();
    setShowSuggest(false);
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
    else navigate('/search');
  }

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-light dark:bg-grid-dark [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="absolute left-1/2 top-0 -z-10 h-[480px] w-[800px] -translate-x-1/2 rounded-full bg-brand-500/20 dark:bg-brand-500/10 blur-[120px]" />
        <div className="absolute right-0 top-40 -z-10 h-[300px] w-[400px] rounded-full bg-accent-500/20 dark:bg-accent-500/10 blur-[100px]" />

        <div className="relative mx-auto max-w-4xl px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-700 dark:text-brand-300 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5" /> Compare prices from 1000+ stores worldwide
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight font-display sm:text-5xl lg:text-6xl">
            Find the <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">best deal</span>, anywhere.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-gray-600 dark:text-gray-300 sm:text-lg">
            Search any product and instantly compare prices, offers, and availability across multiple online stores — all in one place.
          </p>

          <div ref={searchRef} className="relative mx-auto mt-8 max-w-2xl">
            <form onSubmit={(e) => { e.preventDefault(); submit(query); }} className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setShowSuggest(true)}
                placeholder="Search for a product, brand, or model number…"
                className="h-14 w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 backdrop-blur-xl pl-12 pr-32 text-base shadow-lg shadow-gray-900/5 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition"
                aria-label="Search products"
              />
              <button type="submit" className="absolute right-2 top-2 btn-primary h-10 px-5">
                Search
              </button>
            </form>

            {showSuggest && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-16 z-50 glass-strong rounded-2xl shadow-xl py-2 animate-slide-down overflow-hidden">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { navigate(`/product/${s.id}`); setShowSuggest(false); setQuery(s.name); }}
                    className="flex w-full items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition text-left"
                  >
                    {s.hero_image && <img src={s.hero_image} alt="" className="h-10 w-10 rounded-lg object-cover" loading="lazy" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{s.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{s.brand} · {s.category}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Trending:</span>
            {TRENDING.map((t) => (
              <button
                key={t}
                onClick={() => navigate(`/search?q=${encodeURIComponent(t)}`)}
                className="rounded-full border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/5 px-3 py-1 text-xs text-gray-600 dark:text-gray-300 hover:border-brand-500/40 hover:text-brand-600 dark:hover:text-brand-400 transition"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((c) => (
            <button
              key={c.name}
              onClick={() => navigate(`/search?category=${encodeURIComponent(c.name)}`)}
              className="group card flex flex-col items-center gap-2 p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${c.color} text-2xl shadow-sm transition-transform group-hover:scale-110`}>
                {c.icon}
              </div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-20">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: BarChart3, title: 'Price Comparison', desc: 'See lowest, highest, and average prices across sellers at a glance.' },
            { icon: Tag, title: 'Offer Tracking', desc: 'Live coupons, cashback, flash sales, and countdown timers for every deal.' },
            { icon: Bell, title: 'Price Alerts', desc: 'Set a target price and get notified the moment it drops.' },
            { icon: ShieldCheck, title: 'Verified Sellers', desc: 'Prices from trusted marketplaces, updated in real time.' },
          ].map((f) => (
            <div key={f.title} className="card p-5 transition-all hover:shadow-md">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">{f.title}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trending products */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-20">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold font-display">
              <TrendingUp className="h-5 w-5 text-brand-600 dark:text-brand-400" /> Trending Now
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Most-searched products with the best deals today</p>
          </div>
          <button onClick={() => navigate('/search')} className="hidden btn-ghost sm:inline-flex text-sm">
            View all <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {trending.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* Stats band */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-20">
        <div className="card relative overflow-hidden p-8 sm:p-10">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-brand-500/10 to-transparent" />
          <div className="relative grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
            {[
              { icon: Store, value: '1,000+', label: 'Sellers tracked' },
              { icon: Globe2, value: '50+', label: 'Countries' },
              { icon: Zap, value: 'Real-time', label: 'Price updates' },
              { icon: ShieldCheck, value: '100%', label: 'Verified deals' },
            ].map((s) => (
              <div key={s.label}>
                <s.icon className="mx-auto h-6 w-6 text-brand-500" />
                <p className="mt-2 text-2xl font-bold font-display">{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
