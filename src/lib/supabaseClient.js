import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isConfigured = supabaseUrl && supabaseAnonKey;

// Mock Charities dataset (seeds if empty)
const DEFAULT_CHARITIES = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Green Canopy Trust',
    description: 'Restoring native woodlands, creating urban micro-forests, and fighting deforestation through community-driven planting campaigns.',
    logo_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=150&h=150&fit=crop',
    cover_image_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=400&fit=crop',
    website_url: 'https://greencanopytrust.org',
    is_featured: true,
    upcoming_events: [
      { id: 'e1', name: 'Forest Fairways Planting Day', date: '2026-07-12', location: 'Sherwood Golf Club', description: 'Help us plant 500 saplings along the club perimeter followed by an eco-lunch.' },
      { id: 'e2', name: 'Charity Golf Scramble', date: '2026-08-25', location: 'Highland Green Course', description: 'Annual 4-person team scramble supporting local canopy restoration.' }
    ]
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Blue Ocean Alliance',
    description: 'Tackling ocean plastic pollution, funding reef restoration, and supporting marine biology research labs globally.',
    logo_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150&h=150&fit=crop',
    cover_image_url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&h=400&fit=crop',
    website_url: 'https://blueoceanalliance.org',
    is_featured: false,
    upcoming_events: [
      { id: 'e3', name: 'Ocean Cleanup Drive', date: '2026-06-30', location: 'Sandy Shores Beach', description: 'Community beach sweep. Lunch and clean-up kits provided.' }
    ]
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Youth Sports Trust',
    description: 'Providing equipment, coaching, and facilities to disadvantaged communities to ensure every child gets access to healthy sporting activities.',
    logo_url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=150&h=150&fit=crop',
    cover_image_url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&h=400&fit=crop',
    website_url: 'https://youthsportstrust.org',
    is_featured: false,
    upcoming_events: [
      { id: 'e5', name: 'Junior Golf Academy Opening', date: '2026-07-05', location: 'City Park Driving Range', description: 'Free lessons and equipment trials for children aged 8-16.' }
    ]
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'Cardiac Health Research',
    description: 'Funding ground-breaking clinical trials, purchasing defibrillators for local community spaces, and running awareness events.',
    logo_url: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=150&h=150&fit=crop',
    cover_image_url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&h=400&fit=crop',
    website_url: 'https://cardiacresearch.org',
    is_featured: true,
    upcoming_events: [
      { id: 'e7', name: 'Heart Health Screening Day', date: '2026-06-25', location: 'Centennial Golf Lodge', description: 'Free blood pressure and heart rate checks.' }
    ]
  }
];

// Initialize Mock Local Storage Data
const seedMockData = () => {
  if (typeof window === 'undefined') return;

  const MOCK_DB_VERSION = 'v6_force_reset_charities_real_images';
  if (localStorage.getItem('mock_db_version') !== MOCK_DB_VERSION) {
    localStorage.removeItem('mock_db_charities');
    localStorage.setItem('mock_db_version', MOCK_DB_VERSION);
  }

  const storedCharities = localStorage.getItem('mock_db_charities');
  let reseedCharities = false;
  if (storedCharities) {
    try {
      const parsed = JSON.parse(storedCharities);
      if (!Array.isArray(parsed) || parsed.some(c => !c.cover_image_url || c.cover_image_url === '' || !c.logo_url || c.logo_url === '')) {
        reseedCharities = true;
      }
    } catch (e) {
      reseedCharities = true;
    }
  } else {
    reseedCharities = true;
  }

  if (reseedCharities) {
    localStorage.setItem('mock_db_charities', JSON.stringify(DEFAULT_CHARITIES));
  }

  if (!localStorage.getItem('mock_auth_users')) {
    const defaultUsers = [
      {
        id: 'mock_user_admin_id',
        email: 'admin@digitalheroes.co.in',
        password: 'admin123',
        raw_user_meta_data: { full_name: 'Admin Hero', role: 'admin' },
        created_at: new Date().toISOString()
      },
      {
        id: 'mock_user_sub_id',
        email: 'subscriber@digitalheroes.co.in',
        password: 'sub123',
        raw_user_meta_data: { full_name: 'Subscriber Hero', role: 'subscriber' },
        created_at: new Date().toISOString()
      }
    ];
    localStorage.setItem('mock_auth_users', JSON.stringify(defaultUsers));

    const defaultProfiles = [
      {
        id: 'mock_user_admin_id',
        email: 'admin@digitalheroes.co.in',
        full_name: 'Admin Hero',
        role: 'admin',
        subscription_status: 'active',
        subscription_tier: 'monthly',
        charity_contribution_percent: 15.0,
        selected_charity_id: '00000000-0000-0000-0000-000000000004',
        created_at: new Date().toISOString()
      },
      {
        id: 'mock_user_sub_id',
        email: 'subscriber@digitalheroes.co.in',
        full_name: 'Subscriber Hero',
        role: 'subscriber',
        subscription_status: 'active',
        subscription_tier: 'monthly',
        charity_contribution_percent: 10.0,
        selected_charity_id: '00000000-0000-0000-0000-000000000001',
        created_at: new Date().toISOString()
      }
    ];
    localStorage.setItem('mock_db_profiles', JSON.stringify(defaultProfiles));
  }

  if (!localStorage.getItem('mock_db_golf_scores')) {
    const defaultScores = [
      { id: 'ms1', user_id: 'mock_user_sub_id', score: 36, score_date: '2026-06-10', created_at: new Date().toISOString() },
      { id: 'ms2', user_id: 'mock_user_sub_id', score: 40, score_date: '2026-06-11', created_at: new Date().toISOString() },
      { id: 'ms3', user_id: 'mock_user_sub_id', score: 38, score_date: '2026-06-12', created_at: new Date().toISOString() },
      { id: 'ms4', user_id: 'mock_user_sub_id', score: 42, score_date: '2026-06-13', created_at: new Date().toISOString() },
      { id: 'ms5', user_id: 'mock_user_sub_id', score: 35, score_date: '2026-06-14', created_at: new Date().toISOString() }
    ];
    localStorage.setItem('mock_db_golf_scores', JSON.stringify(defaultScores));
  }
};

