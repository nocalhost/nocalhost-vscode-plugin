import { Actions } from "./actions/actions.types";

export interface ILogs {
  id: string;
  items: string[];
}

export interface IStoreState {
  url: string;
  theme: string;
  logs: ILogs;
}

export interface IAppContext {
  state: IStoreState;
  dispatch: React.Dispatch<Actions>;
}
