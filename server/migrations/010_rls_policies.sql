-- 010_rls_policies.sql: Strict Row Level Security Policies for Canopy Supabase
-- Ensures users can only access their own private data, while public profiles/calls remain viewable

-- 1. Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 2. Profiles: Public can view; Owners can edit
CREATE POLICY "Public profiles are viewable by everyone" 
    ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
    ON profiles FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own profile" 
    ON profiles FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- 3. Build Calls: Approved calls are public; Creators can manage
CREATE POLICY "Approved build calls are viewable by everyone" 
    ON build_calls FOR SELECT USING (moderation_status = 'approved');

CREATE POLICY "Authenticated users can create build calls" 
    ON build_calls FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creators can update their own build calls" 
    ON build_calls FOR UPDATE USING (auth.uid()::text = creator_id);

-- 4. Matches: Participants can view and update
CREATE POLICY "Participants can view their matches" 
    ON matches FOR SELECT USING (auth.uid()::text = requester_id OR auth.uid()::text = recipient_id);

CREATE POLICY "Authenticated users can create match requests" 
    ON matches FOR INSERT WITH CHECK (auth.uid()::text = requester_id);

CREATE POLICY "Participants can update match status" 
    ON matches FOR UPDATE USING (auth.uid()::text = requester_id OR auth.uid()::text = recipient_id);

-- 5. Sprints: Publicly discoverable
CREATE POLICY "Sprints are viewable by everyone" 
    ON sprints FOR SELECT USING (true);

-- 6. Notebook: Approved entries are public; Authors can write/update
CREATE POLICY "Approved notebook entries are viewable by everyone" 
    ON notebook_entries FOR SELECT USING (moderation_status = 'approved');

CREATE POLICY "Authenticated users can publish notebook entries" 
    ON notebook_entries FOR INSERT WITH CHECK (auth.uid()::text = author_id);

CREATE POLICY "Authors can update their own notebook entries" 
    ON notebook_entries FOR UPDATE USING (auth.uid()::text = author_id);

-- 7. Applications: Only Admins can view; Anyone can submit
CREATE POLICY "Anyone can submit an intake application" 
    ON applications FOR INSERT WITH CHECK (true);

-- 8. Notifications: Only recipient can view/update
CREATE POLICY "Users can view their own notifications" 
    ON notifications FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own notifications" 
    ON notifications FOR UPDATE USING (auth.uid()::text = user_id);
