import { type Client, type ClientOptions, createClient } from "graphql-ws";
import WebSocket from "ws";

import type {
  GoldRushNewPairEvent,
  GoldRushOhlcvInterval,
  GoldRushOhlcvPairCandleEvent,
  GoldRushOhlcvTimeframe,
  GoldRushOhlcvTokenCandleEvent,
  GoldRushStreamConfig,
  GoldRushTokenSearchResult,
  GoldRushUpdatePairEvent,
} from "@jaguar/domain";

export const SEARCH_TOKEN_QUERY = /* GraphQL */ `
  query JaguarSearchToken($query: String!, $chain_name: ChainName) {
    searchToken(query: $query, chain_name: $chain_name) {
      pair_address
      chain_name
      quote_rate
      quote_rate_usd
      volume
      volume_usd
      swap_count
      market_cap
      base_token {
        contract_name
        contract_address
        contract_decimals
        contract_ticker_symbol
      }
      quote_token {
        contract_name
        contract_address
        contract_decimals
        contract_ticker_symbol
      }
    }
  }
`;

export const NEW_PAIRS_SUBSCRIPTION = /* GraphQL */ `
  subscription JaguarNewPairs($chain_name: ChainName!, $protocols: [UnifiedProtocol!]!) {
    newPairs(chain_name: $chain_name, protocols: $protocols) {
      pair {
        contract_name
        contract_address
        contract_decimals
        contract_ticker_symbol
      }
      liquidity
      tx_hash
      supply
      pair_address
      dev_holdings
      base_token {
        contract_name
        contract_address
        contract_decimals
        contract_ticker_symbol
      }
      protocol
      protocol_version
      market_cap
      quote_rate
      quote_token {
        contract_name
        contract_address
        contract_decimals
        contract_ticker_symbol
      }
      quote_rate_usd
      event_name
      block_signed_at
      deployer_address
      chain_name
    }
  }
`;

export const UPDATE_PAIRS_SUBSCRIPTION = /* GraphQL */ `
  subscription JaguarUpdatePairs($chain_name: ChainName!, $pair_addresses: [String!]!) {
    updatePairs(chain_name: $chain_name, pair_addresses: $pair_addresses) {
      chain_name
      pair_address
      timestamp
      quote_rate
      quote_rate_usd
      market_cap
      liquidity
      base_token {
        contract_name
        contract_address
        contract_decimals
        contract_ticker_symbol
      }
      quote_token {
        contract_name
        contract_address
        contract_decimals
        contract_ticker_symbol
      }
      last_5m {
        price {
          current_value
          previous_value
          pct_change
        }
        swap_count {
          current_value
          previous_value
          pct_change
        }
        volume_usd {
          current_value
          previous_value
          pct_change
        }
        buy_count {
          current_value
        }
        sell_count {
          current_value
        }
        unique_buyers {
          current_value
        }
        unique_sellers {
          current_value
        }
      }
      last_1hr {
        price {
          current_value
          previous_value
          pct_change
        }
        swap_count {
          current_value
          previous_value
          pct_change
        }
        volume_usd {
          current_value
          previous_value
          pct_change
        }
      }
    }
  }
`;

export const OHLCV_PAIR_CANDLES_SUBSCRIPTION = /* GraphQL */ `
  subscription JaguarPairOhlcvCandles(
    $chain_name: ChainName!
    $pair_addresses: [String!]!
    $interval: OhlcvTimeInterval!
    $timeframe: OhlcvTimeFrame!
    $limit: Int
  ) {
    ohlcvCandlesForPair(
      chain_name: $chain_name
      pair_addresses: $pair_addresses
      interval: $interval
      timeframe: $timeframe
      limit: $limit
    ) {
      id
      chain_name
      pair_address
      interval
      timeframe
      timestamp
      open
      high
      low
      close
      volume
      volume_usd
      quote_rate
      quote_rate_usd
      base_token {
        contract_name
        contract_address
        contract_decimals
        contract_ticker_symbol
      }
      quote_token {
        contract_name
        contract_address
        contract_decimals
        contract_ticker_symbol
      }
    }
  }
`;

export const OHLCV_TOKEN_CANDLES_SUBSCRIPTION = /* GraphQL */ `
  subscription JaguarTokenOhlcvCandles(
    $chain_name: ChainName!
    $token_addresses: [String!]!
    $interval: OhlcvTimeInterval!
    $timeframe: OhlcvTimeFrame!
    $limit: Int
  ) {
    ohlcvCandlesForToken(
      chain_name: $chain_name
      token_addresses: $token_addresses
      interval: $interval
      timeframe: $timeframe
      limit: $limit
    ) {
      chain_name
      pair_address
      interval
      timeframe
      timestamp
      open
      high
      low
      close
      volume
      volume_usd
      quote_rate
      quote_rate_usd
      base_token {
        contract_name
        contract_address
        contract_decimals
        contract_ticker_symbol
      }
      quote_token {
        contract_name
        contract_address
        contract_decimals
        contract_ticker_symbol
      }
    }
  }
`;

type StreamHandlers<T> = {
  next: (event: T) => Promise<void> | void;
  error?: (error: unknown) => void;
  complete?: () => void;
};

const arrayify = <T>(value: T | T[] | null | undefined) => {
  if (!value) return [] as T[];
  return Array.isArray(value) ? value : [value];
};

