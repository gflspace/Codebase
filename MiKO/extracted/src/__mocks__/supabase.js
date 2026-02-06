/**
 * Supabase Mock
 * Mock implementation for testing
 */

import { vi } from 'vitest';

// Mock data storage
let mockData = {
  leads: [],
  appointments: [],
  user_roles: [],
  chat_sessions: [],
  ai_qual_logs: [],
};

// Mock user/session
let mockUser = null;
let mockSession = null;

/**
 * Reset all mock data
 */
export function resetMockData() {
  mockData = {
    leads: [],
    appointments: [],
    user_roles: [],
    chat_sessions: [],
    ai_qual_logs: [],
  };
  mockUser = null;
  mockSession = null;
}

/**
 * Set mock user for auth tests
 */
export function setMockUser(user) {
  mockUser = user;
  if (user) {
    mockSession = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user,
    };
  } else {
    mockSession = null;
  }
}

/**
 * Set mock data for a table
 */
export function setMockTableData(table, data) {
  mockData[table] = data;
}

/**
 * Get mock data for a table
 */
export function getMockTableData(table) {
  return mockData[table] || [];
}

/**
 * Create mock query builder
 */
function createQueryBuilder(table) {
  let filters = [];
  let selectColumns = '*';
  let orderColumn = null;
  let orderAscending = true;
  let limitCount = null;
  let singleResult = false;

  const builder = {
    select: vi.fn((columns = '*') => {
      selectColumns = columns;
      return builder;
    }),

    insert: vi.fn((data) => {
      const newData = Array.isArray(data) ? data : [data];
      const insertedData = newData.map((item) => ({
        id: item.id || `${table}-${Date.now()}-${Math.random()}`,
        created_at: new Date().toISOString(),
        ...item,
      }));
      mockData[table] = [...(mockData[table] || []), ...insertedData];
      return {
        data: insertedData,
        error: null,
        select: () => Promise.resolve({ data: insertedData, error: null }),
      };
    }),

    update: vi.fn((data) => {
      return {
        eq: vi.fn((column, value) => {
          const index = mockData[table]?.findIndex((item) => item[column] === value);
          if (index !== -1) {
            mockData[table][index] = { ...mockData[table][index], ...data };
            return Promise.resolve({ data: mockData[table][index], error: null });
          }
          return Promise.resolve({ data: null, error: { message: 'Not found' } });
        }),
        match: vi.fn(() => Promise.resolve({ data: null, error: null })),
      };
    }),

    delete: vi.fn(() => {
      return {
        eq: vi.fn((column, value) => {
          mockData[table] = mockData[table]?.filter((item) => item[column] !== value) || [];
          return Promise.resolve({ data: null, error: null });
        }),
        match: vi.fn(() => Promise.resolve({ data: null, error: null })),
      };
    }),

    eq: vi.fn((column, value) => {
      filters.push({ type: 'eq', column, value });
      return builder;
    }),

    neq: vi.fn((column, value) => {
      filters.push({ type: 'neq', column, value });
      return builder;
    }),

    in: vi.fn((column, values) => {
      filters.push({ type: 'in', column, values });
      return builder;
    }),

    gte: vi.fn((column, value) => {
      filters.push({ type: 'gte', column, value });
      return builder;
    }),

    lte: vi.fn((column, value) => {
      filters.push({ type: 'lte', column, value });
      return builder;
    }),

    like: vi.fn((column, pattern) => {
      filters.push({ type: 'like', column, pattern });
      return builder;
    }),

    order: vi.fn((column, options = {}) => {
      orderColumn = column;
      orderAscending = options.ascending !== false;
      return builder;
    }),

    limit: vi.fn((count) => {
      limitCount = count;
      return builder;
    }),

    single: vi.fn(() => {
      singleResult = true;
      return builder;
    }),

    maybeSingle: vi.fn(() => {
      singleResult = true;
      return builder;
    }),

    then: vi.fn((resolve) => {
      let result = [...(mockData[table] || [])];

      // Apply filters
      filters.forEach((filter) => {
        switch (filter.type) {
          case 'eq':
            result = result.filter((item) => item[filter.column] === filter.value);
            break;
          case 'neq':
            result = result.filter((item) => item[filter.column] !== filter.value);
            break;
          case 'in':
            result = result.filter((item) => filter.values.includes(item[filter.column]));
            break;
          case 'gte':
            result = result.filter((item) => item[filter.column] >= filter.value);
            break;
          case 'lte':
            result = result.filter((item) => item[filter.column] <= filter.value);
            break;
        }
      });

      // Apply ordering
      if (orderColumn) {
        result.sort((a, b) => {
          const aVal = a[orderColumn];
          const bVal = b[orderColumn];
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return orderAscending ? comparison : -comparison;
        });
      }

      // Apply limit
      if (limitCount) {
        result = result.slice(0, limitCount);
      }

      // Return single or array
      const data = singleResult ? result[0] || null : result;

      return resolve({ data, error: null });
    }),
  };

  return builder;
}

/**
 * Mock Supabase auth
 */
const mockAuth = {
  getSession: vi.fn(() =>
    Promise.resolve({
      data: { session: mockSession },
      error: null,
    })
  ),

  getUser: vi.fn(() =>
    Promise.resolve({
      data: { user: mockUser },
      error: null,
    })
  ),

  signInWithPassword: vi.fn(({ email, password }) => {
    // Simulate auth - accept any valid-looking credentials for testing
    if (email && password && password.length >= 6) {
      const user = {
        id: 'test-user-id',
        email,
        created_at: new Date().toISOString(),
      };
      setMockUser(user);
      return Promise.resolve({
        data: { user, session: mockSession },
        error: null,
      });
    }
    return Promise.resolve({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });
  }),

  signOut: vi.fn(() => {
    setMockUser(null);
    return Promise.resolve({ error: null });
  }),

  onAuthStateChange: vi.fn((callback) => {
    // Return unsubscribe function
    return {
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    };
  }),
};

/**
 * Mock Supabase client
 */
export const supabase = {
  from: vi.fn((table) => createQueryBuilder(table)),
  auth: mockAuth,
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
      download: vi.fn(() => Promise.resolve({ data: new Blob(), error: null })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test-url.com/file' } })),
    })),
  },
  rpc: vi.fn((fnName, params) => {
    // Mock RPC calls
    return Promise.resolve({ data: null, error: null });
  }),
};

/**
 * Mock isSupabaseConfigured function
 */
export const isSupabaseConfigured = vi.fn(() => true);

/**
 * Default export
 */
export default {
  supabase,
  isSupabaseConfigured,
  resetMockData,
  setMockUser,
  setMockTableData,
  getMockTableData,
};
