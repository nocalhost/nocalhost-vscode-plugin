import { homedir } from 'os';
import * as path from 'path';

export const HOME_DIR = homedir();
export const NH_CONFIG_DIR = path.resolve(HOME_DIR, '.nh');
export const USER_CONFIG_FULLPATH = path.resolve(NH_CONFIG_DIR, 'config.json');
export const KUBE_CONFIG_DIR = path.resolve(NH_CONFIG_DIR, 'kubeConfigs');
export const DEFAULT_KUBE_CONFIG_FULLPATH = path.resolve(HOME_DIR, '.kube/config');

// USER INFO
export const USERNAME = 'username';
export const EMAIL = 'email';
export const PASSWORD = 'password';
export const JWT = 'jwt';

// APP
export const SELECTED_APP_ID = 'selectedApp';
// export const 

// CURRENT_KUBECONFIG_FULLPATH
export const CURRENT_KUBECONFIG_FULLPATH = 'currentKubeconfigFullpath';