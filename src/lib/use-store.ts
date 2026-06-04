import { useSyncExternalStore } from "react";
import { store } from "./wip-data";

export function useStore() {
  useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.jobs.length + store.movements.length + store.auditLogs.length,
    () => 0,
  );
  return store;
}
