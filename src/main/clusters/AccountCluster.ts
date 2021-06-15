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
import { LoginInfo } from "./interface";
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
      const jwt = this.jwt;
      if (!config.baseURL) {
        throw new Error("please config your api server");
      }
      if (this.jwt) {
        config.headers["Authorization"] = this.jwt;
      }

      return config;
    });
    this.instance.interceptors.response.use(
      async function (response: AxiosResponse<ResponseData>) {
        const res = response.data;
        if ([20103, 20111].includes(res.code)) {
          host.log(`Please login again ${loginInfo.username}`, true);
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

  // static getLocalClusterRootNode = async (newAccountCluser: AccountClusterNode) => {
  //   let resources = state.getData(ROOT_NODE_KEY) as IRootNode[];
  //   const oldLength = resources.length;
  //   if (!Array.isArray(resources)) {
  //     resources = []
  //   }
  //   const newRootNodes = await AccountClusterService.getAccountClusterNodes(newAccountCluser) || []
  //   resources = [...resources, ...newRootNodes]
  //   if (oldLength !== resources.length) {
  //     state.setData(ROOT_NODE_KEY, resources);
  //   }
  //   return resources;
  // }

  static getServerClusterRootNodes = async (
    newAccountCluser: AccountClusterNode
  ): Promise<IRootNode[]> => {
    const accountClusterService = new AccountClusterService(
      newAccountCluser.loginInfo
    );
    accountClusterService.accountClusterNode = newAccountCluser;
    accountClusterService.jwt = newAccountCluser.jwt;
    const newRootNodes: IRootNode[] = [];
    let serviceAccounts = await accountClusterService.getServiceAccount();
    if (!serviceAccounts || serviceAccounts.length === 0) {
      logger.error(
        `${newAccountCluser.loginInfo.baseUrl}： No cluster found for ${newAccountCluser.loginInfo.username}`
      );
    }
    const applications: V2ApplicationInfo[] = await accountClusterService.getV2Application();
    for (const sa of serviceAccounts) {
      let devSpaces: Array<DevspaceInfo> | undefined = new Array();
      const id = getStringHash(
        `${newAccountCluser.loginInfo.baseUrl}${sa.clusterId}${newAccountCluser.userInfo.id}_config`
      );
      const kubeconfigPath = path.resolve(KUBE_CONFIG_DIR, id);
      writeFileAsync(kubeconfigPath, sa.kubeconfig);
      if (sa.privilege) {
        const devs = await getAllNamespace({
          kubeConfigPath: kubeconfigPath,
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
        userInfo: newAccountCluser.userInfo,
        isServer: true,
        old: [],
        accountClusterService,
        id: newAccountCluser.id,
        createTime: newAccountCluser.createTime,
        localPath: kubeconfigPath,
        kubeConfig: sa.kubeconfig,
      };
      newRootNodes.push(obj);
    }

    return newRootNodes;
  };

  static appendClusterByLoginInfo = async (loginInfo: LoginInfo) => {
    const accountServer = new AccountClusterService(loginInfo);
    const newAccountCluser = await accountServer.buildAccountClusterNode();

    let globalAccountClusterList = host.getGlobalState(SERVER_CLUSTER_LIST);
    if (!Array.isArray(globalAccountClusterList)) {
      globalAccountClusterList = [];
    }
    globalAccountClusterList = globalAccountClusterList.filter(
      (it: AccountClusterNode) => it.id
    );
    const oldAccountIndex = globalAccountClusterList.findIndex(
      (it: AccountClusterNode) => it.id === newAccountCluser.id
    );
    if (oldAccountIndex !== -1) {
      globalAccountClusterList.splice(oldAccountIndex, 1, newAccountCluser);
    } else {
      globalAccountClusterList.push(newAccountCluser);
    }
    globalAccountClusterList = uniqBy(globalAccountClusterList, "id");
    host.setGlobalState(SERVER_CLUSTER_LIST, globalAccountClusterList);
    return newAccountCluser;
  };

  buildAccountClusterNode = async () => {
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
      if (!serviceAccount || serviceAccount.length === 0) {
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
    if (!applications || applications.length === 0) {
      return [];
    }
    const result = new Array<V2ApplicationInfo>();
    for (let i = 0; i < applications.length; i++) {
      const app: V2ApplicationInfo = {
        id: applications[i].id,
        userId: applications[i]["user_id"],
        public: applications[i].public,
        editable: applications[i].editable,
        context: JSON.stringify(
          keysToCamel(JSON.parse(applications[i].context))
        ),
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
