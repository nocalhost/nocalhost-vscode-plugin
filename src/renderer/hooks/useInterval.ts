import React, { useEffect } from "react";
import { DEFAULT_INTERVAL_MS } from "../constants";

export default function useInterval(
  handler: (args?: any) => void,
  args: any[],
  conditions: any[]
): void {
  useEffect(() => {
    handler.apply(null, args);
    const timer = setInterval(() => {
      handler.apply(null, args);
    }, DEFAULT_INTERVAL_MS);
    return () => {
      clearInterval(timer);
    };
  }, conditions);
}
