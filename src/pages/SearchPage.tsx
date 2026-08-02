import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { useCatalog } from '@/hooks/useCatalog';
import { ProductCard } from '@/components/ProductCard';
import { FilterPanel } from '@/components/FilterPanel';
import { SearchSkeletonGrid } from '@/components/Skeletons';
import { NoResults, ErrorState } from '@/components/EmptyStates';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { EMPTY_FILTERS, type Filters, type SortOption } from '@/types';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'price_low', label: 'Lowest Price' },
  { value: 'price_high', label: 'Highest Price' },
  { value: 'discount_high', label: 'Biggest Discount' },
  { value: 'rating_high', label: 'Best Rating' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'New Arrivals' },
  { value: 'delivery_fast', label: 'Fastest Delivery' },
];

export function SearchPage() {
  const { route, navigate } = useRouter();
  const { session } = useAuth();
  const query = route.query.get('q') ?? '';
  const categoryParam = route.query.get('category');

  const [searchInput, setSearchInput] = useState(query);
  const [filters, setFilters] = useState<Filters>(() =>
    categoryParam ? { ...EMPTY_FILTERS, categories: [categoryParam] } : EMPTY_FILTERS
  );
  const [sort, setSort] = useState<SortOption>('relevance');
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<ReturnType<typeof useCatalog>['products']>([]);
  const [accumulating, setAccumulating] = useState(false);

  useEffect(() => { setSearchInput(query); }, [query]);
  useEffect(() => {
    if (categoryParam && !filters.categories.includes(categoryParam)) {
      setFilters((f) => ({ ...f, categories: [categoryParam] }));
    } else if (!categoryParam && filters.categories.length === 1 && filters.categories[0] === route.query.get('category')) {
      setFilters((f) => ({ ...f, categories: [] }));
    }
  }, [categoryParam]);

  const { products, total, loading, error, facets } = useCatalog(query, filters, sort, page);

  useEffect(() => {
    if (page === 1) {
      setAllProducts(products);
    } else {
      setAllProducts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...products.filter((p) => !ids.has(p.id))];
      });
    }
    setAccumulating(false);
  }, [products]);

  useEffect(() => { setPage(1); }, [query, JSON.stringify(filters), sort]);

  useEffect(() => {
    if (query.trim() && session) {
      supabase.from('search_history').insert({ query: query.trim() }).then(({ error: e }) => {
        if (e) console.error('search history insert failed:', e.message);
      });
    }
  }, [query, session]);

  const hasMore = allProducts.length < total && allProducts.length > 0;

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchInput.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  }

  function loadMore() {
    if (hasMore && !loading) {
      setAccumulating(true);
      setPage((p) => p + 1);
    }
  }

  const visibleProducts = page === 1 ? products : allProducts;
  const showInfinite = page > 1 || hasMore;
  const grid = useMemo(() => visibleProducts, [visibleProducts]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Search bar */}
      <form onSubmit={submitSearch} className="relative mb-5 max-w-2xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search products, brands, models…"
          className="input pl-10 h-11"
        />
      </form>

      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {query ? <>Results for "<span className="text-brand-600 dark:text-brand-400">{query}</span>"</> : 'All Products'}
          </h1>
          {!loading && <span className="text-sm text-gray-500 dark:text-gray-400">{total} found</span>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="btn-secondary lg:hidden h-9 px-3 py-0 text-sm"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="appearance-none rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 pl-3 pr-9 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <FilterPanel filters={filters} onChange={setFilters} facets={facets} mobileOpen={mobileFiltersOpen} onCloseMobile={() => setMobileFiltersOpen(false)} />

        <div className="min-w-0 flex-1">
          {loading && page === 1 ? (
            <SearchSkeletonGrid />
          ) : error ? (
            <ErrorState message={error} onRetry={() => setFilters({ ...filters })} />
          ) : grid.length === 0 ? (
            <NoResults query={query} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {grid.map((p) => <ProductCard key={p.id} product={p} />)}
                {accumulating && Array.from({ length: 4 }).map((_, i) => (
                  <div key={`sk-${i}`} className="hidden sm:block"><div className="card overflow-hidden"><div className="skeleton aspect-[4/3] w-full" /><div className="p-4 space-y-2"><div className="skeleton h-4 w-full rounded" /><div className="skeleton h-5 w-24 rounded" /></div></div></div>
                ))}
              </div>

              {showInfinite && (
                <div className="mt-8 flex justify-center">
                  {hasMore ? (
                    <button onClick={loadMore} disabled={loading} className="btn-secondary">
                      {loading ? 'Loading…' : 'Load more products'}
                    </button>
                  ) : (
                    <p className="text-sm text-gray-400">You've reached the end</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
