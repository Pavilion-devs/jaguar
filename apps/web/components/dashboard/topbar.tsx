import Link from "next/link";

import { getTopbarNotificationSummary } from "@jaguar/db";

import { SearchBox } from "@/components/dashboard/search-box";

const formatBadgeCount = (count: number) => (count > 99 ? "99+" : String(count));

export function Topbar() {
  return <TopbarContent />;
}

export async function TopbarContent() {
  const notifications = await getTopbarNotificationSummary(60);
  const launchCount = notifications.launches.count;
  const analystCount = notifications.analyst.count;

  return (
    <header className="topbar">
      <SearchBox />

      <div className="tb-right">
        <Link
          className={launchCount > 0 ? "icon-btn has-badge" : "icon-btn"}
          href="/launches"
          aria-label={`${launchCount} new launches in the last 60 minutes`}
          title={`${launchCount} new launches in the last 60 minutes`}
        >
          <svg viewBox="0 0 24 24" fill="none">
            <title>New launches</title>
            <rect
              x="3"
              y="5"
              width="18"
              height="14"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="m4 7 8 6 8-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {launchCount > 0 ? (
            <span className="icon-badge">{formatBadgeCount(launchCount)}</span>
          ) : null}
        </Link>
        <Link
          className={analystCount > 0 ? "icon-btn has-badge" : "icon-btn"}
          href="/analyst"
          aria-label={`${analystCount} analyst updates in the last 60 minutes`}
          title={`${analystCount} analyst updates in the last 60 minutes`}
        >
          <svg viewBox="0 0 24 24" fill="none">
            <title>Analyst updates</title>
            <path
              d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M10 18a2 2 0 0 0 4 0"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          {analystCount > 0 ? (
            <span className="icon-badge urgent">{formatBadgeCount(analystCount)}</span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
