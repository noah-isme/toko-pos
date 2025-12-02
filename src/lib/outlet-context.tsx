"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { z } from "zod";

import { api } from "@/trpc/client";
import {
  cashSessionSchema,
  cashSessionSummarySchema,
} from "@/server/api/schemas/cash-sessions";

type CashSession = z.infer<typeof cashSessionSchema>;
type CashSessionSummary = z.infer<typeof cashSessionSummarySchema>;

interface Outlet {
  id: string;
  name: string;
  code: string;
  address?: string;
}

interface UserOutlet {
  id: string;
  outletId: string;
  role: "OWNER" | "MANAGER" | "CASHIER";
  outlet: Outlet;
}

interface OutletContextType {
  currentOutlet: Outlet | null;
  userOutlets: UserOutlet[];
  setCurrentOutlet: (outlet: Outlet) => void;
  isLoading: boolean;
  activeShift: CashSession | null;
  isShiftLoading: boolean;
  refreshShift: () => Promise<void>;
  openShift: (openingCash: number) => Promise<void>;
  closeShift: (closingCash: number) => Promise<CashSessionSummary>;
  isOpeningShift: boolean;
  isClosingShift: boolean;
}

const STORAGE_KEY = "toko-pos:current-outlet";

const OutletContext = createContext<OutletContextType | undefined>(undefined);

export function OutletProvider({ children }: { children: ReactNode }) {
  const [currentOutlet, setCurrentOutlet] = useState<Outlet | null>(null);
  const [userOutlets, setUserOutlets] = useState<UserOutlet[]>([]);

  const outletsQuery = api.outlets.getUserOutlets.useQuery();
  const utils = api.useContext();

  const activeShiftQuery = api.cashSessions.getActive.useQuery(
    { outletId: currentOutlet?.id ?? "" },
    {
      enabled: Boolean(currentOutlet?.id),
      refetchInterval: 60_000,
    },
  );
  const { refetch: refetchActiveShift } = activeShiftQuery;

  const refreshShift = useCallback(async () => {
    await refetchActiveShift();
  }, [refetchActiveShift]);

  const openShiftMutation = api.cashSessions.open.useMutation({
    onSuccess: () => {
      void refreshShift();
    },
  });

  const closeShiftMutation = api.cashSessions.close.useMutation({
    onSuccess: () => {
      void refreshShift();
    },
  });

  useEffect(() => {
    if (outletsQuery.data && outletsQuery.data.length > 0) {
      setUserOutlets(outletsQuery.data);

      if (!currentOutlet) {
        const stored = (() => {
          try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? (JSON.parse(raw) as Outlet) : null;
          } catch {
            return null;
          }
        })();

        const fallback =
          outletsQuery.data.find((item) => item.outlet.id === stored?.id)?.outlet ??
          outletsQuery.data[0]?.outlet ??
          null;

        if (fallback) {
          setCurrentOutlet(fallback);
        }
      }
    }
  }, [outletsQuery.data, currentOutlet]);

  useEffect(() => {
    if (currentOutlet) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentOutlet));
    }
  }, [currentOutlet]);

  const setOutlet = (outlet: Outlet) => {
    setCurrentOutlet(outlet);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(outlet));
    void refreshShift();
  };

  const openShift = async (openingCash: number): Promise<void> => {
    if (!currentOutlet) {
      throw new Error("Outlet belum dipilih.");
    }

    await openShiftMutation.mutateAsync({
      outletId: currentOutlet.id,
      openingCash,
    });
  };

  const closeShift = async (closingCash: number): Promise<CashSessionSummary> => {
    const activeShift = activeShiftQuery.data;
    if (!activeShift) {
      throw new Error("Tidak ada shift aktif.");
    }

    const result = await closeShiftMutation.mutateAsync({
      sessionId: activeShift.id,
      closingCash,
    });

    await utils.cashSessions.getActive.invalidate({
      outletId: currentOutlet?.id ?? "",
    });

    return result;
  };

  const value: OutletContextType = {
    currentOutlet,
    userOutlets,
    setCurrentOutlet: setOutlet,
    isLoading: outletsQuery.isLoading,
    activeShift: activeShiftQuery.data ?? null,
    isShiftLoading: activeShiftQuery.isLoading || activeShiftQuery.isFetching,
    refreshShift,
    openShift,
    closeShift,
    isOpeningShift: openShiftMutation.isPending,
    isClosingShift: closeShiftMutation.isPending,
  };

  return <OutletContext.Provider value={value}>{children}</OutletContext.Provider>;
}

export function useOutlet() {
  const context = useContext(OutletContext);
  if (context === undefined) {
    throw new Error("useOutlet must be used within an OutletProvider");
  }
  return context;
}
