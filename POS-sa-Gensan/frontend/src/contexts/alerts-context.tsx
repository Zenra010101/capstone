"use client";

/**
 * Single source for the operational alerts summary (low stock + pending
 * approvals). Previously the top navbar AND the dashboard each fetched
 * `/api/alerts` independently, so every dashboard visit triggered a duplicate
 * request on top of the navbar's 60s poll.
 *
 * This provider runs ONE poller (same 60s cadence as before) and shares the
 * result. Alerts are intentionally NOT cached with a stale TTL — they reflect
 * stock/approval state, so they keep the live 60s refresh and a manual
 * `refresh()` for consumers that want up-to-the-moment data on mount.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api } from "@/lib/api";
import type { AlertsSummary } from "@/lib/types";

const POLL_INTERVAL_MS = 60_000;

type AlertsContextValue = {
  alerts: AlertsSummary | null;
  refresh: () => void;
};

const AlertsContext = createContext<AlertsContextValue | null>(null);

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<AlertsSummary | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    api
      .get<AlertsSummary>("/api/alerts")
      .then(setAlerts)
      .catch(() => {})
      .finally(() => {
        inFlight.current = false;
      });
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <AlertsContext.Provider value={{ alerts, refresh }}>
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts(): AlertsContextValue {
  const ctx = useContext(AlertsContext);
  if (!ctx) {
    // Defensive fallback so consumers never crash if rendered outside provider.
    return { alerts: null, refresh: () => {} };
  }
  return ctx;
}
