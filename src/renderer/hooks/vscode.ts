import { useEffect, useRef } from "react";

type Data<T> = { type: string; payload: T };
type MessageData<T> = MessageEvent<Data<T>>;

export default function useMessage<T = unknown>(
  eventName: string | Array<string>,
  handler: (payload: Data<T>["payload"], eventName: Data<T>["type"]) => void,
  conditions: any[] = []
) {
  let eventsName = Array.of<string>();

  if (!Array.isArray(eventName)) {
    eventsName.push(eventName);
  } else {
    eventsName = eventName;
  }

  useEffect(() => {
    let isMounted = true;

    const eventListener = (event: MessageData<T>) => {
      const {
        data: { type, payload },
      } = event;

      if (isMounted && eventsName.includes(type)) {
        handler.call(null, payload, type);
      }
    };

    window.addEventListener("message", eventListener);

    () => {
      isMounted = false;
      window.removeEventListener("message", eventListener);
    };
  }, [eventName, conditions]);
}
