import { SearchX, PackageOpen, AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center animate-fade-in">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500">
        {icon ?? <PackageOpen className="h-8 w-8" />}
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function NoResults({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<SearchX className="h-8 w-8" />}
      title="No products found"
      description={query ? `We couldn't find anything matching "${query}". Try different keywords or adjust your filters.` : 'Try adjusting your filters to see more results.'}
    />
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center animate-fade-in">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-error-50 dark:bg-error-500/10 text-error-500">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Something went wrong</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary mt-5">Try again</button>
      )}
    </div>
  );
}
