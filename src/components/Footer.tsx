import { Globe, Github, Twitter, Linkedin } from 'lucide-react';
import { useRouter } from '@/lib/router';

export function Footer() {
  const { navigate } = useRouter();
  return (
    <footer className="mt-20 border-t border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.02]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-white">
                <Globe className="h-4.5 w-4.5" />
              </div>
              <span className="text-base font-bold font-display">NextBuy</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-gray-500 dark:text-gray-400">
              Compare prices, offers, and availability across the world's top online stores in one place.
            </p>
            <div className="mt-4 flex gap-2">
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <a key={i} href="#" onClick={(e) => e.preventDefault()} className="grid h-8 w-8 place-items-center rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-brand-600 dark:hover:text-brand-400 transition" aria-label="social link">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <FooterCol title="Shop" links={[
            { label: 'Smartphones', to: '/search?category=Smartphones' },
            { label: 'Laptops', to: '/search?category=Laptops' },
            { label: 'Headphones', to: '/search?category=Headphones' },
            { label: 'Gaming', to: '/search?category=Gaming' },
          ]} onNav={navigate} />

          <FooterCol title="Account" links={[
            { label: 'Sign In', to: '/signin' },
            { label: 'Create Account', to: '/signup' },
            { label: 'Wishlist', to: '/wishlist' },
            { label: 'Price Alerts', to: '/alerts' },
          ]} onNav={navigate} />

          <FooterCol title="Company" links={[
            { label: 'About', to: '/' },
            { label: 'Admin', to: '/admin' },
            { label: 'Search History', to: '/history' },
            { label: 'Profile', to: '/profile' },
          ]} onNav={navigate} />
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-gray-100 dark:border-white/5 pt-6 sm:flex-row">
          <p className="text-xs text-gray-400 dark:text-gray-500">© {new Date().getFullYear()} NextBuy. All rights reserved.</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Prices updated in real-time from verified sellers.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links, onNav }: { title: string; links: { label: string; to: string }[]; onNav: (to: string) => void }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <button onClick={() => onNav(l.to)} className="text-sm text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition">
              {l.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
