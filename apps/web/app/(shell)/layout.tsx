import "../dashboard.css";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { WalletProvider } from "@/lib/wallet-context";

export default function ShellLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <WalletProvider>
      <div className="jaguar-dashboard">
        <div className="shell">
          <Sidebar />
          <div className="main">
            <Topbar />
            <div className="page">{children}</div>
          </div>
        </div>
      </div>
    </WalletProvider>
  );
}
