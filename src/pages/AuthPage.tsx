import { useState, type FormEvent } from 'react';
import { Mail, Lock, Eye, EyeOff, Globe, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';

export function AuthPage({ mode }: { mode: 'signin' | 'signup' }) {
  const { navigate } = useRouter();
  const { toast } = useToast();
  const isSignUp = mode === 'signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    if (isSignUp && password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() || email.split('@')[0] } },
        });
        if (signUpError) throw signUpError;
        toast('Account created! Welcome to NextBuy.', 'success');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
        toast('Signed in successfully.', 'success');
      }
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      const friendly = msg.includes('Invalid login') ? 'Incorrect email or password.' : msg.includes('already registered') ? 'An account with this email already exists. Try signing in.' : msg;
      setError(friendly);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] grid place-items-center px-4 py-10 overflow-hidden">
      <div className="absolute inset-0 bg-grid-light dark:bg-grid-dark [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="absolute left-1/2 top-10 h-72 w-96 -translate-x-1/2 rounded-full bg-brand-500/20 dark:bg-brand-500/10 blur-[100px]" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg">
              <Globe className="h-5 w-5" />
            </div>
          </button>
          <h1 className="mt-4 text-2xl font-bold font-display">{isSignUp ? 'Create your account' : 'Welcome back'}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isSignUp ? 'Start tracking the best deals worldwide.' : 'Sign in to access your wishlist and alerts.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-error-50 dark:bg-error-500/10 border border-error-500/20 px-3 py-2 text-sm text-error-700 dark:text-error-300 animate-slide-down">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {isSignUp && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">Display name</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="input" />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input pl-10" autoComplete="email" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input pl-10 pr-10" autoComplete={isSignUp ? 'new-password' : 'current-password'} />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className={cn('btn-primary w-full', loading && 'opacity-70')}>
            {loading ? 'Please wait…' : <>{isSignUp ? 'Create account' : 'Sign in'} <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => navigate(isSignUp ? '/signin' : '/signup')} className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
