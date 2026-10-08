'use client';

import { useSyncExternalStore } from 'react';

const TOKEN_KEY = 'fixora_token';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('fixora:auth', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('fixora:auth', callback);
  };
}

export function useToken(): string | null {
  return useSyncExternalStore(subscribe, getToken, () => null);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event('fixora:auth'));
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event('fixora:auth'));
}

export function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
