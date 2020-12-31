import { IStoreState } from "../store.types";
import {
  Actions,
  ActionType,
  IRedirect,
  IToggleTheme,
  IUpdateLogs,
} from "../actions/actions.types";
import { redirect } from "./redirect";
import { toggleTheme } from "./theme";
import { updateLogs } from "./logs";

const reducer = (state: IStoreState, action: Actions) => {
  switch (action.type) {
    case ActionType.redirect:
      return redirect(state, action as IRedirect);
    case ActionType.toggleTheme:
      return toggleTheme(state, action as IToggleTheme);
    case ActionType.updateLogs:
      return updateLogs(state, action as IUpdateLogs);
    default:
      return state;
  }
};

export default reducer;
