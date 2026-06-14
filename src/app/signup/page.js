'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Fallback seed charities if DB is disconnected/empty during initial render
const DEFAULT_CHARITIES = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Green Canopy Trust', description: 'Restoring native woodlands and urban micro-forests.' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Blue Ocean Alliance', description: 'Tackling ocean plastic and reef restoration.' },
  { id: '00000000-0000-0000-0000-000000000003', name: 'Youth Sports Trust', description: 'Providing sports access to disadvantaged kids.' },
  { id: '00000000-0000-0000-0000-000000000004', name: 'Cardiac Health Research', description: 'Funding trials and community defibrillators.' },
];

export default function SignUpPage() {
  const { signUp, user } = useAuth();
  const router = useRouter();

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [charityId, setCharityId] = useState('');
  const [contributionPercent, setContributionPercent] = useState(10);
  const [tier, setTier] = useState('monthly');
  const [isAdmin, setIsAdmin] = useState(false); // test helper to easily create admin accounts

  // UI states
  const [charities, setCharities] = useState(DEFAULT_CHARITIES);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load charities from Supabase
  useEffect(() => {
    async function loadCharities() {
      try {
        const { data, error } = await supabase
          .from('charities')
          .select('id, name, description')
          .order('name');
        if (data && data.length > 0 && !error) {
          setCharities(data);
          setCharityId(data[0].id);
        } else {
          setCharityId(DEFAULT_CHARITIES[0].id);
        }
      } catch (e) {
        console.warn('Could not load charities, using defaults:', e);
        setCharityId(DEFAULT_CHARITIES[0].id);
      }
    }
    loadCharities();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (!fullName.trim()) {
      setErrorMsg('Full Name is required.');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      await signUp({
        email,
        password,
        fullName,
        charityId,
        contributionPercent: Number(contributionPercent),
        tier,
        isAdmin,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Check details.');
      setLoading(false);
    }
  };

  return (
    <main id="main-content" className="min-h-screen liquid-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-purple/10 blur-[120px]" />

      <div className="w-full max-w-xl glass-card rounded-2xl p-8 border border-white/10 z-10">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-gradient-hero mb-2">
            Create Your Hero Account
          </h1>
          <p className="text-text-muted text-sm">
            Track performance, support charities, and win monthly prize rewards.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded bg-red-900/30 border border-red-500/30 text-red-400 text-sm">
            {errorMsg}
          </div>
        )}

        {success ? (
          <div className="p-8 text-center text-primary font-semibold">
            Registration successful! Redirecting to Dashboard...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Details Group */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-text-muted mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  className="w-full p-2.5 glass-input text-sm"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-text-muted mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="john@example.com"
                  className="w-full p-2.5 glass-input text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-text-muted mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••"
                className="w-full p-2.5 glass-input text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Separator */}
            <div className="border-t border-white/5 my-4 pt-4">
              <h3 className="text-sm font-bold text-gradient-hero mb-3">Subscription & Charity</h3>
            </div>

            {/* Plan selection */}
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => setTier('monthly')}
                className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${
                  tier === 'monthly'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-white/10 hover:border-white/20 text-text-muted'
                }`}
              >
                <div className="text-xs font-bold uppercase">Monthly Plan</div>
                <div className="text-lg font-extrabold mt-1">$15<span className="text-xs font-normal">/mo</span></div>
              </div>

              <div
                onClick={() => setTier('yearly')}
                className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${
                  tier === 'yearly'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-white/10 hover:border-white/20 text-text-muted'
                }`}
              >
                <div className="text-xs font-bold uppercase">Yearly Plan</div>
                <div className="text-lg font-extrabold mt-1">$120<span className="text-xs font-normal">/yr</span></div>
                <div className="text-[10px] text-primary/80 font-medium">Save $60/year</div>
              </div>
            </div>

            {/* Charity Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase text-text-muted mb-1">
                Select Supported Charity
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
              <p className="text-[10px] text-text-muted mt-1">
                {charities.find((c) => c.id === charityId)?.description || 'Selected charity description'}
              </p>
            </div>

            {/* Contribution Percentage slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold uppercase text-text-muted">
                  Subscription Allocation to Charity
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

            {/* Dev role helper toggle */}
            <div className="flex items-center space-x-2 pt-2">
              <input
                id="isAdmin"
                type="checkbox"
                className="rounded accent-primary"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
              />
              <label htmlFor="isAdmin" className="text-xs text-text-muted cursor-pointer">
                Create as Administrator account (for testing admin console)
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 btn-premium text-sm font-semibold rounded-lg"
            >
              {loading ? 'Processing...' : 'Subscribe & Register'}
            </button>

            <div className="text-center mt-4 text-xs text-text-muted">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-bold">
                Log In here
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
