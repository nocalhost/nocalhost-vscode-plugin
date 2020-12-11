import nodeStore from "../store/nodeStore";
import { BaseNocalhostNode } from "../nodes/nodeType";

interface IChannels {
  [channelName: string]: IChannelValue;
}

interface IChannelValue {
  handler?: (node?: BaseNocalhostNode) => void;
  subscribers: Set<string>;
  timer: NodeJS.Timeout | null;
}

const nodeMap: Map<string, BaseNocalhostNode> = nodeStore.getInstance();
const channels: IChannels = {};
const TIMEOUT: number = 1000;

export default {
  on(channelName: string, handler: (node?: BaseNocalhostNode) => void): void {
    if (!channels[channelName]) {
      const channelValue: IChannelValue = {
        handler: () => {},
        subscribers: new Set(),
        timer: null,
      };
      channels[channelName] = channelValue;
    }
    channels[channelName].handler = handler;
  },
  remove(channelName: string): void {
    const channelValue: IChannelValue = channels[channelName];
    if (channelValue) {
      if (channelValue.timer) {
        clearTimeout(channelValue.timer);
      }
      delete channels[channelName];
    }
  },
  addSubscriber(channelName: string, node: BaseNocalhostNode): void {
    console.log("add subscriber: ", node.getNodeStateId());
    const channelValue: IChannelValue = channels[channelName];
    if (!channelValue) {
      return;
    }
    channelValue.subscribers.add(node.getNodeStateId());
  },
  async removeSubscriber(channelName: string, node: BaseNocalhostNode) {
    const channelValue: IChannelValue = channels[channelName];
    const children:
      | BaseNocalhostNode[]
      | null
      | undefined = await node.getChildren();
    if (children && Array.isArray(children)) {
      children.forEach((n) => this.removeSubscriber(channelName, n));
    }
    const nodeStateId: string = node.getNodeStateId();
    if (channelValue && channelValue.subscribers.has(nodeStateId)) {
      console.log("remove subscriber: ", nodeStateId);
      channelValue.subscribers.delete(nodeStateId);
    }
  },
  notify(channelName: string): void {
    const channelValue: IChannelValue = channels[channelName];
    const { handler, subscribers, timer } = channelValue;
    if (timer) {
      clearTimeout(timer);
    }
    channelValue.timer = setTimeout(() => {
      for (let subscriber of subscribers) {
        const node: BaseNocalhostNode | undefined = nodeMap.get(subscriber);
        console.log("running timer...", node);
        if (handler && typeof handler === "function") {
          handler(node);
        }
      }
      this.notify(channelName);
    }, TIMEOUT);
  },
};
