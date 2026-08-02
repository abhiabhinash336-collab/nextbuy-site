export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY';

export interface DatabaseProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  model_number: string | null;
  description: string | null;
  specs: Record<string, string>;
  features: string[];
  colors: string[];
  sizes: string[];
  storage_options: string[];
  ram_options: string[];
  hero_image: string | null;
  gallery: string[];
  base_currency: string;
  country: string;
  popularity: number;
  created_at: string;
}

export interface Listing {
  id: string;
  product_id: string;
  seller_name: string;
  marketplace: string;
  country: string;
  current_price: number;
  original_price: number | null;
  currency: string;
  discount_percent: number | null;
  rating: number;
  review_count: number;
  availability: 'in_stock' | 'out_of_stock' | 'preorder';
  delivery_days: number | null;
  shipping_cost: number;
  product_url: string | null;
  last_updated: string;
}

export interface Offer {
  id: string;
  product_id: string;
  type: 'coupon' | 'cashback' | 'bank' | 'festival' | 'flash' | 'deal';
  title: string;
  description: string | null;
  code: string | null;
  discount_value: string | null;
  start_date: string | null;
  end_date: string | null;
  is_limited_time: boolean;
  created_at: string;
}

export interface PricePoint {
  id: string;
  product_id: string;
  recorded_at: string;
  price: number;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string | null;
  user_name: string;
  rating: number;
  title: string;
  body: string | null;
  created_at: string;
}

export interface Faq {
  id: string;
  product_id: string;
  question: string;
  answer: string;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
  role: 'user' | 'admin';
  avatar_url: string | null;
  country: string;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface PriceAlert {
  id: string;
  user_id: string;
  product_id: string;
  target_price: number;
  currency: string;
  triggered: boolean;
  created_at: string;
}

export interface SearchHistoryItem {
  id: string;
  user_id: string;
  query: string;
  created_at: string;
}

export interface ReportedIssue {
  id: string;
  user_id: string | null;
  product_id: string | null;
  reason: string;
  details: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  created_at: string;
}

export type SortOption =
  | 'relevance'
  | 'price_low'
  | 'price_high'
  | 'discount_high'
  | 'rating_high'
  | 'popular'
  | 'newest'
  | 'delivery_fast';

export interface Filters {
  minPrice: number | null;
  maxPrice: number | null;
  brands: string[];
  sellers: string[];
  marketplaces: string[];
  minRating: number | null;
  minDiscount: number | null;
  colors: string[];
  availability: string[];
  maxDeliveryDays: number | null;
  countries: string[];
  categories: string[];
}

export const EMPTY_FILTERS: Filters = {
  minPrice: null,
  maxPrice: null,
  brands: [],
  sellers: [],
  marketplaces: [],
  minRating: null,
  minDiscount: null,
  colors: [],
  availability: [],
  maxDeliveryDays: null,
  countries: [],
  categories: [],
};
