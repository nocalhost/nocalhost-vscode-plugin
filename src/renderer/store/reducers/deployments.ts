import { IUpdateDeployments } from "../actions/actions.types";
import { IStoreState } from "../store.types";

export const updateDeployments = (
  state: IStoreState,
  action: IUpdateDeployments
): IStoreState => {
  const { deployments } = action.payload;
  return {
    ...state,
    deployments,
  };
};

export default {
  updateDeployments,
};
