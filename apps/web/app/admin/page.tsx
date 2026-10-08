'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminCreatePayout,
  adminList,
  adminMarkPayoutPaid,
  adminOverview,
  adminPendingTechnicians,
  adminResolveDispute,
  adminVerifyTechnician,
} from '@/lib/api';
import { useToken, useAuthReady } from '@/lib/auth';
import SiteHeader from '@/components/SiteHeader';

const inputCls =
  'rounded-[15px] border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500';

type Tab = 'overview' | 'technicians' | 'disputes' | 'payouts' | 'users';

export default function AdminPanel() {
  const router = useRouter();
  const token = useToken();
  const ready = useAuthReady();
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [payoutForm, setPayoutForm] = useState({ technicianId: '', amount: '' });

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      if (tab === 'overview') {
        setOverview(await adminOverview(token));
      } else if (tab === 'technicians') {
        setRows(await adminPendingTechnicians(token));
      } else if (tab === 'disputes') {
        setRows(await adminList(token, 'disputes', '?status=open'));
      } else if (tab === 'payouts') {
        setRows(await adminList(token, 'payouts'));
      } else {
        setRows(await adminList(token, 'users'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [token, tab]);

  useEffect(() => {
    if (!ready) return;
    if (token === null) router.replace('/login');
    else load();
  }, [ready, token, router, load]);

  async function act(fn: () => Promise<unknown>) {
    try {
      await fn();
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed');
    }
  }

  const tabs: Tab[] = ['overview', 'technicians', 'disputes', 'payouts', 'users'];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader compact />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Admin panel</h1>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-[15px] px-4 py-2 text-sm font-semibold capitalize ${
                tab === t ? 'bg-indigo-600 text-white' : 'bg-neutral-100 text-neutral-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {tab === 'overview' && overview && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Revenue (paid)', `Rs ${Number(overview.revenue ?? 0).toLocaleString()}`],
              ['Businesses', String(overview.businesses ?? 0)],
              ['Open disputes', String(overview.openDisputes ?? 0)],
              ['Pending technicians', String(overview.pendingTechnicians ?? 0)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[15px] border border-neutral-200 bg-white p-6">
                <p className="text-sm text-neutral-500">{label}</p>
                <p className="mt-1 text-2xl font-bold">{value}</p>
              </div>
            ))}
            <div className="rounded-[15px] border border-neutral-200 bg-white p-6 sm:col-span-2">
              <p className="text-sm text-neutral-500">Bookings by status</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries((overview.bookings as Record<string, number>) ?? {}).map(([s, n]) => (
                  <span key={s} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold">
                    {s}: {n}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-[15px] border border-neutral-200 bg-white p-6 sm:col-span-2">
              <p className="text-sm text-neutral-500">Users by role</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries((overview.users as Record<string, number>) ?? {}).map(([s, n]) => (
                  <span key={s} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold">
                    {s}: {n}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'technicians' && (
          <div className="mt-6 space-y-3">
            {rows.length === 0 && <p className="text-neutral-500">No pending verifications.</p>}
            {rows.map((r) => (
              <div key={String(r.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-[15px] border border-neutral-200 bg-white p-4">
                <div>
                  <p className="font-semibold">{(r as { user?: { name?: string; email?: string } }).user?.name} <span className="text-sm text-neutral-500">{(r as { user?: { email?: string } }).user?.email}</span></p>
                  <p className="text-sm text-neutral-600">Skills: {JSON.parse(String(r.skills ?? '[]')).join(', ')}</p>
                  <p className="text-sm text-neutral-600">Areas: {JSON.parse(String(r.serviceAreas ?? '[]')).join(', ')}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => act(() => adminVerifyTechnician(token!, String(r.id), 'VERIFIED'))} className="rounded-[15px] bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                    Verify
                  </button>
                  <button onClick={() => act(() => adminVerifyTechnician(token!, String(r.id), 'REJECTED'))} className="rounded-[15px] border border-red-200 px-4 py-2 text-sm font-semibold text-red-600">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'disputes' && (
          <div className="mt-6 space-y-3">
            {rows.length === 0 && <p className="text-neutral-500">No open disputes.</p>}
            {rows.map((r) => (
              <div key={String(r.id)} className="rounded-[15px] border border-neutral-200 bg-white p-4">
                <p className="text-sm text-neutral-500">Booking {(r as { bookingId?: string }).bookingId}</p>
                <p className="mt-1 font-medium">“{String(r.reason)}”</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => act(() => adminResolveDispute(token!, String(r.id), 'resolved'))} className="rounded-[15px] bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
                    Resolve (business)
                  </button>
                  <button onClick={() => act(() => adminResolveDispute(token!, String(r.id), 'refunded'))} className="rounded-[15px] border border-red-200 px-4 py-2 text-sm font-semibold text-red-600">
                    Refund customer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'payouts' && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-2 rounded-[15px] border border-neutral-200 bg-white p-4">
              <input placeholder="Technician ID" value={payoutForm.technicianId} onChange={(e) => setPayoutForm({ ...payoutForm, technicianId: e.target.value })} className={inputCls} />
              <input placeholder="Amount (Rs)" type="number" min={1} value={payoutForm.amount} onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })} className={inputCls + ' w-36'} />
              <button
                onClick={() => payoutForm.technicianId && payoutForm.amount && act(() => adminCreatePayout(token!, payoutForm.technicianId, Number(payoutForm.amount)))}
                className={inputCls + ' bg-indigo-600 font-semibold text-white'}
              >
                Create payout
              </button>
            </div>
            {rows.map((r) => (
              <div key={String(r.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-[15px] border border-neutral-200 bg-white p-4">
                <div>
                  <p className="font-semibold">Rs {Number(r.amount).toLocaleString()} <span className="text-sm font-normal text-neutral-500">({String(r.status)})</span></p>
                  <p className="text-sm text-neutral-600">Technician: {String(r.technicianId).slice(0, 12)}…</p>
                </div>
                {String(r.status) !== 'paid' && (
                  <button onClick={() => act(() => adminMarkPayoutPaid(token!, String(r.id)))} className="rounded-[15px] bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                    Mark paid
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'users' && (
          <div className="mt-6 space-y-2">
            {rows.map((r) => (
              <div key={String(r.id)} className="flex flex-wrap justify-between gap-2 rounded-[15px] border border-neutral-200 bg-white px-4 py-3">
                <span className="font-medium">{String(r.name)} <span className="text-sm text-neutral-500">{String(r.email)}</span></span>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold">{String(r.role)}</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
