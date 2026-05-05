import { type NextRequest, NextResponse } from "next/server";

import { getDemoHoldingSignals, getWalletHoldingSignals } from "@jaguar/db";

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

export async function GET(req: NextRequest) {
  const demo = req.nextUrl.searchParams.get("demo") === "1";

  if (demo) {
    try {
      const signals = await getDemoHoldingSignals();
      return NextResponse.json({ holdings: [], signals, demo: true });
    } catch {
      return NextResponse.json({ error: "Failed to load demo data" }, { status: 500 });
    }
  }

  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  try {
    const rpc = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getParsedTokenAccountsByOwner",
        params: [address, { programId: TOKEN_PROGRAM }, { encoding: "jsonParsed" }],
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!rpc.ok) {
      return NextResponse.json({ error: "Solana RPC unavailable" }, { status: 502 });
    }

    const rpcData = (await rpc.json()) as {
      result?: { value?: { account: { data: { parsed: { info: { mint: string; tokenAmount: { uiAmount: number } } } } } }[] };
    };

    const accounts = rpcData?.result?.value ?? [];

    const holdings = accounts
      .filter((a) => {
        const amt = a?.account?.data?.parsed?.info?.tokenAmount?.uiAmount;
        return typeof amt === "number" && amt > 0;
      })
      .map((a) => ({
        mint: a.account.data.parsed.info.mint,
        amount: a.account.data.parsed.info.tokenAmount.uiAmount,
      }))
      .slice(0, 200);

    const mints = holdings.map((h) => h.mint);
    const signals = await getWalletHoldingSignals(mints);

    return NextResponse.json({ holdings, signals });
  } catch {
    return NextResponse.json({ error: "Failed to fetch holdings" }, { status: 500 });
  }
}
