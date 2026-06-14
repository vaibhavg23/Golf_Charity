'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

// Default charities for fallback
const DEFAULT_CHARITIES = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Green Canopy Trust',
    description: 'Restoring native woodlands, creating urban micro-forests, and fighting deforestation through community-driven planting campaigns.',
    logo_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=150&h=150&fit=crop',
    cover_image_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=400&fit=crop',
    website_url: 'https://greencanopytrust.org',
    upcoming_events: [
      { id: 'e1', name: 'Forest Fairways Planting Day', date: '2026-07-12', location: 'Sherwood Golf Club', description: 'Help us plant 500 saplings along the club perimeter followed by an eco-lunch.' },
      { id: 'e2', name: 'Charity Golf Scramble', date: '2026-08-25', location: 'Highland Green Course', description: 'Annual 4-person team scramble supporting local canopy restoration. Special prizes for longest drive.' }
    ]
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Blue Ocean Alliance',
    description: 'Tackling ocean plastic pollution, funding reef restoration, and supporting marine biology research labs globally.',
    logo_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150&h=150&fit=crop',
    cover_image_url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&h=400&fit=crop',
    website_url: 'https://blueoceanalliance.org',
    upcoming_events: [
      { id: 'e3', name: 'Ocean Cleanup Drive', date: '2026-06-30', location: 'Sandy Shores Beach', description: 'Community beach sweep. Lunch and clean-up kits provided.' },
      { id: 'e4', name: 'Charity Putting Challenge', date: '2026-07-28', location: 'Ocean Reef Putting Green', description: '18-hole putting contest with registration fees going directly to coral seeding project.' }
    ]
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Youth Sports Trust',
    description: 'Providing equipment, coaching, and facilities to disadvantaged communities to ensure every child gets access to healthy sporting activities.',
    logo_url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=150&h=150&fit=crop',
    cover_image_url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&h=400&fit=crop',
    website_url: 'https://youthsportstrust.org',
    upcoming_events: [
      { id: 'e5', name: 'Junior Golf Academy Opening', date: '2026-07-05', location: 'City Park Driving Range', description: 'Free lessons and equipment trials for children aged 8-16.' },
      { id: 'e6', name: 'Pro-Am Charity Invitational', date: '2026-09-15', location: 'Royal Pines Championship Course', description: 'Play alongside local pros. Proceeds support sporting grants for low-income schools.' }
    ]
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'Cardiac Health Research',
    description: 'Funding ground-breaking clinical trials, purchasing defibrillators for local community spaces, and running awareness events.',
    logo_url: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=150&h=150&fit=crop',
    cover_image_url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&h=400&fit=crop',
    website_url: 'https://cardiacresearch.org',
    upcoming_events: [
      { id: 'e7', name: 'Heart Health Screening Day', date: '2026-06-25', location: 'Centennial Golf Lodge', description: 'Free blood pressure and heart rate variability checks for members and public.' },
      { id: 'e8', name: 'Golf Marathon: 72 Holes', date: '2026-08-01', location: 'Whispering Pines Club', description: 'Sponsor our players as they attempt to play 4 full rounds in a single day for cardiac research.' }
    ]
  }
];

