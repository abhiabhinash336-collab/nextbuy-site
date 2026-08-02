import { useEffect, useState } from 'react';
import { History, Trash2, Search, RotateCcw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { EmptyState } from '@/components/EmptyStates';
import { timeAgo } from '@/lib/utils';
import type { SearchHistoryItem } from '@/types';

export function HistoryPage() {
  const { session } = useAuth();
  const { toast } = useToast();
  const { navigate } = useRouter();
  const [items, setItems] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) { navigate('/signin'); return; }
    (async () => {
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) { console.error(error.message); setLoading(false); return; }
      setItems((data ?? []) as SearchHistoryItem[]);
      setLoading(false);
    })();
  }, [session, navigate]);

  if (!session) return null;

  async function clearAll() {
    const { error } = await supabase.from('search_history').delete().eq('user_id', session!.user.id);
    if (error) { toast('Failed to clear history', 'error'); return; }
    setItems([]);
    toast('Search history cleared', 'success');
  }

  async function removeOne(id: string) {
    const { error } = await supabase.from('search_history').delete().eq('id', id);
    if (error) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold font-display">
          <History className="h-6 w-6 text-brand-500" /> Search History
        </h1>
        {items.length > 0 && (
          <button onClick={clearAll} className="btn-ghost text-sm text-gray-500 hover:text-error-500">
            <Trash2 className="h-4 w-4" /> Clear all
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 w-full rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="No search history yet"
          description="Your recent searches will appear here so you can quickly re-run them."
          action={<button onClick={() => navigate('/search')} className="btn-primary">Start searching</button>}
        />
      ) : (
        <div className="mt-6 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="card flex items-center gap-3 p-3 group transition hover:shadow-sm">
              <button onClick={() => navigate(`/search?q=${encodeURIComponent(item.query)}`)} className="flex flex-1 items-center gap-3 text-left">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gray-100 dark:bg-white/5 text-gray-400 group-hover:bg-brand-500/10 group-hover:text-brand-500 transition">
                  <Search className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{item.query}</p>
                  <p className="text-xs text-gray-400">{timeAgo(item.created_at)}</p>
                </div>
                <RotateCcw className="h-4 w-4 text-gray-300 group-hover:text-brand-500 transition" />
              </button>
              <button onClick={() => removeOne(item.id)} className="grid h-8 w-8 place-items-center rounded-lg text-gray-300 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 transition" aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
