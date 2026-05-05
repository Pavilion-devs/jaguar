import { type GoldRushStreamConfig, SOLANA_PROTOCOLS, type SolanaProtocol } from "@jaguar/domain";

const DEFAULT_STREAM_URL = "wss://streaming.goldrushdata.com/graphql";

const parseProtocols = (rawValue: string | undefined): readonly SolanaProtocol[] => {
  if (!rawValue) return SOLANA_PROTOCOLS;

  const allowed = new Set(SOLANA_PROTOCOLS);
  const parsed = rawValue
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is SolanaProtocol => allowed.has(value as SolanaProtocol));

  return parsed.length > 0 ? parsed : SOLANA_PROTOCOLS;
};

export const loadWorkerEnv = (): GoldRushStreamConfig => ({
  apiKey: process.env.GOLDRUSH_API_KEY ?? "",
  streamUrl: process.env.GOLDRUSH_STREAM_URL ?? DEFAULT_STREAM_URL,
  chainName: "SOLANA_MAINNET",
  trackedProtocols: parseProtocols(process.env.TRACKED_PROTOCOLS),
});
