/*
# Global Search — catalog, listings, offers, price history, and user accounts

## Overview
Builds the full data model for a multi-user global product price-comparison platform.
Users can search a catalog of products, view listings from multiple sellers per product,
track offers/discounts with countdown timers, see price history, and (when signed in)
save products to a wishlist, set target-price alerts, and keep a search history.

## New Tables
1. profiles — one row per auth user (role user|admin, display_name, country).
2. products — catalog (name, brand, category, model, specs jsonb, features, options, images).
3. product_listings — per (product x seller) offer: price, original price, discount, rating,
   reviews, availability, delivery days, shipping cost, marketplace, country.
4. offers — promotional offers (coupon/cashback/bank/festival/flash/deal) with start/end dates.
5. price_history — daily lowest-price snapshots per product.
6. reviews — user reviews (rating 1-5) on products.
7. faqs — FAQs per product.
8. wishlist — signed-in user saved products (owner-scoped).
9. price_alerts — signed-in user target-price alerts (owner-scoped).
10. search_history — signed-in user recent searches (owner-scoped).
11. reported_issues — user-submitted reports, admin-managed.

## Security
- Catalog tables: public SELECT (anon + authenticated); admin-only INSERT/UPDATE/DELETE
  gated by is_admin() SECURITY DEFINER helper.
- reviews: public SELECT, any authenticated user INSERT, owner DELETE.
- Owner-scoped tables (wishlist, price_alerts, search_history): CRUD scoped to auth.uid() = user_id;
  user_id DEFAULT auth.uid() so client inserts work without passing user_id.
- profiles: user can SELECT/UPDATE own row; admin SELECT all. Auto-created via trigger on signup.
- reported_issues: any authenticated user INSERT; admin SELECT/UPDATE/DELETE.

## Notes
1. profiles table created first; is_admin() defined next so policies can reference it.
2. handle_new_user() trigger auto-creates a profile row on auth signup.
3. Owner columns DEFAULT auth.uid() so frontend inserts omitting user_id satisfy WITH CHECK.
4. Indexes added on frequently filtered/joined columns.
*/

-- ---------- profiles table (NO policies yet) ----------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  avatar_url text,
  country text DEFAULT 'US',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ---------- helper: is_admin (profiles table now exists) ----------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ---------- auto-create profile on signup ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- profiles policies (is_admin now exists) ----------
DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---------- products ----------
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text NOT NULL,
  category text NOT NULL,
  model_number text,
  description text,
  specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  features text[] NOT NULL DEFAULT '{}',
  colors text[] NOT NULL DEFAULT '{}',
  sizes text[] NOT NULL DEFAULT '{}',
  storage_options text[] NOT NULL DEFAULT '{}',
  ram_options text[] NOT NULL DEFAULT '{}',
  hero_image text,
  gallery text[] NOT NULL DEFAULT '{}',
  base_currency text NOT NULL DEFAULT 'USD',
  country text NOT NULL DEFAULT 'US',
  popularity integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_popularity ON public.products(popularity DESC);

DROP POLICY IF EXISTS "public_read_products" ON public.products;
CREATE POLICY "public_read_products" ON public.products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_products" ON public.products;
CREATE POLICY "admin_insert_products" ON public.products FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_products" ON public.products;
CREATE POLICY "admin_update_products" ON public.products FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_products" ON public.products;
CREATE POLICY "admin_delete_products" ON public.products FOR DELETE
  TO authenticated USING (public.is_admin());

-- ---------- product_listings ----------
CREATE TABLE IF NOT EXISTS public.product_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  seller_name text NOT NULL,
  marketplace text NOT NULL,
  country text NOT NULL DEFAULT 'US',
  current_price numeric(12,2) NOT NULL,
  original_price numeric(12,2),
  currency text NOT NULL DEFAULT 'USD',
  discount_percent numeric(5,2),
  rating numeric(2,1) NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  availability text NOT NULL DEFAULT 'in_stock' CHECK (availability IN ('in_stock','out_of_stock','preorder')),
  delivery_days integer,
  shipping_cost numeric(10,2) NOT NULL DEFAULT 0,
  product_url text,
  last_updated timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_listings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_listings_product ON public.product_listings(product_id);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.product_listings(current_price);

DROP POLICY IF EXISTS "public_read_listings" ON public.product_listings;
CREATE POLICY "public_read_listings" ON public.product_listings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_listings" ON public.product_listings;
CREATE POLICY "admin_insert_listings" ON public.product_listings FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_listings" ON public.product_listings;
CREATE POLICY "admin_update_listings" ON public.product_listings FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_listings" ON public.product_listings;
CREATE POLICY "admin_delete_listings" ON public.product_listings FOR DELETE
  TO authenticated USING (public.is_admin());

