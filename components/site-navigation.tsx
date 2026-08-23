import Link from "next/link";

const freeTools = [
  { href: "/generator", label: "Quick Generate" },
  { href: "/intelligence", label: "Coverage Review" },
  { href: "/engineering-review", label: "Release Review" },
] as const;

export function SiteNavigation() {
  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-xs font-bold tracking-tight text-white shadow-sm transition group-hover:bg-cyan-600">
            PG
          </span>
          <span>
            <span className="block text-base font-bold tracking-[-0.02em] text-slate-950">
              PlaywrightGen
            </span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:block">
              Quality operating system
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          <Link
            href="/#product"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          >
            Product
          </Link>
          <span className="ml-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Free tools
          </span>
          {freeTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              {tool.label}
            </Link>
          ))}
          <Link
            href="/pricing"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          >
            Pricing
          </Link>
        </div>

        <Link
          href="/workspace"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-600"
        >
          Open Workspace
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden">
        {freeTools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
          >
            {tool.label}
          </Link>
        ))}
        <Link
          href="/pricing"
          className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
        >
          Pricing
        </Link>
      </div>
    </nav>
  );
}
