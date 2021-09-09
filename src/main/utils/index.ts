import * as camelcase from "camelcase";
import { cpus } from "os";

export const keysToCamel = (o: any) => {
  if (isObject(o)) {
    const n: { [index: string]: any } = {};
    Object.keys(o).forEach((k: string) => {
      n[camelcase(k)] = keysToCamel(o[k]);
    });

    return n;
  } else if (isArray(o)) {
    return o.map((i: string) => {
      return keysToCamel(i);
    });
  }

  return o;
};

export const isObject = (o: any) =>
  o === Object(o) && !isArray(o) && typeof o !== "function";

export const isArray = (a: any) => Array.isArray(a);

export const snakeToCamel = (str: string) =>
  str.replace(/([-_]\w)/g, (g) => g[1].toUpperCase());

export async function asyncLimit<T, R>(
  array: T[],
  iteratorFn: (result: T, array: T[]) => Promise<R>,
  /**
   * millisecond
   */
  timeOut?: number,
  limit = cpus().length / 2
) {
  const ret = [];
  const executing: any[] = [];

  let fn = iteratorFn;

  if (timeOut) {
    fn = (result: T) => {
      return new Promise((res, rej) => {
        const time = setTimeout(() => {
          rej("timeout");
        }, timeOut);

        iteratorFn(result, array).then((result: R) => {
          res(result);

          clearTimeout(time);
        }, rej);
      });
    };
  }

  for (const item of array) {
    const p = Promise.resolve().then(() => fn(item, array));
    ret.push(p);

    if (limit <= array.length) {
      const e = p.finally(() => executing.splice(executing.indexOf(e), 1));

      executing.push(e);

      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.allSettled(ret);
}
