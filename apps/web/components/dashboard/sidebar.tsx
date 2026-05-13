"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: string;
};

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Dashboard</title>
    <rect x="3" y="3" width="7.5" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" fill="currentColor" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <rect
      x="13.5"
      y="13.5"
      width="7.5"
      height="7.5"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.8"
    />
  </svg>
);

const LaunchesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Launches</title>
    <path
      d="M9 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <rect x="9" y="3" width="6" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="m8 13 2.5 2.5L16 10"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const AlertsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Alerts</title>
    <path
      d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const AnalystIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Analyst</title>
    <path
      d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M8 13.5h8M9.5 17h5M9 10.5l2 2 4-4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.2" opacity={0.35} />
  </svg>
);

const ScorecardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Scorecard</title>
    <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M3 9h18M8 2v5M16 2v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const PersonasIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Personas</title>
    <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M3 20a6 6 0 0 1 12 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="17" cy="9" r="2.6" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M15 16.5a4.5 4.5 0 0 1 6 0"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <title>Settings</title>
    <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M19 12a7.8 7.8 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7.3 7.3 0 0 0-2.1-1.2L14 3h-4l-.4 2.7a7.3 7.3 0 0 0-2.1 1.2l-2.4-1-2 3.4 2 1.5A7.8 7.8 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1a7.3 7.3 0 0 0 2.1 1.2L10 21h4l.4-2.7a7.3 7.3 0 0 0 2.1-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

const MENU: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <DashboardIcon /> },
  { label: "Launches", href: "/launches", icon: <LaunchesIcon /> },
  { label: "Analyst", href: "/analyst", icon: <AnalystIcon /> },
  { label: "Alerts", href: "/alerts", icon: <AlertsIcon /> },
  { label: "Scorecard", href: "/scorecard", icon: <ScorecardIcon /> },
  { label: "Personas", href: "/personas", icon: <PersonasIcon /> },
  { label: "Settings", href: "/settings", icon: <SettingsIcon /> },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sb">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <title>Jaguar</title>
            <path
              d="M4 14c0-4.4 3.6-8 8-8s8 3.6 8 8"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="12" cy="14" r="3" stroke="currentColor" strokeWidth="2.2" />
            <circle cx="12" cy="14" r="0.8" fill="currentColor" />
          </svg>
        </span>
        <span className="brand-name">Jaguar</span>
      </div>

      <div className="sb-section">Menu</div>
      <nav className="sb-nav">
        {MENU.map((item) => {
          const active =
            item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              className={active ? "sb-link active" : "sb-link"}
              href={item.href}
            >
              {item.icon}
              {item.label}
              {item.badge ? <span className="sb-badge">{item.badge}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="sb-spacer" />
    </aside>
  );
}
