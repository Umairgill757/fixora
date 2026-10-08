const CATEGORIES = [
  { icon: "⚡", name: "Electricians", desc: "Wiring, switchboards, repairs", slug: "electrician" },
  { icon: "🔧", name: "Plumbers", desc: "Leaks, fittings, installations", slug: "plumber" },
  { icon: "🪚", name: "Carpenters", desc: "Furniture, doors, woodwork", slug: "carpenter" },
  { icon: "🎨", name: "Painters", desc: "Interior & exterior painting", slug: "painter" },
  { icon: "❄️", name: "AC Technicians", desc: "Service, repair, install", slug: "ac-technician" },
  { icon: "🧹", name: "Cleaners", desc: "Home & deep cleaning", slug: "cleaner" },
];

const STEPS = [
  { n: "1", title: "Describe the job", desc: "Tell our AI what you need — it asks a few smart questions and gives you a fixed quote with date & time." },
  { n: "2", title: "Book & pay online", desc: "Pick your slot, pay securely. The AI dispatches a verified technician to your door." },
  { n: "3", title: "Job done, invoice emailed", desc: "Track the job live. When it's done, the invoice lands in your inbox with a payment link." },
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <span className="text-xl font-extrabold tracking-tight">
            ⚡ Fixora
          </span>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted sm:flex">
            <a href="#services" className="hover:text-foreground">Services</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#pros" className="hover:text-foreground">For Pros</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/businesses" className="hidden text-sm font-semibold text-muted hover:text-foreground sm:inline">
              Browse pros
            </a>
            <a href="#" className="text-sm font-semibold text-muted hover:text-foreground">Log in</a>
            <a href="#" className="rounded-btn bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-dark">
              Sign up
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-5 pt-14 pb-10 text-center sm:pt-20">
        <h1 className="mx-auto max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
          Home repairs, booked in <span className="text-primary">60 seconds.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
          Describe the problem. Our AI quotes a fixed price, finds a verified
          electrician, plumber or cleaner near you — and handles the invoice.
        </p>
        <form className="rounded-card mx-auto mt-8 flex max-w-xl flex-col gap-3 border border-border bg-card p-3 shadow-sm sm:flex-row">
          <input
            type="text"
            placeholder="e.g. kitchen sink is leaking…"
            className="rounded-input flex-1 border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <button type="submit" className="rounded-btn bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary-dark">
            Get AI quote →
          </button>
        </form>
        <p className="mt-4 text-xs text-muted">✓ Verified pros &nbsp; ✓ Fixed quotes &nbsp; ✓ Secure online payment</p>
      </section>

      {/* Categories */}
      <section id="services" className="mx-auto w-full max-w-6xl px-5 py-10">
        <h2 className="text-center text-2xl font-extrabold tracking-tight">What do you need fixed today?</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((c) => (
            <a key={c.name} href={`/businesses?category=${c.slug}`} className="rounded-card group border border-border bg-card p-5 text-center transition hover:-translate-y-1 hover:shadow-md">
              <div className="text-3xl">{c.icon}</div>
              <div className="mt-2 text-sm font-bold">{c.name}</div>
              <div className="mt-1 text-xs text-muted">{c.desc}</div>
            </a>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto w-full max-w-6xl px-5 py-10">
        <h2 className="text-center text-2xl font-extrabold tracking-tight">How Fixora works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-card border border-border bg-card p-6">
              <div className="rounded-btn flex h-10 w-10 items-center justify-center bg-primary font-extrabold text-white">{s.n}</div>
              <h3 className="mt-3 font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* For pros */}
      <section id="pros" className="mx-auto w-full max-w-6xl px-5 py-10">
        <div className="rounded-card bg-foreground p-8 text-center text-white sm:p-12">
          <h2 className="text-2xl font-extrabold tracking-tight">Are you a technician?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
            Get verified, receive AI-matched jobs in your area, and get paid on time.
            No chasing customers, no paperwork.
          </p>
          <a href="#" className="rounded-btn mt-6 inline-block bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary-dark">
            Join as a pro →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-muted sm:flex-row">
          <span>© 2026 Fixora. All rights reserved.</span>
          <span>Built for homeowners & local pros.</span>
        </div>
      </footer>
    </div>
  );
}
