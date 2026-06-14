'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBilling } from '@/context/BillingContext';
import { supabase } from '@/lib/supabaseClient';
import DashboardGuard from '@/components/DashboardGuard';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { mockCancel, mockSetPastDue, mockSetLapsed, mockSubscribe } = useBilling();

  // Core Data States
  const [scores, setScores] = useState([]);
  const [loadingScores, setLoadingScores] = useState(true);
  const [winnings, setWinnings] = useState([]);
  const [loadingWinnings, setLoadingWinnings] = useState(true);

  // Score Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingScoreId, setEditingScoreId] = useState(null);
  const [scoreVal, setScoreVal] = useState('');
  const [scoreDate, setScoreDate] = useState('');
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Charity edit states
  const [allCharities, setAllCharities] = useState([]);
  const [charityId, setCharityId] = useState('');
  const [contributionPercent, setContributionPercent] = useState(10);
  const [savingCharity, setSavingCharity] = useState(false);

  // Proof upload states
  const [uploadingForEntrantId, setUploadingForEntrantId] = useState(null);
  const [proofUrl, setProofUrl] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadSubmitting, setUploadSubmitting] = useState(false);

  // Load golf scores
  const loadScores = async () => {
    if (!user) return;
    setLoadingScores(true);
    try {
      const { data, error } = await supabase
        .from('golf_scores')
        .select('*')
        .eq('user_id', user.id)
        .order('score_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (data && !error) setScores(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingScores(false);
    }
  };

  // Load winnings & draw entries
  const loadWinnings = async () => {
    if (!user) return;
    setLoadingWinnings(true);
    try {
      const { data, error } = await supabase
        .from('draw_entrants')
        .select('*, draws(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data && !error) setWinnings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingWinnings(false);
    }
  };

  // Fetch charities for settings edit
  useEffect(() => {
    async function loadCharities() {
      try {
        const { data } = await supabase.from('charities').select('id, name');
        if (data) setAllCharities(data);
      } catch (e) {
        console.error(e);
      }
    }
    if (user) {
      loadCharities();
    }
  }, [user]);

  // Sync edit states when profile loads
  useEffect(() => {
    if (profile) {
      setCharityId(profile.selected_charity_id || '');
      setContributionPercent(profile.charity_contribution_percent || 10);
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      loadScores();
      loadWinnings();
    }
  }, [user]);

  // Save Charity Allocation settings
  const handleSaveCharitySettings = async () => {
    setSavingCharity(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          selected_charity_id: charityId || null,
          charity_contribution_percent: Number(contributionPercent),
        })
        .eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
      alert('Charity settings saved successfully!');
    } catch (e) {
      alert(e.message || 'Failed to update settings.');
    } finally {
      setSavingCharity(false);
    }
  };

  // Add a new score (Trigger limit_user_scores enforces rolling 5 database-side)
  const handleAddScore = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);

    const score = Number(scoreVal);
    if (isNaN(score) || score < 1 || score > 45) {
      setFormError('Stableford score must be between 1 and 45.');
      setFormSubmitting(false);
      return;
    }
    if (!scoreDate) {
      setFormError('Please select a valid date.');
      setFormSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('golf_scores')
        .insert({
          user_id: user.id,
          score,
          score_date: scoreDate,
        });

      if (error) throw error;

      setScoreVal('');
      setScoreDate('');
      setShowAddForm(false);
      await loadScores();
    } catch (err) {
      setFormError(err.message || 'Failed to record score.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Edit an existing score
  const handleStartEdit = (item) => {
    setEditingScoreId(item.id);
    setScoreVal(item.score.toString());
    setScoreDate(item.score_date);
  };

  const handleUpdateScore = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);

    const score = Number(scoreVal);
    if (isNaN(score) || score < 1 || score > 45) {
      setFormError('Stableford score must be between 1 and 45.');
      setFormSubmitting(false);
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
      await loadScores();
    } catch (err) {
      setFormError(err.message || 'Failed to update score.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Upload proof of winning screenshot (mock URL)
  const handleUploadProof = async (e) => {
    e.preventDefault();
    setUploadError('');
    setUploadSubmitting(true);

    if (!proofUrl.trim()) {
      setUploadError('Please provide a screenshot URL.');
      setUploadSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('draw_entrants')
        .update({
          verification_proof_url: proofUrl,
          verification_status: 'pending',
          payout_status: 'pending'
        })
        .eq('id', uploadingForEntrantId);

      if (error) throw error;

      setUploadingForEntrantId(null);
      setProofUrl('');
      await loadWinnings();
    } catch (err) {
      setUploadError(err.message || 'Failed to upload verification proof.');
    } finally {
      setUploadSubmitting(false);
    }
  };

  // Calculate stats
  const totalPrizeWon = winnings.reduce((acc, curr) => acc + Number(curr.prize_won), 0);
  const activeDrawWinnings = winnings.filter((w) => w.matches_count >= 3);

  return (
    <DashboardGuard>
      <div className="min-h-screen liquid-bg text-text-main flex flex-col font-sans">
        
        {/* Header Dashboard Nav */}
        <header className="w-full bg-zinc-950/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <span className="h-8 w-8 rounded-lg bg-gradient-to-tr from-primary to-gold flex items-center justify-center font-extrabold text-black text-sm shadow-md">
              H
            </span>
            <span className="text-sm font-extrabold tracking-wider text-white">
              DIGITAL<span className="text-mossamber font-semibold font-serif italic">HEROES</span> Panel
            </span>
            {profile?.role === 'admin' && (
              <span className="text-[10px] bg-purple/20 text-purple border border-purple/30 font-extrabold px-2 py-0.5 rounded-full uppercase">
                Admin
              </span>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {profile?.role === 'admin' && (
              <Link href="/admin" className="text-xs font-bold text-primary hover:underline">
                Admin Console
              </Link>
            )}
            <button
              onClick={() => signOut()}
              className="text-xs text-text-muted hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Dashboard Grid */}
        <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8 z-10">
          
          {/* Main Column (Col span 2) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Welcome banner */}
            <div className="glass-card rounded-2xl p-6 border border-white/5 bg-gradient-premium relative overflow-hidden">
              <div className="z-10 relative">
                <h2 className="text-2xl font-extrabold text-white mb-1">
                  Good day, {profile?.full_name || 'Golfer'}!
                </h2>
                <p className="text-text-muted text-xs leading-relaxed max-w-xl">
                  Keep your handicap active. Enter your latest golf scores below to update your draw ticket. Your currently selected charity is <span className="text-primary font-bold">{profile?.charities?.name || 'none selected'}</span>.
                </p>
              </div>
            </div>

            {/* Score Entry Area */}
            <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-white mb-1">Rolling Stableford Log</h3>
                  <p className="text-xs text-text-muted">
                    Only your latest 5 scores are active. Oldest scores are replaced automatically.
                  </p>
                </div>
                {!showAddForm && !editingScoreId && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="py-1.5 px-4 btn-premium text-xs rounded-lg font-bold"
                  >
                    + Enter Score
                  </button>
                )}
              </div>

              {/* Add/Edit Forms */}
              {(showAddForm || editingScoreId) && (
                <form
                  onSubmit={editingScoreId ? handleUpdateScore : handleAddScore}
                  className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-4"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-extrabold text-gradient-hero">
                      {editingScoreId ? 'Edit Golf Score' : 'Record New Stableford Score'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingScoreId(null);
                        setScoreVal('');
                        setScoreDate('');
                        setFormError('');
                      }}
                      className="text-text-muted hover:text-white text-xs"
                    >
                      Cancel
                    </button>
                  </div>

                  {formError && (
                    <div className="p-2.5 rounded bg-red-900/30 border border-red-500/30 text-red-400 text-xs">
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase text-text-muted font-bold mb-1">
                        Stableford Score (1 - 45)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="45"
                        required
                        placeholder="e.g. 36"
                        className="w-full p-2 glass-input text-xs"
                        value={scoreVal}
                        onChange={(e) => setScoreVal(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-text-muted font-bold mb-1">
                        Score Date
                      </label>
                      <input
                        type="date"
                        required
                        className="w-full p-2 glass-input text-xs bg-black"
                        value={scoreDate}
                        onChange={(e) => setScoreDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="w-full py-2 btn-premium text-xs font-bold rounded-lg uppercase tracking-wider"
                  >
                    {formSubmitting ? 'Submitting...' : editingScoreId ? 'Update Score' : 'Add & Replace Oldest'}
                  </button>
                </form>
              )}

              {/* Log List */}
              {loadingScores ? (
                <div className="text-center py-6 text-text-muted animate-pulse">Loading Scorecards...</div>
              ) : scores.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-xs bg-white/5 rounded-xl border border-white/5">
                  No scores recorded yet. Submit your first score to qualify for draws!
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 text-[10px] uppercase font-bold text-text-muted px-4">
                    <span>Rank / Order</span>
                    <span>Stableford Score</span>
                    <span className="text-right">Date Played</span>
                  </div>
                  <div className="space-y-2">
                    {scores.map((item, index) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-3 items-center p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors text-xs text-white"
                      >
                        <div className="flex items-center space-x-2">
                          <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            index === 0 ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-white/5 text-text-muted'
                          }`}>
                            {index === 0 ? 'Newest' : `#${index + 1}`}
                          </span>
                        </div>
                        <div className="font-extrabold text-sm text-primary flex items-center space-x-3">
                          <span>{item.score} points</span>
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="text-[10px] font-normal text-text-muted hover:text-white underline cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                        <div className="text-right text-text-muted font-medium">
                          {item.score_date}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-text-muted text-center italic mt-2">
                    Your current active handicap profile is comprised of the {scores.length} scores listed above.
                  </div>
                </div>
              )}
            </div>

            {/* Verification Proof Uploader Modal/Overlay */}
            {uploadingForEntrantId && (
              <div className="p-6 rounded-2xl bg-zinc-900 border border-primary/20 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-white">Upload Golf Score Verification Screenshot</h3>
                  <button onClick={() => setUploadingForEntrantId(null)} className="text-text-muted text-xs hover:text-white">✕</button>
                </div>
                {uploadError && <div className="p-2.5 rounded bg-red-900/30 text-red-400 text-xs">{uploadError}</div>}
                <form onSubmit={handleUploadProof} className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase text-text-muted font-bold mb-1">
                      Link to Screenshot Proof (hosted image url, or mockup path)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. https://mock-upload.com/my-score-screenshot.png"
                      className="w-full p-2.5 glass-input text-xs"
                      value={proofUrl}
                      onChange={(e) => setProofUrl(e.target.value)}
                    />
                    <p className="text-[10px] text-text-muted mt-1 leading-normal">
                      Provide a URL of your golf union app screenshot showing your 5 scores matching what you entered.
                    </p>
                  </div>
                  <button type="submit" disabled={uploadSubmitting} className="w-full py-2 btn-premium text-xs font-bold rounded-lg uppercase">
                    {uploadSubmitting ? 'Uploading...' : 'Submit Proof for Admin Review'}
                  </button>
                </form>
              </div>
            )}

            {/* Winnings History Card */}
            <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
              <div>
                <h3 className="text-lg font-extrabold text-white mb-1">Winnings & Draws Overview</h3>
                <p className="text-xs text-text-muted">Review your winnings and submit proof for payment verification.</p>
              </div>

              {loadingWinnings ? (
                <div className="text-center py-6 text-text-muted animate-pulse">Loading Draw Entry History...</div>
              ) : winnings.length === 0 ? (
                <div className="text-center py-8 text-xs text-text-muted bg-white/5 rounded-xl border border-white/5">
                  You have not participated in any monthly draws yet. Keep your subscription active for the upcoming cycle!
                </div>
              ) : (
                <div className="space-y-3">
                  {winnings.map((item) => {
                    const isWinner = Number(item.prize_won) > 0;
                    return (
                      <div key={item.id} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-white">Draw Date: {new Date(item.draws.draw_date).toLocaleDateString()}</div>
                            <div className="text-[10px] text-text-muted mt-0.5">
                              Submitted Ticket: [{item.scores_submitted.join(', ')}] | Method: {item.draws.draw_type}
                            </div>
                          </div>
                          <div>
                            {isWinner ? (
                              <span className="bg-primary/20 text-primary border border-primary/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px]">
                                Matched {item.matches_count}
                              </span>
                            ) : (
                              <span className="bg-white/5 text-text-muted px-2 py-0.5 rounded text-[10px]">
                                No Match
                              </span>
                            )}
                          </div>
                        </div>

                        {isWinner && (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-white/5 pt-3 mt-1 space-y-2 sm:space-y-0 text-xs">
                            <div>
                              Prize Split Won:{' '}
                              <span className="font-extrabold text-gradient-gold text-sm">${item.prize_won}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                              {item.verification_status === 'none' && (
                                <button
                                  onClick={() => setUploadingForEntrantId(item.id)}
                                  className="py-1 px-3 bg-primary text-black rounded font-bold uppercase text-[10px] hover:bg-primary-hover"
                                >
                                  Upload Proof
                                </button>
                              )}
                              {item.verification_status === 'pending' && (
                                <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px]">
                                  Pending Review
                                </span>
                              )}
                              {item.verification_status === 'approved' && (
                                <span className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px]">
                                  Approved
                                </span>
                              )}
                              {item.verification_status === 'rejected' && (
                                <div className="flex items-center space-x-2">
                                  <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px]">
                                    Rejected
                                  </span>
                                  <button
                                    onClick={() => setUploadingForEntrantId(item.id)}
                                    className="underline text-[10px] text-text-muted hover:text-white"
                                  >
                                    Re-upload
                                  </button>
                                </div>
                              )}

                              {item.payout_status === 'paid' ? (
                                <span className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px]">
                                  Paid
                                </span>
                              ) : (
                                item.verification_status === 'approved' && (
                                  <span className="bg-zinc-800 text-zinc-400 px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px]">
                                    Pending Payment
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Right Column (Col span 1) */}
          <div className="space-y-8">
            
            {/* Subscription Controller Panel */}
            <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6">
              <h3 className="text-base font-extrabold text-white">Subscription Management</h3>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">Billing Status:</span>
                  <span className="font-extrabold uppercase text-primary">{profile?.subscription_status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Active Tier:</span>
                  <span className="font-bold uppercase text-white">{profile?.subscription_tier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Renewal Date:</span>
                  <span className="font-medium text-white">
                    {profile?.current_period_end ? new Date(profile.current_period_end).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Dev billing simulation helpers */}
              <div className="border-t border-white/5 pt-4 space-y-2">
                <div className="text-[10px] font-bold text-text-muted uppercase text-center mb-1">
                  Simulation Commands (Stripe Console Mock)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => mockSubscribe(profile?.subscription_tier, profile?.selected_charity_id, profile?.charity_contribution_percent)}
                    className="py-1 px-2.5 rounded bg-white/5 border border-white/10 text-[10px] font-semibold text-primary hover:bg-white/10"
                  >
                    Simulate Renew
                  </button>
                  <button
                    onClick={mockCancel}
                    className="py-1 px-2.5 rounded bg-white/5 border border-white/10 text-[10px] font-semibold text-red-400 hover:bg-white/10"
                  >
                    Simulate Cancel
                  </button>
                  <button
                    onClick={mockSetPastDue}
                    className="py-1 px-2.5 rounded bg-white/5 border border-white/10 text-[10px] font-semibold text-yellow-400 hover:bg-white/10"
                  >
                    Set Past Due
                  </button>
                  <button
                    onClick={mockSetLapsed}
                    className="py-1 px-2.5 rounded bg-white/5 border border-white/10 text-[10px] font-semibold text-red-500 hover:bg-white/10"
                  >
                    Set Lapsed
                  </button>
                </div>
              </div>
            </div>

            {/* Charity Allocation Card */}
            <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6">
              <h3 className="text-base font-extrabold text-white">Charity Allocation</h3>

              <div>
                <label className="block text-xs text-text-muted font-semibold mb-2">Supported Charity</label>
                <select
                  className="w-full p-2.5 glass-input text-xs bg-zinc-950 text-white border border-white/10"
                  value={charityId}
                  onChange={(e) => setCharityId(e.target.value)}
                >
                  <option value="" className="bg-zinc-950 text-white">Select a Charity</option>
                  {allCharities.map((c) => (
                    <option key={c.id} value={c.id} className="bg-zinc-950 text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-text-muted font-semibold">Allocation percentage</label>
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
              </div>

              <button
                onClick={handleSaveCharitySettings}
                disabled={savingCharity}
                className="w-full py-2 btn-premium text-xs font-bold rounded-lg uppercase"
              >
                {savingCharity ? 'Saving...' : 'Update Allocations'}
              </button>
            </div>

          </div>

        </main>
      </div>
    </DashboardGuard>
  );
}
