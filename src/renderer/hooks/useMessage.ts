import { useContext, useEffect } from "react";
import { redirect, updateDeployments, updateLogs } from "../store/actions";
import { store } from "../store/store";
import { IDeployments } from "../store/store.types";

export default function useMessage() {
  const { dispatch } = useContext(store);

  const handleMessage = (event: MessageEvent) => {
    const data = event.data;
    const { type, payload } = data;
    switch (type) {
      case "location/redirect": {
        return dispatch(redirect(payload.url));
      }
      case "logs/update": {
        return dispatch(updateLogs(payload.logs));
      }
      case "deployments/update": {
        const deployments: IDeployments = {
          id: payload.deployments.id,
          items: payload.deployments.items.map((item: any) => ({
            name: item.metadata?.name || "",
            namespace: item.metadata?.namespace || "",
            pods: `${item.status?.readyReplicas}/${item.status?.replicas}`,
            replicas: item.status?.replicas,
            createdTime: item.metadata?.creationTimestamp,
            conditions: item.status?.conditions?.reduce(
              (acc: string[], condition: any) => {
                return [
                  ...acc,
                  ...(condition.status === "True" ? [condition.type] : []),
                ];
              },
              []
            ),
          })),
        };
        return dispatch(updateDeployments(deployments));
      }
      default:
        return;
    }
  };

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);
}
