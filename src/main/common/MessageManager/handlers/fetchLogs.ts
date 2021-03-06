import { IMessage } from "..";
import NocalhostWebviewPanel from "../../../webview/NocalhostWebviewPanel";
import DataCenter from "../../DataCenter";
import {
  IApplicationDescribe,
  IApplicationMeta,
} from "../../DataCenter/index.types";
import services, { ServiceResult } from "../../DataCenter/services";

export default async function fetchLogs(message: IMessage, id: number) {
  const { payload } = message;
  const dataCenter = DataCenter.getInstance();
  if (
    !payload ||
    !payload.id ||
    !payload.app ||
    !payload.pod ||
    !payload.container
  ) {
    return;
  }
  const applicationDescribe:
    | IApplicationDescribe
    | undefined = dataCenter.getApplicationDescribe(payload.app);
  if (applicationDescribe) {
    const kubeConfig: string = applicationDescribe.kubeConfig;
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
}
