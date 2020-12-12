import { BaseNocalhostNode } from "../nodes/types/nodeType";

let instance: Map<string, BaseNocalhostNode>;

export default {
  getInstance() {
    if (!instance) {
      instance = new Map<string, BaseNocalhostNode>();
    }
    return instance;
  },
};
