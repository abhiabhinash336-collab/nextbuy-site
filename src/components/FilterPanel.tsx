import { X, SlidersHorizontal } from 'lucide-react';
import type { Filters } from '@/types';
import { EMPTY_FILTERS } from '@/types';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  facets: {
    brands: string[];
    sellers: string[];
    marketplaces: string[];
    categories: string[];
    countries: string[];
    colors: string[];
  };
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function FilterPanel({ filters, onChange, facets, mobileOpen, onCloseMobile }: FilterPanelProps) {
  function toggle(key: keyof Filters, value: string) {
    const arr = filters[key] as string[];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    onChange({ ...filters, [key]: next });
  }

  function setNum(key: 'minPrice' | 'maxPrice' | 'minRating' | 'minDiscount' | 'maxDeliveryDays', value: string) {
    const num = value === '' ? null : Number(value);
    onChange({ ...filters, [key]: Number.isNaN(num) ? null : num });
  }

  const activeCount =
    filters.brands.length + filters.sellers.length + filters.marketplaces.length +
    filters.categories.length + filters.colors.length + filters.availability.length +
    filters.countries.length +
    (filters.minPrice != null ? 1 : 0) + (filters.maxPrice != null ? 1 : 0) +
    (filters.minRating != null ? 1 : 0) + (filters.minDiscount != null ? 1 : 0) +
    (filters.maxDeliveryDays != null ? 1 : 0);

  const content = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <SlidersHorizontal className="h-4 w-4" /> Filters
          {activeCount > 0 && <span className="badge bg-brand-500/10 text-brand-600 dark:text-brand-400">{activeCount}</span>}
        </h3>
        {activeCount > 0 && (
          <button onClick={() => onChange({ ...EMPTY_FILTERS })} className="text-xs text-gray-500 hover:text-error-500 transition">
            Clear all
          </button>
        )}
      </div>

      <Section title="Price Range">
        <div className="flex items-center gap-2">
          <input type="number" placeholder="Min" value={filters.minPrice ?? ''} onChange={(e) => setNum('minPrice', e.target.value)} className="input h-9 text-sm" />
          <span className="text-gray-400">—</span>
          <input type="number" placeholder="Max" value={filters.maxPrice ?? ''} onChange={(e) => setNum('maxPrice', e.target.value)} className="input h-9 text-sm" />
        </div>
      </Section>

      <Section title="Category">
        <CheckboxGroup options={facets.categories} selected={filters.categories} onToggle={(v) => toggle('categories', v)} />
      </Section>

      <Section title="Brand">
        <CheckboxGroup options={facets.brands} selected={filters.brands} onToggle={(v) => toggle('brands', v)} />
      </Section>

      <Section title="Seller">
        <CheckboxGroup options={facets.sellers} selected={filters.sellers} onToggle={(v) => toggle('sellers', v)} />
      </Section>

      <Section title="Marketplace">
        <CheckboxGroup options={facets.marketplaces} selected={filters.marketplaces} onToggle={(v) => toggle('marketplaces', v)} />
      </Section>

      <Section title="Minimum Rating">
        <div className="flex gap-1.5">
          {[4.5, 4, 3, 0].map((r) => (
            <button
              key={r}
              onClick={() => onChange({ ...filters, minRating: filters.minRating === r ? null : r })}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-xs font-medium transition',
                filters.minRating === r
                  ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400'
                  : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20'
              )}
            >
              {r === 0 ? 'Any' : `${r}★+`}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Min Discount">
        <div className="flex flex-wrap gap-1.5">
          {[10, 20, 30, 50].map((d) => (
            <button
              key={d}
              onClick={() => onChange({ ...filters, minDiscount: filters.minDiscount === d ? null : d })}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-xs font-medium transition',
                filters.minDiscount === d
                  ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400'
                  : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20'
              )}
            >
              {d}%+
            </button>
          ))}
        </div>
      </Section>

      <Section title="Availability">
        <CheckboxGroup
          options={[{ value: 'in_stock', label: 'In Stock' }, { value: 'preorder', label: 'Pre-order' }, { value: 'out_of_stock', label: 'Out of Stock' }]}
          selected={filters.availability}
          onToggle={(v) => toggle('availability', v)}
        />
      </Section>

      <Section title="Max Delivery (days)">
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 5].map((d) => (
            <button
              key={d}
              onClick={() => onChange({ ...filters, maxDeliveryDays: filters.maxDeliveryDays === d ? null : d })}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-xs font-medium transition',
                filters.maxDeliveryDays === d
                  ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400'
                  : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20'
              )}
            >
              ≤{d}d
            </button>
          ))}
        </div>
      </Section>

      <Section title="Color">
        <CheckboxGroup options={facets.colors} selected={filters.colors} onToggle={(v) => toggle('colors', v)} />
      </Section>

      <Section title="Country">
        <CheckboxGroup options={facets.countries} selected={filters.countries} onToggle={(v) => toggle('countries', v)} />
      </Section>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-20 card p-5 max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar">
          {content}
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in-fast" onClick={onCloseMobile} />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85%] bg-white dark:bg-[#0d1424] shadow-xl overflow-y-auto animate-slide-up p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold">Filters</span>
              <button onClick={onCloseMobile} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/5">
                <X className="h-5 w-5" />
              </button>
            </div>
            {content}
            <button onClick={onCloseMobile} className="btn-primary mt-5 w-full">Show results</button>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-100 dark:border-white/5 pt-4 first:border-0 first:pt-0">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</h4>
      {children}
    </div>
  );
}

function CheckboxGroup({ options, selected, onToggle }: { options: (string | { value: string; label: string })[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
      {options.map((opt) => {
        const value = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const checked = selected.includes(value);
        return (
          <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <input type="checkbox" checked={checked} onChange={() => onToggle(value)} className="h-4 w-4 rounded border-gray-300 dark:border-white/20 text-brand-600 focus:ring-brand-500/40 bg-transparent" />
            <span className="truncate">{label}</span>
          </label>
        );
      })}
    </div>
  );
}
