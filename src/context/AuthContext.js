'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile details from database
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, charities(*)')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('Fetch profile catch:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const prof = await fetchProfile(user.id);
      setProfile(prof);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        const prof = await fetchProfile(session.user.id);
        setProfile(prof);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser(session.user);
          const prof = await fetchProfile(session.user.id);
          setProfile(prof);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoading(false);
      throw error;
    }
    return data;
  };

  const signUp = async ({ email, password, fullName, charityId, contributionPercent, tier, isAdmin = false }) => {
    setLoading(true);
    // 1. SignUp user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: isAdmin ? 'admin' : 'subscriber',
        },
      },
    });

    if (error) {
      setLoading(false);
      throw error;
    }

    if (data?.user) {
      // 2. Wait a split second for trigger to complete, then update public.profiles
      // with custom registration choices (charity, contribution percent, subscription details)
      const maxRetries = 5;
      let attempt = 0;
      let updated = false;

      while (attempt < maxRetries && !updated) {
        attempt++;
        // Attempt update
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            selected_charity_id: charityId || null,
            charity_contribution_percent: Number(contributionPercent) || 10.0,
            subscription_tier: tier || 'monthly',
            // If checking out mock payments, we will auto-activate it or make it inactive until mock-subscribed.
            // Let's set it to inactive by default, and let the user trigger activation on mock payment screen.
            subscription_status: 'inactive',
          })
          .eq('id', data.user.id);

        if (!updateError) {
          updated = true;
        } else {
          // Wait 150ms before retrying (in case the profile row hasn't been created by the trigger yet)
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }
    }
    
    return data;
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setLoading(false);
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
