import { notFound } from "next/navigation";
import { getBusiness } from "@/lib/api";
import BookingForm from "@/components/BookingForm";
import SiteHeader from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) return { title: "Not found — Fixora" };
  return {
    title: `${business.name} — ${business.city} | Fixora`,
    description:
      business.description ??
      `Book ${business.name} in ${business.city}. Verified technicians, fixed quotes, secure online payment.`,
  };
}

export default async function BusinessDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader compact />

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
        <div className="rounded-card border border-border bg-card p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">{business.name}</h1>
              <p className="mt-2 text-muted">
                📍 {business.city} · ⭐ {business.rating.toFixed(1)}
                {business.verified && <span className="ml-2 font-bold text-primary">✓ Verified</span>}
              </p>
            </div>
            <a
              href="#book"
              className="rounded-btn bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary-dark"
            >
              Book now →
            </a>
          </div>

          {business.description && <p className="mt-4 text-muted">{business.description}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            {business.serviceAreas.map((a) => (
              <span key={a} className="rounded-btn bg-background px-3 py-1 text-xs font-semibold text-muted">
                📍 {a}
              </span>
            ))}
          </div>
        </div>

        <h2 className="mt-8 text-xl font-extrabold">Services & fixed prices</h2>
        <div className="mt-4 grid gap-3">
          {business.services.map((s) => (
            <div key={s.id} className="rounded-card flex items-center justify-between border border-border bg-card p-5">
              <div>
                <div className="font-bold">{s.name}</div>
                {s.description && <div className="text-sm text-muted">{s.description}</div>}
              </div>
              <div className="text-right">
                <div className="text-lg font-extrabold text-primary">Rs {s.basePrice.toLocaleString()}</div>
                <div className="text-xs text-muted">per {s.unit}</div>
              </div>
            </div>
          ))}
          {business.services.length === 0 && <p className="text-muted">No services listed yet.</p>}
        </div>

        {business.technicians.length > 0 && (
          <>
            <h2 className="mt-8 text-xl font-extrabold">Verified technicians ({business.technicians.length})</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {business.technicians.map((t) => (
                <div key={t.id} className="rounded-card border border-border bg-card p-5">
                  <div className="font-bold">⭐ {t.rating.toFixed(1)} · {t.completedJobs} jobs done</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {t.skills.map((sk) => (
                      <span key={sk} className="rounded-btn bg-background px-3 py-1 text-xs font-semibold text-muted">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div id="book" className="rounded-card mt-8 border border-border bg-card p-8">
          <h2 className="text-xl font-extrabold">Request a booking</h2>
          <p className="mt-2 text-sm text-muted">
            Pick a service and time — the business confirms your slot.
          </p>
          <div className="mt-5">
            <BookingForm business={business} />
          </div>
        </div>
      </main>
    </div>
  );
}
