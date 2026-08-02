import { useEffect, useState } from 'react';
import {
  ArrowLeft, Heart, Bell, Store, Truck, MapPin, Tag, ShieldCheck, Star,
  ChevronRight, CheckCircle2, XCircle, Clock, Copy, MessageSquare, ChevronDown,
  TrendingDown, BarChart3, Sparkles, AlertCircle,
} from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
import { useToast } from '@/context/ToastContext';
import { StarRating } from '@/components/StarRating';
import { PriceChart, type PriceHistoryPoint } from '@/components/PriceChart';
import { Countdown } from '@/components/Countdown';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState, ErrorState } from '@/components/EmptyStates';
import {
  formatPrice, discountPercent, availabilityLabel, timeAgo, formatDate, cn,
} from '@/lib/utils';
import type {
  DatabaseProduct, Listing, Offer, Review, Faq, PricePoint,
} from '@/types';
import type { ProductWithStats } from '@/hooks/useCatalog';

const OFFER_STYLES: Record<Offer['type'], { bg: string; text: string; label: string }> = {
  coupon: { bg: 'bg-brand-500/10', text: 'text-brand-600 dark:text-brand-400', label: 'Coupon' },
  cashback: { bg: 'bg-success-500/10', text: 'text-success-600 dark:text-success-400', label: 'Cashback' },
  bank: { bg: 'bg-accent-500/10', text: 'text-accent-600 dark:text-accent-400', label: 'Bank Offer' },
  festival: { bg: 'bg-warning-500/10', text: 'text-warning-600 dark:text-warning-400', label: 'Festival Sale' },
  flash: { bg: 'bg-error-500/10', text: 'text-error-600 dark:text-error-400', label: 'Flash Sale' },
  deal: { bg: 'bg-brand-500/10', text: 'text-brand-600 dark:text-brand-400', label: 'Deal' },
};

