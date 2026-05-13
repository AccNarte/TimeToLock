import apiClient from '../client';
import { AuthResponse, LoginRequest, RegisterRequest, WalletLoginRequest, User } from '../types';

// Response type now only contains user (token is in HTTP-only cookie)
interface AuthResponseWithCookie {
  user: User;
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponseWithCookie>('/auth/login', data);
    // Token is automatically set as HTTP-only cookie by the backend
    return { access_token: '', user: response.data.user };
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponseWithCookie>('/auth/register', data);
    // Token is automatically set as HTTP-only cookie by the backend
    return { access_token: '', user: response.data.user };
  },

  async walletLogin(data: WalletLoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponseWithCookie>('/auth/wallet-login', data);
    // Token is automatically set as HTTP-only cookie by the backend
    return { access_token: '', user: response.data.user };
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  // User storage helpers (token is now in HTTP-only cookie)
  setUser(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
  },

  getUser(): User | null {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  },

  removeUser(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      // Also clear any wagmi/wallet related storage
      const keysToRemove = Object.keys(localStorage).filter(key =>
        key.startsWith('wagmi') || key.startsWith('rk-') || key.startsWith('walletconnect')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  },

  async logout(): Promise<void> {
    try {
      // Call backend to clear the HTTP-only cookie
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.removeUser();
    }
  },

  // Check if user data exists (auth state is verified via /auth/me)
  hasStoredUser(): boolean {
    return !!this.getUser();
  },

  // Legacy methods for backward compatibility (no-op for token)
  setToken(_token: string): void {
    // Token is now in HTTP-only cookie, no-op
  },

  getToken(): string | null {
    // Token is now in HTTP-only cookie
    // Return a placeholder to maintain backward compatibility with auth checks
    return this.hasStoredUser() ? 'cookie-auth' : null;
  },

  removeToken(): void {
    // Token is now in HTTP-only cookie, no-op
  },

  isAuthenticated(): boolean {
    return this.hasStoredUser();
  },

  // Email verification methods
  async sendVerificationEmail(): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/send-verification');
    return response.data;
  },

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>('/auth/verify-email', { token });
    return response.data;
  },

  async getVerificationStatus(): Promise<{ isVerified: boolean; email: string }> {
    const response = await apiClient.get<{ isVerified: boolean; email: string }>('/auth/verification-status');
    return response.data;
  },
};


