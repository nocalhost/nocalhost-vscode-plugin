import axios, { AxiosInstance, AxiosResponse } from "axios";
import * as semver from "semver";
import * as url from "url";
import { uniqBy, difference } from "lodash";
import * as path from "path";
import { promises as fs } from "fs";
import * as assert from "assert";
import { ChildProcessWithoutNullStreams } from "child_process";

import {
  IResponseData,
  IServiceAccountInfo,
  IV2ApplicationInfo,
  IUserInfo,
  IRootNode,
} from "../domain";
import logger, { loggerDebug } from "../utils/logger";
import { keysToCamel } from "../utils";
import {
  checkCluster,
  kubeconfigCommand,
  kubeConfigRender,
} from "../ctl/nhctl";
import host from "../host";
import { getStringHash } from "../utils/common";
import { LoginInfo } from "./interface";
import { isExist, writeFileLock } from "../utils/fileUtil";
import { KUBE_CONFIG_DIR, SERVER_CLUSTER_LIST } from "../constants";
import { ClusterSource } from "../common/define";
import * as packageJson from "../../../package.json";
import { ClustersState } from ".";

export class AccountClusterNode {
  userInfo: IUserInfo;
  createTime: number;
  jwt: string | null;
  id: string | null;
  loginInfo: LoginInfo;
  refreshToken: string | null;
  state: ClustersState;
}

export function buildRootNodeForAccountCluster(
  accountCluster: AccountClusterNode,
  state: ClustersState
): IRootNode {
  return {
    applications: [],
    devSpaces: [],
    userInfo: accountCluster.userInfo,
    clusterSource: ClusterSource.server,
    accountClusterService: new AccountClusterService(accountCluster.loginInfo),
    id: accountCluster.id,
    createTime: accountCluster.createTime,
    kubeConfigPath: null,
    state,
  };
}
const virtualClusterProcMap: {
  [key: string]: { proc: ChildProcessWithoutNullStreams; kubeconfig: string };
} = {};
export default class AccountClusterService {
  instance: AxiosInstance;
  accountClusterNode: AccountClusterNode;
  jwt: string;
  refreshToken: string;
  lastServiceAccounts: IServiceAccountInfo[];
  isRefreshing: boolean;

