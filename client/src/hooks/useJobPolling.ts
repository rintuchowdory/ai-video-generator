import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

export interface JobPollingOptions {
  jobId?: string;
  type: "video" | "image";
  onStatusChange?: (status: "pending" | "processing" | "completed" | "failed") => void;
  onError?: (error: string) => void;
  pollInterval?: number;
}

export function useJobPolling({
  jobId,
  type,
  onStatusChange,
  onError,
  pollInterval = 3000,
}: JobPollingOptions) {
  const videoStatusQuery = trpc.videos.getStatus.useQuery(
    { jobId: jobId || "" },
    {
      enabled: !!jobId && type === "video",
      refetchInterval: (query) => {
        const status = (query.state.data as any)?.status;
        return status === "completed" || status === "failed" ? false : pollInterval;
      },
    }
  );

  const imageStatusQuery = trpc.images.getStatus.useQuery(
    { jobId: jobId || "" },
    {
      enabled: !!jobId && type === "image",
      refetchInterval: (query) => {
        const status = (query.state.data as any)?.status;
        return status === "completed" || status === "failed" ? false : pollInterval;
      },
    }
  );

  const query = type === "video" ? videoStatusQuery : imageStatusQuery;

  useEffect(() => {
    if (!query.data) return;

    const status = query.data.status as "pending" | "processing" | "completed" | "failed";
    onStatusChange?.(status);

    // Stop polling when job is completed or failed
    if (status === "completed" || status === "failed") {
      if (query.data.error) {
        onError?.(query.data.error);
      }
    }
  }, [query.data, onStatusChange, onError]);

  useEffect(() => {
    if (query.error) {
      onError?.((query.error as any).message || "Polling error");
    }
  }, [query.error, onError]);

  return {
    status: query.data?.status,
    result: query.data?.result,
    error: query.data?.error,
    isLoading: query.isLoading,
  };
}
