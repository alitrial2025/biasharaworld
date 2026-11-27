"use client";

import { useEffect, useState } from "react";
import { workspaceRequest } from "./workspace-request";

type Summary = { sector: string; counts: Record<string, number> };

export function useIndustrySummary(
  business: string | undefined,
  sector: string,
  role: string,
  enabled: boolean,
) {
  const [request, setRequest] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    counts?: Summary["counts"];
    error?: string;
  }>();
  const key = `${business}:${sector}:${role}:${request}`;
  useEffect(() => {
    if (!business || !enabled) return;
    const controller = new AbortController();
    void workspaceRequest<Summary>(
      "/api/industry?view=summary",
      undefined,
      controller.signal,
    )
      .then((summary) => {
        if (controller.signal.aborted) return;
        if (summary.sector !== sector) {
          setResult({
            key,
            error: "Your business type changed. Refresh the workspace.",
          });
          return;
        }
        setResult({ key, counts: summary.counts });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResult({ key, error: "Could not load current work counts." });
      });
    return () => controller.abort();
  }, [business, enabled, key, sector]);
  return {
    ...(enabled && result?.key === key ? result : undefined),
    loading: enabled && !!business && result?.key !== key,
    retry: () => setRequest((value) => value + 1),
  };
}
