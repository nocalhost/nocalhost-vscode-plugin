import { IMessage } from "..";
import NocalhostWebviewPanel from "../../../webview/NocalhostWebviewPanel";
import DataCenter from "../../DataCenter";
import ApplicationMeta from "../../DataCenter/model/ApplicationMeta";
import services from "../../DataCenter/services";

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
    const rawData: string = await services.fetchDeployments(kubeConfig);
    try {
      const data: any = JSON.parse(rawData);
      const items: any[] = data.items;
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
      console.log("[error] rawData: ", rawData);
    }
  }
}
