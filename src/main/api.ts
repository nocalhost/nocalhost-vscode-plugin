import { AxiosResponse } from "axios";
import axios from "axios";
import * as vscode from "vscode";
import state from "./state";
import host from "./host";
import { BASE_URL, JWT, USERINFO } from "./constants";
import { keysToCamel } from "./utils";
import { IUserInfo } from "./domain";

axios.defaults.headers.post["Content-Type"] = "application/json";

interface LoginInfo {
  email: string;
  password: string;
  from?: "plugin";
}

export interface ResponseData {
  code: number;
  message?: string;
  data: any;
}

export interface DevspaceInfo {
  id: number;
  spaceName: string;
  clusterId: number;
  kubeconfig: string;
  namespace: string;
  storageClass: string;
  devStartAppendCommand: Array<string>;
  [key: string]: any;
}

// axios.interceptors.request.use(function (config) {
//   // const jwt = host.getGlobalState(JWT) as string;
//   config.baseURL = host.getGlobalState(BASE_URL) as string;
//   if (!config.baseURL) {
//     throw new Error("please config your api server");
//   }
//   // config.headers["Authorization"] = `Bearer ${jwt}`;

//   return config;
// });

axios.interceptors.response.use(
  async function (response: AxiosResponse<ResponseData>) {
    const res = response.data;
    // if ([20103, 20111].includes(res.code)) {
    //   state.setLogin(false);
    // }
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

export async function login(loginInfo: LoginInfo) {
  loginInfo.from = "plugin";
  const response = (await axios.post("/v1/login", loginInfo))
    .data as ResponseData;
  if (response.data && response.data.token) {
    const jwt = response.data.token;
    return jwt;
  }

  throw new Error("login fail");
}

export async function getUserInfo(jwt: string) {
  const response = await axios.get("/v1/me", {
    headers: {
      // eslint-disable-next-line
      Authorization: `Bearer ${jwt}`,
    },
  });
  if (response.status === 200 && response.data) {
    const { data } = response.data;
    return data;
  }
  throw new Error("Fail to fetch user infomation.");
}

export interface ApplicationInfo {
  id: number;
  context: string;
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
  devStartAppendCommand: Array<string>;
}

export interface V2ApplicationInfo {
  id: number;
  context: string;
  userId: number;
  status: number;
  editable: number;
  public: number;
}

export interface V2ApplicationInfo {
  id: number;
  context: string;
  userId: number;
  status: number;
  editable: number;
  public: number;
}

export async function getApplication(jwt: string) {
  const response = await axios.get("/v1/plugin/dev_space", {
    headers: {
      // eslint-disable-next-line
      Authorization: `Bearer ${jwt}`,
    },
  });
  const res = response.data as ResponseData;
  const applications = res.data || [];
  const result = new Array<ApplicationInfo>();
  for (let i = 0; i < applications.length; i++) {
    const app: ApplicationInfo = {
      id: applications[i].id,
      context: applications[i].context,
      status: applications[i].status,
      installStatus: applications[i]["install_status"],
      kubeconfig: applications[i].kubeconfig,
      cpu: applications[i].cpu,
      memory: applications[i].memory,
      namespace: applications[i].namespace,
      clusterId: applications[i]["cluster_id"],
      devspaceId: applications[i]["devspace_id"],
      spaceName: applications[i]["space_name"],
      storageClass: applications[i]["storage_class"],
      devStartAppendCommand: applications[i]["dev_start_append_command"],
    };
    result.push(app);
  }
  return result;
}

async function fetchApplication(userId: number, jwt: string) {
  try {
    const response = await axios.get(`/v1/users/${userId}/applications`, {
      headers: {
        // eslint-disable-next-line
        Authorization: `Bearer ${jwt}`,
      },
    });
    const res = response.data as ResponseData;
    const applications = res.data || [];
    return applications;
  } catch (e) {
    return [];
  }
}
export async function getV2Application(
  userInfo: IUserInfo,
  jwt: string
): Promise<V2ApplicationInfo[]> {
  const userId = userInfo.id;
  if (!userId) {
    return [];
  }
  const applications = await fetchApplication(userId, jwt);
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
      context: JSON.stringify(keysToCamel(JSON.parse(applications[i].context))),
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

export async function updateAppInstallStatus(
  appId: number,
  devSpaceId: number,
  status: number
) {
  return axios.put(
    `/v1/plugin/application/${appId}/dev_space/${devSpaceId}/plugin_sync`,
    { status }
  );
}

export async function resetDevspace(devSpaceId: number) {
  return axios.post(`/v1/plugin/${devSpaceId}/recreate`);
}

export async function getDevSpace() {
  const userinfo = host.getGlobalState(USERINFO);
  const userId = userinfo.id;
  if (!userId) {
    return;
  }
  const response = await axios.get(`/v1/users/${userId}/dev_spaces`);
  const res = response.data as ResponseData;
  const applications = res.data || [];
  const result = new Array<DevspaceInfo>();
  for (let i = 0; i < applications.length; i++) {
    const app: DevspaceInfo = {
      id: applications[i].id,
      userId: applications[i]["user_id"],
      status: applications[i].status,
      kubeconfig: applications[i].kubeconfig,
      cpu: applications[i].cpu,
      memory: applications[i].memory,
      namespace: applications[i].namespace,
      clusterId: applications[i]["cluster_id"],
      spaceName: applications[i]["space_name"],
      spaceResourceLimit: applications[i]["space_resource_limit"],
      storageClass: applications[i]["storage_class"],
      devStartAppendCommand: applications[i]["dev_start_append_command"],
    };
    result.push(app);
  }
  return result.sort((a, b) => {
    if (a.spaceName < b.spaceName) {
      return -1;
    }
    if (a.spaceName > b.spaceName) {
      return 1;
    }
    return 0;
  });
}

export interface ServiceAccountInfo {
  clusterId: number;
  kubeconfig: string;
  storageClass: string;
  privilege: boolean;
  namespacePacks: Array<{
    spaceId: number;
    namespace: string;
    spacename: string;
  }>;
}

export async function getServiceAccount(jwt: string) {
  try {
    const response = await axios.get(`/v1/plugin/service_accounts`, {
      headers: {
        // eslint-disable-next-line
        Authorization: `Bearer ${jwt}`,
      },
    });

    const res = response.data as ResponseData;
    const serviceAccount: ServiceAccountInfo[] = keysToCamel(res.data) || [];
    return serviceAccount;
  } catch (e) {
    console.log(e);
    return [];
  }
}
