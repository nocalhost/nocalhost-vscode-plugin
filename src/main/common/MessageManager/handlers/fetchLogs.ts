import { IMessage } from "..";
import NocalhostWebviewPanel from "../../../webview/NocalhostWebviewPanel";
import services, { ServiceResult } from "../../DataCenter/services";
import state from "../../../state";
import { AppNode } from "../../../nodes/AppNode";

export default async function fetchLogs(message: IMessage, id: number) {
  const { payload } = message;
  if (
    !payload ||
    !payload.id ||
    !payload.app ||
    !payload.pod ||
    !payload.container
  ) {
    return;
  }
  const appNode = state.getNode(payload.id) as AppNode;
  if (!appNode) {
    return;
  }
  const kubeConfig = appNode.getKubeConfigPath();
  const result: ServiceResult = await services.fetchLogs(
    payload.pod,
    payload.container,
    payload.tail,
    kubeConfig
  );
  const content: string = result.success ? result.value : "";
  const items: string[] = content ? content.split("\n") : [];
  NocalhostWebviewPanel.postMessage(
    {
      type: "logs/update",
      payload: {
        logs: {
          id: payload.id,
          items,
        },
      },
    },
    id
  );
}
