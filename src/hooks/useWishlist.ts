import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useWishlist() {
  const { session } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!session) {
      setWishlistIds(new Set());
      return;
    }
    const { data, error } = await supabase
      .from('wishlist')
      .select('product_id')
      .eq('user_id', session.user.id);
    if (error) {
      console.error('wishlist load error:', error.message);
      return;
    }
    setWishlistIds(new Set((data ?? []).map((r) => r.product_id as string)));
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(async (productId: string): Promise<boolean> => {
    if (!session) return false;
    setLoading(true);
    const isWishlisted = wishlistIds.has(productId);
    try {
      if (isWishlisted) {
        const { error } = await supabase
          .from('wishlist')
          .delete()
          .eq('user_id', session.user.id)
          .eq('product_id', productId);
        if (error) throw error;
        setWishlistIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      } else {
        const { error } = await supabase
          .from('wishlist')
          .insert({ product_id: productId });
        if (error) throw error;
        setWishlistIds((prev) => new Set(prev).add(productId));
      }
      return !isWishlisted;
    } catch (err) {
      console.error('wishlist toggle error:', err);
      return isWishlisted;
    } finally {
      setLoading(false);
    }
  }, [session, wishlistIds]);

  return { wishlistIds, toggle, loading, refresh, isSignedIn: !!session };
}
