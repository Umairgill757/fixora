'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBooking, type BusinessDetail } from '@/lib/api';
import { useToken } from '@/lib/auth';

const inputCls =
  'w-full rounded-[15px] border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

export default function BookingForm({ business }: { business: BusinessDetail }) {
  const router = useRouter();
  const token = useToken();
  const [serviceId, setServiceId] = useState(business.services[0]?.id ?? '');
  const [scheduledAt, setScheduledAt] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      router.push('/login');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const iso = new Date(scheduledAt).toISOString();
      await createBooking(token, {
        businessId: business.id,
        serviceId: serviceId || undefined,
        scheduledAt: iso,
        address,
        notes: notes || undefined,
      });
      router.push('/bookings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <p className="rounded-[15px] bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {business.services.length > 0 && (
        <div>
          <label className="mb-1.5 block text-sm font-medium">Service</label>
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputCls}>
            <option value="">General visit</option>
            {business.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — Rs {s.basePrice.toLocaleString()} {s.unit}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium">Date & time</label>
        <input
          type="datetime-local"
          required
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          min={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)}
          className={inputCls}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Service address</label>
        <input
          required
          minLength={5}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="House 12, Street 4, DHA Phase 5, Lahore"
          className={inputCls}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe the issue…"
          rows={3}
          className={inputCls}
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-[15px] bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
      >
        {busy ? 'Requesting…' : token ? 'Request booking' : 'Log in to book'}
      </button>
      <p className="text-center text-xs text-neutral-500">
        The business confirms your slot. You can pay securely with JazzCash from My bookings.
      </p>
    </form>
  );
}
