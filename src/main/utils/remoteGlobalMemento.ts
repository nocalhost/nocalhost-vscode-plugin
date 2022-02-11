import * as vscode from "vscode";
import { watchFile, unwatchFile, promises, constants } from "fs";
import { join } from "path";
import { isEqual } from "lodash";
import { lock, unlock } from "proper-lockfile";

import { RunOnceScheduler, DeferredPromise } from "./async";
import logger from "./logger";

export class RemoteGlobalMemento implements vscode.Memento {
  private readonly _init: Promise<RemoteGlobalMemento>;
  private _value?: { [n: string]: any };

  private _deferredPromises: Map<string, DeferredPromise<void>> = new Map();
  private _scheduler: RunOnceScheduler;
  private readonly _globalStorageFile: string;

  constructor(private readonly _globalStoragePath: string) {
    this._globalStorageFile = join(_globalStoragePath, "state.data");

    this._init = this._initializeStorage().then((value) => {
      this._value = value;

      return this;
    });
  }

  private async writeFile() {
    await lock(this._globalStorageFile, { retries: 3 });

    await promises.writeFile(
      this._globalStorageFile,
      JSON.stringify(this._value)
    );

    await unlock(this._globalStorageFile);
  }
  private async _fileChangeListener() {
    const buffer = await promises.readFile(this._globalStorageFile);

    const value = JSON.parse(buffer.toString());

    if (!isEqual(value, this._value)) {
      this._value = value;
    }
  }

  private async _initializeStorage() {
    try {
      await promises
        .access(this._globalStoragePath, constants.F_OK)
        .catch(async () => {
          await promises.mkdir(this._globalStoragePath, { recursive: true });
          await promises.writeFile(this._globalStorageFile, `{}`);
        });

      this._scheduler = new RunOnceScheduler(() => {
        const records = this._deferredPromises;

        this._deferredPromises = new Map();
        (async () => {
          try {
            await this.writeFile();

            for (const value of records.values()) {
              value.complete();
            }
          } catch (e) {
            for (const value of records.values()) {
              value.error(e);
            }
          }
        })();
      }, 0);

      watchFile(
        this._globalStorageFile,
        { interval: 500 },
        this._fileChangeListener.bind(this)
      );

      const buffer = await promises.readFile(this._globalStorageFile);

      return JSON.parse(buffer.toString());
    } catch (error) {
      logger.error("initializeStorage", error);

      throw Error("Failed to initialize remote storage");
    }
  }

  keys(): readonly string[] {
    // Filter out `undefined` values, as they can stick around in the `_value` until the `onDidChangeStorage` event runs
    return Object.entries(this._value ?? {})
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key);
  }

  get whenReady(): Promise<RemoteGlobalMemento> {
    return this._init;
  }

  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  get<T>(key: string, defaultValue?: T): T {
    let value = this._value![key];
    if (typeof value === "undefined") {
      value = defaultValue;
    }
    return value;
  }

  update(key: string, value: any): Promise<void> {
    this._value![key] = value;

    let record = this._deferredPromises.get(key);
    if (record !== undefined) {
      return record.p;
    }

    const promise = new DeferredPromise<void>();
    this._deferredPromises.set(key, promise);

    if (!this._scheduler.isScheduled()) {
      this._scheduler.schedule();
    }

    return promise.p;
  }

  dispose(): void {
    unwatchFile(this._globalStorageFile, this._fileChangeListener.bind(this));
  }
}
