/**
 * AdminLogin Component Tests
 * Tests for authentication functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../../__tests__/test-utils';
import AdminLogin, { checkAdminAuth, checkAdminAuthSync, adminLogout } from './AdminLogin';

// Mock demoMode - ensure demo mode is OFF for these tests
vi.mock('@/lib/demoMode', () => ({
  isDemoMode: vi.fn(() => false),
  validateDemoCredentials: vi.fn(() => false),
  getDemoUser: vi.fn(() => ({ id: 'demo-user', email: 'demo@miko.com' })),
  getDemoRoles: vi.fn(() => ['admin']),
}));

// Mock Supabase
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args) => mockSignInWithPassword(...args),
      signOut: (...args) => mockSignOut(...args),
      getSession: (...args) => mockGetSession(...args),
    },
    from: (...args) => mockFrom(...args),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

describe('AdminLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    // Default mock implementations
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    mockSignOut.mockResolvedValue({ error: null });

    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    });
  });

  describe('Component Rendering', () => {
    it('should render login form', async () => {
      const onLoginSuccess = vi.fn();
      render(<AdminLogin onLoginSuccess={onLoginSuccess} />);

      expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render MiKO branding', async () => {
      render(<AdminLogin onLoginSuccess={vi.fn()} />);

      expect(screen.getByAltText(/miko/i)).toBeInTheDocument();
      expect(screen.getByText(/admin login/i)).toBeInTheDocument();
    });

    it('should have email input with correct type', async () => {
      render(<AdminLogin onLoginSuccess={vi.fn()} />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should have password input with correct type', async () => {
      render(<AdminLogin onLoginSuccess={vi.fn()} />);

      const passwordInput = screen.getByPlaceholderText(/enter password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Form Validation', () => {
    it('should have required attribute on email and password inputs', async () => {
      render(<AdminLogin onLoginSuccess={vi.fn()} />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter password/i);

      expect(emailInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('required');
    });
  });

  describe('Authentication Flow', () => {
    it('should call Supabase signInWithPassword on submit', async () => {
      const onLoginSuccess = vi.fn();
      const { user } = render(<AdminLogin onLoginSuccess={onLoginSuccess} />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'admin@test.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: 'admin@test.com',
          password: 'password123',
        });
      });
    });

    it('should show error message on failed login', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const onLoginSuccess = vi.fn();
      const { user } = render(<AdminLogin onLoginSuccess={onLoginSuccess} />);

      await user.type(screen.getByPlaceholderText(/enter your email/i), 'admin@test.com');
      await user.type(screen.getByPlaceholderText(/enter password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });

      expect(onLoginSuccess).not.toHaveBeenCalled();
    });

    it('should call onLoginSuccess after successful login with admin role', async () => {
      const mockUser = { id: 'user-123', email: 'admin@test.com' };
      const mockSession = { user: mockUser, access_token: 'token' };

      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      // Mock role check to return admin role
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) =>
          resolve({ data: [{ role: 'admin' }], error: null })
        ),
      });

      const onLoginSuccess = vi.fn();
      const { user } = render(<AdminLogin onLoginSuccess={onLoginSuccess} />);

      await user.type(screen.getByPlaceholderText(/enter your email/i), 'admin@test.com');
      await user.type(screen.getByPlaceholderText(/enter password/i), 'correctpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(onLoginSuccess).toHaveBeenCalled();
      });
    });

    it('should deny access for users without admin role', async () => {
      const mockUser = { id: 'user-123', email: 'user@test.com' };
      const mockSession = { user: mockUser, access_token: 'token' };

      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      // Mock role check to return no admin role
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: [], error: null })),
      });

      const onLoginSuccess = vi.fn();
      const { user } = render(<AdminLogin onLoginSuccess={onLoginSuccess} />);

      await user.type(screen.getByPlaceholderText(/enter your email/i), 'user@test.com');
      await user.type(screen.getByPlaceholderText(/enter password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      });

      expect(onLoginSuccess).not.toHaveBeenCalled();
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility when eye icon is clicked', async () => {
      const { user } = render(<AdminLogin onLoginSuccess={vi.fn()} />);

      const passwordInput = screen.getByPlaceholderText(/enter password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Find and click the toggle button
      const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button has no text
      await user.click(toggleButton);

      expect(passwordInput).toHaveAttribute('type', 'text');

      // Toggle back
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Loading State', () => {
    it('should show loading state during authentication', async () => {
      // Make the sign in hang
      mockSignInWithPassword.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { user } = render(<AdminLogin onLoginSuccess={vi.fn()} />);

      await user.type(screen.getByPlaceholderText(/enter your email/i), 'admin@test.com');
      await user.type(screen.getByPlaceholderText(/enter password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      });
    });

    it('should disable form inputs during loading', async () => {
      mockSignInWithPassword.mockImplementation(
        () => new Promise(() => {})
      );

      const { user } = render(<AdminLogin onLoginSuccess={vi.fn()} />);

      await user.type(screen.getByPlaceholderText(/enter your email/i), 'admin@test.com');
      await user.type(screen.getByPlaceholderText(/enter password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
      });
    });
  });
});

describe('checkAdminAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('should return false when no session exists', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const result = await checkAdminAuth();

    expect(result).toBe(false);
  });

  it('should return false when user has no admin role', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
          access_token: 'token',
        },
      },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    });

    const result = await checkAdminAuth();

    expect(result).toBe(false);
  });

  it('should return true when user has admin role', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
          access_token: 'token',
        },
      },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) =>
        resolve({ data: [{ role: 'admin' }], error: null })
      ),
    });

    const result = await checkAdminAuth();

    expect(result).toBe(true);
  });
});

describe('checkAdminAuthSync', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('should return false when no cached auth exists', () => {
    const result = checkAdminAuthSync();

    expect(result).toBe(false);
  });

  it('should return true when valid cached auth exists', () => {
    sessionStorage.setItem('miko_admin_auth_valid', 'true');
    sessionStorage.setItem('miko_admin_auth_expiry', String(Date.now() + 60000));

    const result = checkAdminAuthSync();

    expect(result).toBe(true);
  });

  it('should return false when cached auth is expired', () => {
    sessionStorage.setItem('miko_admin_auth_valid', 'true');
    sessionStorage.setItem('miko_admin_auth_expiry', String(Date.now() - 1000));

    const result = checkAdminAuthSync();

    expect(result).toBe(false);
  });
});

describe('adminLogout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    // Mock window.location
    delete window.location;
    window.location = { href: '' };
  });

  it('should call Supabase signOut', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    await adminLogout();

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('should clear session storage', async () => {
    sessionStorage.setItem('miko_admin_auth_valid', 'true');
    sessionStorage.setItem('miko_admin_auth_expiry', '12345');

    mockSignOut.mockResolvedValue({ error: null });

    await adminLogout();

    expect(sessionStorage.getItem('miko_admin_auth_valid')).toBeNull();
    expect(sessionStorage.getItem('miko_admin_auth_expiry')).toBeNull();
  });

  it('should redirect to /admin', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    await adminLogout();

    expect(window.location.href).toBe('/admin');
  });
});
