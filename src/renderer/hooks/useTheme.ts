import { useContext, useEffect } from "react";
import { redirect, toggleTheme } from "../store/actions";
import { store } from "../store/store";
import { postMessage } from "../utils";
import { MessageActionType } from "../constants";

export default function useMessage() {
  const {
    state: { url },
    dispatch,
  } = useContext(store);

  const detectTheme = (className: string) => {
    const regex: RegExp = /^vscode\-(\w+)$/;
    const matched: RegExpMatchArray = className.match(regex);
    if (matched) {
      const theme: string = matched[1];
      dispatch(toggleTheme(theme));
    }
  };

  const handleDOMContentLoaded = () => {
    const observer = new MutationObserver((mutations: MutationRecord[]) => {
      mutations.forEach((record: MutationRecord) => {
        const { className } = record.target as HTMLElement;
        detectTheme(className);
      });
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const lastVisit: string = localStorage.getItem("lastVisit") || "";
    if (lastVisit && lastVisit !== url) {
      dispatch(redirect(lastVisit));
    }
  };

  useEffect(() => {
    window.addEventListener("DOMContentLoaded", handleDOMContentLoaded);
    () => {
      window.removeEventListener("DOMContentLoaded", handleDOMContentLoaded);
    };
  }, []);
}
