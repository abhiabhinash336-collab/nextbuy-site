import { Heart, MapPin, Truck, Tag, Store, ChevronRight } from 'lucide-react';
import type { ProductWithStats } from '@/hooks/useCatalog';
import { useWishlist } from '@/hooks/useWishlist';
import { useToast } from '@/context/ToastContext';
import { StarRating } from '@/components/StarRating';
import { formatPrice, discountPercent, availabilityLabel, cn } from '@/lib/utils';
import { useRouter } from '@/lib/router';

interface ProductCardProps {
  product: ProductWithStats;
  onNavigate?: (path: string) => void;
}

export function ProductCard({ product, onNavigate }: ProductCardProps) {
  const { navigate } = useRouter();
  const { wishlistIds, toggle, isSignedIn } = useWishlist();
  const { toast } = useToast();
  const go = onNavigate ?? navigate;

  const wished = wishlistIds.has(product.id);
  const best = product.best_listing;
  const discount = best ? discountPercent(best.original_price, best.current_price) : product.max_discount;

  async function handleWish(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isSignedIn) {
      toast('Sign in to save products to your wishlist', 'info');
      go('/signin');
      return;
    }
    const nowWished = await toggle(product.id);
    toast(nowWished ? 'Added to wishlist' : 'Removed from wishlist', nowWished ? 'success' : 'info');
  }

  return (
    <article
      onClick={() => go(`/product/${product.id}`)}
      className="group card overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/5 dark:hover:shadow-black/30 hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-white/5">
        {product.hero_image ? (
          <img
            src={product.hero_image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            <Store className="h-10 w-10" />
          </div>
        )}
        {discount != null && discount > 0 && (
          <span className="absolute left-3 top-3 badge bg-error-500 text-white shadow-sm">
            <Tag className="h-3 w-3" />-{discount}%
          </span>
        )}
        <button
          onClick={handleWish}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 dark:bg-black/40 backdrop-blur transition-all hover:scale-110"
        >
          <Heart className={cn('h-4 w-4 transition-all', wished ? 'fill-error-500 text-error-500' : 'text-gray-600 dark:text-gray-300')} />
        </button>
      </div>

      <div className="p-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-brand-600 dark:text-brand-400">{product.brand}</span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">{product.category}</span>
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
          {product.name}
        </h3>

        {best && (
          <div className="mt-2 flex items-end gap-2">
            <span className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(best.current_price, best.currency)}</span>
            {best.original_price && (
              <span className="text-xs text-gray-400 line-through">{formatPrice(best.original_price, best.currency)}</span>
            )}
          </div>
        )}

        <div className="mt-2 flex items-center gap-3">
          <StarRating rating={product.avg_rating} showNumber reviewCount={product.total_reviews} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
          {best && (
            <span className="inline-flex items-center gap-1">
              <Store className="h-3 w-3" /> {best.seller_name}
            </span>
          )}
          {product.min_delivery_days != null && (
            <span className="inline-flex items-center gap-1">
              <Truck className="h-3 w-3" /> {product.min_delivery_days}d delivery
            </span>
          )}
          {best && (
            <span className={cn(
              'inline-flex items-center gap-1 font-medium',
              best.availability === 'in_stock' ? 'text-success-600 dark:text-success-400'
                : best.availability === 'preorder' ? 'text-warning-600 dark:text-warning-400'
                : 'text-error-500'
            )}>
              <MapPin className="h-3 w-3" /> {availabilityLabel(best.availability)}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-3">
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            {product.listing_count} sellers
          </span>
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-brand-600 dark:text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity">
            Compare <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
