import { BaseNocalhostNode } from "../nodes/nodeType";
let instance: Map<string, BaseNocalhostNode> = null;

export default {
  getInstance() {
    if (!instance) {
      instance = new Map<string, BaseNocalhostNode>();
    }
    return instance;
  },
};
