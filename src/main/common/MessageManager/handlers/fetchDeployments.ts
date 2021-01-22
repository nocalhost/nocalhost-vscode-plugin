import { IMessage } from "..";
import host from "../../../host";
import NocalhostWebviewPanel from "../../../webview/NocalhostWebviewPanel";
import DataCenter from "../../DataCenter";
import ApplicationMeta from "../../DataCenter/model/ApplicationMeta";
import services, { ServiceResult } from "../../DataCenter/services";

export default async function fetchDeployments(message: IMessage, id: number) {
  const { payload } = message;
  const dataCenter = DataCenter.getInstance();
  if (!payload || !payload.id || !payload.app) {
    return;
  }
  const applicationMeta:
    | ApplicationMeta
    | undefined = dataCenter.getApplicationMeta(payload.app);
  if (applicationMeta) {
    const kubeConfig: string = applicationMeta.kubeconfig;
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
