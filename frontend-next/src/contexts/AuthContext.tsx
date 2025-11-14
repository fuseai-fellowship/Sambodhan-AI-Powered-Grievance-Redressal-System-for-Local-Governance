'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import apiClient from '../../lib/api-client';
import { User, AuthResponse } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, phone: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check if we're on an admin page
  const isAdminPage = pathname?.startsWith('/admin-dashboard') || pathname?.startsWith('/admin-login');

  // Load user on mount
  useEffect(() => {
    // Skip auth check for admin pages
    if (isAdminPage) {
      setLoading(false);
      return;
    }
    loadUser();
  }, [isAdminPage]);

  const loadUser = async () => {
    const token = Cookies.get('sambodhan_token');
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.get<User>('/chatbot/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to load user:', error);
      Cookies.remove('sambodhan_token');
      Cookies.remove('sambodhan_user');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await apiClient.post<AuthResponse>('/chatbot/auth/login', {
      email,
      password,
    });

    if (response.data.success && response.data.token && response.data.user) {
      Cookies.set('sambodhan_token', response.data.token, { expires: 1 }); // 1 day
      Cookies.set('sambodhan_user', JSON.stringify(response.data.user), { expires: 1 });
      setUser(response.data.user);
      router.push('/dashboard');
    } else {
      throw new Error(response.data.message || 'Login failed');
    }
  };

  const signup = async (
    name: string,
    email: string,
    phone: string,
    password: string
  ) => {
    const response = await apiClient.post<AuthResponse>('/chatbot/auth/signup', {
      name,
      email,
      phone,
      password,
    });

    if (response.data.success && response.data.token && response.data.user) {
      Cookies.set('sambodhan_token', response.data.token, { expires: 1 });
      Cookies.set('sambodhan_user', JSON.stringify(response.data.user), { expires: 1 });
      setUser(response.data.user);
      router.push('/dashboard');
    } else {
      throw new Error(response.data.message || 'Signup failed');
    }
  };

  const logout = () => {
    Cookies.remove('sambodhan_token');
    Cookies.remove('sambodhan_user');
    setUser(null);
    router.push('/auth/login');
  };

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
