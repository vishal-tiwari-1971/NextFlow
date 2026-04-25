// /app/page.tsx
import Link from 'next/link';

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 py-10 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.1),transparent_30%)]" />

      <section className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center shadow-[0_24px_80px_rgba(2,6,23,0.6)] backdrop-blur-xl sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-500">Nextflow</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">
          Build Visual Workflows
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
          Create node-based workflows with a fast, polished canvas inspired by modern creative tools.
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            href="/workflow"
            className="inline-flex items-center rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-medium text-slate-100 transition hover:border-white/25 hover:bg-white/15"
          >
            Open Workflow Builder
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.22em] text-slate-500">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
        </div>
      </section>
    </main>
  );
}