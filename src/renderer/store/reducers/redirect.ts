import { IStoreState } from "../store.types";
import { IRedirect } from "../actions/actions.types";

export const redirect = (
  state: IStoreState,
  action: IRedirect
): IStoreState => {
  const { uri } = action.payload;
  return {
    ...state,
    uri,
  };
};

export default {
  redirect,
};
