import * as fs from "fs";
import {
  DEFAULT_KUBE_CONFIG_FULLPATH,
  USER_CONFIG_FULLPATH,
} from "../constants";

export function mkdir(fullPath: string) {
  const isExist = fs.existsSync(fullPath);
  if (isExist) {
    return;
  }
  fs.mkdirSync(fullPath);
}

export function initConfig() {
  const isExist = fs.existsSync(USER_CONFIG_FULLPATH);
  if (!isExist) {
    const defaultConfig = {
      currentKubeConfig: DEFAULT_KUBE_CONFIG_FULLPATH,
    };
    fs.writeFileSync(
      USER_CONFIG_FULLPATH,
      JSON.stringify(defaultConfig, null, 2)
    );
  }
}

export function getAllConfig() {
  const bf = fs.readFileSync(USER_CONFIG_FULLPATH);
  return JSON.parse(bf.toString());
}

function store(config: any) {
  fs.writeFileSync(USER_CONFIG_FULLPATH, JSON.stringify(config, undefined, 2));
}

export function get(key: string) {
  const config = getAllConfig();
  return config[key];
}

export function set(key: string, value: any) {
  const config = getAllConfig();
  config[key] = value;
  store(config);
}

export function remove(key: string) {
  const config = getAllConfig();
  delete config[key];
  store(config);
}
