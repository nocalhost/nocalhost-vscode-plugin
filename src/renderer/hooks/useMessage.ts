import { useContext, useEffect } from "react";
import { redirect, updateLogs } from "../store/actions";
import { store } from "../store/store";

export default function useMessage() {
  const { dispatch } = useContext(store);

  const handleMessage = (event: MessageEvent) => {
    console.log(event);
    const data = event.data;
    const { type, payload } = data;
    switch (type) {
      case "location/redirect": {
        dispatch(redirect(payload.url));
        break;
      }
      case "logs/update": {
        dispatch(updateLogs(payload.logs));
        break;
      }
      default:
        break;
    }
  };

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);
}
