'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import DashboardGuard from '@/components/DashboardGuard';
import Link from 'next/link';

export default function AdminPage() {
  const { user } = useAuth();

  // Navigation state
  const [activeTab, setActiveTab] = useState('reports');

  // Reports & Analytics States
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscribers: 0,
    totalPrizePool: 0,
    totalCharityContributions: 0,
    jackpotRollover: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // User Manager States
  const [usersList, setUsersList] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userScores, setUserScores] = useState([]);
  const [editingScoreId, setEditingScoreId] = useState(null);
  const [scoreVal, setScoreVal] = useState('');
  const [scoreDate, setScoreDate] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Charity CRUD States
  const [charitiesList, setCharitiesList] = useState([]);
  const [editingCharity, setEditingCharity] = useState(null); // null means adding new
  const [charityForm, setCharityForm] = useState({
    name: '',
    description: '',
    website_url: '',
    logo_url: '',
    cover_image_url: '',
    is_featured: false,
  });
  const [loadingCharities, setLoadingCharities] = useState(false);

  // Winners Queue States
  const [winnersQueue, setWinnersQueue] = useState([]);
  const [loadingWinners, setLoadingWinners] = useState(false);

  // Draw Management States
  const [drawLogic, setDrawLogic] = useState('random'); // 'random' | 'algorithmic'
  const [algoWeighting, setAlgoWeighting] = useState('most_frequent'); // 'most_frequent' | 'least_frequent'
  const [simulation, setSimulation] = useState(null); // holds simulated draw data
  const [simulating, setSimulating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [lastDraw, setLastDraw] = useState(null);

  // Load General Stats
  const loadStats = async () => {
    setLoadingStats(true);
    try {
      // 1. Total users & Active subscribers
      const { data: profiles, error: pError } = await supabase.from('profiles').select('id, subscription_status, subscription_tier, charity_contribution_percent');
      if (pError) throw pError;

      const totalU = profiles.length;
      const activeS = profiles.filter((p) => p.subscription_status === 'active').length;

      // Calculate total mock revenue generated so far (e.g. active monthly * $15, yearly * $10 per month equivalent)
      // Standard pricing monthly is $15, yearly is $120 ($10/mo equivalent)
      let monthlyRevenue = 0;
      let totalCharityAllocations = 0;

      profiles.forEach((p) => {
        if (p.subscription_status === 'active') {
          const rate = p.subscription_tier === 'yearly' ? 10 : 15;
          monthlyRevenue += rate;
          totalCharityAllocations += rate * ((p.charity_contribution_percent || 10) / 100);
        }
      });

      // 2. Fetch past published draws to calculate cumulative jackpot / rollover values
      const { data: draws, error: dError } = await supabase.from('draws').select('*').order('draw_date', { ascending: false });
      if (dError) throw dError;

      const totalPools = draws.reduce((acc, curr) => acc + Number(curr.prize_pool_total), 0);
      const currentRollover = draws.length > 0 ? Number(draws[0].jackpot_rollover_carried_forward) : 0;

      // 3. Independent donations totals
      const { data: donations, error: donError } = await supabase.from('donations').select('amount');
      if (donError) throw donError;
      const totalDirectDonations = donations.reduce((acc, curr) => acc + Number(curr.amount), 0);

      setStats({
        totalUsers: totalU,
        activeSubscribers: activeS,
        totalPrizePool: totalPools,
        totalCharityContributions: totalCharityAllocations + totalDirectDonations,
        jackpotRollover: currentRollover,
      });
      if (draws.length > 0) setLastDraw(draws[0]);
    } catch (e) {
      console.error('Error loading admin stats:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  // Load User Profiles
  const loadUsersList = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (data && !error) setUsersList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load specific user scores
  const loadUserScores = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('golf_scores')
        .select('*')
        .eq('user_id', userId)
        .order('score_date', { ascending: false });
      if (data && !error) setUserScores(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Load Charities
  const loadCharitiesList = async () => {
    setLoadingCharities(true);
    try {
      const { data, error } = await supabase.from('charities').select('*').order('name');
      if (data && !error) setCharitiesList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCharities(false);
    }
  };

  // Load Winners Verification Queue
  const loadWinnersQueue = async () => {
    setLoadingWinners(true);
    try {
      const { data, error } = await supabase
        .from('draw_entrants')
        .select('*, draws(*), profiles(*)')
        .gt('prize_won', 0)
        .order('created_at', { ascending: false });

      if (data && !error) setWinnersQueue(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingWinners(false);
    }
  };

  // Trigger loads based on active tab
  useEffect(() => {
    if (activeTab === 'reports') loadStats();
    if (activeTab === 'users') loadUsersList();
    if (activeTab === 'charities') loadCharitiesList();
    if (activeTab === 'winners') loadWinnersQueue();
  }, [activeTab]);

  // Initial load
  useEffect(() => {
    loadStats();
  }, []);

  // Update User role / subscription directly
  const handleUpdateUserStatus = async (userId, field, value) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', userId);

      if (error) throw error;
      await loadUsersList();
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, [field]: value });
      }
    } catch (e) {
      alert(e.message || 'Failed to update user profile.');
    }
  };

  // Override / Edit a specific score from user list
  const handleUpdateUserScore = async (e) => {
    e.preventDefault();
    const score = Number(scoreVal);
    if (isNaN(score) || score < 1 || score > 45) {
      alert('Stableford score must be between 1 and 45.');
      return;
    }

    try {
      const { error } = await supabase
        .from('golf_scores')
        .update({
          score,
          score_date: scoreDate,
        })
        .eq('id', editingScoreId);

      if (error) throw error;

      setEditingScoreId(null);
      setScoreVal('');
      setScoreDate('');
      await loadUserScores(selectedUser.id);
    } catch (err) {
      alert(err.message || 'Failed to update score.');
    }
  };

  // Add/Edit Charity CRUD operations
  const handleSaveCharity = async (e) => {
    e.preventDefault();
    if (!charityForm.name.trim()) return;

    try {
      if (editingCharity) {
        // Edit existing
        const { error } = await supabase
          .from('charities')
          .update(charityForm)
          .eq('id', editingCharity.id);
        if (error) throw error;
      } else {
        // Add new
        const { error } = await supabase
          .from('charities')
          .insert(charityForm);
        if (error) throw error;
      }

      setCharityForm({
        name: '',
        description: '',
        website_url: '',
        logo_url: '',
        cover_image_url: '',
        is_featured: false,
      });
      setEditingCharity(null);
      await loadCharitiesList();
      alert('Charity saved successfully!');
    } catch (err) {
      alert(err.message || 'Failed to save charity.');
    }
  };

  const handleDeleteCharity = async (id) => {
    if (!confirm('Are you sure you want to delete this charity? All references will be set to null.')) return;
    try {
      const { error } = await supabase.from('charities').delete().eq('id', id);
      if (error) throw error;
      await loadCharitiesList();
    } catch (e) {
      alert(e.message || 'Failed to delete charity.');
    }
  };

  const handleStartEditCharity = (c) => {
    setEditingCharity(c);
    setCharityForm({
      name: c.name,
      description: c.description || '',
      website_url: c.website_url || '',
      logo_url: c.logo_url || '',
      cover_image_url: c.cover_image_url || '',
      is_featured: c.is_featured || false,
    });
  };

  // Verification reviews: Approve/Reject winner screenshots
  const handleVerifySubmission = async (entrantId, status) => {
    try {
      const { error } = await supabase
        .from('draw_entrants')
        .update({
          verification_status: status,
          payout_status: status === 'approved' ? 'pending' : 'none',
        })
        .eq('id', entrantId);

      if (error) throw error;
      await loadWinnersQueue();
    } catch (e) {
      alert(e.message || 'Failed to verify submission.');
    }
  };

  const handleCompletePayout = async (entrantId) => {
    try {
      const { error } = await supabase
        .from('draw_entrants')
        .update({ payout_status: 'paid' })
        .eq('id', entrantId);

      if (error) throw error;
      await loadWinnersQueue();
    } catch (e) {
      alert(e.message || 'Failed to complete payout.');
    }
  };

  // ==========================================
  // CUSTOM DRAW ENGINE SIMULATOR ALGORITHMS
  // ==========================================
  const runDrawSimulation = async () => {
    setSimulating(true);
    setSimulation(null);

    try {
      // 1. Fetch active subscribers
      const { data: subscribers, error: sErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('subscription_status', 'active');
      if (sErr) throw sErr;

      if (subscribers.length === 0) {
        alert('Simulation aborted: There are no active subscribers to draw from.');
        setSimulating(false);
        return;
      }

      // 2. Fetch all scores for calculation of entrants and weights
      const { data: scoresData, error: scErr } = await supabase.from('golf_scores').select('*');
      if (scErr) throw scErr;

      // Group active user scores
      const entrants = [];
      const scoreFrequency = {};

      // Seed frequency map (1-45)
      for (let i = 1; i <= 45; i++) scoreFrequency[i] = 0;

      subscribers.forEach((sub) => {
        // Filter this sub's scores
        const subScores = scoresData
          .filter((s) => s.user_id === sub.id)
          .sort((a, b) => new Date(b.score_date) - new Date(a.score_date))
          .slice(0, 5) // latest 5 only
          .map((s) => s.score);

        // Sub is only eligible for draw if they have entered exactly 5 scores
        if (subScores.length === 5) {
          entrants.push({
            user: sub,
            scores: subScores,
          });
          // Update global frequencies
          subScores.forEach((num) => {
            scoreFrequency[num] = (scoreFrequency[num] || 0) + 1;
          });
        }
      });

      if (entrants.length === 0) {
        alert('Simulation aborted: No active subscribers have recorded exactly 5 scores.');
        setSimulating(false);
        return;
      }

      // 3. Generate 5 winning numbers
      let winningNumbers = [];
      if (drawLogic === 'random') {
        // Standard random lottery
        const pool = Array.from({ length: 45 }, (_, i) => i + 1);
        for (let i = 0; i < 5; i++) {
          const idx = Math.floor(Math.random() * pool.length);
          winningNumbers.push(pool.splice(idx, 1)[0]);
        }
      } else {
        // Algorithmic (frequency weighted)
        // Calculate probability weights
        const weightedPool = [];
        Object.entries(scoreFrequency).forEach(([num, freq]) => {
          let weight = Number(freq);
          if (algoWeighting === 'least_frequent') {
            // Reverse frequencies: base weight of 10 - frequency (capped at 0)
            weight = Math.max(1, 10 - Number(freq));
          }
          // Push key 'weight' times
          for (let w = 0; w < weight; w++) {
            weightedPool.push(Number(num));
          }
        });

        // If pool is empty (no scores recorded at all), fallback to random
        if (weightedPool.length === 0) {
          const pool = Array.from({ length: 45 }, (_, i) => i + 1);
          for (let i = 0; i < 5; i++) {
            const idx = Math.floor(Math.random() * pool.length);
            winningNumbers.push(pool.splice(idx, 1)[0]);
          }
        } else {
          // Select 5 unique numbers
          const poolCopy = [...weightedPool];
          while (winningNumbers.length < 5 && poolCopy.length > 0) {
            const idx = Math.floor(Math.random() * poolCopy.length);
            const chosen = poolCopy[idx];
            if (!winningNumbers.includes(chosen)) {
              winningNumbers.push(chosen);
            }
            // Remove chosen value entirely from selection to ensure uniqueness
            const cleanPool = poolCopy.filter((item) => item !== chosen);
            poolCopy.length = 0;
            poolCopy.push(...cleanPool);
          }
          // If we couldn't get 5 due to lack of distinct weighted values, fill with random numbers
          while (winningNumbers.length < 5) {
            const randomFill = Math.floor(Math.random() * 45) + 1;
            if (!winningNumbers.includes(randomFill)) {
              winningNumbers.push(randomFill);
            }
          }
        }
      }

      // 4. Calculate prize pool details
      // Average subscription fee is $15. Total monthly fee base: subscribers * $15
      const monthlyFeesCollected = subscribers.length * 15;
      // Fixed portion contributing to prize pool is 50%
      const monthlyPrizeContribution = monthlyFeesCollected * 0.50;
      
      // Pull rolled over jackpot from last published draw
      const rolloverAdded = stats.jackpotRollover;
      const totalPool = monthlyPrizeContribution + rolloverAdded;

      // Prize Tier breakdown shares: 5-Match (40% + Rollover), 4-Match (35%), 3-Match (25%)
      const poolShare5 = (monthlyPrizeContribution * 0.40) + rolloverAdded;
      const poolShare4 = monthlyPrizeContribution * 0.35;
      const poolShare3 = monthlyPrizeContribution * 0.25;

      // 5. Match tickets & calculate winners
      const winners5 = [];
      const winners4 = [];
      const winners3 = [];

      entrants.forEach((entrant) => {
        // Calculate matches count (order-independent set match)
        // Treatment of duplicate scores: treat user ticket as multiset and winning numbers as unique set.
        // A user score matches if it matches a number in winningNumbers.
        let matchCount = 0;
        const matchedNums = [];
        
        entrant.scores.forEach((sc) => {
          if (winningNumbers.includes(sc) && !matchedNums.includes(sc)) {
            matchCount++;
            matchedNums.push(sc); // ensure a duplicate score doesn't match twice if drawn once
          }
        });

        const entrantData = {
          userId: entrant.user.id,
          fullName: entrant.user.full_name,
          email: entrant.user.email,
          ticket: entrant.scores,
          matches: matchCount,
          prize: 0,
        };

        if (matchCount === 5) winners5.push(entrantData);
        else if (matchCount === 4) winners4.push(entrantData);
        else if (matchCount === 3) winners3.push(entrantData);
      });

      // Calculate share amounts split equally
      const prize5 = winners5.length > 0 ? (poolShare5 / winners5.length).toFixed(2) : 0;
      const prize4 = winners4.length > 0 ? (poolShare4 / winners4.length).toFixed(2) : 0;
      const prize3 = winners3.length > 0 ? (poolShare3 / winners3.length).toFixed(2) : 0;

      // Set individual prizes
      winners5.forEach((w) => (w.prize = Number(prize5)));
      winners4.forEach((w) => (w.prize = Number(prize4)));
      winners3.forEach((w) => (w.prize = Number(prize3)));

      // Rollover check: If no 5-match winner, 5-match share rolls over to next month
      const rolloverCarriedForward = winners5.length === 0 ? poolShare5 : 0;

      setSimulation({
        winningNumbers,
        prizePoolTotal: totalPool,
        rolloverAdded,
        rolloverCarriedForward,
        tier5Share: poolShare5,
        tier4Share: poolShare4,
        tier3Share: poolShare3,
        winners5,
        winners4,
        winners3,
        entrantsCount: entrants.length,
      });

    } catch (err) {
      alert(err.message || 'Draw simulation failed.');
    } finally {
      setSimulating(false);
    }
  };

  // Publish Simulated Draw Results to Supabase Database
  const publishDrawResults = async () => {
    if (!simulation) return;
    setPublishing(true);

    try {
      // 1. Insert Draw record
      const { data: drawRecord, error: drError } = await supabase
        .from('draws')
        .select('*')
        .order('draw_date', { ascending: false });

      const { data: newDraw, error: dError } = await supabase
        .from('draws')
        .insert({
          draw_date: new Date().toISOString(),
          status: 'published',
          winning_numbers: simulation.winningNumbers,
          draw_type: drawLogic,
          prize_pool_total: simulation.prizePoolTotal,
          tier_5_match_prize: simulation.winners5.length > 0 ? Number((simulation.tier5Share / simulation.winners5.length).toFixed(2)) : 0.0,
          tier_4_match_prize: simulation.winners4.length > 0 ? Number((simulation.tier4Share / simulation.winners4.length).toFixed(2)) : 0.0,
          tier_3_match_prize: simulation.winners3.length > 0 ? Number((simulation.tier3Share / simulation.winners3.length).toFixed(2)) : 0.0,
          jackpot_rollover_added: simulation.rolloverAdded,
          jackpot_rollover_carried_forward: simulation.rolloverCarriedForward,
        })
        .select()
        .single();

      if (dError) throw dError;

      // 2. Compile and insert draw entrants
      const allEntrantsToInsert = [];
      const addEntrantsList = (winnersList, tier) => {
        winnersList.forEach((w) => {
          allEntrantsToInsert.push({
            draw_id: newDraw.id,
            user_id: w.userId,
            scores_submitted: w.ticket,
            matches_count: w.matches,
            prize_won: w.prize,
            winning_tier: tier,
            verification_status: 'none',
            payout_status: 'none',
          });
        });
      };

      addEntrantsList(simulation.winners5, 5);
      addEntrantsList(simulation.winners4, 4);
      addEntrantsList(simulation.winners3, 3);

      if (allEntrantsToInsert.length > 0) {
        const { error: eError } = await supabase.from('draw_entrants').insert(allEntrantsToInsert);
        if (eError) throw eError;
      }

      alert('Draw results published successfully to database!');
      setSimulation(null);
      await loadStats();
    } catch (e) {
      alert(e.message || 'Failed to publish draw results.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <DashboardGuard requireAdmin={true}>
      <div className="min-h-screen liquid-bg text-text-main flex flex-col font-sans">
        
        {/* Navigation Admin Header */}
        <header className="w-full bg-zinc-950/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <span className="h-8 w-8 rounded-lg bg-gradient-to-tr from-primary to-gold flex items-center justify-center font-extrabold text-black text-sm shadow-md">
              H
            </span>
            <span className="text-sm font-extrabold tracking-wider text-white">
              DIGITAL<span className="text-mossamber font-semibold font-serif italic">HEROES</span> Admin Panel
            </span>
          </div>
          <div className="flex space-x-4 text-xs font-bold">
            <Link href="/dashboard" className="text-primary hover:underline">
              Subscriber Dashboard
            </Link>
            <Link href="/" className="text-text-muted hover:text-white">
              Public Site
            </Link>
          </div>
        </header>

        {/* Workspace Layout */}
        <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8 z-10">
          
          {/* Side Menu Tab Selector */}
          <div className="lg:col-span-1 space-y-2">
            {[
              { id: 'reports', label: '📊 Reports & Analytics' },
              { id: 'draws', label: '🎲 Monthly Draw Center' },
              { id: 'winners', label: '🏆 Verification Queue' },
              { id: 'users', label: '👥 User & Score Manager' },
              { id: 'charities', label: '❤️ Charity Listings Manager' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left py-3 px-4 rounded-xl text-xs font-bold transition-all border ${
                  activeTab === tab.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-white/5 bg-white/5 hover:border-white/10 text-text-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Main Console Window (Col span 3) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* 1. REPORTS & ANALYTICS TAB */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-extrabold text-white">Platform Analytics</h2>
                
                {loadingStats ? (
                  <div className="text-center py-10 animate-pulse text-text-muted">Loading metrics...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card rounded-xl p-5 border border-white/5 space-y-1">
                      <span className="text-[10px] font-bold text-text-muted uppercase">Total Registered Users</span>
                      <div className="text-3xl font-extrabold text-white">{stats.totalUsers}</div>
                    </div>
                    <div className="glass-card rounded-xl p-5 border border-white/5 space-y-1">
                      <span className="text-[10px] font-bold text-text-muted uppercase">Active Paid Subscribers</span>
                      <div className="text-3xl font-extrabold text-primary">{stats.activeSubscribers}</div>
                    </div>
                    <div className="glass-card rounded-xl p-5 border border-white/5 space-y-1">
                      <span className="text-[10px] font-bold text-text-muted uppercase">Active Rollover Jackpot</span>
                      <div className="text-3xl font-extrabold text-gradient-gold">${stats.jackpotRollover}</div>
                    </div>
                    <div className="glass-card rounded-xl p-5 border border-white/5 space-y-1">
                      <span className="text-[10px] font-bold text-text-muted uppercase">Cumulative Prize Pools</span>
                      <div className="text-3xl font-extrabold text-white">${stats.totalPrizePool}</div>
                    </div>
                    <div className="glass-card rounded-xl p-5 border border-white/5 space-y-1 md:col-span-2">
                      <span className="text-[10px] font-bold text-text-muted uppercase">Total Generated Charity Funding</span>
                      <div className="text-3xl font-extrabold text-primary">${stats.totalCharityContributions.toFixed(2)}</div>
                    </div>
                  </div>
                )}

                {lastDraw && (
                  <div className="glass-card rounded-xl p-6 border border-white/5 space-y-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Latest Published Draw Summary</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-text-muted">Winning Draw:</span>
                        <div className="font-extrabold text-primary mt-1">[{lastDraw.winning_numbers.join(', ')}]</div>
                      </div>
                      <div>
                        <span className="text-text-muted">Logic:</span>
                        <div className="font-bold text-white uppercase mt-1">{lastDraw.draw_type}</div>
                      </div>
                      <div>
                        <span className="text-text-muted">Total Pool:</span>
                        <div className="font-bold text-white mt-1">${lastDraw.prize_pool_total}</div>
                      </div>
                      <div>
                        <span className="text-text-muted">Rollover Carried:</span>
                        <div className="font-bold text-gradient-gold mt-1">${lastDraw.jackpot_rollover_carried_forward}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. MONTHLY DRAW CENTER */}
            {activeTab === 'draws' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-white">Monthly Draw Engine</h2>
                  <p className="text-xs text-text-muted">Run simulated draw combinations and verify rollovers before publishing.</p>
                </div>

                {/* Configuration form */}
                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                  <h3 className="text-xs font-bold text-gradient-hero uppercase">Draw Logic Parameters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] uppercase text-text-muted font-bold mb-2">Draw Type</label>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setDrawLogic('random')}
                          className={`flex-1 py-2 rounded text-xs font-bold border transition-all ${
                            drawLogic === 'random' ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 bg-white/5 text-text-muted'
                          }`}
                        >
                          Random Lottery
                        </button>
                        <button
                          onClick={() => setDrawLogic('algorithmic')}
                          className={`flex-1 py-2 rounded text-xs font-bold border transition-all ${
                            drawLogic === 'algorithmic' ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 bg-white/5 text-text-muted'
                          }`}
                        >
                          Weighted Algorithmic
                        </button>
                      </div>
                    </div>

                    {drawLogic === 'algorithmic' && (
                      <div>
                        <label className="block text-[10px] uppercase text-text-muted font-bold mb-2">Algorithm Weighting</label>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setAlgoWeighting('most_frequent')}
                            className={`flex-1 py-2 rounded text-xs font-bold border transition-all ${
                              algoWeighting === 'most_frequent' ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 bg-white/5 text-text-muted'
                            }`}
                          >
                            Most Frequent User Scores
                          </button>
                          <button
                            onClick={() => setAlgoWeighting('least_frequent')}
                            className={`flex-1 py-2 rounded text-xs font-bold border transition-all ${
                              algoWeighting === 'least_frequent' ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 bg-white/5 text-text-muted'
                            }`}
                          >
                            Least Frequent User Scores
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={runDrawSimulation}
                    disabled={simulating}
                    className="w-full py-3 btn-premium text-xs font-bold uppercase tracking-wider mt-2"
                  >
                    {simulating ? 'Computing Simulation...' : '🎲 Run Simulation & Pre-Analysis'}
                  </button>
                </div>

                {/* Simulation Pre-analysis display */}
                {simulation && (
                  <div className="glass-card rounded-2xl p-6 border border-primary/20 space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div>
                        <h3 className="text-base font-extrabold text-white">Simulated Pre-Analysis Results</h3>
                        <p className="text-[10px] text-text-muted">Total Entrants: {simulation.entrantsCount} active users</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {simulation.winningNumbers.map((num, i) => (
                          <span key={i} className="h-8 w-8 rounded-full bg-primary text-black flex items-center justify-center font-black text-sm shadow shadow-primary/20">
                            {num}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Prize Pools table */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase font-bold text-text-muted">Prize Tier Pools & Winners</h4>
                      <div className="grid grid-cols-3 gap-4 text-xs font-medium">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                          <span className="text-[10px] text-gradient-gold font-bold block">5-Match (Jackpot)</span>
                          <div className="text-sm font-extrabold text-white mt-1">${simulation.tier5Share.toFixed(2)}</div>
                          <div className="text-[10px] text-text-muted mt-0.5">{simulation.winners5.length} Winners</div>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                          <span className="text-[10px] text-text-muted font-bold block">4-Match (35%)</span>
                          <div className="text-sm font-extrabold text-white mt-1">${simulation.tier4Share.toFixed(2)}</div>
                          <div className="text-[10px] text-text-muted mt-0.5">{simulation.winners4.length} Winners</div>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                          <span className="text-[10px] text-text-muted font-bold block">3-Match (25%)</span>
                          <div className="text-sm font-extrabold text-white mt-1">${simulation.tier3Share.toFixed(2)}</div>
                          <div className="text-[10px] text-text-muted mt-0.5">{simulation.winners3.length} Winners</div>
                        </div>
                      </div>
                    </div>

                    {/* Rollover check */}
                    {simulation.winners5.length === 0 && (
                      <div className="p-3.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs flex justify-between items-center">
                        <span>⚠️ No 5-match winners. Jackpot of **${simulation.rolloverCarriedForward.toFixed(2)}** carries forward!</span>
                        <span className="font-bold">Rollover Enforced</span>
                      </div>
                    )}

                    {/* Publish Trigger */}
                    <button
                      onClick={publishDrawResults}
                      disabled={publishing}
                      className="w-full py-3 btn-premium text-xs font-bold uppercase tracking-wider"
                    >
                      {publishing ? 'Publishing draw...' : 'Publish Official Draw Results'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3. WINNER VERIFICATION QUEUE */}
            {activeTab === 'winners' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-white">Winner Verification Queue</h2>
                  <p className="text-xs text-text-muted">Review winner scorecards, approve verification proof, and process payouts.</p>
                </div>

                {loadingWinners ? (
                  <div className="text-center py-10 animate-pulse text-text-muted">Loading winners queue...</div>
                ) : winnersQueue.length === 0 ? (
                  <div className="text-center py-12 text-xs text-text-muted bg-white/5 rounded-xl border border-white/5">
                    No prize winners found in the database logs yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {winnersQueue.map((entrant) => (
                      <div key={entrant.id} className="p-5 rounded-xl bg-white/5 border border-white/5 space-y-4 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-white">{entrant.profiles.full_name} ({entrant.profiles.email})</div>
                            <div className="text-[10px] text-text-muted mt-0.5">
                              Matched {entrant.matches_count} | Ticket: [{entrant.scores_submitted.join(', ')}]
                            </div>
                            <div className="text-[10px] text-gradient-gold font-bold mt-1">Prize won: ${entrant.prize_won}</div>
                          </div>

                          <div className="flex flex-col items-end space-y-1">
                            <span className="text-[9px] uppercase font-bold text-text-muted">Verification Status</span>
                            {entrant.verification_status === 'none' && (
                              <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-[9px] uppercase font-bold">Waiting Proof</span>
                            )}
                            {entrant.verification_status === 'pending' && (
                              <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded text-[9px] uppercase font-bold">Pending Review</span>
                            )}
                            {entrant.verification_status === 'approved' && (
                              <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-[9px] uppercase font-bold">Approved</span>
                            )}
                            {entrant.verification_status === 'rejected' && (
                              <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[9px] uppercase font-bold">Rejected</span>
                            )}
                          </div>
                        </div>

                        {entrant.verification_proof_url && (
                          <div className="p-3 bg-zinc-900 rounded border border-white/5 space-y-3">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-text-muted">Submitted Screenshot URL:</span>
                              <a href={entrant.verification_proof_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold">
                                Open Link &nearr;
                              </a>
                            </div>
                            {/* Render image block directly as verification review helper */}
                            <div className="max-h-24 overflow-hidden rounded bg-black flex items-center justify-center border border-white/5">
                              <img src={entrant.verification_proof_url} alt="Proof" className="max-w-full max-h-24 object-contain" />
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center border-t border-white/5 pt-3">
                          <div className="flex space-x-2">
                            {entrant.verification_status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleVerifySubmission(entrant.id, 'approved')}
                                  className="py-1 px-3 bg-primary text-black font-bold uppercase text-[9px] rounded hover:bg-primary-hover"
                                >
                                  Approve Verification
                                </button>
                                <button
                                  onClick={() => handleVerifySubmission(entrant.id, 'rejected')}
                                  className="py-1 px-3 bg-red-600 text-white font-bold uppercase text-[9px] rounded hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>

                          <div>
                            {entrant.verification_status === 'approved' && entrant.payout_status !== 'paid' && (
                              <button
                                onClick={() => handleCompletePayout(entrant.id)}
                                className="py-1 px-3 bg-yellow-500 text-black font-bold uppercase text-[9px] rounded hover:bg-yellow-600"
                              >
                                Complete Cash Payout
                              </button>
                            )}
                            {entrant.payout_status === 'paid' && (
                              <span className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px]">
                                Paid & Completed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. USER & SCORE MANAGER */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-white">User & Score Manager</h2>
                  <p className="text-xs text-text-muted">Override golf scores, adjust roles, and manage mock subscriptions.</p>
                </div>

                {loadingUsers ? (
                  <div className="text-center py-10 animate-pulse text-text-muted">Loading user accounts...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Users list left side */}
                    <div className="md:col-span-1 glass-card border border-white/5 rounded-xl p-4 space-y-2 h-[400px] overflow-y-auto">
                      <h3 className="text-[10px] font-bold text-text-muted uppercase mb-2">Registered Accounts</h3>
                      <div className="space-y-1">
                        {usersList.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              setSelectedUser(item);
                              loadUserScores(item.id);
                            }}
                            className={`p-2.5 rounded-lg text-left cursor-pointer transition-all border text-xs ${
                              selectedUser?.id === item.id
                                ? 'border-primary bg-primary/5 text-primary font-bold'
                                : 'border-white/5 bg-white/5 text-text-muted hover:border-white/10'
                            }`}
                          >
                            <div className="truncate text-white">{item.full_name}</div>
                            <div className="truncate text-[10px] text-text-muted">{item.email}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Specific user overrides right side */}
                    <div className="md:col-span-2">
                      {selectedUser ? (
                        <div className="glass-card border border-white/5 rounded-xl p-5 space-y-6">
                          <div>
                            <h3 className="text-base font-bold text-white leading-tight">{selectedUser.full_name}</h3>
                            <p className="text-xs text-text-muted">{selectedUser.email}</p>
                          </div>

                          {/* Profile overrides grid */}
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <label className="block text-[10px] uppercase text-text-muted font-bold mb-1">Role Type</label>
                              <select
                                className="w-full p-2 bg-zinc-950 border border-white/10 text-white rounded text-xs"
                                value={selectedUser.role}
                                onChange={(e) => handleUpdateUserStatus(selectedUser.id, 'role', e.target.value)}
                              >
                                <option value="subscriber" className="bg-zinc-950 text-white">Subscriber</option>
                                <option value="admin" className="bg-zinc-950 text-white">Administrator</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase text-text-muted font-bold mb-1">Subscription Status</label>
                              <select
                                className="w-full p-2 bg-zinc-950 border border-white/10 text-white rounded text-xs"
                                value={selectedUser.subscription_status}
                                onChange={(e) => handleUpdateUserStatus(selectedUser.id, 'subscription_status', e.target.value)}
                              >
                                <option value="active" className="bg-zinc-950 text-white">Active</option>
                                <option value="inactive" className="bg-zinc-950 text-white">Inactive</option>
                                <option value="past_due" className="bg-zinc-950 text-white">Past Due</option>
                                <option value="lapsed" className="bg-zinc-950 text-white">Lapsed</option>
                              </select>
                            </div>
                          </div>

                          {/* Specific User scores log */}
                          <div className="border-t border-white/5 pt-4 space-y-3">
                            <h4 className="text-xs font-bold text-white">Score History & Overrides</h4>

                            {editingScoreId && (
                              <form onSubmit={handleUpdateUserScore} className="p-3 bg-white/5 border border-white/5 rounded-lg space-y-3">
                                <div className="text-[10px] uppercase font-bold text-primary">Override Score Form</div>
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="number"
                                    min="1"
                                    max="45"
                                    className="p-1.5 glass-input text-xs"
                                    value={scoreVal}
                                    onChange={(e) => setScoreVal(e.target.value)}
                                  />
                                  <input
                                    type="date"
                                    className="p-1.5 glass-input text-xs bg-zinc-950 text-white"
                                    value={scoreDate}
                                    onChange={(e) => setScoreDate(e.target.value)}
                                  />
                                </div>
                                <div className="flex space-x-2">
                                  <button type="submit" className="py-1 px-3 bg-primary text-black font-bold text-[10px] rounded">Save</button>
                                  <button type="button" onClick={() => setEditingScoreId(null)} className="py-1 px-3 bg-zinc-800 text-white text-[10px] rounded">Cancel</button>
                                </div>
                              </form>
                            )}

                            {userScores.length === 0 ? (
                              <div className="text-center text-xs text-text-muted py-4">No scores logged.</div>
                            ) : (
                              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                {userScores.map((scoreCard) => (
                                  <div key={scoreCard.id} className="flex justify-between items-center p-2 bg-white/5 rounded text-xs text-white">
                                    <div className="font-bold text-primary">{scoreCard.score} points</div>
                                    <div className="text-[10px] text-text-muted">{scoreCard.score_date}</div>
                                    <button
                                      onClick={() => {
                                        setEditingScoreId(scoreCard.id);
                                        setScoreVal(scoreCard.score.toString());
                                        setScoreDate(scoreCard.score_date);
                                      }}
                                      className="text-[9px] uppercase font-bold bg-white/5 px-2 py-0.5 rounded text-text-muted hover:text-white"
                                    >
                                      Override
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="glass-card border border-white/5 rounded-xl p-8 text-center text-text-muted text-xs h-full flex items-center justify-center">
                          Select an account from the left side panel to manage profile permissions and scores.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. CHARITY CRUD MANAGER */}
            {activeTab === 'charities' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-white">Charity Listings Manager</h2>
                  <p className="text-xs text-text-muted">Create new listings, edit descriptions, change spotlight settings, or delete partners.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left column list (CRUD list) */}
                  <div className="md:col-span-1 glass-card border border-white/5 rounded-xl p-4 space-y-2 h-[450px] overflow-y-auto">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-[10px] font-bold text-text-muted uppercase">Organizations</h3>
                      <button
                        onClick={() => {
                          setEditingCharity(null);
                          setCharityForm({
                            name: '',
                            description: '',
                            website_url: '',
                            logo_url: '',
                            cover_image_url: '',
                            is_featured: false,
                          });
                        }}
                        className="text-[10px] text-primary hover:underline font-bold"
                      >
                        + Add New
                      </button>
                    </div>
                    
                    {loadingCharities ? (
                      <div className="text-center py-6 text-xs text-text-muted animate-pulse">Loading list...</div>
                    ) : (
                      <div className="space-y-1">
                        {charitiesList.map((item) => (
                          <div
                            key={item.id}
                            className="p-2.5 rounded bg-white/5 border border-white/5 text-xs flex justify-between items-center"
                          >
                            <span className="truncate text-white font-semibold">{item.name}</span>
                            <div className="flex space-x-1.5 shrink-0">
                              <button
                                onClick={() => handleStartEditCharity(item)}
                                className="text-[10px] text-primary hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteCharity(item.id)}
                                className="text-[10px] text-red-400 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Form right column (CRUD Editor) */}
                  <div className="md:col-span-2">
                    <form onSubmit={handleSaveCharity} className="glass-card border border-white/5 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-bold text-gradient-hero uppercase">
                        {editingCharity ? `Edit details: ${editingCharity.name}` : 'Register New Charity'}
                      </h3>

                      <div>
                        <label className="block text-[10px] uppercase text-text-muted font-bold mb-1">Charity Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Save The Children"
                          className="w-full p-2 glass-input text-xs"
                          value={charityForm.name}
                          onChange={(e) => setCharityForm({ ...charityForm, name: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase text-text-muted font-bold mb-1">Description / Mission</label>
                        <textarea
                          placeholder="What is the mission of this charity?"
                          className="w-full p-2 glass-input text-xs h-20"
                          value={charityForm.description}
                          onChange={(e) => setCharityForm({ ...charityForm, description: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase text-text-muted font-bold mb-1">Website URL</label>
                        <input
                          type="url"
                          placeholder="https://example.org"
                          className="w-full p-2 glass-input text-xs"
                          value={charityForm.website_url}
                          onChange={(e) => setCharityForm({ ...charityForm, website_url: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase text-text-muted font-bold mb-1">Logo Image URL</label>
                          <input
                            type="url"
                            placeholder="https://image-source.com/logo.png"
                            className="w-full p-2 glass-input text-xs"
                            value={charityForm.logo_url}
                            onChange={(e) => setCharityForm({ ...charityForm, logo_url: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-text-muted font-bold mb-1">Cover Image URL</label>
                          <input
                            type="url"
                            placeholder="https://image-source.com/cover.png"
                            className="w-full p-2 glass-input text-xs"
                            value={charityForm.cover_image_url}
                            onChange={(e) => setCharityForm({ ...charityForm, cover_image_url: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-1">
                        <input
                          id="isFeatured"
                          type="checkbox"
                          className="rounded accent-primary"
                          checked={charityForm.is_featured}
                          onChange={(e) => setCharityForm({ ...charityForm, is_featured: e.target.checked })}
                        />
                        <label htmlFor="isFeatured" className="text-xs text-text-muted cursor-pointer">
                          Spotlight / Feature this charity on the Homepage
                        </label>
                      </div>

                      <button type="submit" className="w-full py-2.5 btn-premium text-xs font-bold uppercase tracking-wider mt-2">
                        {editingCharity ? 'Save Changes' : 'Register Organization'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

          </div>

        </main>
      </div>
    </DashboardGuard>
  );
}
