import { Compass } from 'lucide-react';
import { useRouter } from '@/lib/router';

export function NotFoundPage() {
  const { navigate } = useRouter();
  return (
    <div className="grid place-items-center px-4 py-24 text-center animate-fade-in">
      <div className="grid h-20 w-20 place-items-center rounded-3xl bg-brand-500/10 text-brand-500">
        <Compass className="h-10 w-10" />
      </div>
      <h1 className="mt-6 text-3xl font-bold font-display">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        The page you're looking for doesn't exist or has moved. Let's get you back on track.
      </p>
      <button onClick={() => navigate('/')} className="btn-primary mt-6">Back to home</button>
    </div>
  );
}