  constructor(public loginInfo: LoginInfo) {
    var parsed = url.parse(loginInfo.baseUrl);

    if (!parsed.protocol) {
      loginInfo.baseUrl = "http://" + loginInfo.baseUrl;
    }

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
        if (res.code === 20103) {
          // refresh token
          if (config.url === "/v1/token/refresh") {
            host.log(
              `Please login again ${this.loginInfo.baseUrl || ""}:${
                this.loginInfo.username || ""
              }`,
              true
            );
            host.showWarnMessage(
              `Please login again ${this.loginInfo.baseUrl || ""}:${
                this.loginInfo.username || ""
              }`
            );
            this.deleteAccountNode();
          } else if (this.isRefreshing) {
            this.isRefreshing = false;
            await this.getRefreshToken();
            this.isRefreshing = true;
          }
        }

        if (res.code === 20111) {
          this.deleteAccountNode();
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
    newAccountCluster: AccountClusterNode
  ): Promise<IRootNode[]> => {
    if (!newAccountCluster) {
      return [];
    }
    const accountClusterService = new AccountClusterService(
      newAccountCluster.loginInfo
    );
    accountClusterService.accountClusterNode = newAccountCluster;
    accountClusterService.jwt = newAccountCluster.jwt;
    accountClusterService.refreshToken = newAccountCluster.refreshToken;

    let serviceAccounts = await accountClusterService.getServiceAccount();
    logger.info(
      `[getServerClusterRootNodes] serviceAccounts length ${
        (serviceAccounts || []).length
      }`
    );

    assert(
      Array.isArray(serviceAccounts) && serviceAccounts.length > 0,
      `no cluster found for ${newAccountCluster.loginInfo.baseUrl} ${newAccountCluster.loginInfo.username}`
    );

    const applications: IV2ApplicationInfo[] = await accountClusterService.getV2Application();
    logger.info(
      `[getServerClusterRootNodes] applications length ${
        (applications || []).length
      }`
    );

    const kubeConfigArr: Array<string> = [];

    const serviceNodes = serviceAccounts.map(async (serviceAccount) => {
      const kubeconfig = await AccountClusterService.vClusterProcess(
        serviceAccount
      );

      if (kubeconfig) {
        serviceAccount.kubeconfig = kubeconfig;
      }

      const { id, kubeConfigPath } = await AccountClusterService.saveKubeConfig(
        serviceAccount
      );

      kubeConfigArr.push(id);

      const state = await checkCluster(kubeConfigPath);

      return {
        serviceAccount,
        devSpaces: [],
        applications,
        userInfo: newAccountCluster.userInfo,
        clusterSource: ClusterSource.server,
        accountClusterService,
        id: newAccountCluster.id,
        createTime: newAccountCluster.createTime,
        kubeConfigPath,
        state,
      };
    });

    await AccountClusterService.cleanDiffKubeConfig(
      newAccountCluster,
      kubeConfigArr
    );

    return await (await Promise.allSettled(serviceNodes)).map((item) => {
      if (item.status === "fulfilled") {
        return item.value;
      }
      return {
        devSpaces: [],
        userInfo: newAccountCluster.userInfo,
        clusterSource: ClusterSource.server,
        accountClusterService,
        id: newAccountCluster.id,
        createTime: newAccountCluster.createTime,
        kubeConfigPath: null,
      } as IRootNode;
    });
  };

  static async vClusterProcess(sa: IServiceAccountInfo) {
    const { virtualCluster, kubeconfigType } = sa;
    if (
      kubeconfigType === "vcluster" &&
      virtualCluster.serviceType === "ClusterIP"
    ) {
      const {
        serviceNamespace,
        servicePort,
        hostClusterContext,
        serviceAddress,
      } = virtualCluster;

      let oldProc = virtualClusterProcMap[serviceAddress];
      if (oldProc?.proc.killed === false) {
        return oldProc.kubeconfig;
      }

      const { proc, kubeconfig } = await kubeConfigRender({
        namespace: serviceNamespace,
        kubeconfig: sa.kubeconfig,
        remotePort: servicePort,
        context: hostClusterContext,
        serviceAddress: serviceAddress,
      });

      const kubeConfigPath = path.resolve(
        KUBE_CONFIG_DIR,
        getStringHash(kubeconfig.trim())
      );

      host.getContext().subscriptions.push({
        dispose: () => {
          loggerDebug.debug("dispose", kubeConfigPath);

          proc.kill();
          kubeconfigCommand(kubeConfigPath, "remove");

          return fs.unlink(kubeConfigPath);
        },
      });
      virtualClusterProcMap[serviceAddress] = {
        proc,
        kubeconfig,
      };

      return kubeconfig;
    }
  }
  static async cleanDiffKubeConfig(
    accountCluster: AccountClusterNode,
    configs: Array<string>
  ) {
    const { baseUrl, username } = accountCluster.loginInfo;
    const KEY = `USER_LINK:${baseUrl}@${username}`;

    const prevData = host.getGlobalState<Array<string>>(KEY);

    if (prevData) {
      const diff = difference(prevData, configs);

      if (diff.length === 0) {
        return;
      }

      await Promise.allSettled(
        diff.map((id) => {
          const file = path.resolve(KUBE_CONFIG_DIR, id);

          kubeconfigCommand(file, "remove");
        })
      );
    }

    host.setGlobalState(KEY, configs);
  }

  static async saveKubeConfig(accountInfo: IServiceAccountInfo) {
    const id = getStringHash(accountInfo.kubeconfig.trim());

    const kubeConfigPath = path.resolve(KUBE_CONFIG_DIR, id);

    if (!(await isExist(kubeConfigPath))) {
      await writeFileLock(kubeConfigPath, accountInfo.kubeconfig);

      kubeconfigCommand(kubeConfigPath, "add");
    }

    return { id, kubeConfigPath };
  }
  static appendClusterByLoginInfo = async (
    loginInfo: LoginInfo
  ): Promise<AccountClusterNode> => {
    const accountServer = new AccountClusterService(loginInfo);
    const newAccountCluster = await accountServer.buildAccountClusterNode();

    let globalAccountClusterList = host.getGlobalState<
      Array<AccountClusterNode>
    >(SERVER_CLUSTER_LIST);

    if (!Array.isArray(globalAccountClusterList)) {
      globalAccountClusterList = [];
    }

    globalAccountClusterList = globalAccountClusterList.filter((it) => it.id);

    const oldAccountIndex = globalAccountClusterList.findIndex(
      (it) => it.id === newAccountCluster.id
    );

    if (oldAccountIndex !== -1) {
      globalAccountClusterList.splice(oldAccountIndex, 1, newAccountCluster);
    } else {
      globalAccountClusterList.push(newAccountCluster);
    }

    globalAccountClusterList = uniqBy(globalAccountClusterList, "id");
    host.setGlobalState(SERVER_CLUSTER_LIST, globalAccountClusterList);

    return newAccountCluster;
  };

  buildAccountClusterNode = async (): Promise<AccountClusterNode> => {
    await this.login(this.loginInfo);
    const userInfo = await this.getUserInfo();
    return {
      userInfo,
      jwt: this.jwt,
      refreshToken: this.refreshToken,
      createTime: Date.now(),
      loginInfo: this.loginInfo,
      id: `${userInfo.id}${this.loginInfo.baseUrl}`,
      state: {
        code: 200,
      },
    };
  };
  resetDevSpace = async (devSpaceId: number) => {
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
  };

  // get refresh token
  async getRefreshToken() {
    const response = await this.instance.post(
      "/v1/token/refresh",
      {},
      {
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Reraeb: this.refreshToken || "",
        },
      }
    );
    if (response.status === 200 && response.data) {
      const {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        data: { token, refresh_token },
        code,
      } = response.data;
      if (code === 0) {
        this.jwt = `Bearer ${token}`;
        this.refreshToken = refresh_token;
        this.updateLoginInfo();
      }
    }
  }

  deleteAccountNode() {
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

  updateLoginInfo() {
    const newAccountCluster = {
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
      (it: AccountClusterNode) => it.id === newAccountCluster.id
    );
    if (oldAccountIndex !== -1) {
      globalAccountClusterList.splice(oldAccountIndex, 1, newAccountCluster);
    } else {
      globalAccountClusterList.push(newAccountCluster);
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
      logger.error("getServiceAccount", e);

      throw Error(
        `failed to get cluster for ${this.loginInfo.baseUrl}@${this.loginInfo.username}`
      );
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

  async checkServerVersion(): Promise<void> {
    const res = await this.getVersion();

    const log = `checkVersion serverVersion:${res.data?.version} packageVersion:${packageJson.nhctl.serverVersion}`;
    logger.info(log);

    if (res.data?.version) {
      const { version } = res.data;
      if (semver.gt(packageJson.nhctl.serverVersion, version)) {
        host.showWarnMessage(
          `please upgrade api server version.(${packageJson.nhctl.serverVersion} or higher)`
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
