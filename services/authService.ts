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
      let errorMsg = "登录失败";
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    const data = await response.json();
    if (data.success) {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(data.user));
      return data.user;
    }
    
    throw new Error("邮箱或密码错误");
  },

  // Register
  register: async (email: string, password: string, name: string): Promise<User> => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      let errorMsg = "注册失败";
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    const data = await response.json();
    if (data.success) {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(data.user));
      return data.user;
    }
    
    throw new Error("注册失败");
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