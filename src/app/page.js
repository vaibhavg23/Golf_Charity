'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();
  const [featuredCharities, setFeaturedCharities] = useState([]);
  const [loadingCharities, setLoadingCharities] = useState(true);

  // Load featured charities
  useEffect(() => {
    async function getFeatured() {
      try {
        const { data, error } = await supabase
          .from('charities')
          .select('*')
          .eq('is_featured', true)
          .limit(2);

        if (data && data.length > 0 && !error) {
          setFeaturedCharities(data);
        } else {
          // Fallbacks if DB connection is not ready
          setFeaturedCharities([
            {
              id: '00000000-0000-0000-0000-000000000001',
              name: 'Green Canopy Trust',
              description: 'Restoring native woodlands, creating urban micro-forests, and fighting deforestation through community-driven planting campaigns.',
              logo_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=150&h=150&fit=crop',
              cover_image_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=400&fit=crop',
            },
            {
              id: '00000000-0000-0000-0000-000000000004',
              name: 'Cardiac Health Research',
              description: 'Funding ground-breaking clinical trials, purchasing defibrillators for local community spaces, and running awareness events.',
              logo_url: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=150&h=150&fit=crop',
              cover_image_url: 'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=800&h=400&fit=crop',
            }
          ]);
        }
      } catch (e) {
        console.warn('DB read issue, showing featured charity fallbacks:', e);
      } finally {
        setLoadingCharities(false);
      }
    }
    getFeatured();
  }, []);

  return (
    <div className="min-h-screen liquid-bg text-text-main flex flex-col relative overflow-hidden font-sans">
      {/* Main Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between z-20 border-b border-white/5">
        <div className="flex items-center space-x-2">
          <span className="h-8 w-8 rounded-lg bg-gradient-to-tr from-primary to-gold flex items-center justify-center font-extrabold text-black text-lg shadow-lg">
            H
          </span>
          <span className="text-xl font-extrabold tracking-wider text-white">
            DIGITAL<span className="text-mossamber font-semibold font-serif italic">HEROES</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center bg-zinc-950/40 border border-white/5 backdrop-blur-md rounded-full p-1 text-xs font-semibold text-text-muted shadow-lg">
          <Link href="#concept" className="px-4 py-2 hover:text-white hover:bg-white/5 rounded-full transition-all duration-300">The Concept</Link>
          <Link href="#charities" className="px-4 py-2 hover:text-white hover:bg-white/5 rounded-full transition-all duration-300">Our Charities</Link>
          <Link href="#draw" className="px-4 py-2 hover:text-white hover:bg-white/5 rounded-full transition-all duration-300">Draw Mechanics</Link>
          {user && (
            <Link href="/dashboard" className="px-4 py-2 text-primary hover:text-primary-hover hover:bg-white/5 rounded-full transition-all duration-300 font-bold">
              User Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center space-x-4">
          {user ? (
            <Link href="/dashboard" className="py-2 px-5 btn-premium text-xs rounded-full">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-xs text-text-muted hover:text-white font-semibold px-3 py-2 transition-colors">
                Log In
              </Link>
              <Link href="/signup" className="py-2 px-5 btn-premium text-xs rounded-full">
                Join Now
              </Link>
            </>
          )}
        </div>
      </header>

      <main id="main-content" className="flex-1 flex flex-col relative w-full">

      {/* Hero Section */}
      <section className="flex-1 max-w-7xl mx-auto px-6 py-20 md:py-32 flex flex-col items-center justify-center text-center z-10 relative">
        <div className="inline-flex py-1 px-4 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider mb-6 animate-pulse">
          Where Performance Meets Purpose
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold leading-none tracking-tight mb-6 max-w-4xl text-gradient-hero">
          Track Your Golf Game. <br />
          <span className="text-mossamber font-serif font-normal italic">Fund Life-Saving Charity.</span>
        </h1>
        <p className="text-text-muted text-base md:text-lg max-w-2xl mb-10">
          Digital Heroes is a premium subscription platform combining golf score tracking, charity contributions, and a monthly jackpot draw. Direct 10%+ of your fees to your favorite cause and win major prizes.
        </p>

        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <Link href="/signup" className="py-4 px-8 btn-premium text-sm font-bold rounded-lg shadow-xl shadow-primary/20">
            Subscribe & Join the Draw
          </Link>
          <Link href="#concept" className="py-4 px-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold text-white transition-all">
            Explore Mechanics
          </Link>
        </div>
      </section>

      {/* Concept Breakdown Section */}
      <section id="concept" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5 relative z-10 w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-gradient-hero mb-3">
            How Digital Heroes Works
          </h2>
          <p className="text-text-muted max-w-lg mx-auto text-sm">
            A seamless three-step cycle built to improve your golf performance and support the community.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card rounded-xl p-6 border border-white/5">
            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary mb-4">
              1
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Subscribe & Choose Cause</h3>
            <p className="text-text-muted text-sm leading-relaxed">
              Join for $15/month or $120/year. Direct at least 10% (up to 100%) of your subscription to a verified charity from our directory.
            </p>
          </div>

          <div className="glass-card rounded-xl p-6 border border-white/5">
            <div className="h-10 w-10 rounded-lg bg-purple/10 border border-purple/20 flex items-center justify-center font-bold text-purple mb-4">
              2
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Record Your Latest Scores</h3>
            <p className="text-text-muted text-sm leading-relaxed">
              Keep a rolling log of your last 5 Stableford scores (range 1 - 45). Adding a new score automatically archives the oldest record.
            </p>
          </div>

          <div className="glass-card rounded-xl p-6 border border-white/5">
            <div className="h-10 w-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center font-bold text-yellow-400 mb-4">
              3
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Participate in Monthly Draws</h3>
            <p className="text-text-muted text-sm leading-relaxed">
              Your active 5 scores act as your raffle ticket. Match 3, 4, or 5 numbers with the winning monthly draw to win shares of the prize pool!
            </p>
          </div>
        </div>
      </section>

      {/* Featured Charities Section */}
      <section id="charities" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5 w-full relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-gradient-hero mb-3">
              Spotlight Charities
            </h2>
            <p className="text-text-muted max-w-lg text-sm">
              Your subscription creates real-world impact. Search and support vetted environmental and humanitarian projects.
            </p>
          </div>
          <Link href="/charities" className="mt-4 md:mt-0 text-sm font-bold text-primary hover:underline inline-flex items-center">
            View All Charities &rarr;
          </Link>
        </div>

        {loadingCharities ? (
          <div className="text-center py-10 text-text-muted animate-pulse">Loading Spotlight Organizations...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {featuredCharities.map((charity) => (
              <div key={charity.id} className="glass-card rounded-2xl overflow-hidden border border-white/5 flex flex-col h-full group">
                <div className="h-48 relative overflow-hidden bg-zinc-900">
                  <img
                    src={charity.cover_image_url}
                    alt={charity.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-3 mb-3">
                      <img src={charity.logo_url} alt={charity.name} className="h-10 w-10 rounded-full object-cover border border-white/10" />
                      <h3 className="text-xl font-bold text-white">{charity.name}</h3>
                    </div>
                    <p className="text-text-muted text-xs leading-relaxed mb-6">
                      {charity.description}
                    </p>
                  </div>
                  <div className="border-t border-white/5 pt-4 flex items-center justify-between">
                    <span className="text-[11px] text-primary bg-primary/10 border border-primary/20 py-1 px-2.5 rounded-full font-bold uppercase">
                      Featured Partner
                    </span>
                    <Link href={`/charities`} className="text-xs text-white hover:underline font-semibold">
                      Read Profile
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-10 border-t border-white/5 z-20 flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted">
        <div>
          &copy; {new Date().getFullYear()} Digital Heroes. All rights reserved.
        </div>
        <div className="flex space-x-6 mt-4 sm:mt-0 font-medium">
          <Link href="/charities" className="hover:text-white transition-colors">Charities Directory</Link>
          <Link href="/signup" className="hover:text-white transition-colors">Subscription Plans</Link>
          <Link href="/login" className="hover:text-white transition-colors">User Login</Link>
        </div>
      </footer>
    </div>
  );
}
