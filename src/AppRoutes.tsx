import { useRouter } from '@/lib/router';
import { HomePage } from '@/pages/HomePage';
import { SearchPage } from '@/pages/SearchPage';
import { ProductPage } from '@/pages/ProductPage';
import { AuthPage } from '@/pages/AuthPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { WishlistPage } from '@/pages/WishlistPage';
import { AlertsPage } from '@/pages/AlertsPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { AdminPage } from '@/pages/AdminPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function AppRoutes() {
  const { route } = useRouter();
  const [first, second, third] = route.segments;

  if (!first) return <HomePage />;
  if (first === 'search') return <SearchPage />;
  if (first === 'product' && second) return <ProductPage productId={second} />;
  if (first === 'signin') return <AuthPage mode="signin" />;
  if (first === 'signup') return <AuthPage mode="signup" />;
  if (first === 'profile') return <ProfilePage />;
  if (first === 'wishlist') return <WishlistPage />;
  if (first === 'alerts') return <AlertsPage />;
  if (first === 'history') return <HistoryPage />;
  if (first === 'admin') return <AdminPage />;

  void third;
  return <NotFoundPage />;
}
