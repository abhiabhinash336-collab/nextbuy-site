import { useEffect, useState } from 'react';
import { User, Mail, MapPin, Calendar, Heart, Bell, Search, Shield, LogOut, Edit2, Check, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';

export function ProfilePage() {
  const { session, profile, signOut, refreshProfile, isAdmin } = useAuth();
  const { toast } = useToast();
  const { navigate } = useRouter();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [country, setCountry] = useState(profile?.country ?? 'US');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ wishlist: 0, alerts: 0, searches: 0, reviews: 0 });

  useEffect(() => {
    if (!session) { navigate('/signin'); return; }
    setDisplayName(profile?.display_name ?? '');
    setCountry(profile?.country ?? 'US');
    (async () => {
      const uid = session.user.id;
      const [w, a, s, r] = await Promise.all([
        supabase.from('wishlist').select('*', { count: 'exact', head: true }).eq('user_id', uid),
        supabase.from('price_alerts').select('*', { count: 'exact', head: true }).eq('user_id', uid),
        supabase.from('search_history').select('*', { count: 'exact', head: true }).eq('user_id', uid),
        supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      ]);
      setStats({ wishlist: w.count ?? 0, alerts: a.count ?? 0, searches: s.count ?? 0, reviews: r.count ?? 0 });
    })();
  }, [session, profile, navigate]);

  if (!session) return null;

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ display_name: displayName.trim(), country }).eq('id', session!.user.id);
    setSaving(false);
    if (error) { toast('Failed to save profile', 'error'); return; }
    await refreshProfile();
    setEditing(false);
    toast('Profile updated', 'success');
  }

  async function handleSignOut() {
    await signOut();
    toast('Signed out', 'info');
    navigate('/');
  }

  const statCards = [
    { icon: Heart, label: 'Wishlist items', value: stats.wishlist, to: '/wishlist' },
    { icon: Bell, label: 'Price alerts', value: stats.alerts, to: '/alerts' },
    { icon: Search, label: 'Searches', value: stats.searches, to: '/history' },
    { icon: Shield, label: 'Reviews written', value: stats.reviews, to: '/profile' },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold font-display">Your Profile</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <button key={s.label} onClick={() => navigate(s.to)} className="card p-4 text-left transition hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/10 text-brand-500">
                <s.icon className="h-4.5 w-4.5" />
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</span>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="mt-6 card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-xl font-bold text-white">
              {(profile?.display_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{profile?.display_name || 'User'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{session.user.email}</p>
              {isAdmin && <span className="mt-1 inline-flex items-center gap-1 badge bg-warning-500/10 text-warning-600 dark:text-warning-400"><Shield className="h-3 w-3" /> Admin</span>}
            </div>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-ghost text-sm"><Edit2 className="h-4 w-4" /> Edit</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm"><Check className="h-4 w-4" /> Save</button>
              <button onClick={() => { setEditing(false); setDisplayName(profile?.display_name ?? ''); setCountry(profile?.country ?? 'US'); }} className="btn-secondary text-sm"><X className="h-4 w-4" /></button>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow icon={<User className="h-4 w-4" />} label="Display name">
            {editing ? <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /> : <span className="text-sm text-gray-700 dark:text-gray-200">{profile?.display_name || '—'}</span>}
          </InfoRow>
          <InfoRow icon={<Mail className="h-4 w-4" />} label="Email">
            <span className="text-sm text-gray-700 dark:text-gray-200">{session.user.email}</span>
          </InfoRow>
          <InfoRow icon={<MapPin className="h-4 w-4" />} label="Country">
            {editing ? (
              <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
                {['US', 'UK', 'CA', 'AU', 'IN', 'DE', 'FR', 'JP'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : <span className="text-sm text-gray-700 dark:text-gray-200">{profile?.country}</span>}
          </InfoRow>
          <InfoRow icon={<Calendar className="h-4 w-4" />} label="Member since">
            <span className="text-sm text-gray-700 dark:text-gray-200">{profile ? formatDate(profile.created_at) : '—'}</span>
          </InfoRow>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {isAdmin && <button onClick={() => navigate('/admin')} className="btn-secondary"><Shield className="h-4 w-4" /> Admin Dashboard</button>}
        <button onClick={handleSignOut} className="btn-secondary text-error-600 dark:text-error-400"><LogOut className="h-4 w-4" /> Sign Out</button>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-white/5 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">{icon} {label}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
