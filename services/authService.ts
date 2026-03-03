import { User } from '../types';

const STORAGE_KEY_SESSION = 'pem_session';

export const authService = {
  // Login
  login: async (email: string, password: string): Promise<User> => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error("登录失败");
    }

    const data = await response.json();
    if (data.success) {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(data.user));
      return data.user;
    }
    
    throw new Error("邮箱或密码错误");
  },

  // Register (same as login for mock backend)
  register: async (email: string, password: string, name: string): Promise<User> => {
    return authService.login(email, password);
  },

  // Logout
  logout: () => {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  },

  // Get current user
  getCurrentUser: (): User | null => {
    const sessionStr = localStorage.getItem(STORAGE_KEY_SESSION);
    return sessionStr ? JSON.parse(sessionStr) : null;
  }
};