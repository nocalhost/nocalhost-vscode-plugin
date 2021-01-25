import { IApplicationContext } from "./ApplicationContext";
import { IApplicationMeta } from "./ApplicationMeta";

export interface IApplication {
  id: number;
  context: IApplicationContext;
  status: number;
  installStatus: number;
  kubeconfig: string;
  cpu: number;
  memory: number;
  namespace: string;
  clusterId: number;
  devspaceId: number;
  spaceName: string;
  storageClass: string;
}

export default class Applicaiton implements IApplication {
  id: number;
  context: IApplicationContext;
  status: number;
  installStatus: number;
  kubeconfig: string;
  cpu: number;
  memory: number;
  namespace: string;
  clusterId: number;
  devspaceId: number;
  spaceName: string;
  storageClass: string;

  constructor(
    id: number,
    context: IApplicationContext,
    status: number,
    installStatus: number,
    kubeconfig: string,
    cpu: number,
    memory: number,
    namespace: string,
    clusterId: number,
    devspaceId: number,
    spaceName: string,
    storageClass: string
  ) {
    this.id = id;
    this.context = context;
    this.status = status;
    this.installStatus = installStatus;
    this.kubeconfig = kubeconfig;
    this.cpu = cpu;
    this.memory = memory;
    this.namespace = namespace;
    this.clusterId = clusterId;
    this.devspaceId = devspaceId;
    this.spaceName = spaceName;
    this.storageClass = storageClass;
  }
}
