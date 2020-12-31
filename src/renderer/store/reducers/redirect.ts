import { IStoreState } from "../store.types";
import { IRedirect } from "../actions/actions.types";

export const redirect = (
  state: IStoreState,
  action: IRedirect
): IStoreState => {
  const { url } = action.payload;
  return {
    ...state,
    url,
  };
};

export default {
  redirect,
};
