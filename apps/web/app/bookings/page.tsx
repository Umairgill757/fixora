'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cancelBooking, getMyBookings, type Booking } from '@/lib/api';
import { useToken } from '@/lib/auth';

const STATUS_STYLE: Record<string, string> = {
  QUOTED: 'bg-amber-100 text-amber-800',
  PAID: 'bg-blue-100 text-blue-800',
  DISPATCHED: 'bg-indigo-100 text-indigo-800',
  ASSIGNED: 'bg-indigo-100 text-indigo-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  INVOICED: 'bg-emerald-100 text-emerald-800',
  SETTLED: 'bg-neutral-200 text-neutral-700',
  CANCELLED: 'bg-red-100 text-red-700',
  DISPUTED: 'bg-orange-100 text-orange-800',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLE[status] ?? 'bg-neutral-100 text-neutral-700';
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default function MyBookingsPage() {
  const router = useRouter();
  const token = useToken();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setBookings(await getMyBookings(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    }
  }, [token]);

  useEffect(() => {
    if (token === null) {
      router.replace('/login');
      return;
    }
    load();
  }, [token, router, load]);

  async function onCancel(id: string) {
    if (!token || !confirm('Cancel this booking?')) return;
    try {
      await cancelBooking(token, id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Cancellation failed');
    }
  }

  if (bookings === null && !error) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12">
        <p className="text-neutral-500">Loading your bookings…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">My bookings</h1>

      {error && (
        <p className="mt-6 rounded-[15px] bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {bookings && bookings.length === 0 && (
        <div className="mt-8 rounded-[15px] border border-neutral-200 bg-white p-8 text-center">
          <p className="text-neutral-600">No bookings yet.</p>
          <Link
            href="/businesses"
            className="mt-4 inline-block rounded-[15px] bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Browse businesses
          </Link>
        </div>
      )}

      <div className="mt-8 space-y-4">
        {bookings?.map((b) => (
          <div key={b.id} className="rounded-[15px] border border-neutral-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  href={`/businesses/${b.business.slug}`}
                  className="font-semibold text-lg hover:underline"
                >
                  {b.business.name}
                </Link>
                <p className="mt-1 text-sm text-neutral-600">
                  {b.service?.name ?? 'General visit'} · {b.business.city}
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  {new Date(b.scheduledAt).toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-neutral-500">{b.address}</p>
              </div>
              <StatusBadge status={b.status} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {b.totalPrice != null && (
                <span className="font-semibold">Rs {b.totalPrice.toLocaleString()}</span>
              )}
              {['QUOTED', 'PAID'].includes(b.status) && (
                <button
                  onClick={() => onCancel(b.id)}
                  className="rounded-[15px] border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
