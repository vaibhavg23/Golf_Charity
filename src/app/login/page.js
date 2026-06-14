'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { signIn, user } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email or password.');
      setLoading(false);
    }
  };

  // Helper helper to quickly insert demo credentials
  const fillDemoCredentials = (role) => {
    if (role === 'admin') {
      setEmail('admin@digitalheroes.co.in');
      setPassword('admin123');
    } else {
      setEmail('subscriber@digitalheroes.co.in');
      setPassword('sub123');
    }
  };

  return (
    <main id="main-content" className="min-h-screen liquid-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-purple/10 blur-[120px]" />

      <div className="w-full max-w-md glass-card rounded-2xl p-8 border border-white/10 z-10">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-gradient-hero mb-2">
            Welcome Back
          </h1>
          <p className="text-text-muted text-sm">
            Sign in to track your scores, check draws, and manage charity impact.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded bg-red-900/30 border border-red-500/30 text-red-400 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 btn-premium text-sm font-semibold rounded-lg"
          >
            {loading ? 'Signing In...' : 'Log In'}
          </button>
        </form>

        {/* Quick Demo Access Credentials */}
        <div className="mt-6 border-t border-white/5 pt-4">
          <div className="text-center text-xs font-bold text-gradient-hero uppercase mb-3">
            Quick Test Accounts
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => fillDemoCredentials('subscriber')}
              className="flex-1 py-1.5 px-3 rounded bg-white/5 border border-white/10 text-[11px] font-medium text-text-muted hover:text-white hover:border-white/20 transition-all"
            >
              Demo Subscriber
            </button>
            <button
              onClick={() => fillDemoCredentials('admin')}
              className="flex-1 py-1.5 px-3 rounded bg-white/5 border border-white/10 text-[11px] font-medium text-text-muted hover:text-white hover:border-white/20 transition-all"
            >
              Demo Administrator
            </button>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-text-muted">
          Don't have an account?{' '}
          <Link href="/signup" className="text-primary hover:underline font-bold">
            Sign Up here
          </Link>
        </div>
      </div>
    </main>
  );
}
