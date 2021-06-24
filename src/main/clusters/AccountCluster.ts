import axios, { AxiosInstance, AxiosResponse } from "axios";
import { IUserInfo, IRootNode } from "../domain";
import logger from "../utils/logger";
import { keysToCamel } from "../utils";
import * as path from "path";
import { getAllNamespace } from "../ctl/nhctl";
import host from "../host";
import { getStringHash } from "../utils/common";
import { uniqBy } from "lodash";
import {
  ResponseData,
  DevspaceInfo,
  V2ApplicationInfo,
  ServiceAccountInfo,
} from "../api";
import { LoginInfo, ClusterSource } from "./interface";
import { writeFileAsync } from "../utils/fileUtil";
import { KUBE_CONFIG_DIR, SERVER_CLUSTER_LIST } from "../constants";

export class AccountClusterNode {
  userInfo: IUserInfo;
  createTime: number;
  jwt: string | null;
  id: string | null;
  loginInfo: LoginInfo;
}
export default class AccountClusterService {
  instance: AxiosInstance;
  loginInfo: LoginInfo;
  accountClusterNode: AccountClusterNode;
  jwt: string;
  lastServiceAccounts: ServiceAccountInfo[];
  constructor(loginInfo: LoginInfo) {
    this.loginInfo = loginInfo;
    this.instance = axios.create({
      baseURL: loginInfo.baseUrl,
      timeout: 1000 * 20,
    });
    this.instance.interceptors.request.use((config) => {
      // const jwt = host.getGlobalState(JWT) as string;
      if (!config.baseURL) {
        throw new Error("please config your api server");
      }
      if (this.jwt) {
        config.headers["Authorization"] = this.jwt;
      }

      return config;
    });
    this.instance.interceptors.response.use(
      async (response: AxiosResponse<ResponseData>) => {
        const res = response.data;
        if ([20103, 20111].includes(res.code)) {
          host.log(`Please login again ${loginInfo.username}`, true);
          if (this.accountClusterNode) {
            let globalClusterRootNodes: AccountClusterNode[] =
              host.getGlobalState(SERVER_CLUSTER_LIST) || [];
            const index = globalClusterRootNodes.findIndex(
              ({ id }) => id === this.accountClusterNode.id
            );
            if (index !== -1) {
              globalClusterRootNodes.splice(index, 1);
              host.setGlobalState(SERVER_CLUSTER_LIST, globalClusterRootNodes);
            }
          }
        }
        if (res.code !== 0) {
          // vscode.window.showErrorMessage(res.message || "");
          return Promise.reject({ source: "api", error: res });
        }

        return response;
      },
      function (error) {
        return Promise.reject({ source: "api", error });
      }
    );
  }

  static getServerClusterRootNodes = async (
    newAccountClusterNode: AccountClusterNode
  ): Promise<IRootNode[]> => {
    const accountClusterService = new AccountClusterService(
      newAccountClusterNode.loginInfo
    );
    accountClusterService.accountClusterNode = newAccountClusterNode;
    accountClusterService.jwt = newAccountClusterNode.jwt;
    const newRootNodes: IRootNode[] = [];
    let serviceAccounts = await accountClusterService.getServiceAccount();
    if (!Array.isArray(serviceAccounts) || serviceAccounts.length === 0) {
      logger.error(
        `${newAccountClusterNode.loginInfo.baseUrl}： No cluster found for ${newAccountClusterNode.loginInfo.username}`
      );
      return newRootNodes;
    }
    const applications: V2ApplicationInfo[] = await accountClusterService.getV2Application();
    for (const sa of serviceAccounts) {
      let devSpaces: Array<DevspaceInfo> | undefined = new Array();
      const id = getStringHash(
        `${newAccountClusterNode.loginInfo.baseUrl}${sa.clusterId}${newAccountClusterNode.userInfo.id}_config`
      );
      const kubeConfigPath = path.resolve(KUBE_CONFIG_DIR, id);
      writeFileAsync(kubeConfigPath, sa.kubeconfig);
      if (sa.privilege) {
        const devs = await getAllNamespace({
          kubeConfigPath,
          namespace: "default",
        });
        for (const dev of devs) {
          dev.storageClass = sa.storageClass;
          dev.devStartAppendCommand = [
            "--priority-class",
            "nocalhost-container-critical",
          ];
          dev.kubeconfig = sa.kubeconfig;
        }
        devSpaces.push(...devs);
      } else {
        for (const ns of sa.namespacePacks) {
          const devInfo: DevspaceInfo = {
            id: ns.spaceId,
            spaceName: ns.spacename,
            namespace: ns.namespace,
            kubeconfig: sa.kubeconfig,
            accountClusterService,
            clusterId: sa.clusterId,
            storageClass: sa.storageClass,
            devStartAppendCommand: [
              "--priority-class",
              "nocalhost-container-critical",
            ],
          };
          devSpaces.push(devInfo);
        }
      }
      const obj: IRootNode = {
        devSpaces,
        applications,
        userInfo: newAccountClusterNode.userInfo,
        clusterSource: ClusterSource.server,
        accountClusterService,
        id: newAccountClusterNode.id,
        createTime: newAccountClusterNode.createTime,
        kubeConfigPath,
      };
      newRootNodes.push(obj);
    }

    return newRootNodes;
  };

