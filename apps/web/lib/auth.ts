'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

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

export function useRole(): string | null {
  const token = useToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

/**
 * True once the component has mounted on the client. Guards against the
 * SSR hydration trap: useSyncExternalStore's server snapshot is null, so a
 * "redirect when token is null" effect would fire on first render even for
 * logged-in users. Wait for `ready` before redirecting.
 */
export function useAuthReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  return ready;
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
