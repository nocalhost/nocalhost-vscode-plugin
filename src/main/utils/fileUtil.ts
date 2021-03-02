import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import * as vscode from "vscode";
import host from "../host";
import { ColorThemeKind } from "vscode";

export async function readYaml(filePath: string) {
  const data = await readFile(filePath);
  let yamlObj = null;
  try {
    yamlObj = yaml.parse(data);
  } catch (error) {}
  return yamlObj;
}

export async function writeYaml(filePath: string, yamlObj: any) {
  const yamlStr = yaml.stringify(yamlObj);
  await writeFile(filePath, yamlStr);
}

export function readFile(fliePath: string): Promise<string> {
  accessFile(fliePath);
  return new Promise((resolve, reject) => {
    fs.readFile(fliePath, { encoding: "utf-8" }, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
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

export function accessFile(filePath: string) {
  return new Promise((resolve, reject) => {
    fs.access(filePath, (err) => {
      if (err) {
        reject(err);
      }
      resolve(null);
    });
  });
}

export function isExist(filePath: string) {
  return new Promise((resolve, reject) => {
    fs.access(filePath, (err) => {
      if (err) {
        resolve(false);
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