  static appendClusterByLoginInfo = async (loginInfo: LoginInfo) => {
    const accountServer = new AccountClusterService(loginInfo);
    const newAccountClusterNode: AccountClusterNode = await accountServer.buildAccountClusterNode();

    let globalAccountClusterList = host.getGlobalState(SERVER_CLUSTER_LIST);
    if (!Array.isArray(globalAccountClusterList)) {
      globalAccountClusterList = [];
    }
    globalAccountClusterList = globalAccountClusterList.filter(
      (it: AccountClusterNode) => it.id
    );
    const oldAccountIndex = globalAccountClusterList.findIndex(
      (it: AccountClusterNode) => it.id === newAccountClusterNode.id
    );
    if (oldAccountIndex !== -1) {
      globalAccountClusterList.splice(
        oldAccountIndex,
        1,
        newAccountClusterNode
      );
    } else {
      globalAccountClusterList.push(newAccountClusterNode);
    }
    globalAccountClusterList = uniqBy(globalAccountClusterList, "id");
    host.setGlobalState(SERVER_CLUSTER_LIST, globalAccountClusterList);
    return newAccountClusterNode;
  };

  buildAccountClusterNode = async (): Promise<AccountClusterNode> => {
    await this.login(this.loginInfo);
    const userInfo = await this.getUserInfo();
    return {
      userInfo,
      jwt: this.jwt,
      createTime: Date.now(),
      loginInfo: this.loginInfo,
      id: `${userInfo.id}${this.loginInfo.baseUrl}`,
    };
  };
  resetDevspace = async (devSpaceId: number) => {
    return this.instance.post(`/v1/plugin/${devSpaceId}/recreate`);
  };
  login = async (loginInfo: LoginInfo) => {
    const response = (
      await this.instance.post("/v1/login", {
        email: loginInfo.username,
        password: loginInfo.password,
        from: "plugin",
      })
    ).data as ResponseData;
    if (response.data && response.data.token) {
      this.jwt = `Bearer ${response.data.token}`;
    }
    return this.jwt;
    // this.userInfo = await this.getUserInfo();
    // this.loginInfo.password = null;
    // this.id = `${this.userInfo.id}${this.loginInfo.baseUrl}`;
  };

  async getServiceAccount() {
    try {
      const response = await this.instance.get(`/v1/plugin/service_accounts`);
      const res = response.data as ResponseData;
      let serviceAccount: ServiceAccountInfo[] = keysToCamel(res.data) || [];
      if (!Array.isArray(serviceAccount) || serviceAccount.length === 0) {
        serviceAccount = this.lastServiceAccounts;
      } else {
        this.lastServiceAccounts = [...serviceAccount];
      }
      return serviceAccount;
    } catch (e) {
      logger.error(e);
      console.log(e);
      return this.lastServiceAccounts || [];
    }
  }

  async getApplication() {
    const { userInfo } = this.accountClusterNode;
    try {
      const response = await this.instance.get(
        `/v1/users/${userInfo.id}/applications`
      );
      const res = response.data as ResponseData;
      const applications = res.data || [];
      return applications;
    } catch (e) {
      return [];
    }
  }

  async getV2Application(): Promise<V2ApplicationInfo[]> {
    const { userInfo } = this.accountClusterNode;
    const userId = userInfo.id;
    if (!userId) {
      return [];
    }
    const applications = await this.getApplication();
    if (!Array.isArray(applications) || applications.length === 0) {
      return [];
    }
    const result = new Array<V2ApplicationInfo>();
    for (let i = 0; i < applications.length; i++) {
      const context = JSON.parse(applications[i].context);
      context.install_type = applications[i].application_type;
      const app: V2ApplicationInfo = {
        id: applications[i].id,
        userId: applications[i]["user_id"],
        public: applications[i].public,
        editable: applications[i].editable,
        context: JSON.stringify(keysToCamel(context)),
        status: applications[i].status,
      };
      result.push(app);
    }

    const contextObj = {
      applicationName: "default.application",
      applicationUrl: "",
      applicationConfigPath: "",
      nocalhostConfig: "",
      source: "",
      resourceDir: "",
      installType: "",
    };

    result.push({
      id: 0,
      userId: userId,
      public: 1,
      editable: 1,
      context: JSON.stringify(contextObj),
      status: 1,
    });
    return result.sort((a, b) => a.id - b.id);
  }

  async getUserInfo() {
    const response = await this.instance.get("/v1/me");
    if (response.status === 200 && response.data) {
      const { data } = response.data;
      return data;
    }
    throw new Error("Fail to fetch user infomation.");
  }
}
