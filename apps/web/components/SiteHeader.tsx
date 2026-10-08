'use client';

import Link from 'next/link';
import { clearToken, useRole, useToken } from '@/lib/auth';

export default function SiteHeader({ compact = false }: { compact?: boolean }) {
  const token = useToken();
  const role = useRole();

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          ⚡ Fixora
        </Link>
        {!compact && (
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted sm:flex">
            <a href="/#services" className="hover:text-foreground">Services</a>
            <a href="/#how" className="hover:text-foreground">How it works</a>
            <a href="/#pros" className="hover:text-foreground">For Pros</a>
          </nav>
        )}
        <div className="flex items-center gap-3">
          {!compact && (
            <Link
              href="/businesses"
              className="hidden text-sm font-semibold text-muted hover:text-foreground sm:inline"
            >
              Browse pros
            </Link>
          )}
          {token ? (
            <>
              {role === 'CUSTOMER' && (
                <Link href="/bookings" className="text-sm font-semibold text-muted hover:text-foreground">
                  My bookings
                </Link>
              )}
              {role === 'BUSINESS_OWNER' && (
                <Link href="/dashboard" className="text-sm font-semibold text-muted hover:text-foreground">
                  Dashboard
                </Link>
              )}
              {role === 'TECHNICIAN' && (
                <Link href="/tech" className="text-sm font-semibold text-muted hover:text-foreground">
                  My jobs
                </Link>
              )}
              {role === 'ADMIN' && (
                <Link href="/admin" className="text-sm font-semibold text-muted hover:text-foreground">
                  Admin
                </Link>
              )}
              <button
                onClick={() => clearToken()}
                className="text-sm font-semibold text-muted hover:text-foreground"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-semibold text-muted hover:text-foreground">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-btn bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-dark"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
