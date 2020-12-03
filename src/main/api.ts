import { AxiosResponse } from "axios";
import axios from "axios";
import * as vscode from "vscode";
import state from "./state";
import * as fileStore from "./store/fileStore";
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

axios.interceptors.request.use(function (config) {
  const jwt = fileStore.get(JWT);
  config.baseURL = fileStore.get(BASE_URL);
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
    fileStore.set(JWT, jwt);
    return jwt;
  }

  throw new Error("login fail");
}

export async function getUserinfo() {
  const response = await axios.get("/v1/me");
  if (response.status === 200 && response.data) {
    const { data } = response.data;
    fileStore.set(USERINFO, data);
    return data;
  }
  throw new Error("Fail to fetch user infomation.");
}

interface ApplicationInfo {
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
}

export async function getApplication() {
  const response = await axios.get("/v1/plugin/applications");
  const res = response.data as ResponseData;
  const applications = res.data;
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
    };
    result.push(app);
  }
  vscode.commands.executeCommand(
    "setContext",
    "Nocalhost:appIsEmpty",
    result.length === 0
  );
  return result;
}

export async function updateAppInstallStatus(
  appId: number,
  devSpaceId: number,
  status: number
) {
  return axios.put(
    `/v1/application/${appId}/dev_space/${devSpaceId}/plugin_sync`,
    { status }
  );
}
