'use client';

import { createContext, useContext, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './AuthContext';

const BillingContext = createContext({
  processing: false,
  mockSubscribe: async () => {},
  mockCancel: async () => {},
  mockSetPastDue: async () => {},
  mockSetLapsed: async () => {},
});

export function BillingProvider({ children }) {
  const { user, refreshProfile } = useAuth();
  const [processing, setProcessing] = useState(false);

  // Helper to update profile status
  const updateSubscription = async (updates) => {
    if (!user) throw new Error('User must be authenticated to manage billing.');
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
    } finally {
      setProcessing(false);
    }
  };

  // Simulate Subscribe
  const mockSubscribe = async (tier = 'monthly', charityId, contributionPercent) => {
    const periodDays = tier === 'yearly' ? 365 : 30;
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + periodDays);

    const updates = {
      subscription_status: 'active',
      subscription_tier: tier,
      subscription_id: `sub_mock_${Math.random().toString(36).substr(2, 9)}`,
      current_period_end: periodEnd.toISOString(),
    };

    if (charityId) updates.selected_charity_id = charityId;
    if (contributionPercent) updates.charity_contribution_percent = Number(contributionPercent);

    await updateSubscription(updates);
  };

  // Simulate Cancel (makes subscription inactive immediately for testing access control)
  const mockCancel = async () => {
    await updateSubscription({
      subscription_status: 'inactive',
      subscription_id: null,
      current_period_end: null,
    });
  };

  // Simulate Past Due state
  const mockSetPastDue = async () => {
    await updateSubscription({
      subscription_status: 'past_due',
    });
  };

  // Simulate Lapsed / Inactive state
  const mockSetLapsed = async () => {
    await updateSubscription({
      subscription_status: 'lapsed',
      current_period_end: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // set expired yesterday
    });
  };

  return (
    <BillingContext.Provider
      value={{
        processing,
        mockSubscribe,
        mockCancel,
        mockSetPastDue,
        mockSetLapsed,
      }}
    >
      {children}
    </BillingContext.Provider>
  );
}

export const useBilling = () => useContext(BillingContext);