export function ProductPage({ productId }: { productId: string }) {
  const { navigate } = useRouter();
  const { session } = useAuth();
  const { wishlistIds, toggle } = useWishlist();
  const { toast } = useToast();
  const [product, setProduct] = useState<DatabaseProduct | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [similar, setSimilar] = useState<ProductWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState<'specs' | 'reviews' | 'faqs' | 'similar'>('specs');
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', body: '' });
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Incorrect price');
  const [reportDetails, setReportDetails] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data: p, error: pe } = await supabase.from('products').select('*').eq('id', productId).maybeSingle();
        if (pe) throw pe;
        if (!p) { setError('Product not found'); setLoading(false); return; }
        if (!active) return;
        setProduct(p as DatabaseProduct);

        const [lRes, oRes, rRes, fRes, hRes] = await Promise.all([
          supabase.from('product_listings').select('*').eq('product_id', productId),
          supabase.from('offers').select('*').eq('product_id', productId),
          supabase.from('reviews').select('*').eq('product_id', productId).order('created_at', { ascending: false }),
          supabase.from('faqs').select('*').eq('product_id', productId),
          supabase.from('price_history').select('*').eq('product_id', productId).order('recorded_at', { ascending: true }),
        ]);
        if (!active) return;
        setListings((lRes.data ?? []) as Listing[]);
        setOffers((oRes.data ?? []) as Offer[]);
        setReviews((rRes.data ?? []) as Review[]);
        setFaqs((fRes.data ?? []) as Faq[]);
        setHistory((hRes.data ?? []) as PricePoint[]);

        const { data: simRows } = await supabase
          .from('products').select('*').eq('category', (p as DatabaseProduct).category).neq('id', productId).limit(4);
        const sim = (simRows ?? []) as DatabaseProduct[];
        if (sim.length) {
          const { data: simListings } = await supabase.from('product_listings').select('*').in('product_id', sim.map((s) => s.id));
          const sl = (simListings ?? []) as Listing[];
          setSimilar(sim.map((s) => {
            const pL = sl.filter((l) => l.product_id === s.id);
            const inStock = pL.filter((l) => l.availability === 'in_stock');
            const prices = inStock.length ? inStock.map((l) => l.current_price) : pL.map((l) => l.current_price);
            const best = inStock.sort((a, b) => a.current_price - b.current_price)[0] ?? null;
            const ratings = pL.map((l) => l.rating);
            const reviewsCount = pL.map((l) => l.review_count);
            const discounts = pL.map((l) => l.discount_percent).filter((d): d is number => d != null);
            const deliveries = pL.map((l) => l.delivery_days).filter((d): d is number => d != null);
            return {
              ...s, lowest_price: prices.length ? Math.min(...prices) : 0, highest_price: prices.length ? Math.max(...prices) : 0,
              best_listing: best, listing_count: pL.length, in_stock_count: inStock.length,
              avg_rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
              total_reviews: reviewsCount.reduce((a, b) => a + b, 0),
              max_discount: discounts.length ? Math.max(...discounts) : null,
              min_delivery_days: deliveries.length ? Math.min(...deliveries) : null,
            };
          }));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load product';
        if (active) setError(msg);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [productId]);

  const wished = wishlistIds.has(productId);
  const inStockListings = listings.filter((l) => l.availability === 'in_stock');
  const sortedListings = [...listings].sort((a, b) => {
    if (a.availability === 'in_stock' && b.availability !== 'in_stock') return -1;
    if (b.availability === 'in_stock' && a.availability !== 'in_stock') return 1;
    return a.current_price - b.current_price;
  });
  const bestListing = sortedListings[0];
  const prices = inStockListings.length ? inStockListings.map((l) => l.current_price) : listings.map((l) => l.current_price);
  const lowest = prices.length ? Math.min(...prices) : 0;
  const highest = prices.length ? Math.max(...prices) : 0;
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const allRatings = listings.map((l) => l.rating);
  const avgRating = allRatings.length ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;
  const totalReviews = listings.reduce((a, b) => a + b.review_count, 0);
  const gallery = product ? [product.hero_image, ...product.gallery].filter(Boolean) as string[] : [];

  async function handleWish() {
    if (!session) { toast('Sign in to save to your wishlist', 'info'); navigate('/signin'); return; }
    const nowWished = await toggle(productId);
    toast(nowWished ? 'Added to wishlist' : 'Removed from wishlist', nowWished ? 'success' : 'info');
  }

  async function handleCreateAlert() {
    if (!session) { toast('Sign in to set price alerts', 'info'); navigate('/signin'); return; }
    const tp = Number(targetPrice);
    if (!tp || tp <= 0) { toast('Enter a valid target price', 'error'); return; }
    const { error: e } = await supabase.from('price_alerts').insert({ product_id: productId, target_price: tp, currency: product?.base_currency ?? 'USD' });
    if (e) { toast(e.message.includes('duplicate') ? 'Alert already exists for this product' : 'Failed to create alert', 'error'); return; }
    toast(`Alert set! We'll notify you when the price drops below ${formatPrice(tp)}`, 'success');
    setShowAlertModal(false);
    setTargetPrice('');
  }

  async function submitReview() {
    if (!session) { toast('Sign in to write a review', 'info'); navigate('/signin'); return; }
    if (!reviewForm.title.trim()) { toast('Add a review title', 'error'); return; }
    const name = session.user.email?.split('@')[0] ?? 'User';
    const { data, error: e } = await supabase.from('reviews').insert({
      product_id: productId, user_name: name, rating: reviewForm.rating, title: reviewForm.title.trim(), body: reviewForm.body.trim() || null,
    }).select('*').single();
    if (e) { toast('Failed to post review', 'error'); return; }
    setReviews((prev) => [data as Review, ...prev]);
    setReviewForm({ rating: 5, title: '', body: '' });
    toast('Review posted!', 'success');
  }

  async function submitReport() {
    if (!session) { toast('Sign in to report an issue', 'info'); return; }
    const { error: e } = await supabase.from('reported_issues').insert({ product_id: productId, reason: reportReason, details: reportDetails.trim() || null });
    if (e) { toast('Failed to submit report', 'error'); return; }
    toast('Report submitted. Our team will review it.', 'success');
    setReportOpen(false);
    setReportDetails('');
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast(`Copied "${code}" to clipboard`, 'success');
  }

  if (loading) return <ProductDetailSkeleton />;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-20"><ErrorState message={error} onRetry={() => navigate('/search')} /></div>;
  if (!product) return null;

  const chartData: PriceHistoryPoint[] = history.map((h) => ({ date: h.recorded_at, price: Number(h.price) }));
  const discount = bestListing ? discountPercent(bestListing.original_price, bestListing.current_price) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
      <button onClick={() => navigate('/search')} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition">
        <ArrowLeft className="h-4 w-4" /> Back to search
      </button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="card overflow-hidden aspect-square bg-gray-50 dark:bg-white/5">
            {gallery[activeImage] && (
              <img src={gallery[activeImage]} alt={product.name} className="h-full w-full object-cover animate-fade-in-fast" />
            )}
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
              {gallery.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={cn('h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition', activeImage === i ? 'border-brand-500' : 'border-transparent opacity-60 hover:opacity-100')}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-brand-600 dark:text-brand-400">{product.brand}</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500 dark:text-gray-400">{product.category}</span>
            {product.model_number && <span className="text-gray-400">· {product.model_number}</span>}
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight font-display sm:text-3xl">{product.name}</h1>

          <div className="mt-3 flex items-center gap-3">
            <StarRating rating={avgRating} size={16} showNumber reviewCount={totalReviews} />
            <span className="text-sm text-gray-400">·</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{listings.length} sellers</span>
          </div>

          {bestListing && (
            <div className="mt-5 card p-5">
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{formatPrice(bestListing.current_price, bestListing.currency)}</span>
                {bestListing.original_price && (
                  <span className="text-base text-gray-400 line-through">{formatPrice(bestListing.original_price, bestListing.currency)}</span>
                )}
                {discount != null && discount > 0 && (
                  <span className="badge bg-error-500 text-white">-{discount}%</span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Best price at <span className="font-medium text-gray-700 dark:text-gray-200">{bestListing.seller_name}</span> · {availabilityLabel(bestListing.availability)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => bestListing.product_url && window.open(bestListing.product_url, '_blank')} className="btn-primary">
                  <Store className="h-4 w-4" /> View Deal
                </button>
                <button onClick={handleWish} className="btn-secondary">
                  <Heart className={cn('h-4 w-4', wished && 'fill-error-500 text-error-500')} /> {wished ? 'Saved' : 'Save'}
                </button>
                <button onClick={() => setShowAlertModal(true)} className="btn-secondary">
                  <Bell className="h-4 w-4" /> Set Alert
                </button>
              </div>
            </div>
          )}

          {/* Price comparison summary */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <PriceStat label="Lowest" value={formatPrice(lowest, product.base_currency)} icon={<TrendingDown className="h-4 w-4 text-success-500" />} />
            <PriceStat label="Average" value={formatPrice(avg, product.base_currency)} icon={<BarChart3 className="h-4 w-4 text-brand-500" />} />
            <PriceStat label="Highest" value={formatPrice(highest, product.base_currency)} icon={<TrendingDown className="h-4 w-4 rotate-180 text-error-500" />} />
          </div>

          {product.features.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Key Features</h3>
              <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {product.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-500" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Offers */}
      {offers.length > 0 && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-lg font-bold font-display"><Tag className="h-5 w-5 text-brand-500" /> Active Offers & Deals</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((o) => {
              const style = OFFER_STYLES[o.type];
              const endingSoon = o.end_date && new Date(o.end_date).getTime() - Date.now() < 86400000 * 2;
              return (
                <div key={o.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <span className={cn('badge', style.bg, style.text)}>{style.label}</span>
                    {o.is_limited_time && o.end_date && (
                      <span className={cn('inline-flex items-center gap-1 text-xs font-medium', endingSoon ? 'text-error-500' : 'text-gray-400')}>
                        <Clock className="h-3 w-3" /> <Countdown target={o.end_date} compact />
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{o.title}</h3>
                  {o.description && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{o.description}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    {o.code ? (
                      <button onClick={() => copyCode(o.code!)} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 dark:border-white/20 px-2.5 py-1 text-xs font-mono font-medium text-gray-700 dark:text-gray-200 hover:border-brand-500 hover:text-brand-600 transition">
                        <Copy className="h-3 w-3" /> {o.code}
                      </button>
                    ) : <span className="text-xs text-gray-400">{o.discount_value ?? ''}</span>}
                    <span className="text-[11px] text-gray-400">
                      {o.start_date && formatDate(o.start_date)}{o.end_date ? ` – ${formatDate(o.end_date)}` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Limited-time offer countdown banner */}
      {offers.some((o) => o.is_limited_time && o.end_date && new Date(o.end_date).getTime() > Date.now()) && (() => {
        const flash = offers.find((o) => o.type === 'flash' && o.end_date && new Date(o.end_date).getTime() > Date.now()) ?? offers.find((o) => o.is_limited_time && o.end_date);
        if (!flash?.end_date) return null;
        return (
          <div className="mt-4 card overflow-hidden p-5 bg-gradient-to-r from-error-500/10 to-warning-500/10 border-error-500/20">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-error-500/20 text-error-500">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{flash.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Hurry, this offer expires soon!</p>
                </div>
              </div>
              <Countdown target={flash.end_date} />
            </div>
          </div>
        );
      })()}

      {/* Tabs */}
      <section className="mt-10">
        <div className="flex gap-1 border-b border-gray-200 dark:border-white/10 overflow-x-auto no-scrollbar">
          {([
            { id: 'specs', label: 'Specifications', count: Object.keys(product.specs).length },
            { id: 'reviews', label: 'Reviews', count: reviews.length },
            { id: 'faqs', label: 'FAQs', count: faqs.length },
            { id: 'similar', label: 'Similar Products', count: similar.length },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'relative px-4 py-2.5 text-sm font-medium transition whitespace-nowrap',
                activeTab === t.id ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              )}
            >
              {t.label} {t.count > 0 && <span className="text-gray-400">({t.count})</span>}
              {activeTab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === 'specs' && (
            <div className="animate-fade-in-fast">
              {product.description && <p className="mb-5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{product.description}</p>}
              {Object.keys(product.specs).length > 0 ? (
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(product.specs).map(([key, val], i) => (
                        <tr key={key} className={i % 2 === 0 ? 'bg-gray-50/50 dark:bg-white/[0.02]' : ''}>
                          <td className="w-1/3 px-4 py-3 font-medium text-gray-700 dark:text-gray-300 capitalize">{key.replace(/_/g, ' ')}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-sm text-gray-400">No specifications listed.</p>}

              {/* Color / size / storage options */}
              <div className="mt-5 space-y-3">
                {product.colors.length > 0 && <OptionRow label="Colors" values={product.colors} />}
                {product.sizes.length > 0 && <OptionRow label="Sizes" values={product.sizes} />}
                {product.storage_options.length > 0 && <OptionRow label="Storage" values={product.storage_options} />}
                {product.ram_options.length > 0 && <OptionRow label="RAM" values={product.ram_options} />}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="animate-fade-in-fast space-y-5">
              {/* Write a review */}
              {session && (
                <div className="card p-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Write a Review</h4>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-sm text-gray-500">Your rating:</span>
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button key={r} onClick={() => setReviewForm((f) => ({ ...f, rating: r }))}>
                        <Star className={cn('h-5 w-5 transition', r <= reviewForm.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-white/20')} />
                      </button>
                    ))}
                  </div>
                  <input className="input mt-3" placeholder="Review title" value={reviewForm.title} onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))} />
                  <textarea className="input mt-2 min-h-20" placeholder="Share your experience… (optional)" value={reviewForm.body} onChange={(e) => setReviewForm((f) => ({ ...f, body: e.target.value }))} />
                  <button onClick={submitReview} className="btn-primary mt-3">Post Review</button>
                </div>
              )}
              {reviews.length ? reviews.map((r) => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-xs font-bold text-white">
                        {r.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{r.user_name}</p>
                        <StarRating rating={r.rating} size={12} />
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{timeAgo(r.created_at)}</span>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-gray-800 dark:text-gray-100">{r.title}</h4>
                  {r.body && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{r.body}</p>}
                </div>
              )) : <EmptyState icon={<MessageSquare className="h-8 w-8" />} title="No reviews yet" description="Be the first to share your experience with this product." />}
            </div>
          )}

          {activeTab === 'faqs' && (
            <div className="animate-fade-in-fast space-y-2">
              {faqs.length ? faqs.map((f) => <FaqRow key={f.id} question={f.question} answer={f.answer} />) : (
                <EmptyState icon={<MessageSquare className="h-8 w-8" />} title="No FAQs yet" description="Questions and answers will appear here." />
              )}
            </div>
          )}

          {activeTab === 'similar' && (
            <div className="animate-fade-in-fast">
              {similar.length ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {similar.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              ) : <EmptyState title="No similar products" description="No related products found in this category." />}
            </div>
          )}
        </div>
      </section>

      {/* Price comparison table */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold font-display"><Store className="h-5 w-5 text-brand-500" /> Price Comparison Across Sellers</h2>
        <div className="mt-4 card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Seller</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold hidden sm:table-cell">Rating</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Delivery</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Shipping</th>
                  <th className="px-4 py-3 font-semibold">Availability</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedListings.map((l, i) => {
                  const disc = discountPercent(l.original_price, l.current_price);
                  const isBest = i === 0 && l.availability === 'in_stock';
                  return (
                    <tr key={l.id} className={cn('border-t border-gray-100 dark:border-white/5', isBest && 'bg-success-500/5')}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gray-100 dark:bg-white/5 text-xs font-bold text-gray-600 dark:text-gray-300">
                            {l.seller_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{l.seller_name}</p>
                            <p className="text-xs text-gray-400">{l.marketplace} · {l.country}</p>
                          </div>
                          {isBest && <span className="badge bg-success-500/10 text-success-600 dark:text-success-400">Best deal</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-gray-900 dark:text-white">{formatPrice(l.current_price, l.currency)}</span>
                        {l.original_price && <span className="ml-1 text-xs text-gray-400 line-through">{formatPrice(l.original_price, l.currency)}</span>}
                        {disc != null && disc > 0 && <span className="ml-1 text-xs font-medium text-error-500">-{disc}%</span>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell"><StarRating rating={l.rating} size={12} showNumber reviewCount={l.review_count} /></td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400">
                        {l.delivery_days != null ? <span className="inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> {l.delivery_days} days</span> : '—'}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400">
                        {l.shipping_cost > 0 ? formatPrice(l.shipping_cost, l.currency) : <span className="text-success-600 dark:text-success-400 font-medium">Free</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 text-xs font-medium',
                          l.availability === 'in_stock' ? 'text-success-600 dark:text-success-400'
                          : l.availability === 'preorder' ? 'text-warning-600 dark:text-warning-400'
                          : 'text-error-500')}>
                          {l.availability === 'in_stock' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          {availabilityLabel(l.availability)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => l.product_url && window.open(l.product_url, '_blank')} className="btn-ghost px-2 py-1 text-xs">
                          Visit <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 dark:border-white/5 px-4 py-2 text-xs text-gray-400">
            Prices last updated {bestListing ? timeAgo(bestListing.last_updated) : 'recently'}
          </div>
        </div>
      </section>

      {/* Price history chart */}
      {chartData.length > 1 && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-lg font-bold font-display"><BarChart3 className="h-5 w-5 text-brand-500" /> Price History (30 days)</h2>
          <div className="mt-4 card p-5">
            <PriceChart data={chartData} />
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div><p className="text-xs text-gray-400">30-day low</p><p className="font-bold text-success-600 dark:text-success-400">{formatPrice(Math.min(...chartData.map((d) => d.price)), product.base_currency)}</p></div>
              <div><p className="text-xs text-gray-400">30-day average</p><p className="font-bold text-gray-700 dark:text-gray-200">{formatPrice(chartData.reduce((a, b) => a + b.price, 0) / chartData.length, product.base_currency)}</p></div>
              <div><p className="text-xs text-gray-400">30-day high</p><p className="font-bold text-error-500">{formatPrice(Math.max(...chartData.map((d) => d.price)), product.base_currency)}</p></div>
            </div>
          </div>
        </section>
      )}

      {/* Store availability */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold font-display"><MapPin className="h-5 w-5 text-brand-500" /> Store Availability</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><Store className="h-4 w-4 text-brand-500" /> Online Stores</div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{inStockListings.length}</p>
            <p className="text-xs text-gray-400">sellers with stock</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><MapPin className="h-4 w-4 text-accent-500" /> Nearby Stores</div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Enable location access to find this product at physical stores near you.</p>
            <button onClick={() => toast('Location features coming soon', 'info')} className="btn-ghost mt-2 px-0 text-xs text-brand-600 dark:text-brand-400">Enable location</button>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><ShieldCheck className="h-4 w-4 text-success-500" /> Warehouse</div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Warehouse availability shown when sellers provide stock data.</p>
          </div>
        </div>
      </section>

      {/* Report */}
      <div className="mt-8 text-center">
        <button onClick={() => setReportOpen((o) => !o)} className="text-xs text-gray-400 hover:text-error-500 transition inline-flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" /> Report an issue with this product
        </button>
        {reportOpen && (
          <div className="mx-auto mt-3 max-w-md card p-4 text-left animate-slide-down">
            <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="input">
              <option>Incorrect price</option><option>Out of stock listing</option><option>Wrong product info</option><option>Spam or fraud</option><option>Other</option>
            </select>
            <textarea className="input mt-2 min-h-16" placeholder="Add details (optional)" value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} />
            <button onClick={submitReport} className="btn-primary mt-2 w-full">Submit Report</button>
          </div>
        )}
      </div>

      {/* Alert modal */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in-fast" onClick={() => setShowAlertModal(false)} />
          <div className="relative w-full max-w-sm card p-6 animate-scale-in">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/10 text-brand-500"><Bell className="h-5 w-5" /></div>
              <h3 className="text-base font-semibold">Set Price Alert</h3>
            </div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              We'll notify you when {product.name} drops below your target price.
            </p>
            <input type="number" placeholder={`Target price (current low: ${formatPrice(lowest, product.base_currency)})`} value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} className="input mt-4" />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowAlertModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleCreateAlert} className="btn-primary flex-1">Create Alert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PriceStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="card p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-xs text-gray-400">{icon} {label}</div>
      <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function OptionRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-1 text-xs text-gray-700 dark:text-gray-200">{v}</span>
        ))}
      </div>
    </div>
  );
}

function FaqRow({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen((o) => !o)} className="w-full card p-4 text-left transition hover:shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-900 dark:text-white">{question}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} />
      </div>
      {open && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 animate-fade-in-fast">{answer}</p>}
    </button>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="skeleton mb-4 h-4 w-32 rounded" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="skeleton aspect-square w-full rounded-2xl" />
        <div className="space-y-4">
          <div className="skeleton h-4 w-40 rounded" />
          <div className="skeleton h-8 w-3/4 rounded" />
          <div className="skeleton h-6 w-48 rounded" />
          <div className="skeleton h-28 w-full rounded-2xl" />
          <div className="skeleton h-20 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
