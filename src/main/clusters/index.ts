import state from "../state";
import LocalCluster from "./LocalCuster";
import AccountCluster, { AccountClusterNode } from "./AccountCluster";
import { orderBy } from "lodash";
import { IRootNode } from "../domain";
import { ROOT_NODE_KEY } from "../constants";
const sortResources = (resources: IRootNode[]) => {
  return orderBy(resources, ["createTime"], ["desc"]);
};

const updateStateRootNodes = (newNode: IRootNode) => {
  let resources = state.getData(ROOT_NODE_KEY) as IRootNode[];
  if (!Array.isArray(resources)) {
    resources = [];
  }
  let isCover = false;

  if (newNode.id) {
    const index = resources.findIndex((it) => it.id === newNode.id);
    if (index !== -1) {
      resources.splice(index, 1, newNode);
      isCover = true;
    }
  }

  if (!isCover) {
    resources.push(newNode);
  }

  state.setData(ROOT_NODE_KEY, sortResources(resources));
};
export * from "./interface";
export {
  sortResources,
  updateStateRootNodes,
  AccountCluster,
  LocalCluster,
  AccountClusterNode,
};
