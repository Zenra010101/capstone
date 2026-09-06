"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AppFeatures } from "@/lib/types";

let cached: AppFeatures | null = null;
let inflight: Promise<AppFeatures> | null = null;

async function fetchAppFeatures(): Promise<AppFeatures> {
  if (cached) return cached;
  if (!inflight) {
    inflight = api
      .get<AppFeatures>("/api/app-features")
      .then((data) => {
        cached = data;
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Clears cache after login/logout so the next session refetches flags. */
export function clearAppFeaturesCache() {
  cached = null;
  inflight = null;
}

export function useAppFeatures() {
  const [features, setFeatures] = useState<AppFeatures | null>(cached);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;
    void fetchAppFeatures()
      .then((f) => {
        if (!cancelled) setFeatures(f);
      })
      .catch(() => {
        if (!cancelled) {
          setFeatures({ exchangeWorkflowPhase1Enabled: false });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    features,
    loading,
    phase1Enabled: features?.exchangeWorkflowPhase1Enabled ?? false,
  };
}
