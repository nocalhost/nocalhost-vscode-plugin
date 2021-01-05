import { ISvcProfile } from "./SvcProfile";

export interface IApplicationMeta {
  name: string;
  releasename: string;
  namespace: string;
  kubeconfig: string;
  dependencyConfigMapName: string;
  appType: string;
  svcProfile: ISvcProfile[];
  installed: boolean;
  resourcePath: string[];
}

export default class ApplicationMeta implements IApplicationMeta {
  name: string;
  releasename: string;
  namespace: string;
  kubeconfig: string;
  dependencyConfigMapName: string;
  appType: string;
  svcProfile: ISvcProfile[];
  installed: boolean;
  resourcePath: string[];

  constructor(
    name: string,
    releasename: string,
    namespace: string,
    kubeconfig: string,
    dependencyConfigMapName: string,
    appType: string,
    svcProfile: ISvcProfile[],
    installed: boolean,
    resourcePath: string[]
  ) {
    this.name = name;
    this.releasename = releasename;
    this.namespace = namespace;
    this.kubeconfig = kubeconfig;
    this.dependencyConfigMapName = dependencyConfigMapName;
    this.appType = appType;
    this.svcProfile = svcProfile;
    this.installed = installed;
    this.resourcePath = resourcePath;
  }
}
