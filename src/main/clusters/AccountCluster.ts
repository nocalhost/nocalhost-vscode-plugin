import axios, { AxiosInstance, AxiosResponse } from "axios";
import {
  IResponseData,
  IServiceAccountInfo,
  IDevSpaceInfo,
  IV2ApplicationInfo,
  IUserInfo,
  IRootNode,
} from "../domain";
import logger from "../utils/logger";
import { keysToCamel } from "../utils";
import * as path from "path";
import { getAllNamespace } from "../ctl/nhctl";
import host from "../host";
import { getStringHash } from "../utils/common";
import { uniqBy } from "lodash";
import { LoginInfo } from "./interface";
import { writeFileLock } from "../utils/fileUtil";
import { KUBE_CONFIG_DIR, SERVER_CLUSTER_LIST } from "../constants";
import { ClusterSource } from "../common/define";
import * as packageJson from "../../../package.json";
import * as semver from "semver";
import { getConfiguration } from "../utils/conifg";

export class AccountClusterNode {
  userInfo: IUserInfo;
  createTime: number;
  jwt: string | null;
  id: string | null;
  loginInfo: LoginInfo;
  refreshToken: string | null;
}
export default class AccountClusterService {
  instance: AxiosInstance;
  loginInfo: LoginInfo;
  accountClusterNode: AccountClusterNode;
  jwt: string;
  refreshToken: string;
  lastServiceAccounts: IServiceAccountInfo[];
  isRefreshing: boolean;
  constructor(loginInfo: LoginInfo) {
    this.loginInfo = loginInfo;
    this.isRefreshing = true;
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
      async (response: AxiosResponse<IResponseData>) => {
        const config = response.config;
        const res = response.data;
        if ([20103, 20111].includes(res.code)) {
          // refresh token
          if (config.url === '/v1/token/refresh') {
            host.log(
              `Please login again ${this.loginInfo.baseUrl || ""}：${
                this.loginInfo.username || ""
              }`,
              true
            );
            host.showWarnMessage(
              `Please login again ${this.loginInfo.baseUrl || ""}：${
                this.loginInfo.username || ""
              }`
            );
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
          } else if (this.isRefreshing) {
            this.isRefreshing = false;
            await this.getRefreshToken();
            this.isRefreshing = true;
          }
        }
        if (res.code !== 0) {
          // vscode.window.showErrorMessage(res.message || "");
          return Promise.reject({ source: "api", error: res });
        }

        return response;
      },
      (error) => {
        return Promise.reject({ source: "api", error });
      }
    );
  }

  static getServerClusterRootNodes = async (
    newAccountCluser: AccountClusterNode
  ): Promise<IRootNode[]> => {
    if (!newAccountCluser) {
      return [];
    }
    const accountClusterService = new AccountClusterService(
      newAccountCluser.loginInfo
    );
    accountClusterService.accountClusterNode = newAccountCluser;
    accountClusterService.jwt = newAccountCluser.jwt;
    accountClusterService.refreshToken = newAccountCluser.refreshToken;
    const newRootNodes: IRootNode[] = [];
    let serviceAccounts = await accountClusterService.getServiceAccount();
    if (!Array.isArray(serviceAccounts) || serviceAccounts.length === 0) {
      logger.error(
        `${newAccountCluser.loginInfo.baseUrl}： No cluster found for ${newAccountCluser.loginInfo.username}`
      );
      return [];
    }
    logger.info(
      `[getServerClusterRootNodes] serviceAccounts length ${
        (serviceAccounts || []).length
      }`
    );
    const applications: IV2ApplicationInfo[] = await accountClusterService.getV2Application();
    logger.info(
      `[getServerClusterRootNodes] applications length ${
        (applications || []).length
      }`
    );
    for (const sa of serviceAccounts) {
      let devSpaces: Array<IDevSpaceInfo> | undefined = new Array();
      const id = getStringHash(
        `${newAccountCluser.loginInfo.baseUrl}${sa.clusterId}${newAccountCluser.userInfo.id}_config`
      );
      const kubeConfigPath = path.resolve(KUBE_CONFIG_DIR, id);
      await writeFileLock(kubeConfigPath, sa.kubeconfig);
      if (sa.privilege) {
        const devs = await getAllNamespace({
          kubeConfigPath: kubeConfigPath,
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
          const devInfo: IDevSpaceInfo = {
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
        clusterSource: ClusterSource.server,
        accountClusterService,
        id: newAccountCluser.id,
        createTime: newAccountCluser.createTime,
        kubeConfigPath,
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
      refreshToken: this.refreshToken,
      createTime: Date.now(),
      loginInfo: this.loginInfo,
      id: `${userInfo.id}${this.loginInfo.baseUrl}`,
    };
  };
  resetDevspace = async (devSpaceId: number) => {
    return this.instance.post(`/v1/plugin/${devSpaceId}/recreate`);
  };
  login = async (loginInfo: LoginInfo) => {
    logger.info("logging in。..");
    const response = (
      await this.instance.post("/v1/login", {
        email: loginInfo.username,
        password: loginInfo.password,
        from: "plugin",
      })
    ).data as IResponseData;
    if (response.data && response.data.token) {
      this.jwt = `Bearer ${response.data.token}`;
      this.refreshToken = response.data.refresh_token;
    }
    logger.info("login end");
    return this.jwt;
    // this.userInfo = await this.getUserInfo();
    // this.loginInfo.password = null;
    // this.id = `${this.userInfo.id}${this.loginInfo.baseUrl}`;
  };

  // get refresh token
  async getRefreshToken() {
    const response = await this.instance.post(
      "/v1/token/refresh",
      {},
      {
        headers: {
          Reraeb: this.refreshToken,
        },
      }
    );
    if (response.status === 200 && response.data) {
      const {
        data: { token, refresh_token },
        code,
      } = response.data;
      if (code === 0) {
        this.jwt =`Bearer ${token}`;
        this.refreshToken = refresh_token;
        this.updateLoginInfo();
      } 
    }
  }

 // update login infoo 
  updateLoginInfo() {
  const newAccountCluser =  {
    ...this.accountClusterNode,
    jwt: this.jwt,
    refreshToken: this.refreshToken,
  };
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
 }

  async getServiceAccount() {
    try {
      const response = await this.instance.get(`/v1/plugin/service_accounts`);
      const res = response.data as IResponseData;
      let serviceAccount: IServiceAccountInfo[] = keysToCamel(res.data) || [];
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
      const res = response.data as IResponseData;
      const applications = res.data || [];
      return applications;
    } catch (e) {
      return [];
    }
  }
  async getVersion() {
    try {
      const response = await this.instance.get("/v1/version");
      return response.data as { data?: { version: string } };
    } catch (e) {
      return {};
    }
  }

  async checkVersion(): Promise<void> {
    if (getConfiguration("apiServer.checkVersion") === false) {
      return;
    }

    const res = await this.getVersion();

    const log = `checkVersion serverVersion:${res.data?.version} packageVerison:${packageJson.version}`;
    logger.info(log);

    if (res.data?.version) {
      const { version } = res.data;
      if (semver.gt(packageJson.version, version)) {
        throw new Error(
          `please upgrade api server version.(${packageJson.version} or higher)`
        );
      }
    }
  }

  async getV2Application(): Promise<IV2ApplicationInfo[]> {
    const { userInfo } = this.accountClusterNode;
    const userId = userInfo.id;
    if (!userId) {
      return [];
    }
    const applications = await this.getApplication();
    if (!Array.isArray(applications) || applications.length === 0) {
      return [];
    }
    const result = new Array<IV2ApplicationInfo>();
    for (let i = 0; i < applications.length; i++) {
      const context = JSON.parse(applications[i].context);
      context.install_type = applications[i].application_type;
      // context.install_type = applications[i].application_type;
      const app: IV2ApplicationInfo = {
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
