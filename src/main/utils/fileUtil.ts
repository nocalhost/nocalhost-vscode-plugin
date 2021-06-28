import * as fs from "fs";
import * as path from "path";
import { ColorThemeKind } from "vscode";
import * as ProperLockfile from "proper-lockfile";
import * as yaml from "yaml";
import * as vscode from "vscode";
import host from "../host";
import { KUBE_CONFIG_DIR } from "../constants";
import logger from "./logger";

export async function writeKubeConfigFile(
  data: string,
  fileName: string
): Promise<string> {
  if (!fs.existsSync(KUBE_CONFIG_DIR)) {
    fs.mkdirSync(KUBE_CONFIG_DIR);
  }
  const filePath = path.resolve(KUBE_CONFIG_DIR, fileName);
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, data, { encoding: "utf-8" }, (err) => {
      if (err) {
        reject(null);
      }
      resolve(filePath);
    });
  });
}

export function getYamlDefaultContext(yaml: any) {
  const contexts = yaml.contexts || [];
  const currentContext = yaml["current-context"];
  if (currentContext) {
    return currentContext;
  }
  return contexts.length > 0 ? contexts[0].name : null;
}

export async function readYaml(filePath: string) {
  let yamlObj = null;
  const result = await isExist(filePath);
  if (result !== true) {
    return null;
  }
  try {
    const data = await readFile(filePath);
    yamlObj = yaml.parse(data);
  } catch (error) {}
  return yamlObj;
}

export async function writeYaml(filePath: string, yamlObj: any) {
  const yamlStr = yaml.stringify(yamlObj);
  await writeFile(filePath, yamlStr);
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
  const colorTheme =
    vscode.window.activeColorTheme.kind === ColorThemeKind.Dark
      ? "dark"
      : "light";
  const resolvePath: string = path.resolve(
    extensionPath,
    "images",
    colorTheme,
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
