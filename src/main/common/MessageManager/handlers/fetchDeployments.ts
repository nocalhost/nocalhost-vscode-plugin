import { IMessage } from "..";
import NocalhostWebviewPanel from "../../../webview/NocalhostWebviewPanel";
import DataCenter from "../../DataCenter";
import { IApplicationMeta } from "../../DataCenter/index.types";
import services, { ServiceResult } from "../../DataCenter/services";

export default async function fetchDeployments(message: IMessage, id: number) {
  const { payload } = message;
  const dataCenter = DataCenter.getInstance();
  if (!payload || !payload.id || !payload.app) {
    return;
  }
  const applicationMeta:
    | IApplicationMeta
    | undefined = dataCenter.getApplicationMeta(payload.app);
  if (applicationMeta) {
    const kubeConfig: string = applicationMeta.kubeConfig;
    const result: ServiceResult = await services.fetchDeployments(kubeConfig);
    const content: string = result.success ? result.value : "{}";
    try {
      const data: any = JSON.parse(content);
      const items: any[] = data.items || [];
      NocalhostWebviewPanel.postMessage(
        {
          type: "deployments/update",
          payload: {
            deployments: {
              id: payload.id,
              items,
            },
          },
        },
        id
      );
    } catch (e) {
      console.log("[error] fetchDeployments: ", e);
    }
  }
}
