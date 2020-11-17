import { AxiosResponse } from 'axios';
import axios from 'axios';
import * as vscode from 'vscode';
import { tryToLogin } from './commands/login';
import state from './state';

axios.defaults.baseURL = 'http://10.94.97.54:8080';
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

export function register(userInfo: RegisterUserInfo) {
  // axios.post()
}

// bussiness --> commands
// first try to login
// show login UI dialog

export async function login(loginInfo: LoginInfo) {
  const response = (await axios.post('/v1/login', loginInfo)).data as ResponseData;
  if (response.data && response.data.token ) {
    // setAuth(response.data.jwt);
    jwt = response.data.token;
    return true;
  }

  throw new Error('login fail');
}

interface ApplicationInfo {
  id: number;
  context: string;
  status: number;
  devSpaceStatus: number;
}

interface DevSpaceInfo {
  id: number,
  application_id: number,
  cluster_id: number,
  cpu: number,
  kubeconfig: string,
  memory: number,
  user_id: number,
  status: number,
}

export async function getApplication() {
  const response = await axios.get('/v1/application');
  const res = response.data as ResponseData;
  const applications = res.data as ApplicationInfo[];
  for(let i=0;i<applications.length;i++) {
    const app = applications[i];
    const devInfo = await getDevSpace(app.id + '');
    app.devSpaceStatus = (devInfo && devInfo.status) || 0;
  }
  return applications;
}

export async function getDevSpace(appId: string) {
  const response = await axios.get(`/v1/application/${appId}/dev_space`);
  const res = response.data as ResponseData;
  const kubeInfo = res.data as DevSpaceInfo;
  return kubeInfo;
}