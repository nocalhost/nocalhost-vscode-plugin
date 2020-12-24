import { IStoreState } from "../store.types";
import {
  Actions,
  ActionType,
  IRedirect,
  IToggleTheme,
} from "../actions/actions.types";
import { redirect } from "./redirect";
import { toggleTheme } from "./theme";

const reducer = (state: IStoreState, action: Actions) => {
  switch (action.type) {
    case ActionType.redirect:
      return redirect(state, action as IRedirect);
    case ActionType.toggleTheme:
      return toggleTheme(state, action as IToggleTheme);
    default:
      return state;
  }
};

export default reducer;
