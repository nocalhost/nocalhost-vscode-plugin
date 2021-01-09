import { homedir } from "os";
import * as path from "path";

export const HOME_DIR = homedir();
export const NH_CONFIG_DIR = path.resolve(HOME_DIR, ".nh");
export const PLUGIN_CONFIG_DIR = path.resolve(NH_CONFIG_DIR, "plugin");
export const USER_CONFIG_FULLPATH = path.resolve(
  PLUGIN_CONFIG_DIR,
  "config.json"
);
export const NHCTL_DIR = path.resolve(NH_CONFIG_DIR, "nhctl");
export const KUBE_CONFIG_DIR = path.resolve(PLUGIN_CONFIG_DIR, "kubeConfigs");
export const HELM_NH_CONFIG_DIR = path.resolve(
  PLUGIN_CONFIG_DIR,
  "helmNHConfigs"
);
export const HELM_VALUES_DIR = path.resolve(PLUGIN_CONFIG_DIR, "helmValues");
export const DEFAULT_KUBE_CONFIG_FULLPATH = path.resolve(
  HOME_DIR,
  ".kube/config"
);

// USER INFO
export const USERNAME = "username";
export const EMAIL = "email";
export const PASSWORD = "password";
export const JWT = "jwt";
export const BASE_URL = "baseUrl";
export const USERINFO = "userinfo";
export const WELCOME_DID_SHOW = "welcomeDidShow";

// tmp start record
export const TMP_STATUS = "tmpStatus";
export const TMP_APP = "tmpApp";
export const TMP_WORKLOAD = "tmpWorkload";
export const TMP_WORKLOAD_PATH = "tmpWorkloadPath";
export const TMP_RESOURCE_TYPE = "tmpResourceType";
export const TMP_KUBECONFIG_PATH = "tmpKubeconfigPath";
export const TMP_STORAGE_CLASS = "tmpStorageClass";
