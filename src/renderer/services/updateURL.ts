import { postMessage } from "../utils/index";

export default function updateURL(url: string): void {
  postMessage({
    type: "url/update",
    payload: { url },
  });
}
