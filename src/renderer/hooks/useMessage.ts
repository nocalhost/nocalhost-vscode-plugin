import { useContext, useEffect } from "react";
import { redirect } from "../store/actions";
import { store } from "../store/store";

export default function useMessage() {
  const { dispatch } = useContext(store);

  const handleMessage = (event) => {
    const data = event.data;
    const { type, payload } = data;
    switch (type) {
      case "location/redirect": {
        dispatch(redirect(payload.url));
        // persist the url, because tab the other editor will reload the whole document
        localStorage.setItem("lastVisit", payload.url);
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