export default function CharitiesPage() {
  const { user } = useAuth();

  // Core states
  const [charities, setCharities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCharity, setSelectedCharity] = useState(null);

  // Donation modal states
  const [donationAmount, setDonationAmount] = useState('25');
  const [donationStatus, setDonationStatus] = useState(''); // '', 'processing', 'success', 'error'

  useEffect(() => {
    async function loadCharities() {
      try {
        const { data, error } = await supabase
          .from('charities')
          .select('*')
          .order('name');
        if (data && data.length > 0 && !error) {
          setCharities(data);
        } else {
          setCharities(DEFAULT_CHARITIES);
        }
      } catch (e) {
        setCharities(DEFAULT_CHARITIES);
      } finally {
        setLoading(false);
      }
    }
    loadCharities();
  }, []);

  const handleDonate = async (e) => {
    e.preventDefault();
    if (!selectedCharity) return;

    setDonationStatus('processing');
    const amount = Number(donationAmount);
    if (isNaN(amount) || amount <= 0) {
      setDonationStatus('error');
      return;
    }

    try {
      const { error } = await supabase
        .from('donations')
        .insert({
          user_id: user?.id || null, // supports public/anonymous donations
          charity_id: selectedCharity.id,
          amount: amount,
          payment_status: 'completed'
        });

      if (error) throw error;
      setDonationStatus('success');
      setTimeout(() => {
        setDonationStatus('');
        setDonationAmount('25');
      }, 2000);
    } catch (err) {
      console.error('Donation error:', err);
      setDonationStatus('error');
    }
  };

  // Filter list by search query
  const filteredCharities = charities.filter((charity) =>
    charity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    charity.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen liquid-bg text-text-main flex flex-col relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-purple/5 blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between z-20 border-b border-white/5">
        <Link href="/" className="flex items-center space-x-2">
          <span className="h-8 w-8 rounded-lg bg-gradient-to-tr from-primary to-gold flex items-center justify-center font-extrabold text-black text-lg shadow-lg">
            H
          </span>
          <span className="text-xl font-extrabold tracking-wider text-white">
            DIGITAL<span className="text-mossamber font-semibold font-serif italic">HEROES</span>
          </span>
        </Link>
        <div className="flex space-x-4 items-center">
          <Link href="/" className="text-xs text-text-muted hover:text-white font-semibold">
            Home
          </Link>
          {user ? (
            <Link href="/dashboard" className="py-1.5 px-4 btn-premium text-xs rounded-full">
              Dashboard
            </Link>
          ) : (
            <Link href="/signup" className="py-1.5 px-4 btn-premium text-xs rounded-full">
              Join Now
            </Link>
          )}
        </div>
      </header>

      {/* Content */}
      <main id="main-content" className="flex-1 max-w-7xl mx-auto px-6 py-12 z-10 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Directory search and list (Col span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gradient-hero mb-2">
              Charity Directory
            </h1>
            <p className="text-text-muted text-sm">
              Discover local and global initiatives, view upcoming fundraising events, and contribute directly.
            </p>
          </div>

          {/* Search bar */}
          <div className="w-full">
            <input
              type="text"
              placeholder="Search charities by name or mission..."
              className="w-full p-3.5 glass-input text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Listings */}
          {loading ? (
            <div className="text-center py-10 text-text-muted animate-pulse">Loading Directory...</div>
          ) : filteredCharities.length === 0 ? (
            <div className="text-center py-12 text-text-muted border border-white/5 rounded-xl bg-white/5">
              No charities found matching "{searchQuery}"
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCharities.map((charity) => (
                <div
                  key={charity.id}
                  onClick={() => setSelectedCharity(charity)}
                  className={`glass-card rounded-xl overflow-hidden border cursor-pointer flex flex-col justify-between transition-all h-full ${
                    selectedCharity?.id === charity.id
                      ? 'border-primary shadow-lg shadow-primary/5'
                      : 'border-white/5'
                  }`}
                >
                  <div className="h-32 bg-zinc-900 overflow-hidden relative">
                    <img src={charity.cover_image_url} alt={charity.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <img src={charity.logo_url} alt={charity.name} className="h-8 w-8 rounded-full border border-white/10" />
                        <h3 className="text-base font-bold text-white leading-tight">{charity.name}</h3>
                      </div>
                      <p className="text-text-muted text-xs line-clamp-3 leading-relaxed mb-4">
                        {charity.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-white/5 pt-3 mt-2">
                      <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 py-0.5 px-2 rounded-full font-bold uppercase">
                        Active Partner
                      </span>
                      <span className="text-white font-semibold hover:underline">
                        View Details &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Charity profile detail & direct donation (Col span 1) */}
        <div className="lg:col-span-1">
          {selectedCharity ? (
            <div className="glass-card rounded-2xl border border-white/10 overflow-hidden sticky top-6">
              <div className="h-40 bg-zinc-900 relative">
                <img src={selectedCharity.cover_image_url} alt={selectedCharity.name} className="w-full h-full object-cover" />
                <button
                  onClick={() => setSelectedCharity(null)}
                  className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center font-bold text-xs hover:bg-black"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start space-x-3">
                  <img src={selectedCharity.logo_url} alt={selectedCharity.name} className="h-12 w-12 rounded-full border border-white/10" />
                  <div>
                    <h2 className="text-xl font-bold text-white leading-tight">{selectedCharity.name}</h2>
                    {selectedCharity.website_url && (
                      <a
                        href={selectedCharity.website_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-primary hover:underline"
                      >
                        Visit Website ↗
                      </a>
                    )}
                  </div>
                </div>

                {/* Mission */}
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted">About Mission</h4>
                  <p className="text-text-muted text-xs leading-relaxed">{selectedCharity.description}</p>
                </div>

                {/* Upcoming Events */}
                {selectedCharity.upcoming_events && selectedCharity.upcoming_events.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Upcoming Events</h4>
                    <div className="space-y-2">
                      {selectedCharity.upcoming_events.map((event, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-1 text-xs">
                          <div className="flex justify-between font-bold text-white">
                            <span>{event.name}</span>
                            <span className="text-primary font-medium">{event.date}</span>
                          </div>
                          <div className="text-[10px] text-text-muted">{event.location}</div>
                          <p className="text-[11px] text-text-muted font-normal mt-1 leading-normal">
                            {event.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct Donation Form */}
                <div className="border-t border-white/5 pt-5 space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-text-muted text-center">
                    Make a Direct Contribution
                  </div>

                  {donationStatus === 'success' ? (
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center text-primary text-xs font-bold uppercase tracking-wide">
                      Donation Successful! Thank You!
                    </div>
                  ) : (
                    <form onSubmit={handleDonate} className="space-y-3">
                      <div>
                        <label className="block text-[10px] uppercase text-text-muted font-semibold mb-1">
                          Amount ($)
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {['10', '25', '50', '100'].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setDonationAmount(val)}
                              className={`py-1.5 rounded text-xs font-bold border transition-all ${
                                donationAmount === val
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-white/5 bg-white/5 hover:border-white/20 text-text-muted'
                              }`}
                            >
                              ${val}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-text-muted">$</span>
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="Custom Amount"
                          className="w-full pl-6 pr-3 py-2 glass-input text-xs"
                          value={donationAmount}
                          onChange={(e) => setDonationAmount(e.target.value)}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={donationStatus === 'processing'}
                        className="w-full py-2.5 btn-premium text-xs font-bold rounded-lg uppercase tracking-wider"
                      >
                        {donationStatus === 'processing' ? 'Processing...' : `Donate $${donationAmount} Now`}
                      </button>
                    </form>
                  )}
                  <p className="text-[10px] text-center text-text-muted leading-relaxed">
                    Direct donations are sent directly to the charity and are not tied to draw entries.
                  </p>
                </div>

              </div>
            </div>
          ) : (
            <div className="glass-card rounded-2xl border border-white/5 p-8 text-center text-text-muted text-sm h-full flex flex-col justify-center items-center space-y-3">
              <span className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-xl">ℹ️</span>
              <div>Select a charity from the list to view its complete profile, events directory, and make direct donations.</div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
