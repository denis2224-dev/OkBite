import { router } from "expo-router";
import { useEffect } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
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
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) flush();
    });
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") flush();
    });
    return () => {
      unsubscribe();
      foreground.remove();
    };
  }, [toast]);
}
