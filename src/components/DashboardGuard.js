'use client';

import { useAuth } from '@/context/AuthContext';
import { useBilling } from '@/context/BillingContext';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const DEFAULT_CHARITIES = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Green Canopy Trust' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Blue Ocean Alliance' },
  { id: '00000000-0000-0000-0000-000000000003', name: 'Youth Sports Trust' },
  { id: '00000000-0000-0000-0000-000000000004', name: 'Cardiac Health Research' },
];

export default function DashboardGuard({ children, requireAdmin = false }) {
  const { user, profile, loading, signOut } = useAuth();
  const { mockSubscribe, processing } = useBilling();
  const router = useRouter();

  // Guard states
  const [charityId, setCharityId] = useState('');
  const [contributionPercent, setContributionPercent] = useState(10);
  const [tier, setTier] = useState('monthly');
  const [charities, setCharities] = useState(DEFAULT_CHARITIES);

  // Fetch charities for checkout dropdown
  useEffect(() => {
    async function loadCharities() {
      try {
        const { data } = await supabase.from('charities').select('id, name');
        if (data && data.length > 0) {
          setCharities(data);
          setCharityId(data[0].id);
        } else {
          setCharityId(DEFAULT_CHARITIES[0].id);
        }
      } catch (e) {
        setCharityId(DEFAULT_CHARITIES[0].id);
      }
    }
    if (user && profile && profile.subscription_status !== 'active') {
      loadCharities();
    }
  }, [user, profile]);

  // Sync state with profile selections when profile loads
  useEffect(() => {
    if (profile) {
      if (profile.selected_charity_id) setCharityId(profile.selected_charity_id);
      if (profile.charity_contribution_percent) setContributionPercent(profile.charity_contribution_percent);
      if (profile.subscription_tier) setTier(profile.subscription_tier);
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen liquid-bg flex items-center justify-center">
        <div className="text-primary font-semibold text-lg animate-pulse">Loading Hero Session...</div>
      </div>
    );
  }

  // 1. Authenticated check
  if (!user || !profile) {
    return (
      <div className="min-h-screen liquid-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-card rounded-2xl p-8 border border-white/10 text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h2>
          <p className="text-text-muted text-sm mb-6">
            You must be logged in to access the subscriber dashboard.
          </p>
          <Link href="/login" className="py-2.5 px-6 btn-premium text-sm font-semibold rounded-lg">
            Go to Log In
          </Link>
        </div>
      </div>
    );
  }

  // 2. Administrator role check
  if (requireAdmin && profile.role !== 'admin') {
    return (
      <div className="min-h-screen liquid-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-card rounded-2xl p-8 border border-white/10 text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-2">Unauthorized</h2>
          <p className="text-text-muted text-sm mb-6">
            This section is restricted to administrators only.
          </p>
          <div className="flex space-x-4 justify-center">
            <Link href="/dashboard" className="py-2 px-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-sm">
              Subscriber Dashboard
            </Link>
            <button
              onClick={() => router.back()}
              className="py-2 px-4 btn-premium text-sm font-semibold rounded-lg"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Active Subscription check (skip for admins)
  if (profile.role !== 'admin' && profile.subscription_status !== 'active') {
    const isPastDue = profile.subscription_status === 'past_due';
    const isLapsed = profile.subscription_status === 'lapsed';

    const handleMockCheckout = async () => {
      try {
        await mockSubscribe(tier, charityId, contributionPercent);
      } catch (err) {
        alert(err.message || 'Billing activation failed.');
      }
    };

    return (
      <div className="min-h-screen liquid-bg flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background grids */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-purple/10 blur-[120px]" />

        <div className="max-w-lg w-full glass-card rounded-2xl p-8 border border-white/10 z-10">
          <div className="text-center mb-6">
            <div className="inline-block py-1 px-3 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold uppercase mb-2">
              {isPastDue ? 'Subscription Past Due' : isLapsed ? 'Subscription Lapsed' : 'Subscription Required'}
            </div>
            <h2 className="text-3xl font-extrabold text-gradient-hero mb-2">
              Activate Digital Heroes Access
            </h2>
            <p className="text-text-muted text-sm">
              {isPastDue
                ? 'Your last payment failed. Please complete your billing to resume score entries and prize draws.'
                : 'Subscribe to access golf scoring metrics, charity contributions, and monthly rewards.'}
            </p>
          </div>

          <div className="space-y-4">
            {/* Choose pricing plan */}
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => setTier('monthly')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTier('monthly'); } }}
                tabIndex={0}
                className={`p-3 rounded-lg border text-center cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-primary ${
                  tier === 'monthly'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-white/10 hover:border-white/20 text-text-muted hover:text-white'
                }`}
              >
                <div className="text-xs font-bold uppercase">Monthly Plan</div>
                <div className="text-lg font-extrabold mt-1">$15<span className="text-xs font-normal">/mo</span></div>
              </div>

              <div
                onClick={() => setTier('yearly')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTier('yearly'); } }}
                tabIndex={0}
                className={`p-3 rounded-lg border text-center cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-primary ${
                  tier === 'yearly'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-white/10 hover:border-white/20 text-text-muted hover:text-white'
                }`}
              >
                <div className="text-xs font-bold uppercase">Yearly Plan</div>
                <div className="text-lg font-extrabold mt-1">$120<span className="text-xs font-normal">/yr</span></div>
                <div className="text-[10px] text-primary/80 font-medium">Save $60/year</div>
              </div>
            </div>

            {/* Select supported charity */}
            <div>
              <label className="block text-xs font-semibold uppercase text-text-muted mb-1">
                Supported Charity
              </label>
              <select
                className="w-full p-2.5 glass-input text-sm bg-zinc-950 text-white border border-white/10"
                value={charityId}
                onChange={(e) => setCharityId(e.target.value)}
              >
                {charities.map((c) => (
                  <option key={c.id} value={c.id} className="bg-zinc-950 text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Slider for donation allocation */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold uppercase text-text-muted">
                  Donation Percentage
                </label>
                <span className="text-sm font-extrabold text-primary">{contributionPercent}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                className="w-full accent-primary"
                value={contributionPercent}
                onChange={(e) => setContributionPercent(e.target.value)}
              />
              <div className="flex justify-between text-[10px] text-text-muted">
                <span>10% (Min)</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <button
              onClick={handleMockCheckout}
              disabled={processing}
              className="w-full py-3 mt-4 btn-premium text-sm font-semibold rounded-lg"
            >
              {processing ? 'Processing Stripe Checkout...' : 'Simulate Stripe Payment & Activate'}
            </button>

            <div className="text-center mt-4">
              <button
                onClick={async () => {
                  try {
                    await signOut();
                    router.push('/login');
                  } catch (e) {
                    console.error('Sign out error:', e);
                    router.push('/login');
                  }
                }}
                className="text-xs text-text-muted hover:underline cursor-pointer bg-transparent border-none p-0 inline-block mx-auto font-medium"
              >
                Sign in with another account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Return children if all checks pass (authenticated & active or admin)
  return <>{children}</>;
}
