'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { register } from '@/lib/api';
import { setToken } from '@/lib/auth';

const inputCls =
  'w-full rounded-[15px] border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

const ROLES = [
  { value: 'CUSTOMER', label: 'Customer — book services' },
  { value: 'TECHNICIAN', label: 'Technician — take jobs' },
  { value: 'BUSINESS_OWNER', label: 'Business owner — list my business' },
];

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await register({ name, email, password, role });
      setToken(res.accessToken);
      router.push('/bookings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-2 text-neutral-600">Book trusted home services in minutes.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {error && (
          <p className="rounded-[15px] bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Full name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">I am a…</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-[15px] bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? 'Creating account…' : 'Sign up'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-600">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
