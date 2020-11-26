import { Actions } from "./actions/actions.types";

export interface IStoreState {
  [key: string]: any;
}

export interface IAppContext {
  state: IStoreState;
  dispatch: React.Dispatch<Actions>;
}