-- ---------- offers ----------
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('coupon','cashback','bank','festival','flash','deal')),
  title text NOT NULL,
  description text,
  code text,
  discount_value text,
  start_date timestamptz,
  end_date timestamptz,
  is_limited_time boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_offers_product ON public.offers(product_id);
CREATE INDEX IF NOT EXISTS idx_offers_end ON public.offers(end_date);

DROP POLICY IF EXISTS "public_read_offers" ON public.offers;
CREATE POLICY "public_read_offers" ON public.offers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_offers" ON public.offers;
CREATE POLICY "admin_insert_offers" ON public.offers FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_offers" ON public.offers;
CREATE POLICY "admin_update_offers" ON public.offers FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_offers" ON public.offers;
CREATE POLICY "admin_delete_offers" ON public.offers FOR DELETE
  TO authenticated USING (public.is_admin());

-- ---------- price_history ----------
CREATE TABLE IF NOT EXISTS public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  recorded_at date NOT NULL,
  price numeric(12,2) NOT NULL,
  UNIQUE (product_id, recorded_at)
);
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_pricehist_product ON public.price_history(product_id, recorded_at);

DROP POLICY IF EXISTS "public_read_price_history" ON public.price_history;
CREATE POLICY "public_read_price_history" ON public.price_history FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_price_history" ON public.price_history;
CREATE POLICY "admin_insert_price_history" ON public.price_history FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_price_history" ON public.price_history;
CREATE POLICY "admin_delete_price_history" ON public.price_history FOR DELETE
  TO authenticated USING (public.is_admin());

-- ---------- reviews ----------
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid DEFAULT auth.uid(),
  user_name text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text NOT NULL,
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews(product_id);

DROP POLICY IF EXISTS "public_read_reviews" ON public.reviews;
CREATE POLICY "public_read_reviews" ON public.reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_reviews" ON public.reviews;
CREATE POLICY "auth_insert_reviews" ON public.reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner_delete_reviews" ON public.reviews;
CREATE POLICY "owner_delete_reviews" ON public.reviews FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------- faqs ----------
CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_faqs_product ON public.faqs(product_id);

DROP POLICY IF EXISTS "public_read_faqs" ON public.faqs;
CREATE POLICY "public_read_faqs" ON public.faqs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_modify_faqs" ON public.faqs;
CREATE POLICY "admin_modify_faqs" ON public.faqs FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_faqs" ON public.faqs;
CREATE POLICY "admin_update_faqs" ON public.faqs FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_faqs" ON public.faqs;
CREATE POLICY "admin_delete_faqs" ON public.faqs FOR DELETE
  TO authenticated USING (public.is_admin());

-- ---------- wishlist ----------
CREATE TABLE IF NOT EXISTS public.wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON public.wishlist(user_id);

DROP POLICY IF EXISTS "select_own_wishlist" ON public.wishlist;
CREATE POLICY "select_own_wishlist" ON public.wishlist FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_wishlist" ON public.wishlist;
CREATE POLICY "insert_own_wishlist" ON public.wishlist FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_wishlist" ON public.wishlist;
CREATE POLICY "delete_own_wishlist" ON public.wishlist FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------- price_alerts ----------
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  target_price numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  triggered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_alerts_user ON public.price_alerts(user_id);

DROP POLICY IF EXISTS "select_own_alerts" ON public.price_alerts;
CREATE POLICY "select_own_alerts" ON public.price_alerts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_alerts" ON public.price_alerts;
CREATE POLICY "insert_own_alerts" ON public.price_alerts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_alerts" ON public.price_alerts;
CREATE POLICY "update_own_alerts" ON public.price_alerts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_alerts" ON public.price_alerts;
CREATE POLICY "delete_own_alerts" ON public.price_alerts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------- search_history ----------
CREATE TABLE IF NOT EXISTS public.search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_searchhist_user ON public.search_history(user_id, created_at DESC);

DROP POLICY IF EXISTS "select_own_search_history" ON public.search_history;
CREATE POLICY "select_own_search_history" ON public.search_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_search_history" ON public.search_history;
CREATE POLICY "insert_own_search_history" ON public.search_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_search_history" ON public.search_history;
CREATE POLICY "delete_own_search_history" ON public.search_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------- reported_issues ----------
CREATE TABLE IF NOT EXISTS public.reported_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reported_issues ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_issues_status ON public.reported_issues(status);

DROP POLICY IF EXISTS "insert_own_report" ON public.reported_issues;
CREATE POLICY "insert_own_report" ON public.reported_issues FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_manage_reports" ON public.reported_issues;
CREATE POLICY "admin_manage_reports" ON public.reported_issues FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_update_reports" ON public.reported_issues;
CREATE POLICY "admin_update_reports" ON public.reported_issues FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_reports" ON public.reported_issues;
CREATE POLICY "admin_delete_reports" ON public.reported_issues FOR DELETE
  TO authenticated USING (public.is_admin());
