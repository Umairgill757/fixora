'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  applyAsTechnician,
  getMyTechProfile,
  getTechEarnings,
  getTechJobs,
  techJobAction,
  type Booking,
  type TechProfile,
} from '@/lib/api';
import { useToken } from '@/lib/auth';
import SiteHeader from '@/components/SiteHeader';

const inputCls =
  'w-full rounded-[15px] border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-indigo-500';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending verification',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

export default function TechPortal() {
  const router = useRouter();
  const token = useToken();
  const [profile, setProfile] = useState<TechProfile | null | undefined>(undefined);
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [earnings, setEarnings] = useState<{ net: number; payable: number; paidOut: number; jobsSettled: number } | null>(null);
  const [skills, setSkills] = useState('');
  const [areas, setAreas] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const p = await getMyTechProfile(token);
      setProfile(p);
      if (p) {
        const [j, e] = await Promise.all([getTechJobs(token), getTechEarnings(token)]);
        setJobs(j);
        setEarnings(e);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [token]);

  useEffect(() => {
    if (token === null) router.replace('/login');
    else load();
  }, [token, router, load]);

  async function onApply(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    try {
      await applyAsTechnician(token, {
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        serviceAreas: areas.split(',').map((s) => s.trim()).filter(Boolean),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Application failed');
    }
  }

  async function onJob(id: string, action: 'accept' | 'decline' | 'complete') {
    if (!token) return;
    if (action === 'decline' && !confirm('Decline this job? It goes back to the dispatch pool.')) return;
    try {
      await techJobAction(token, id, action);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed');
    }
  }

  if (profile === undefined) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader compact />
        <main className="mx-auto w-full max-w-3xl px-4 py-12">
          <p className="text-neutral-500">Loading…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader compact />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Technician portal</h1>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {profile === null ? (
          <form onSubmit={onApply} className="mt-8 max-w-md space-y-4 rounded-[15px] border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-bold">Apply as a technician</h2>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Skills (comma separated)</label>
              <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="wiring, switchboard repair" className={inputCls} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Service areas (comma separated)</label>
              <input value={areas} onChange={(e) => setAreas(e.target.value)} placeholder="Lahore, DHA" className={inputCls} required />
            </div>
            <button type="submit" className="w-full rounded-[15px] bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700">
              Submit application
            </button>
            <p className="text-xs text-neutral-500">An admin reviews applications before you can take jobs.</p>
          </form>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
                {STATUS_LABEL[profile.verificationStatus] ?? profile.verificationStatus}
              </span>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                ⭐ {profile.rating.toFixed(1)} · {profile.completedJobs} jobs done
              </span>
            </div>

            {earnings && (
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[15px] border border-neutral-200 bg-white p-5">
                  <p className="text-sm text-neutral-500">Net earnings</p>
                  <p className="mt-1 text-xl font-bold">Rs {earnings.net.toLocaleString()}</p>
                </div>
                <div className="rounded-[15px] border border-neutral-200 bg-white p-5">
                  <p className="text-sm text-neutral-500">Payable</p>
                  <p className="mt-1 text-xl font-bold">Rs {earnings.payable.toLocaleString()}</p>
                </div>
                <div className="rounded-[15px] border border-neutral-200 bg-white p-5">
                  <p className="text-sm text-neutral-500">Paid out</p>
                  <p className="mt-1 text-xl font-bold">Rs {earnings.paidOut.toLocaleString()}</p>
                </div>
              </div>
            )}

            <h2 className="mt-8 text-xl font-bold">My jobs</h2>
            <div className="mt-4 space-y-4">
              {jobs.length === 0 && <p className="text-neutral-500">No active jobs.</p>}
              {jobs.map((j) => (
                <div key={j.id} className="rounded-[15px] border border-neutral-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{j.service?.name ?? 'General visit'} — {j.business.name}</p>
                      <p className="mt-1 text-sm text-neutral-600">{new Date(j.scheduledAt).toLocaleString()}</p>
                      <p className="mt-1 text-sm text-neutral-500">{j.address}</p>
                      {j.notes && <p className="mt-1 text-sm text-neutral-500">“{j.notes}”</p>}
                    </div>
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                      {j.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {j.status === 'ASSIGNED' && (
                      <>
                        <button onClick={() => onJob(j.id, 'accept')} className="rounded-[15px] bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                          Accept
                        </button>
                        <button onClick={() => onJob(j.id, 'decline')} className="rounded-[15px] border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                          Decline
                        </button>
                      </>
                    )}
                    {j.status === 'IN_PROGRESS' && (
                      <button onClick={() => onJob(j.id, 'complete')} className="rounded-[15px] bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                        Mark complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
