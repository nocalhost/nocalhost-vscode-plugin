import * as fs from "fs";

export interface INLSStore {
  [key: string]: string;
}

export class NLSStore {
  get(key?: string): string | INLSStore {}
}
