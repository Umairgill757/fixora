import Link from "next/link";
import { getBusinesses } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Find trusted local pros — Fixora",
  description:
    "Browse verified electricians, plumbers, carpenters, painters and cleaners near you. Fixed quotes, secure payment, AI-matched technicians.",
};

const CATEGORY_ICON: Record<string, string> = {
  electrician: "⚡",
  plumber: "🔧",
  carpenter: "🪚",
  painter: "🎨",
  cleaner: "🧹",
};

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; category?: string }>;
}) {
  const params = await searchParams;
  const businesses = await getBusinesses(params);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="text-xl font-extrabold tracking-tight">⚡ Fixora</Link>
          <Link href="/" className="text-sm font-semibold text-muted hover:text-foreground">← Home</Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {params.city ? `Pros in ${params.city}` : "All pros"}
          {params.category ? ` — ${params.category}` : ""}
        </h1>
        <p className="mt-2 text-muted">{businesses.length} verified businesses</p>

        {(params.city || params.category) && (
          <Link href="/businesses" className="mt-3 inline-block text-sm font-semibold text-primary">
            Clear filters ✕
          </Link>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <Link
              key={b.id}
              href={`/businesses/${b.slug}`}
              className="rounded-card group border border-border bg-card p-6 transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="text-3xl">{CATEGORY_ICON[b.categories[0]] ?? "🔧"}</div>
                {b.verified && (
                  <span className="rounded-btn bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    ✓ Verified
                  </span>
                )}
              </div>
              <h2 className="mt-3 text-lg font-bold group-hover:text-primary">{b.name}</h2>
              <p className="mt-1 text-sm text-muted">📍 {b.city} · ⭐ {b.rating.toFixed(1)}</p>
              <p className="mt-2 line-clamp-2 text-sm text-muted">{b.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {b.categories.map((c) => (
                  <span key={c} className="rounded-btn bg-background px-3 py-1 text-xs font-semibold text-muted">
                    {c}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        {businesses.length === 0 && (
          <p className="mt-10 text-center text-muted">No businesses found. Try clearing the filters.</p>
        )}
      </main>
    </div>
  );
}