// Builder to simulate Supabase Query Chaining in client-side LocalStorage
const createMockBuilder = (tableName) => {
  if (typeof window !== 'undefined') seedMockData();
  
  let filters = [];
  let gtFilters = [];
  let updateFields = null;
  let insertRows = null;
  let isDelete = false;
  let isSingle = false;
  let selectStr = null;
  let orderCol = null;
  let orderAscending = true;
  let limitVal = null;

  const builder = {
    select: (str) => {
      selectStr = str;
      return builder;
    },
    eq: (col, val) => {
      filters.push({ col, val });
      return builder;
    },
    gt: (col, val) => {
      gtFilters.push({ col, val });
      return builder;
    },
    order: (col, options) => {
      orderCol = col;
      orderAscending = options?.ascending !== false;
      return builder;
    },
    limit: (val) => {
      limitVal = val;
      return builder;
    },
    single: () => {
      isSingle = true;
      return builder;
    },
    insert: (rows) => {
      insertRows = rows;
      return builder;
    },
    update: (fields) => {
      updateFields = fields;
      return builder;
    },
    delete: () => {
      isDelete = true;
      return builder;
    },
    then: async (resolve) => {
      if (typeof window === 'undefined') {
        resolve({ data: null, error: null });
        return;
      }

      let data = JSON.parse(localStorage.getItem(`mock_db_${tableName}`) || '[]');
      let result = [...data];

      // Apply Joins if selectStr has them
      if (selectStr) {
        if (selectStr.includes('charities')) {
          const charities = JSON.parse(localStorage.getItem('mock_db_charities') || '[]');
          result = result.map(row => {
            const charity = charities.find(c => c.id === row.selected_charity_id);
            return { ...row, charities: charity || null };
          });
        }
        if (selectStr.includes('profiles')) {
          const profiles = JSON.parse(localStorage.getItem('mock_db_profiles') || '[]');
          result = result.map(row => {
            const profile = profiles.find(p => p.id === row.user_id);
            return { ...row, profiles: profile || null };
          });
        }
        if (selectStr.includes('draws')) {
          const draws = JSON.parse(localStorage.getItem('mock_db_draws') || '[]');
          result = result.map(row => {
            const draw = draws.find(d => d.id === row.draw_id);
            return { ...row, draws: draw || null };
          });
        }
      }

      // Apply filters
      filters.forEach(({ col, val }) => {
        result = result.filter(row => row[col] === val);
      });
      gtFilters.forEach(({ col, val }) => {
        result = result.filter(row => Number(row[col]) > Number(val));
      });

      // Apply ordering
      if (orderCol) {
        result.sort((a, b) => {
          if (a[orderCol] < b[orderCol]) return orderAscending ? -1 : 1;
          if (a[orderCol] > b[orderCol]) return orderAscending ? 1 : -1;
          return 0;
        });
      }

      // Apply limit
      if (limitVal !== null) {
        result = result.slice(0, limitVal);
      }

      // 1. Handle Insert
      if (insertRows !== null) {
        const rowsArray = Array.isArray(insertRows) ? insertRows : [insertRows];
        const newRows = rowsArray.map(r => {
          const newRow = { 
            id: r.id || `mock_uuid_${Math.random().toString(36).substr(2, 9)}`, 
            created_at: new Date().toISOString(),
            ...r 
          };
          data.push(newRow);
          return newRow;
        });
        localStorage.setItem(`mock_db_${tableName}`, JSON.stringify(data));

        // Trigger: Limit user scores to latest 5
        if (tableName === 'golf_scores') {
          const userIds = [...new Set(newRows.map(r => r.user_id))];
          userIds.forEach(uid => {
            let userScores = data.filter(s => s.user_id === uid);
            if (userScores.length > 5) {
              userScores.sort((a, b) => new Date(a.score_date) - new Date(b.score_date));
              const toDeleteCount = userScores.length - 5;
              const toDeleteIds = userScores.slice(0, toDeleteCount).map(s => s.id);
              data = data.filter(s => !toDeleteIds.includes(s.id));
            }
          });
          localStorage.setItem(`mock_db_${tableName}`, JSON.stringify(data));
        }

        resolve({ data: Array.isArray(insertRows) ? newRows : newRows[0], error: null });
        return;
      }

      // 2. Handle Update
      if (updateFields !== null) {
        const matchingIds = result.map(r => r.id);
        data = data.map(row => {
          if (matchingIds.includes(row.id)) {
            return { ...row, ...updateFields };
          }
          return row;
        });
        localStorage.setItem(`mock_db_${tableName}`, JSON.stringify(data));
        resolve({ data: null, error: null });
        return;
      }

      // 3. Handle Delete
      if (isDelete) {
        const matchingIds = result.map(r => r.id);
        data = data.filter(row => !matchingIds.includes(row.id));
        localStorage.setItem(`mock_db_${tableName}`, JSON.stringify(data));
        resolve({ data: null, error: null });
        return;
      }

      // 4. Handle Select read
      if (isSingle) {
        const item = result[0] || null;
        resolve({ data: item, error: item ? null : { message: 'Row not found' } });
      } else {
        resolve({ data: result, error: null });
      }
    }
  };

  return builder;
};

