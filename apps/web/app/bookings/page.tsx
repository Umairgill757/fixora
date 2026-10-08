'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cancelBooking, getMyBookings, initiatePayment, openDispute, submitReview, type Booking } from '@/lib/api';
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
  const [payingId, setPayingId] = useState<string | null>(null);
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [disputeFor, setDisputeFor] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');

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

  async function onReview(id: string) {
    if (!token) return;
    try {
      await submitReview(token, id, rating, comment || undefined);
      setReviewFor(null);
      setComment('');
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Review failed');
    }
  }

  async function onDispute(id: string) {
    if (!token || disputeReason.trim().length < 10) {
      alert('Please describe the issue (at least 10 characters).');
      return;
    }
    try {
      await openDispute(token, id, disputeReason.trim());
      setDisputeFor(null);
      setDisputeReason('');
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Dispute failed');
    }
  }
  async function onPay(booking: Booking) {
    if (!token) return;
    setPayingId(booking.id);
    try {
      const checkout = await initiatePayment(token, booking.id);
      // Auto-submit a hidden form to JazzCash's hosted checkout page.
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = checkout.gatewayUrl;
      for (const [k, v] of Object.entries(checkout.fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = k;
        input.value = v;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Payment failed');
      setPayingId(null);
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
              {b.status === 'QUOTED' && (
                <button
                  onClick={() => onPay(b)}
                  disabled={payingId === b.id}
                  className="rounded-[15px] bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {payingId === b.id ? 'Redirecting…' : 'Pay with JazzCash'}
                </button>
              )}
              {['QUOTED', 'PAID'].includes(b.status) && (
                <button
                  onClick={() => onCancel(b.id)}
                  className="rounded-[15px] border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Cancel
                </button>
              )}
              {['COMPLETED', 'INVOICED', 'SETTLED'].includes(b.status) &&
                (reviewFor === b.id ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="rounded-[15px] border border-neutral-200 px-2 py-2 text-sm">
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>{n} ⭐</option>
                      ))}
                    </select>
                    <input
                      placeholder="Comment (optional)"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="rounded-[15px] border border-neutral-200 px-3 py-2 text-sm"
                    />
                    <button onClick={() => onReview(b.id)} className="rounded-[15px] bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
                      Submit
                    </button>
                  </span>
                ) : (
                  <button onClick={() => setReviewFor(b.id)} className="rounded-[15px] border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
                    Leave a review
                  </button>
                ))}
              {['PAID', 'DISPATCHED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'INVOICED'].includes(b.status) &&
                (disputeFor === b.id ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <input
                      placeholder="Describe the issue…"
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="rounded-[15px] border border-neutral-200 px-3 py-2 text-sm"
                    />
                    <button onClick={() => onDispute(b.id)} className="rounded-[15px] bg-orange-600 px-4 py-2 text-sm font-semibold text-white">
                      Open dispute
                    </button>
                  </span>
                ) : (
                  <button onClick={() => setDisputeFor(b.id)} className="rounded-[15px] border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-500 hover:bg-neutral-50">
                    Report issue
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
