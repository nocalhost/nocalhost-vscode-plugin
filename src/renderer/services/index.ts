import { postMessage } from "../utils/index";

export const fetchLogs = (tail = 6000) => {
  postMessage({
    type: "logs/fetch",
    payload: { tail },
  });
};
