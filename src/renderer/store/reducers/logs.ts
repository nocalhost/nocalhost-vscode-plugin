import { IUpdateLogs } from "../actions/actions.types";
import { ILogs, IStoreState } from "../store.types";

export const updateLogs = (
  state: IStoreState,
  action: IUpdateLogs
): IStoreState => {
  let thisLogs: ILogs = state.logs;
  const { logs } = action.payload;
  const { id, items } = logs;
  if (id !== thisLogs.id || items.length !== thisLogs.items.length) {
    thisLogs = logs;
  }
  return {
    ...state,
    logs: thisLogs,
  };
};

export default {
  updateLogs,
};
