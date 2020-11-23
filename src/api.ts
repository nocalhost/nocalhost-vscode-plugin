import { AxiosResponse } from 'axios';
import axios from 'axios';
import * as vscode from 'vscode';
import { tryToLogin } from './commands/login';
import state from './state';

axios.defaults.baseURL = 'http://129.226.14.191';
axios.defaults.headers.post['Content-Type'] = 'application/json';

let jwt = '';

interface RegisterUserInfo {
  email: string;
  password: string;
  confirm_password: string;
}

interface LoginInfo {
  email: string;
  password: string;
  from?: 'plugin';
}

interface ResponseData {
  code: number;
  message?: string;
  data: any;
}

axios.interceptors.request.use( function (config) {
  config.headers['Authorization'] = `Bearer ${jwt}`;

  return config;
});

axios.interceptors.response.use(async function (response: AxiosResponse<ResponseData>) {
  const res = response.data;
  if (res.code === 20103) {
    await tryToLogin();
  } else if (res.code === 20111) {
    state.setLogin(false);
    vscode.commands.executeCommand('getApplicationList');
  }
  if (res.code !== 0) {
    return Promise.reject(res);
  }

  return response;
}, function (error) {
  vscode.window.showErrorMessage(error.message);
  return Promise.reject(error);
});

function setAuth(jwt: string) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;
}

export async function login(loginInfo: LoginInfo) {
  loginInfo.from = 'plugin';
  const response = (await axios.post('/v1/login', loginInfo)).data as ResponseData;
  if (response.data && response.data.token ) {
    jwt = response.data.token;
    return true;
  }

  throw new Error('login fail');
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
  const response = await axios.get('/v1/plugin/applications');
  const res = response.data as ResponseData;
  const applications = res.data;
  const result = new Array<ApplicationInfo>();
  for(let i=0;i<applications.length;i++) {
    const app: ApplicationInfo = {
      id: applications[i].id,
      context: applications[i].context,
      status: applications[i].status,
      installStatus: applications[i]['install_status'],
      kubeconfig: applications[i].kubeconfig,
      cpu: applications[i].cpu,
      memory: applications[i].memory,
      namespace: applications[i].namespace,
      clusterId: applications[i]['cluster_id'],
      devspaceId: applications[i]['devspace_id']
    };
    result.push(app);
  }
  return result;
}

export async function updateAppInstallStatus(appId: number, devSpaceId: number, status: number) {
  return axios.put(`/v1/application/${appId}/dev_space/${devSpaceId}/plugin_sync`, { status });
}