-- Digital Heroes - Supabase Database Schema
-- Paste this script directly into the Supabase SQL Editor to configure your database.

-- Clean up existing objects (optional, for clean runs)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();


-- ==========================================
-- 1. Create Charities Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.charities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    website_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    upcoming_events JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Charities
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. Create Profiles Table (syncs with Supabase Auth users)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'subscriber' CHECK (role IN ('subscriber', 'admin')),
    subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'lapsed')),
    subscription_tier TEXT DEFAULT 'monthly' CHECK (subscription_tier IN ('monthly', 'yearly')),
    subscription_id TEXT,
    current_period_end TIMESTAMP WITH TIME ZONE,
    selected_charity_id UUID REFERENCES public.charities(id) ON DELETE SET NULL,
    charity_contribution_percent NUMERIC DEFAULT 10.0 CHECK (charity_contribution_percent >= 10.0 AND charity_contribution_percent <= 100.0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. Create Golf Scores Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.golf_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 45),
    score_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Golf Scores
ALTER TABLE public.golf_scores ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. Create Draws Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.draws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'simulated' CHECK (status IN ('simulated', 'published')),
    winning_numbers INTEGER[] NOT NULL CHECK (cardinality(winning_numbers) = 5),
    draw_type TEXT DEFAULT 'random' CHECK (draw_type IN ('random', 'algorithmic')),
    prize_pool_total NUMERIC DEFAULT 0.0 NOT NULL,
    tier_5_match_prize NUMERIC DEFAULT 0.0 NOT NULL,
    tier_4_match_prize NUMERIC DEFAULT 0.0 NOT NULL,
    tier_3_match_prize NUMERIC DEFAULT 0.0 NOT NULL,
    jackpot_rollover_added NUMERIC DEFAULT 0.0 NOT NULL,
    jackpot_rollover_carried_forward NUMERIC DEFAULT 0.0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Draws
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 5. Create Draw Entrants Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.draw_entrants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    scores_submitted INTEGER[] NOT NULL CHECK (cardinality(scores_submitted) = 5),
    matches_count INTEGER DEFAULT 0 NOT NULL CHECK (matches_count >= 0 AND matches_count <= 5),
    prize_won NUMERIC DEFAULT 0.0 NOT NULL,
    winning_tier INTEGER CHECK (winning_tier IN (3, 4, 5)),
    verification_status TEXT DEFAULT 'none' CHECK (verification_status IN ('none', 'pending', 'approved', 'rejected')),
    verification_proof_url TEXT,
    payout_status TEXT DEFAULT 'none' CHECK (payout_status IN ('none', 'pending', 'paid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Draw Entrants
ALTER TABLE public.draw_entrants ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 6. Create Donations Table (Independent / direct donations)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    charity_id UUID NOT NULL REFERENCES public.charities(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0.0),
    payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Donations
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- 7. Database Triggers
-- ==========================================

-- Trigger A: Synchronize Supabase Auth Users with Public Profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, subscription_status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'subscriber'),
        'inactive'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Trigger B: Enforce Rolling Score Rule (Latest 5 Scores Only)
DROP TRIGGER IF EXISTS trigger_limit_user_scores ON public.golf_scores;
DROP FUNCTION IF EXISTS public.limit_user_scores();

CREATE OR REPLACE FUNCTION public.limit_user_scores()
RETURNS TRIGGER AS $$
DECLARE
    score_count INTEGER;
BEGIN
    -- Count the user's current scores
    SELECT COUNT(*) INTO score_count FROM public.golf_scores WHERE user_id = NEW.user_id;

    -- If 5 or more scores exist, delete the oldest
    IF score_count >= 5 THEN
        DELETE FROM public.golf_scores
        WHERE id = (
            SELECT id FROM public.golf_scores
            WHERE user_id = NEW.user_id
            ORDER BY score_date ASC, created_at ASC
            LIMIT 1
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_limit_user_scores
    BEFORE INSERT ON public.golf_scores
    FOR EACH ROW EXECUTE FUNCTION public.limit_user_scores();


-- ==========================================
-- 8. Row Level Security (RLS) Policies
-- ==========================================

-- Profiles Policies
CREATE POLICY "Allow public read of profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow users to update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow admins full control of profiles" ON public.profiles TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Charities Policies
CREATE POLICY "Allow public read of charities" ON public.charities FOR SELECT USING (true);
CREATE POLICY "Allow admins full control of charities" ON public.charities TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Golf Scores Policies
CREATE POLICY "Allow users to read own scores" ON public.golf_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to insert own scores" ON public.golf_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to update own scores" ON public.golf_scores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow users to delete own scores" ON public.golf_scores FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Allow admins full control of scores" ON public.golf_scores TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Draws Policies
CREATE POLICY "Allow public read of published draws" ON public.draws FOR SELECT USING (true);
CREATE POLICY "Allow admins full control of draws" ON public.draws TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Draw Entrants Policies
CREATE POLICY "Allow users to read own entries" ON public.draw_entrants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to update own entries" ON public.draw_entrants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow admins full control of entries" ON public.draw_entrants TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Donations Policies
CREATE POLICY "Allow public to select donations" ON public.donations FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Allow public to insert donations" ON public.donations FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Allow admins full control of donations" ON public.donations TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ==========================================
-- 9. Seed Initial Mock Charities
-- ==========================================
INSERT INTO public.charities (id, name, description, logo_url, cover_image_url, website_url, is_featured, upcoming_events)
VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'Green Canopy Trust',
    'Restoring native woodlands, creating urban micro-forests, and fighting deforestation through community-driven planting campaigns.',
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=150&h=150&fit=crop',
    'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=400&fit=crop',
    'https://greencanopytrust.org',
    true,
    '[
        {"id": "e1", "name": "Forest Fairways Planting Day", "date": "2026-07-12", "location": "Sherwood Golf Club", "description": "Help us plant 500 saplings along the club perimeter followed by an eco-lunch."},
        {"id": "e2", "name": "Charity Golf Scramble", "date": "2026-08-25", "location": "Highland Green Course", "description": "Annual 4-person team scramble supporting local canopy restoration. Special prizes for longest drive."}
    ]'::jsonb
),
(
    '00000000-0000-0000-0000-000000000002',
    'Blue Ocean Alliance',
    'Tackling ocean plastic pollution, funding reef restoration, and supporting marine biology research labs globally.',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150&h=150&fit=crop',
    'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&h=400&fit=crop',
    'https://blueoceanalliance.org',
    false,
    '[
        {"id": "e3", "name": "Ocean Cleanup Drive", "date": "2026-06-30", "location": "Sandy Shores Beach", "description": "Community beach sweep. Lunch and clean-up kits provided."},
        {"id": "e4", "name": "Charity Putting Challenge", "date": "2026-07-28", "location": "Ocean Reef Putting Green", "description": "18-hole putting contest with registration fees going directly to coral seeding project."}
    ]'::jsonb
),
(
    '00000000-0000-0000-0000-000000000003',
    'Youth Sports Trust',
    'Providing equipment, coaching, and facilities to disadvantaged communities to ensure every child gets access to healthy sporting activities.',
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=150&h=150&fit=crop',
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&h=400&fit=crop',
    'https://youthsportstrust.org',
    false,
    '[
        {"id": "e5", "name": "Junior Golf Academy Opening", "date": "2026-07-05", "location": "City Park Driving Range", "description": "Free lessons and equipment trials for children aged 8-16."},
        {"id": "e6", "name": "Pro-Am Charity Invitational", "date": "2026-09-15", "location": "Royal Pines Championship Course", "description": "Play alongside local pros. Proceeds support sporting grants for low-income schools."}
    ]'::jsonb
),
(
    '00000000-0000-0000-0000-000000000004',
    'Cardiac Health Research',
    'Funding ground-breaking clinical trials, purchasing defibrillators for local community spaces, and running awareness events.',
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=150&h=150&fit=crop',
    'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=800&h=400&fit=crop',
    'https://cardiacresearch.org',
    true,
    '[
        {"id": "e7", "name": "Heart Health Screening Day", "date": "2026-06-25", "location": "Centennial Golf Lodge", "description": "Free blood pressure and heart rate variability checks for members and public."},
        {"id": "e8", "name": "Golf Marathon: 72 Holes", "date": "2026-08-01", "location": "Whispering Pines Club", "description": "Sponsor our players as they attempt to play 4 full rounds in a single day for cardiac research."}
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;
