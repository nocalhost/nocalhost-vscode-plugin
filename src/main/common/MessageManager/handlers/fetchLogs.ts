import { ctlFetch } from "./index";
import { IMessage } from "..";
import NocalhostWebviewPanel from "../../../webview/NocalhostWebviewPanel";

export default async function fetchLogs(message: IMessage, id: number) {
  const { payload } = message;
  if (
    !payload ||
    !payload.logId ||
    !payload.pod ||
    !payload.container ||
    !payload.kubeConfig
  ) {
    return;
  }
  const command: string = `kubectl logs ${
    payload.tail ? "--tail=" + payload.tail : ""
  } ${payload.pod} -c ${payload.container} --kubeconfig ${payload.kubeConfig}`;
  const res: string = await ctlFetch(command);
  const items: string[] = res.split("\n");
  NocalhostWebviewPanel.postMessage(
    {
      type: "logs/update",
      payload: {
        logs: {
          id: payload.logId,
          items,
        },
      },
    },
    id
  );
}
