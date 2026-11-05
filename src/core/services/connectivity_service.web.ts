import { router } from "expo-router";
import { useEffect } from "react";
import { flushQueue } from "./offline_queue";
import { useToast } from "../../shared/widgets/toast";
import { ro } from "../constants/strings_ro";
import { isPreview } from "../../shared/state/app_state";
export function useQueueFlush() {
  const toast = useToast();
  useEffect(() => {
    if (isPreview) return;
    const flush = () => {
      void flushQueue((id) =>
        toast(ro.offline.resolved(1), {
          label: ro.app.open,
          onPress: () => router.push(`/product/${id}`),
        }),
      ).catch(() => toast(ro.offline.queueError));
    };
    window.addEventListener("online", flush);
    const visible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) flush();
    };
    document.addEventListener("visibilitychange", visible);
    if (navigator.onLine) flush();
    return () => {
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [toast]);
}
