import { AxiosResponse } from "axios";
import axios from "axios";
import * as vscode from "vscode";
import state from "./state";
import host from "./host";
import { BASE_URL, JWT, USERINFO } from "./constants";

axios.defaults.headers.post["Content-Type"] = "application/json";

interface LoginInfo {
  email: string;
  password: string;
  from?: "plugin";
}

interface ResponseData {
  code: number;
  message?: string;
  data: any;
}

export interface DevspaceInfo {
  id: number;
  userId: number;
  spaceName: string;
  clusterId: number;
  kubeconfig: string;
  memory: number;
  cpu: number;
  spaceResourceLimit: string;
  namespace: string;
  status: number;
  storageClass: string;
  devStartAppendCommand: Array<string>;
}

axios.interceptors.request.use(function (config) {
  const jwt = host.getGlobalState(JWT) as string;
  config.baseURL = host.getGlobalState(BASE_URL) as string;
  if (!config.baseURL) {
    throw new Error("please config your api server");
  }
  config.headers["Authorization"] = `Bearer ${jwt}`;

  return config;
});

axios.interceptors.response.use(
  async function (response: AxiosResponse<ResponseData>) {
    const res = response.data;
    if ([20103, 20111].includes(res.code)) {
      state.setLogin(false);
    }
    if (res.code !== 0) {
      vscode.window.showErrorMessage(res.message || "");
      return Promise.reject(res);
    }

    return response;
  },
  function (error) {
    vscode.window.showErrorMessage(error.message);
    return Promise.reject(error);
  }
);

export async function login(loginInfo: LoginInfo) {
  loginInfo.from = "plugin";
  const response = (await axios.post("/v1/login", loginInfo))
    .data as ResponseData;
  if (response.data && response.data.token) {
    const jwt = response.data.token;
    host.setGlobalState(JWT, jwt);
    return jwt;
  }

  throw new Error("login fail");
}

export async function getUserinfo() {
  const response = await axios.get("/v1/me");
  if (response.status === 200 && response.data) {
    const { data } = response.data;
    host.setGlobalState(USERINFO, data);
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

export async function getApplication() {
  const response = await axios.get("/v1/plugin/dev_space");
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

export async function getV2Application() {
  const userinfo = host.getGlobalState(USERINFO);
  const userId = userinfo.id;
  if (!userId) {
    return;
  }
  const response = await axios.get(`/v1/users/${userId}/applications`);
  const res = response.data as ResponseData;
  const applications = res.data || [];
  const result = new Array<V2ApplicationInfo>();
  for (let i = 0; i < applications.length; i++) {
    const app: V2ApplicationInfo = {
      id: applications[i].id,
      userId: applications[i]["user_id"],
      public: applications[i].public,
      editable: applications[i].editable,
      context: applications[i].context,
      status: applications[i].status,
    };
    result.push(app);
  }

  const contextObj = {
    application_name: "default.application",
    application_url: "",
    application_config_path: "",
    nocalhost_config: "",
    source: "",
    resource_dir: "",
    install_type: "",
  };

  result.push({
    id: 0,
    userId: userId,
    public: 1,
    editable: 1,
    context: JSON.stringify(contextObj),
    status: 1,
  });
  return result;
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
  return result;
}
