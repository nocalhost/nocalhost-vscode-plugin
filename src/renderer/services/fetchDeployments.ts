import { postMessage } from "../utils/index";

export interface IFetchDeploymentsParam {
  id: string;
  app: string;
}

export default function fetchDeployments(param: IFetchDeploymentsParam): void {
  const { id, app } = param;
  postMessage({
    type: "deployments/fetch",
    payload: { id, app },
  });
}
