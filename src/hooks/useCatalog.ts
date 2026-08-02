import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { DatabaseProduct, Listing, Filters, SortOption } from '@/types';

export interface ProductWithStats extends DatabaseProduct {
  lowest_price: number;
  highest_price: number;
  best_listing: Listing | null;
  listing_count: number;
  in_stock_count: number;
  avg_rating: number;
  total_reviews: number;
  max_discount: number | null;
  min_delivery_days: number | null;
}

interface CatalogResult {
  products: ProductWithStats[];
  total: number;
  loading: boolean;
  error: string | null;
  facets: {
    brands: string[];
    sellers: string[];
    marketplaces: string[];
    categories: string[];
    countries: string[];
    colors: string[];
  };
}

const PAGE_SIZE = 12;

export function useCatalog(query: string, filters: Filters, sort: SortOption, page: number): CatalogResult {
  const [products, setProducts] = useState<ProductWithStats[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facets, setFacets] = useState<CatalogResult['facets']>({
    brands: [], sellers: [], marketplaces: [], categories: [], countries: [], colors: [],
  });

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let dbQuery = supabase.from('products').select('*', { count: 'exact' });

      if (query.trim()) {
        const term = query.trim().replace(/[(),:]+/g, ' ').trim();
        dbQuery = dbQuery.or(
          `name.ilike.%${term}%,brand.ilike.%${term}%,category.ilike.%${term}%,model_number.ilike.%${term}%`
        );
      }

      if (filters.categories.length) dbQuery = dbQuery.in('category', filters.categories);
      if (filters.brands.length) dbQuery = dbQuery.in('brand', filters.brands);
      if (filters.minPrice != null) dbQuery = dbQuery.gte('popularity', 0);
      if (filters.colors.length) {
        const colorFilter = filters.colors.map((c) => `colors.cs.{${JSON.stringify(c)}}`).join(',');
        dbQuery = dbQuery.or(colorFilter);
      }

      const offset = (page - 1) * PAGE_SIZE;
      switch (sort) {
        case 'popular': dbQuery = dbQuery.order('popularity', { ascending: false }); break;
        case 'newest': dbQuery = dbQuery.order('created_at', { ascending: false }); break;
        case 'price_low':
        case 'price_high':
        case 'discount_high':
        case 'rating_high':
        case 'delivery_fast':
          dbQuery = dbQuery.order('popularity', { ascending: false }); break;
        default: dbQuery = dbQuery.order('popularity', { ascending: false });
      }
      dbQuery = dbQuery.range(offset, offset + PAGE_SIZE - 1);

      const { data: productRows, count, error: dbError } = await dbQuery;
      if (dbError) throw new Error(dbError.message);
      const rows = (productRows ?? []) as DatabaseProduct[];
      setTotal(count ?? 0);

      if (!rows.length) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const productIds = rows.map((r) => r.id);
      const { data: listingRows, error: lErr } = await supabase
        .from('product_listings')
        .select('*')
        .in('product_id', productIds);
      if (lErr) throw new Error(lErr.message);
      const listings = (listingRows ?? []) as Listing[];

      const enriched: ProductWithStats[] = rows.map((p) => {
        const pListings = listings.filter((l) => l.product_id === p.id);
        const inStock = pListings.filter((l) => l.availability === 'in_stock');
        const prices = inStock.length ? inStock.map((l) => l.current_price) : pListings.map((l) => l.current_price);
        const lowest = prices.length ? Math.min(...prices) : 0;
        const highest = prices.length ? Math.max(...prices) : 0;
        const best = pListings
          .filter((l) => l.availability === 'in_stock')
          .sort((a, b) => a.current_price - b.current_price)[0] ?? null;
        const ratings = pListings.map((l) => l.rating);
        const reviews = pListings.map((l) => l.review_count);
        const discounts = pListings.map((l) => l.discount_percent).filter((d): d is number => d != null);
        const deliveries = pListings.map((l) => l.delivery_days).filter((d): d is number => d != null);
        return {
          ...p,
          lowest_price: lowest,
          highest_price: highest,
          best_listing: best,
          listing_count: pListings.length,
          in_stock_count: inStock.length,
          avg_rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
          total_reviews: reviews.reduce((a, b) => a + b, 0),
          max_discount: discounts.length ? Math.max(...discounts) : null,
          min_delivery_days: deliveries.length ? Math.min(...deliveries) : null,
        };
      });

      let filtered = enriched;
      if (filters.minPrice != null) filtered = filtered.filter((p) => p.lowest_price >= filters.minPrice!);
      if (filters.maxPrice != null) filtered = filtered.filter((p) => p.lowest_price <= filters.maxPrice!);
      if (filters.sellers.length) {
        const ids = new Set(listings.filter((l) => filters.sellers.includes(l.seller_name)).map((l) => l.product_id));
        filtered = filtered.filter((p) => ids.has(p.id));
      }
      if (filters.marketplaces.length) {
        const ids = new Set(listings.filter((l) => filters.marketplaces.includes(l.marketplace)).map((l) => l.product_id));
        filtered = filtered.filter((p) => ids.has(p.id));
      }
      if (filters.minRating != null) filtered = filtered.filter((p) => p.avg_rating >= filters.minRating!);
      if (filters.minDiscount != null) filtered = filtered.filter((p) => (p.max_discount ?? 0) >= filters.minDiscount!);
      if (filters.availability.length) {
        filtered = filtered.filter((p) => {
          const pListings = listings.filter((l) => l.product_id === p.id);
          return pListings.some((l) => filters.availability.includes(l.availability));
        });
      }
      if (filters.maxDeliveryDays != null) {
        filtered = filtered.filter((p) => p.min_delivery_days != null && p.min_delivery_days <= filters.maxDeliveryDays!);
      }
      if (filters.countries.length) {
        const ids = new Set(listings.filter((l) => filters.countries.includes(l.country)).map((l) => l.product_id));
        filtered = filtered.filter((p) => ids.has(p.id));
      }

      if (sort === 'price_low') filtered.sort((a, b) => a.lowest_price - b.lowest_price);
      if (sort === 'price_high') filtered.sort((a, b) => b.lowest_price - a.lowest_price);
      if (sort === 'discount_high') filtered.sort((a, b) => (b.max_discount ?? 0) - (a.max_discount ?? 0));
      if (sort === 'rating_high') filtered.sort((a, b) => b.avg_rating - a.avg_rating);
      if (sort === 'delivery_fast') filtered.sort((a, b) => (a.min_delivery_days ?? 99) - (b.min_delivery_days ?? 99));

      setProducts(filtered);

      if (page === 1) {
        const allListings = listings;
        setFacets({
          brands: [...new Set(rows.map((r) => r.brand))].sort(),
          sellers: [...new Set(allListings.map((l) => l.seller_name))].sort(),
          marketplaces: [...new Set(allListings.map((l) => l.marketplace))].sort(),
          categories: [...new Set(rows.map((r) => r.category))].sort(),
          countries: [...new Set(allListings.map((l) => l.country))].sort(),
          colors: [...new Set(rows.flatMap((r) => r.colors))].sort(),
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load products';
      setError(msg);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [query, JSON.stringify(filters), sort, page]);

  useEffect(() => {
    const t = setTimeout(fetchPage, 120);
    return () => clearTimeout(t);
  }, [fetchPage]);

  return { products, total, loading, error, facets };
}

export { PAGE_SIZE };
