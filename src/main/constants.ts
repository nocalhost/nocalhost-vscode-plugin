import { homedir, tmpdir } from "os";
import * as path from "path";
export const ROOT_NODE_KEY = "Nocalhost";
export const HOME_DIR = homedir();
export const NH_CONFIG_DIR = path.resolve(HOME_DIR, ".nh");
export const PLUGIN_CONFIG_DIR = path.resolve(NH_CONFIG_DIR, "vscode-plugin");
export const PLUGIN_TEMP_DIR = path.resolve(PLUGIN_CONFIG_DIR, ".tmp");
export const PLUGIN_TEMP_NHCTL = path.resolve(PLUGIN_TEMP_DIR, "nhctl");
export const USER_CONFIG_FULLPATH = path.resolve(
  PLUGIN_CONFIG_DIR,
  "config.json"
);
export const NHCTL_DIR = path.resolve(NH_CONFIG_DIR, "nhctl");
export const NH_BIN = path.resolve(NH_CONFIG_DIR, "bin");
export const NH_BIN_NHCTL = path.resolve(NH_BIN, "nhctl");

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

export const TEMP_NHCTL_BIN = path.resolve(tmpdir(), "temp-nhctl.exe");

// LOCAL
export const IS_LOCAL = "isLocal";
export const LOCAL_PATH = "localPaths_v2";

// USER INFO
export const USERNAME = "username";
export const EMAIL = "email";
export const PASSWORD = "password";
export const JWT = "jwt";
export const BASE_URL = "baseUrl";
export const USERINFO = "userinfo";
export const SERVER_CLUSTER_LIST = "userinfoList_v2";

export const WELCOME_DID_SHOW = "welcomeDidShow";

export const DEV_ASSOCIATE_LOCAL_DIRECTORYS = "devAssociateLocalDirectorys";

// tmp start record
export const TMP_STATUS = "tmpStatus";
export const TMP_ID = "tmpId";
export const TMP_APP = "tmpApp";
export const TMP_DEVSPACE = "tmpDevspace";
export const TMP_NAMESPACE = "tmpNamespace";
export const TMP_WORKLOAD = "tmpWorkload";
export const TMP_WORKLOAD_PATH = "tmpWorkloadPath";
export const TMP_RESOURCE_TYPE = "tmpResourceType";
export const TMP_KUBECONFIG_PATH = "tmpKubeconfigPath";
export const TMP_STORAGE_CLASS = "tmpStorageClass";
export const TMP_CONTAINER = "tmpContainer";
export const TMP_DEVSTART_APPEND_COMMAND = "tmpDevstartAppendCommand";

export const DATA_CENTER_INTERVAL_MS = 5000;
