import { Actions } from "./actions/actions.types";

export interface ILogs {
  id: string;
  items: string[];
}

export interface IDeployment {
  name: string;
  namespace: string;
  pods: string;
  replicas: number;
  createdTime: string;
  conditions: string[];
}

export interface IDeployments {
  id: string;
  items: IDeployment[];
}

export interface IStoreState {
  url: string;
  theme: string;
  logs: ILogs;
  deployments: IDeployments;
}

export interface IAppContext {
  state: IStoreState;
  dispatch: React.Dispatch<Actions>;
}
