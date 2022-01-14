import * as fs from "fs";
import * as path from "path";
import * as ProperLockfile from "proper-lockfile";
import * as yaml from "yaml";
import * as vscode from "vscode";
import host from "../host";
import logger from "./logger";
import { IKubeconfig } from "../ctl/nhctl/type";

export function getKubeconfigContext(
  kubeconfig: IKubeconfig,
  contextName?: string
): IKubeconfig["contexts"][number] | undefined {
  const contexts = kubeconfig.contexts || [];

  if (!contextName) {
    contextName = kubeconfig["current-context"];
  }

  return contexts.find((item) => item.name === contextName);
}

export function readYamlSync(filePath: string) {
  if (!isExistSync(filePath)) {
    return null;
  }
  const data = fs.readFileSync(filePath, { encoding: "utf-8" });
  if (!data) {
    return null;
  }
  let yamlObj = null;
  try {
    yamlObj = yaml.parse(data);
  } catch (e) {
    yamlObj = null;
    logger.error(e);
  }
  return yamlObj;
}
export async function readYaml<T = any>(filePath: string) {
  let yamlObj = null;

  const result = await isExist(filePath);
  if (result !== true) {
    return null;
  }
  try {
    const data = await readFile(filePath);
    yamlObj = yaml.parse(data);
  } catch (e) {
    logger.error(e);
  }
  return yamlObj as T;
}

export async function readFile(filePath: string): Promise<string> {
  const result = await isExist(filePath);
  if (result !== true) {
    return null;
  }
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, { encoding: "utf-8" }, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}

export function writeFileLock(filePath: string, writeData: string) {
  if (!isExistSync(filePath)) {
    writeFileAsync(filePath, writeData);
    return;
  }
  return ProperLockfile.lock(filePath)
    .then((release: () => void) => {
      writeFileAsync(filePath, writeData);
      return release();
    })
    .catch((e: any) => {
      logger.error(`[file lock]: ${filePath}`);
    });
}

export function writeFileAsync(filePath: string, writeData: string) {
  const isExist = fs.existsSync(filePath);
  if (isExist) {
    const data = fs.readFileSync(filePath).toString();
    if (data === writeData) {
      return;
    }
  }

  fs.writeFileSync(filePath, writeData, { mode: 0o600 });
}

export async function writeFile(filePath: string, data: string | Uint8Array) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, data, { encoding: "utf-8" }, (err) => {
      if (err) {
        reject(err);
      }
      resolve(null);
    });
  });
}

export function isExistSync(filePath: string) {
  if (!filePath) {
    return false;
  }
  try {
    return !Boolean(fs.accessSync(filePath));
  } catch (e) {
    return false;
  }
}

export function isExist(filePath: string) {
  return new Promise((resolve, reject) => {
    fs.access(filePath, (err) => {
      if (err) {
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

export function resolveVSCodeUri(iconName: string): vscode.Uri {
  const extensionPath: string = host.getGlobalState("extensionPath");
  const resolvePath: string = path.resolve(
    extensionPath,
    "images",
    "icon",
    iconName
  );
  return vscode.Uri.file(resolvePath);
}

export function mkdir(fullPath: string) {
  const isExist = fs.existsSync(fullPath);
  if (isExist) {
    return;
  }
  fs.mkdirSync(fullPath);
}

export function replaceSpacePath(str: string): string {
  if (!str) {
    return str;
  }
  return host.isWindow() ? str.replace(/ /g, "\\ ") : `"${str}"`;
}

export function getFilesByDir(dirPath: string): string[] {
  if (!isExistSync(dirPath)) {
    return [];
  }
  return fs.readdirSync(dirPath);
}
