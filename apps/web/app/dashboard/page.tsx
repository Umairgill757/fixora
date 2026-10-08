'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  assignTechnician,
  generateInvoice,
  getMyBookings,
  getMyBusinesses,
  getVerifiedTechnicians,
  addService,
  removeService,
  updateBookingStatus,
  type Booking,
  type Business,
  type TechProfile,
} from '@/lib/api';
import { useToken, useAuthReady } from '@/lib/auth';
import SiteHeader from '@/components/SiteHeader';

const inputCls =
  'rounded-[15px] border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500';

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-block rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default function OwnerDashboard() {
  const router = useRouter();
  const token = useToken();
  const ready = useAuthReady();
  const [tab, setTab] = useState<'bookings' | 'services' | 'revenue'>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [techs, setTechs] = useState<TechProfile[]>([]);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [assignTech, setAssignTech] = useState('');
  const [newSvc, setNewSvc] = useState({ name: '', basePrice: '', unit: 'visit' });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [b, biz, t] = await Promise.all([
        getMyBookings(token),
        getMyBusinesses(token),
        getVerifiedTechnicians(token),
      ]);
      setBookings(b);
      setBusinesses(biz);
      setTechs(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [token]);

  useEffect(() => {
    if (!ready) return;
    if (token === null) router.replace('/login');
    else load();
  }, [ready, token, router, load]);

  async function act(fn: () => Promise<unknown>, msg: string) {
    if (!token) return;
    try {
      await fn();
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : msg);
    }
  }

  const revenue = bookings
    .filter((b) => ['INVOICED', 'SETTLED', 'COMPLETED'].includes(b.status) && b.totalPrice)
    .reduce((s, b) => s + (b.totalPrice ?? 0), 0);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader compact />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Business dashboard</h1>

        <div className="mt-6 flex gap-2">
          {(['bookings', 'services', 'revenue'] as const).map((t) => (
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

        {tab === 'bookings' && (
          <div className="mt-6 space-y-4">
            {bookings.length === 0 && <p className="text-neutral-500">No bookings yet.</p>}
            {bookings.map((b) => (
              <div key={b.id} className="rounded-[15px] border border-neutral-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {b.service?.name ?? 'General visit'} — {new Date(b.scheduledAt).toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">{b.address}</p>
                    {b.notes && <p className="mt-1 text-sm text-neutral-500">“{b.notes}”</p>}
                    {b.totalPrice != null && (
                      <p className="mt-1 text-sm font-semibold">Rs {b.totalPrice.toLocaleString()}</p>
                    )}
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {b.status === 'PAID' && (
                    <button
                      onClick={() => act(() => updateBookingStatus(token!, b.id, 'DISPATCHED'), 'Failed')}
                      className={inputCls + ' font-semibold text-indigo-700'}
                    >
                      Mark dispatched
                    </button>
                  )}
                  {b.status === 'DISPATCHED' &&
                    (assignFor === b.id ? (
                      <span className="flex gap-2">
                        <select value={assignTech} onChange={(e) => setAssignTech(e.target.value)} className={inputCls}>
                          <option value="">Select technician</option>
                          {techs.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.user?.name ?? t.id.slice(0, 8)} — ⭐ {t.rating.toFixed(1)}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() =>
                            assignTech && act(() => assignTechnician(token!, b.id, assignTech), 'Assign failed')
                          }
                          className={inputCls + ' bg-indigo-600 font-semibold text-white'}
                        >
                          Assign
                        </button>
                      </span>
                    ) : (
                      <button onClick={() => setAssignFor(b.id)} className={inputCls + ' font-semibold text-indigo-700'}>
                        Assign technician
                      </button>
                    ))}
                  {b.status === 'COMPLETED' && (
                    <button
                      onClick={() => act(() => generateInvoice(token!, b.id), 'Invoice failed')}
                      className={inputCls + ' font-semibold text-emerald-700'}
                    >
                      Generate invoice
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'services' && (
          <div className="mt-6 space-y-6">
            {businesses.map((biz) => (
              <div key={biz.id} className="rounded-[15px] border border-neutral-200 bg-white p-5">
                <h2 className="font-bold text-lg">{biz.name}</h2>
                <div className="mt-3 space-y-2">
                  {biz.services?.map((s: { id: string; name: string; basePrice: number; unit: string }) => (
                    <div key={s.id} className="flex items-center justify-between rounded-[15px] bg-neutral-50 px-4 py-2">
                      <span className="text-sm font-medium">
                        {s.name} — Rs {s.basePrice.toLocaleString()} / {s.unit}
                      </span>
                      <button
                        onClick={() => act(() => removeService(token!, biz.id, s.id), 'Remove failed')}
                        className="text-sm font-semibold text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <input
                    placeholder="Service name"
                    value={newSvc.name}
                    onChange={(e) => setNewSvc({ ...newSvc, name: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    placeholder="Price (Rs)"
                    type="number"
                    min={1}
                    value={newSvc.basePrice}
                    onChange={(e) => setNewSvc({ ...newSvc, basePrice: e.target.value })}
                    className={inputCls + ' w-32'}
                  />
                  <input
                    placeholder="Unit (visit/hour)"
                    value={newSvc.unit}
                    onChange={(e) => setNewSvc({ ...newSvc, unit: e.target.value })}
                    className={inputCls + ' w-32'}
                  />
                  <button
                    onClick={() =>
                      newSvc.name &&
                      newSvc.basePrice &&
                      act(
                        () =>
                          addService(token!, biz.id, {
                            name: newSvc.name,
                            basePrice: Number(newSvc.basePrice),
                            unit: newSvc.unit || 'visit',
                          }),
                        'Add failed',
                      )
                    }
                    className={inputCls + ' bg-indigo-600 font-semibold text-white'}
                  >
                    Add service
                  </button>
                </div>
              </div>
            ))}
            {businesses.length === 0 && (
              <p className="text-neutral-500">No businesses yet. Create one from the API to get started.</p>
            )}
          </div>
        )}

        {tab === 'revenue' && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[15px] border border-neutral-200 bg-white p-6">
              <p className="text-sm text-neutral-500">Revenue (completed+)</p>
              <p className="mt-1 text-2xl font-bold">Rs {revenue.toLocaleString()}</p>
            </div>
            <div className="rounded-[15px] border border-neutral-200 bg-white p-6">
              <p className="text-sm text-neutral-500">Total bookings</p>
              <p className="mt-1 text-2xl font-bold">{bookings.length}</p>
            </div>
            <div className="rounded-[15px] border border-neutral-200 bg-white p-6">
              <p className="text-sm text-neutral-500">Active (not done)</p>
              <p className="mt-1 text-2xl font-bold">
                {bookings.filter((b) => !['COMPLETED', 'INVOICED', 'SETTLED', 'CANCELLED'].includes(b.status)).length}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
