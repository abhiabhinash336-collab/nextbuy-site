import { useEffect, useState } from 'react';
import { Heart, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { ProductCard } from '@/components/ProductCard';
import { SearchSkeletonGrid } from '@/components/Skeletons';
import { EmptyState } from '@/components/EmptyStates';
import type { DatabaseProduct, Listing } from '@/types';
import type { ProductWithStats } from '@/hooks/useCatalog';
import { useWishlist } from '@/hooks/useWishlist';

export function WishlistPage() {
  const { session } = useAuth();
  const { wishlistIds, toggle, refresh } = useWishlist();
  const { toast } = useToast();
  const { navigate } = useRouter();
  const [items, setItems] = useState<ProductWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) { navigate('/signin'); return; }
    (async () => {
      const { data: wRows } = await supabase
        .from('wishlist')
        .select('product_id')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      const ids = (wRows ?? []).map((w) => w.product_id as string);
      if (!ids.length) { setItems([]); setLoading(false); return; }
      const { data: pRows } = await supabase.from('products').select('*').in('id', ids);
      const products = (pRows ?? []) as DatabaseProduct[];
      const { data: lRows } = await supabase.from('product_listings').select('*').in('product_id', ids);
      const listings = (lRows ?? []) as Listing[];
      setItems(products.map((p) => {
        const pL = listings.filter((l) => l.product_id === p.id);
        const inStock = pL.filter((l) => l.availability === 'in_stock');
        const prices = inStock.length ? inStock.map((l) => l.current_price) : pL.map((l) => l.current_price);
        const best = inStock.sort((a, b) => a.current_price - b.current_price)[0] ?? null;
        const ratings = pL.map((l) => l.rating);
        const reviews = pL.map((l) => l.review_count);
        const discounts = pL.map((l) => l.discount_percent).filter((d): d is number => d != null);
        const deliveries = pL.map((l) => l.delivery_days).filter((d): d is number => d != null);
        return {
          ...p, lowest_price: prices.length ? Math.min(...prices) : 0, highest_price: prices.length ? Math.max(...prices) : 0,
          best_listing: best, listing_count: pL.length, in_stock_count: inStock.length,
          avg_rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
          total_reviews: reviews.reduce((a, b) => a + b, 0),
          max_discount: discounts.length ? Math.max(...discounts) : null,
          min_delivery_days: deliveries.length ? Math.min(...deliveries) : null,
        };
      }));
      setLoading(false);
    })();
  }, [session, navigate, wishlistIds.size]);

  if (!session) return null;

  async function remove(id: string) {
    await toggle(id);
    toast('Removed from wishlist', 'info');
    refresh();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <h1 className="flex items-center gap-2 text-2xl font-bold font-display">
        <Heart className="h-6 w-6 text-error-500" /> Your Wishlist
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{items.length} saved {items.length === 1 ? 'product' : 'products'}</p>

      {loading ? (
        <SearchSkeletonGrid count={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-8 w-8" />}
          title="Your wishlist is empty"
          description="Save products you're interested in to track their prices and get notified about deals."
          action={<button onClick={() => navigate('/search')} className="btn-primary">Browse products</button>}
        />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((p) => (
            <div key={p.id} className="relative">
              <ProductCard product={p} />
              <button
                onClick={() => remove(p.id)}
                className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/90 dark:bg-black/40 backdrop-blur text-gray-500 hover:text-error-500 transition shadow-sm"
                aria-label="Remove from wishlist"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
