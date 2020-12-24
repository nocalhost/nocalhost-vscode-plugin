import { Actions } from "./actions/actions.types";

export interface IStoreState {
  url: string;
  theme: string;
}

export interface IAppContext {
  state: IStoreState;
  dispatch: React.Dispatch<Actions>;
}
