import LocalCluster from "./LocalCuster";
import AccountCluster, { AccountClusterNode } from "./AccountCluster";
import { orderBy } from "lodash-es";
import { IRootNode } from "../domain";
const sortResources = (resources: IRootNode[]) => {
  return orderBy(resources, ["createTime"], ["desc"]);
};

export type ClustersState = { code: 200 | 201; info?: string };

export { sortResources, AccountCluster, LocalCluster, AccountClusterNode };
