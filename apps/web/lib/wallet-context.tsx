"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

type PhantomProvider = {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect?: () => void;
};

type WalletCtx = {
  publicKey: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletCtx>({
  publicKey: null,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
});

const STORAGE_KEY = "jaguar_wallet_pk";

function getPhantom(): PhantomProvider | undefined {
  return (window as unknown as { solana?: PhantomProvider }).solana;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setPublicKey(stored);
  }, []);

  const connect = useCallback(async () => {
    const phantom = getPhantom();
    if (!phantom?.isPhantom) {
      window.open("https://phantom.app", "_blank");
      return;
    }
    setConnecting(true);
    try {
      const resp = await phantom.connect();
      const key = resp.publicKey.toString();
      setPublicKey(key);
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      // user rejected
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    getPhantom()?.disconnect?.();
    setPublicKey(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <WalletContext.Provider value={{ publicKey, connecting, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
