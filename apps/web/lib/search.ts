import type { LaunchSearchResult } from "@jaguar/db";
import { searchLaunches } from "@jaguar/db";
import type { GoldRushStreamConfig, GoldRushTokenSearchResult } from "@jaguar/domain";
import { createGoldRushClient, searchTokens } from "@jaguar/goldrush";

const DEFAULT_STREAM_URL = "wss://streaming.goldrushdata.com/graphql";

export type JaguarSearchResult = {
  query: string;
  local: LaunchSearchResult[];
  goldrush: Array<
    GoldRushTokenSearchResult & {
      localLaunchId: string | null;
    }
  >;
  goldrushError: string | null;
};

const goldRushConfig = (): GoldRushStreamConfig => ({
  apiKey: process.env.GOLDRUSH_API_KEY ?? "",
  streamUrl: process.env.GOLDRUSH_STREAM_URL ?? DEFAULT_STREAM_URL,
  chainName: "SOLANA_MAINNET",
  trackedProtocols: [],
});

const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (Array.isArray(error)) return error.map((entry) => String(entry)).join("; ");
  return "GoldRush search failed.";
};

export const runJaguarSearch = async (
  rawQuery: string,
  {
    localLimit = 6,
    goldrushLimit = 8,
  }: {
    localLimit?: number;
    goldrushLimit?: number;
  } = {},
): Promise<JaguarSearchResult> => {
  const query = rawQuery.trim();
  if (!query) {
    return {
      query,
      local: [],
      goldrush: [],
      goldrushError: null,
    };
  }

  const local = await searchLaunches(query, localLimit);
  const localByPairAddress = new Map(
    local.map((launch) => [launch.pairAddress.toLowerCase(), launch.id]),
  );

  if (goldrushLimit <= 0) {
    return {
      query,
      local,
      goldrush: [],
      goldrushError: null,
    };
  }

  const config = goldRushConfig();
  if (!config.apiKey) {
    return {
      query,
      local,
      goldrush: [],
      goldrushError: "GOLDRUSH_API_KEY is not set.",
    };
  }

  const client = createGoldRushClient(config);

  try {
    const goldrush = (await searchTokens(client, config.chainName, query))
      .filter((result) => result.chain_name === config.chainName)
      .slice(0, goldrushLimit)
      .map((result) => ({
        ...result,
        localLaunchId: localByPairAddress.get(result.pair_address.toLowerCase()) ?? null,
      }));

    return {
      query,
      local,
      goldrush,
      goldrushError: null,
    };
  } catch (error) {
    return {
      query,
      local,
      goldrush: [],
      goldrushError: errorMessage(error),
    };
  } finally {
    void Promise.resolve(client.dispose()).catch(() => undefined);
  }
};
