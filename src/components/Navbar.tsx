import { useEffect, useRef, useState } from 'react';
import { Search, Globe, Heart, Bell, User, Menu, X, Shield, History, LogOut, ChevronDown } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { DatabaseProduct } from '@/types';

const CATEGORIES = ['Smartphones', 'Laptops', 'Headphones', 'Smartwatches', 'Cameras', 'Gaming'];

export function Navbar() {
  const { route, navigate } = useRouter();
  const { session, profile, isAdmin, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [suggestions, setSuggestions] = useState<DatabaseProduct[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (route.query.get('q')) setSearchValue(route.query.get('q') as string);
  }, [route.query]);

  useEffect(() => {
    if (!session) { setAlertCount(0); return; }
    (async () => {
      const { count } = await supabase
        .from('price_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);
      setAlertCount(count ?? 0);
    })();
  }, [session]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggest(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
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

  function onSearchChange(value: string) {
    setSearchValue(value);
    setShowSuggest(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 180);
  }

  function submitSearch(term: string) {
    const q = term.trim();
    setShowSuggest(false);
    setMenuOpen(false);
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
    else navigate('/search');
  }

  async function handleSignOut() {
    await signOut();
    setUserMenuOpen(false);
    navigate('/');
  }

  return (
    <header className={cn(
      'sticky top-0 z-50 transition-all duration-300',
      scrolled ? 'glass-strong shadow-sm' : 'bg-transparent'
    )}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button onClick={() => navigate('/')} className="flex shrink-0 items-center gap-2 group">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-sm transition-transform group-hover:scale-105">
            <Globe className="h-5 w-5" />
          </div>
          <span className="hidden text-lg font-bold tracking-tight sm:block font-display">
            Next<span className="text-brand-600 dark:text-brand-400">Buy</span>
          </span>
        </button>

        <div ref={searchRef} className="relative flex-1 max-w-2xl hidden md:block">
          <form
            onSubmit={(e) => { e.preventDefault(); submitSearch(searchValue); }}
            className="relative"
          >
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setShowSuggest(true)}
              placeholder="Search products, brands, models…"
              className="input pl-10 pr-4 py-2.5 h-10"
              aria-label="Search products"
            />
          </form>
          {showSuggest && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-12 z-50 glass-strong rounded-xl shadow-lg py-2 animate-slide-down overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { navigate(`/product/${s.id}`); setShowSuggest(false); setSearchValue(s.name); }}
                  className="flex w-full items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition text-left"
                >
                  {s.hero_image && (
                    <img src={s.hero_image} alt="" className="h-9 w-9 rounded-lg object-cover" loading="lazy" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{s.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.brand} · {s.category}</p>
                  </div>
                </button>
              ))}
              <button
                onClick={() => submitSearch(searchValue)}
                className="mt-1 w-full border-t border-gray-100 dark:border-white/5 px-3 py-2 text-left text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Search for "{searchValue}"
              </button>
            </div>
          )}
        </div>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {CATEGORIES.slice(0, 4).map((c) => (
            <button
              key={c}
              onClick={() => navigate(`/search?category=${encodeURIComponent(c)}`)}
              className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white transition"
            >
              {c}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-2">
          {session && (
            <button
              onClick={() => navigate('/alerts')}
              aria-label="Price alerts"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 transition"
            >
              <Bell className="h-5 w-5" />
              {alertCount > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-error-500 px-1 text-[10px] font-bold text-white">
                  {alertCount}
                </span>
              )}
            </button>
          )}
          {session && (
            <button
              onClick={() => navigate('/wishlist')}
              aria-label="Wishlist"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 transition"
            >
              <Heart className="h-5 w-5" />
            </button>
          )}
          <ThemeToggle />

          {session ? (
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-white/10 transition"
              >
                <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-xs font-bold text-white">
                  {(profile?.display_name || 'U').charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="hidden h-4 w-4 text-gray-400 sm:block" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-11 z-50 w-56 glass-strong rounded-xl shadow-lg py-1.5 animate-slide-down">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-white/5">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{profile?.display_name || 'Account'}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{session.user.email}</p>
                  </div>
                  <MenuItem icon={<User className="h-4 w-4" />} label="Profile" onClick={() => { navigate('/profile'); setUserMenuOpen(false); }} />
                  <MenuItem icon={<Heart className="h-4 w-4" />} label="Wishlist" onClick={() => { navigate('/wishlist'); setUserMenuOpen(false); }} />
                  <MenuItem icon={<Bell className="h-4 w-4" />} label="Price Alerts" onClick={() => { navigate('/alerts'); setUserMenuOpen(false); }} />
                  <MenuItem icon={<History className="h-4 w-4" />} label="Search History" onClick={() => { navigate('/history'); setUserMenuOpen(false); }} />
                  {isAdmin && (
                    <MenuItem icon={<Shield className="h-4 w-4" />} label="Admin Dashboard" onClick={() => { navigate('/admin'); setUserMenuOpen(false); }} />
                  )}
                  <div className="my-1 border-t border-gray-100 dark:border-white/5" />
                  <MenuItem icon={<LogOut className="h-4 w-4" />} label="Sign Out" onClick={handleSignOut} danger />
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => navigate('/signin')} className="btn-primary ml-1 hidden h-9 px-4 py-0 sm:inline-flex">
              Sign In
            </button>
          )}

          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 transition lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-gray-100 dark:border-white/5 lg:hidden animate-slide-down">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            <form onSubmit={(e) => { e.preventDefault(); submitSearch(searchValue); }} className="relative md:hidden mb-3">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search products…"
                className="input pl-10 h-10"
              />
            </form>
            <div className="grid grid-cols-2 gap-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => { navigate(`/search?category=${encodeURIComponent(c)}`); setMenuOpen(false); }}
                  className="rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                >
                  {c}
                </button>
              ))}
            </div>
            {!session && (
              <button onClick={() => { navigate('/signin'); setMenuOpen(false); }} className="btn-primary mt-3 w-full">
                Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2 text-sm transition',
        danger ? 'text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5'
      )}
    >
      {icon} {label}
    </button>
  );
}
