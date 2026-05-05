import React from "react";

const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Open dashboard", href: "/dashboard" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Templates", href: "#templates" },
    ],
  },
  {
    title: "Stack",
    links: [
      { label: "Raydium LaunchLab", href: "https://docs.raydium.io/raydium/launchlab/launchlab" },
      { label: "Torque", href: "https://platform.torque.so/docs/mcp/quickstart" },
      { label: "Solana", href: "https://solana.com" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "GitHub", href: "#" },
      { label: "Friction log", href: "#" },
      { label: "X / @jaguarxyz", href: "#" },
    ],
  },
];

const linkClassName =
  "text-sm text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2ea86b] focus-visible:ring-offset-2 rounded";

function FooterBrand() {
  return (
    <div className="col-span-2 flex flex-col gap-4 lg:col-span-2" data-aura-component-name="Footer">
      <a
        href="/"
        className="flex w-fit items-center gap-2 text-xl font-semibold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2ea86b] focus-visible:ring-offset-2"
        data-aura-component-name="Footer"
        aria-label="Jaguar home"
      >
        <iconify-icon
          icon="solar:rocket-2-bold"
          className="text-2xl text-[#2ea86b]"
          strokewidth="1.5"
          data-aura-component-name="Footer"
        />
        <span>Jaguar</span>
      </a>
      <p className="max-w-[280px] text-sm text-slate-500" data-aura-component-name="Footer">
        The decision engine for Solana launches. Every new pair, scored minute by minute.
      </p>
      <div
        className="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500"
        data-aura-component-name="Footer"
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        Live on Solana devnet
      </div>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div className="flex flex-col gap-3" data-aura-component-name="Footer">
      <h4
        className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-900"
        data-aura-component-name="Footer"
      >
        {title}
      </h4>
      {links.map(({ label, href }) => (
        <a key={label} href={href} className={linkClassName} data-aura-component-name="Footer">
          {label}
        </a>
      ))}
    </div>
  );
}

export default function Footer() {
  return (
    <footer
      id="docs"
      className="border-t border-slate-200/70 bg-slate-50 px-6 pb-10 pt-20 lg:px-12"
    >
      <div className="mx-auto max-w-[1200px]" data-aura-component-name="Footer">
        <div
          className="grid grid-cols-2 gap-8 md:grid-cols-5"
          data-aura-component-name="Footer"
        >
          <FooterBrand />
          {footerGroups.map((group) => (
            <FooterColumn key={group.title} {...group} />
          ))}
        </div>
        <div
          className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-slate-200/70 pt-8 text-xs text-slate-400 md:flex-row md:items-center"
          data-aura-component-name="Footer"
        >
          <span>© 2026 Jaguar. Built for the Goldrush track.</span>
          <span className="font-mono">jaguar.xyz</span>
        </div>
      </div>
    </footer>
  );
}
