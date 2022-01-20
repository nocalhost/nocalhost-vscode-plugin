import { useEffect } from "react";

type MessageData<T> = MessageEvent<{ type: string; payload: T }>;

export default function useMessage<T>(
  type: string,
  listener: (data: MessageData<T>) => void,
  conditions: any[] = []
): void {
  useEffect(() => {
    let isMounted = true;
    window.addEventListener("message", (data: MessageData<T>) => {
      if (type === data.type && isMounted) {
        listener.call(null, data);
      }
    });

    () => {
      isMounted = false;
      window.removeEventListener("message", listener);
    };
  }, conditions);
}
