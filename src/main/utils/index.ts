import * as camelcase from "camelcase";

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
