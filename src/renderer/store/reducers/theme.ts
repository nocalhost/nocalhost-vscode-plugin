import { IToggleTheme } from "../actions/actions.types";
import { IStoreState } from "../store.types";

export const toggleTheme = (
  state: IStoreState,
  action: IToggleTheme
): IStoreState => {
  const { theme } = action.payload;
  return {
    ...state,
    theme,
  };
};

export default {
  toggleTheme,
};