const runGraphqlQuery = <TData>(
  client: Client,
  query: string,
  variables: Record<string, unknown>,
  timeoutMs = 5_000,
) =>
  new Promise<TData>((resolve, reject) => {
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      dispose();
      callback();
    };

    const timeout = setTimeout(() => {
      finish(() => reject(new Error("GoldRush query timed out.")));
    }, timeoutMs);

    const dispose = client.subscribe(
      { query, variables },
      {
        next: (result) => {
          if (result.errors) {
            finish(() => reject(result.errors));
            return;
          }

          finish(() => resolve(result.data as TData));
        },
        error: (error) => finish(() => reject(error)),
        complete: () => undefined,
      },
    );
  });

export const createGoldRushClient = (config: GoldRushStreamConfig): Client => {
  const options: ClientOptions = {
    url: config.streamUrl,
    webSocketImpl: WebSocket,
    connectionParams: {
      GOLDRUSH_API_KEY: config.apiKey,
    },
    lazy: true,
    retryAttempts: Number.POSITIVE_INFINITY,
    shouldRetry: () => true,
  };

  return createClient(options);
};

export const searchTokens = async (
  client: Client,
  chainName: GoldRushStreamConfig["chainName"],
  query: string,
): Promise<GoldRushTokenSearchResult[]> => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const result = await runGraphqlQuery<{ searchToken?: GoldRushTokenSearchResult[] }>(
    client,
    SEARCH_TOKEN_QUERY,
    {
      query: trimmedQuery,
      chain_name: chainName,
    },
  );

  return Array.isArray(result.searchToken) ? result.searchToken : [];
};

export const subscribeToNewPairs = (
  client: Client,
  config: GoldRushStreamConfig,
  handlers: StreamHandlers<GoldRushNewPairEvent>,
) =>
  client.subscribe(
    {
      query: NEW_PAIRS_SUBSCRIPTION,
      variables: {
        chain_name: config.chainName,
        protocols: [...config.trackedProtocols],
      },
    },
    {
      next: async (result) => {
        if (result.errors) {
          handlers.error?.(result.errors);
          return;
        }

        for (const event of arrayify(result.data?.newPairs as GoldRushNewPairEvent[] | undefined)) {
          await handlers.next(event);
        }
      },
      error: (error) => handlers.error?.(error),
      complete: () => handlers.complete?.(),
    },
  );

export const subscribeToUpdatePairs = (
  client: Client,
  chainName: GoldRushStreamConfig["chainName"],
  pairAddresses: string[],
  handlers: StreamHandlers<GoldRushUpdatePairEvent>,
) => {
  if (pairAddresses.length === 0) {
    return () => undefined;
  }

  return client.subscribe(
    {
      query: UPDATE_PAIRS_SUBSCRIPTION,
      variables: {
        chain_name: chainName,
        pair_addresses: pairAddresses,
      },
    },
    {
      next: async (result) => {
        if (result.errors) {
          handlers.error?.(result.errors);
          return;
        }

        for (const event of arrayify(
          result.data?.updatePairs as
            | GoldRushUpdatePairEvent
            | GoldRushUpdatePairEvent[]
            | undefined,
        )) {
          await handlers.next(event);
        }
      },
      error: (error) => handlers.error?.(error),
      complete: () => handlers.complete?.(),
    },
  );
};

export const subscribeToPairOhlcvCandles = (
  client: Client,
  chainName: GoldRushStreamConfig["chainName"],
  pairAddresses: string[],
  options: {
    interval: GoldRushOhlcvInterval;
    timeframe: GoldRushOhlcvTimeframe;
    limit?: number;
  },
  handlers: StreamHandlers<GoldRushOhlcvPairCandleEvent>,
) => {
  if (pairAddresses.length === 0) {
    return () => undefined;
  }

  return client.subscribe(
    {
      query: OHLCV_PAIR_CANDLES_SUBSCRIPTION,
      variables: {
        chain_name: chainName,
        pair_addresses: pairAddresses,
        interval: options.interval,
        timeframe: options.timeframe,
        limit: options.limit,
      },
    },
    {
      next: async (result) => {
        if (result.errors) {
          handlers.error?.(result.errors);
          return;
        }

        for (const event of arrayify(
          result.data?.ohlcvCandlesForPair as
            | GoldRushOhlcvPairCandleEvent
            | GoldRushOhlcvPairCandleEvent[]
            | undefined,
        )) {
          await handlers.next(event);
        }
      },
      error: (error) => handlers.error?.(error),
      complete: () => handlers.complete?.(),
    },
  );
};

export const subscribeToTokenOhlcvCandles = (
  client: Client,
  chainName: GoldRushStreamConfig["chainName"],
  tokenAddresses: string[],
  options: {
    interval: GoldRushOhlcvInterval;
    timeframe: GoldRushOhlcvTimeframe;
    limit?: number;
  },
  handlers: StreamHandlers<GoldRushOhlcvTokenCandleEvent>,
) => {
  if (tokenAddresses.length === 0) {
    return () => undefined;
  }

  return client.subscribe(
    {
      query: OHLCV_TOKEN_CANDLES_SUBSCRIPTION,
      variables: {
        chain_name: chainName,
        token_addresses: tokenAddresses,
        interval: options.interval,
        timeframe: options.timeframe,
        limit: options.limit,
      },
    },
    {
      next: async (result) => {
        if (result.errors) {
          handlers.error?.(result.errors);
          return;
        }

        for (const event of arrayify(
          result.data?.ohlcvCandlesForToken as
            | GoldRushOhlcvTokenCandleEvent
            | GoldRushOhlcvTokenCandleEvent[]
            | undefined,
        )) {
          await handlers.next(event);
        }
      },
      error: (error) => handlers.error?.(error),
      complete: () => handlers.complete?.(),
    },
  );
};
