import { IMessage } from "..";
import NocalhostWebviewPanel from "../../../webview/NocalhostWebviewPanel";
import DataCenter from "../../DataCenter";
import ApplicationMeta from "../../DataCenter/model/ApplicationMeta";
import services from "../../DataCenter/services";

const dataCenter = DataCenter.getInstance();

export default async function fetchDeployments(message: IMessage) {
  const { payload } = message;
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
      NocalhostWebviewPanel.postMessage({
        type: "deployments/update",
        payload: {
          deployments: {
            id: payload.id,
            items,
          },
        },
      });
    } catch (e) {
      console.log(e, rawData);
    }
  }
}