// Mock Auth Client Emulator
const mockAuth = {
  listeners: [],
  onAuthStateChange: (cb) => {
    if (typeof window === 'undefined') {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    mockAuth.listeners.push(cb);
    const session = mockAuth.getSyncSession();
    setTimeout(() => cb(session ? 'SIGNED_IN' : 'SIGNED_OUT', session), 10);
    return { data: { subscription: { unsubscribe: () => {
      mockAuth.listeners = mockAuth.listeners.filter(l => l !== cb);
    } } } };
  },
  getSyncSession: () => {
    if (typeof window === 'undefined') return null;
    const sessionStr = localStorage.getItem('mock_auth_session');
    return sessionStr ? JSON.parse(sessionStr) : null;
  },
  getSession: async () => {
    return { data: { session: mockAuth.getSyncSession() }, error: null };
  },
  signUp: async ({ email, password, options }) => {
    if (typeof window === 'undefined') return { data: null, error: null };
    const users = JSON.parse(localStorage.getItem('mock_auth_users') || '[]');
    if (users.find(u => u.email === email)) {
      throw new Error('User already exists');
    }
    const newUser = {
      id: `mock_user_${Math.random().toString(36).substr(2, 9)}`,
      email,
      password,
      raw_user_meta_data: options?.data || {},
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem('mock_auth_users', JSON.stringify(users));

    // Simulate Sync trigger for profile sync
    const profiles = JSON.parse(localStorage.getItem('mock_db_profiles') || '[]');
    const newProfile = {
      id: newUser.id,
      email: newUser.email,
      full_name: newUser.raw_user_meta_data.full_name || newUser.email,
      role: newUser.raw_user_meta_data.role || 'subscriber',
      subscription_status: 'inactive',
      subscription_tier: 'monthly',
      charity_contribution_percent: 10.0,
      created_at: new Date().toISOString()
    };
    profiles.push(newProfile);
    localStorage.setItem('mock_db_profiles', JSON.stringify(profiles));

    // Sign in automatically
    const session = { user: newUser };
    localStorage.setItem('mock_auth_session', JSON.stringify(session));
    mockAuth.listeners.forEach(l => l('SIGNED_IN', session));

    return { data: { user: newUser }, error: null };
  },
  signInWithPassword: async ({ email, password }) => {
    if (typeof window === 'undefined') return { data: null, error: null };
    const users = JSON.parse(localStorage.getItem('mock_auth_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      throw new Error('Invalid email or password.');
    }
    const session = { user };
    localStorage.setItem('mock_auth_session', JSON.stringify(session));
    mockAuth.listeners.forEach(l => l('SIGNED_IN', session));
    return { data: { user }, error: null };
  },
  signOut: async () => {
    if (typeof window === 'undefined') return { error: null };
    localStorage.removeItem('mock_auth_session');
    mockAuth.listeners.forEach(l => l('SIGNED_OUT', null));
    return { error: null };
  }
};

// Unified Export
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      auth: mockAuth,
      from: (tableName) => createMockBuilder(tableName),
    };

if (!isConfigured) {
  console.info('[Digital Heroes] Supabase credentials missing. Running in Client-Side Offline Demo Mode.');
}
